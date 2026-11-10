"""Real recorded-video analysis. Scripted scenes do not call this module."""
from __future__ import annotations
from collections import deque
from pathlib import Path
import json
import math
import subprocess
import threading
import time


def inside(point, rect):
    x,y=point
    return rect[0] <= x <= rect[2] and rect[1] <= y <= rect[3]


class ActionRule:
    def __init__(self, mode='occupancy', shelf=(.05,.1,.4,.8), bag=(.55,.35,.95,.95), zone=(.35,.1,.8,1.)):
        self.mode,self.shelf,self.bag,self.zone=mode,shelf,bag,zone
        self.last_seen=-100.
        self.last_center=None
        self.entry_since=None
        self.entry_emitted=False
        self.hands={}
        self.last_event=-100.

    def update(self,t,landmarks):
        if not landmarks:
            if t-self.last_seen>.8:
                self.hands={};self.entry_since=None;self.entry_emitted=False;self.last_center=None
            return None
        torso=[landmarks[i] for i in (11,12,23,24) if landmarks[i][2]>.5]
        if len(torso)<2:
            return self.update(t, [])
        center=(sum(p[0] for p in torso)/len(torso),sum(p[1] for p in torso)/len(torso))
        if self.last_center and math.dist(center,self.last_center)>.3:
            self.hands={};self.entry_since=None;self.entry_emitted=False
        self.last_center=center;self.last_seen=t
        if self.mode=='zone_entry':
            if inside(center,self.zone):
                if self.entry_since is None:self.entry_since=t
                if t-self.entry_since>=.75 and not self.entry_emitted:
                    self.entry_emitted=True
                    return ('Zone entry · movement test','A detected body centre remained in the configured region for 0.75 seconds. This is a movement test, not a misconduct finding.')
            else:
                self.entry_since=None;self.entry_emitted=False
        elif self.mode=='shelf_bag':
            for hand in (15,16):
                x,y,confidence=landmarks[hand]
                if confidence<.6:
                    self.hands.pop(hand,None)
                    continue
                state=self.hands.setdefault(hand,{'shelf_since':None,'armed':None,'bag_since':None})
                if inside((x,y),self.shelf):
                    if state['shelf_since'] is None:state['shelf_since']=t
                    if t-state['shelf_since']>=.35:state['armed']=t
                else:state['shelf_since']=None
                if state['armed'] is not None and t-state['armed']<=4 and inside((x,y),self.bag):
                    if state['bag_since'] is None:state['bag_since']=t
                    if t-state['bag_since']>=.35 and t-self.last_event>=8:
                        self.last_event=t;self.hands={}
                        return ('Shelf-to-bag-area movement','The same visible wrist moved from the configured shelf region to the configured bag region. Experimental movement rule; staff must review context.')
                else:state['bag_since']=None
        return None

    def explain(self,t,landmarks):
        """Read-only explanation of this rule's actual observation state."""
        visible=sum(p[2]>.5 for p in landmarks)
        torso=[landmarks[i] for i in (11,12,23,24) if landmarks and landmarks[i][2]>.5]
        valid=len(torso)>=2
        dwell=max(0,t-self.entry_since) if self.entry_since is not None and valid else 0
        stage='No reliable body observation'
        if valid:
            if self.mode=='occupancy':stage='Presence observed · no security rule enabled'
            elif self.mode=='zone_entry':stage='Observation emitted' if self.entry_emitted else 'Timing region entry' if self.entry_since is not None else 'Outside configured region'
            else:stage='Waiting for shelf dwell'
        wrists=[]
        for hand in (15,16):
            h=self.hands.get(hand,{})
            shelf=max(0,t-h['shelf_since']) if h.get('shelf_since') is not None else 0
            bag=max(0,t-h['bag_since']) if h.get('bag_since') is not None else 0
            armed=h.get('armed') is not None and t-h['armed']<=4
            wrists.append({'side':'left' if hand==15 else 'right','visible':bool(landmarks and landmarks[hand][2]>=.6),'shelf_dwell_s':round(shelf,2),'bag_dwell_s':round(bag,2),'armed':armed})
            if self.mode=='shelf_bag' and valid and armed:stage='Timing bag-region dwell' if bag>0 else 'Shelf dwell met · waiting for same wrist in bag region'
        if self.mode=='shelf_bag' and t-self.last_event<1:stage='Movement observation emitted · human review required'
        return {'model':'MediaPipe Pose Landmarker Lite','algorithm':'Timed region-state machine',
                'landmarks_total':33,'visible_landmarks':visible,'body_observed':valid,'stage':stage,
                'zone_dwell_s':round(dwell,2),'zone_threshold_s':.75,'shelf_threshold_s':.35,
                'bag_threshold_s':.35,'sequence_window_s':4,'missing_reset_s':.8,'cooldown_s':8,
                'wrists':wrists,'observation_emitted':self.entry_emitted if self.mode=='zone_entry' else t-self.last_event<1,
                'note':'Visibility is landmark observability, not theft confidence.'}


class VideoWorker:
    def __init__(self,root,engine,store,data_dir=None):
        self.root=Path(root);self.engine=engine;self.store=store
        self.data=Path(data_dir) if data_dir else self.root/'data'
        self.thread=None;self.cancel=threading.Event()
        self.latest_jpeg=None;self.frame_lock=threading.Lock()

    def stop(self):
        self.cancel.set()
        if self.thread and self.thread.is_alive():self.thread.join(timeout=8)
        if self.thread and self.thread.is_alive():raise RuntimeError('Video worker is still stopping; retry in a moment.')

    def start(self,path,mode,regions):
        self.stop()
        self.cancel=threading.Event()
        with self.frame_lock:self.latest_jpeg=None
        self.engine.enter_video()
        with self.engine.lock:
            self.engine.video.update(status='loading',name=path.name,rule=mode,progress=0,
                                     message='Loading local pose model…',fps=0,people=0,frame_url=None,
                                     inference_ms=0,media_time=0,frames=0,analysis=None)
        self.thread=threading.Thread(target=self.run,args=(path,mode,regions,self.cancel),daemon=True)
        self.thread.start()

    def save_clip(self,event_id,frames,fps):
        if not frames:return
        import cv2
        import imageio_ffmpeg
        folder=self.data/'clips';folder.mkdir(exist_ok=True,parents=True)
        raw=folder/f'{event_id}.avi';out=folder/f'{event_id}.mp4'
        h,w=frames[0].shape[:2]
        writer=cv2.VideoWriter(str(raw),cv2.VideoWriter_fourcc(*'MJPG'),fps,(w,h))
        if not writer.isOpened():raise RuntimeError('Cannot create event clip')
        for frame in frames:writer.write(frame)
        writer.release()
        result=subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-loglevel','error','-i',str(raw),
             '-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart',str(out)],capture_output=True,timeout=45)
        if result.returncode:raise RuntimeError(result.stderr.decode(errors='replace')[:300])
        raw.unlink(missing_ok=True)
        self.store.attach_clip(event_id,f'/media/clips/{out.name}')

    def run(self,path,mode,regions,cancel):
        cap=None;model=None;pending=[]
        try:
            import cv2
            import mediapipe as mp
            model_path=self.root/'models'/'pose_landmarker_lite.task'
            options=mp.tasks.vision.PoseLandmarkerOptions(
                base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)),
                running_mode=mp.tasks.vision.RunningMode.VIDEO,num_poses=1,
                min_pose_detection_confidence=.5,min_pose_presence_confidence=.5)
            model=mp.tasks.vision.PoseLandmarker.create_from_options(options)
            cap=cv2.VideoCapture(str(path))
            if not cap.isOpened():raise ValueError('The selected file could not be decoded.')
            fps=cap.get(cv2.CAP_PROP_FPS) or 25
            frames_total=cap.get(cv2.CAP_PROP_FRAME_COUNT)
            step=max(1,round(fps/6));output_fps=fps/step
            ring=deque(maxlen=max(1,round(output_fps*3)))
            rule=ActionRule(mode,**regions)
            started=time.monotonic();index=0;processed=0;latencies=[];present=0;events=0
            connections=[(11,12),(11,13),(13,15),(12,14),(14,16),(11,23),(12,24),(23,24),(23,25),(25,27),(24,26),(26,28)]
            while not cancel.is_set():
                ok,frame=cap.read()
                if not ok:break
                index+=1
                if (index-1)%step:continue
                t=(index-1)/fps
                wait=started+t-time.monotonic()
                if wait>0 and cancel.wait(wait):break
                h,w=frame.shape[:2]
                frame=cv2.resize(frame,(640,round(h*640/w)))
                inference_start=time.perf_counter()
                result=model.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB,data=cv2.cvtColor(frame,cv2.COLOR_BGR2RGB)),round(t*1000))
                latencies.append((time.perf_counter()-inference_start)*1000)
                points=[(p.x,p.y,p.visibility) for p in result.pose_landmarks[0]] if result.pose_landmarks else []
                torso=[points[i] for i in (11,12,23,24) if points and points[i][2]>.5]
                count=int(len(torso)>=2)
                present+=count;processed+=1
                # Softened footage + stronger head masking; not a production privacy guarantee.
                shown=cv2.GaussianBlur(frame,(15,15),0)
                hh,ww=shown.shape[:2]
                if points:
                    head=[p for p in points[:11] if p[2]>.3]
                    if head:
                        xs=[p[0] for p in head];ys=[p[1] for p in head]
                        x1=max(0,int((min(xs)-.07)*ww));x2=min(ww,int((max(xs)+.07)*ww))
                        y1=max(0,int((min(ys)-.08)*hh));y2=min(hh,int((max(ys)+.06)*hh))
                        if x2>x1 and y2>y1:shown[y1:y2,x1:x2]=cv2.GaussianBlur(shown[y1:y2,x1:x2],(61,61),0)
                    for a,b in connections:
                        if min(points[a][2],points[b][2])>.5:
                            cv2.line(shown,(int(points[a][0]*ww),int(points[a][1]*hh)),(int(points[b][0]*ww),int(points[b][1]*hh)),(108,226,170),2)
                    visible=[p for p in points if p[2]>.5]
                    for x,y,_ in visible:
                        cv2.circle(shown,(int(x*ww),int(y*hh)),3,(90,240,160),-1)
                    if count and visible:
                        x1=max(0,int(min(p[0] for p in visible)*ww)-12);x2=min(ww-1,int(max(p[0] for p in visible)*ww)+12)
                        y1=max(26,int(min(p[1] for p in visible)*hh)-12);y2=min(hh-1,int(max(p[1] for p in visible)*hh)+12)
                        cv2.rectangle(shown,(x1,y1),(x2,y2),(90,240,160),2)
                        cv2.rectangle(shown,(6,4),(270,32),(23,48,39),-1)
                        cv2.putText(shown,f'POSE 01 | {len(visible)}/33 visible points',(12,24),cv2.FONT_HERSHEY_SIMPLEX,.48,(90,240,160),1)
                if mode!='occupancy':
                    boxes=[('Movement zone',rule.zone)] if mode=='zone_entry' else [('Shelf',rule.shelf),('Bag area',rule.bag)]
                    for label,rect in boxes:
                        x1,y1,x2,y2=rect
                        cv2.rectangle(shown,(int(x1*ww),int(y1*hh)),(int(x2*ww),int(y2*hh)),(100,220,230),1)
                        cv2.putText(shown,label,(int(x1*ww)+4,int(y1*hh)+17),cv2.FONT_HERSHEY_SIMPLEX,.45,(100,220,230),1)
                cv2.putText(shown,'RECORDED VIDEO | local pose analysis',(12,hh-14),cv2.FONT_HERSHEY_SIMPLEX,.5,(240,250,240),1)
                ring.append(shown.copy())
                fired=rule.update(t,points)
                if fired:
                    title,reason=fired;events+=1
                    event_id=self.store.create(source='video',title=title,level=1 if mode=='zone_entry' else 2,zone='A1',
                        reason=reason,session_id=self.engine.session_id,evidence=[{'time':round(t,2),'text':reason}])
                    pending.append({'id':event_id,'until':t+3,'frames':list(ring)})
                    if mode=='shelf_bag':
                        with self.engine.lock:self.engine.zones[0].hold_until=self.engine.elapsed+300
                for item in pending[:]:
                    if not fired or item['id']!=event_id:item['frames'].append(shown.copy())
                    if t>=item['until']:
                        self.save_clip(item['id'],item['frames'],output_fps);pending.remove(item)
                encoded,jpg=cv2.imencode('.jpg',shown,[cv2.IMWRITE_JPEG_QUALITY,80])
                if encoded:
                    with self.frame_lock:self.latest_jpeg=jpg.tobytes()
                self.engine.observe_video(count,f'/api/video/frame?v={processed}',status='running',
                    message='Single-person demo. Detection counts are not ground-truth accuracy.',
                    progress=min(100,index/max(1,frames_total)*100),fps=round(processed/max(.1,time.monotonic()-started),1),
                    inference_ms=round(latencies[-1],1),media_time=round(t,1),frames=processed,analysis=rule.explain(t,points))
            for item in pending:self.save_clip(item['id'],item['frames'],output_fps)
            stats={'file':path.name,'rule':mode,'frames_processed':processed,'frames_with_pose':present,
                   'events_generated':events,'mean_inference_ms':sum(latencies)/max(1,len(latencies)),
                   'wall_seconds':time.monotonic()-started,'cancelled':cancel.is_set(),
                   'limitation':'Presence count is not detection accuracy. No labelled concealment evaluation has been performed.'}
            (self.data/'last_video_run.json').write_text(json.dumps(stats,indent=2),encoding='utf-8')
            with self.engine.lock:
                self.engine.video.update(status='stopped' if cancel.is_set() else 'complete',message='Recorded video stopped.' if cancel.is_set() else 'Recorded video finished. Lighting returns to its input-unavailable safe state.')
                self.engine.healthy=False
                self.engine.running=False
                for zone in self.engine.zones:zone.update(self.engine.elapsed,0,healthy=False)
                self.engine.stage='Recorded video ended'
        except Exception as exc:
            with self.engine.lock:
                self.engine.video.update(status='error',message=str(exc))
                self.engine.healthy=False
                self.engine.running=False
                for zone in self.engine.zones:zone.update(self.engine.elapsed,0,healthy=False)
        finally:
            if cap:cap.release()
            if model:model.close()
