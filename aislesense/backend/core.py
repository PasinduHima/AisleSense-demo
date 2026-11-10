"""Deterministic demo rules. Simulation observations are never presented as AI results."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
import json
import math
import sqlite3
import threading
import time
import uuid


def utc_now():
    return datetime.now(timezone.utc).isoformat()


class EventStore:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        with self.connect() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS events (
              id TEXT PRIMARY KEY, created_at TEXT, source TEXT, title TEXT,
              level INTEGER, zone TEXT, reason TEXT, status TEXT DEFAULT 'open',
              clip_url TEXT, evidence TEXT, session_id TEXT);
            CREATE TABLE IF NOT EXISTS decisions (
              id INTEGER PRIMARY KEY, event_id TEXT, decision TEXT,
              note TEXT, created_at TEXT);
            ''')

    def connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        db.row_factory = sqlite3.Row
        return db

    def create(self, *, source, title, level, zone, reason, session_id, evidence=None, clip_url=None):
        event_id = uuid.uuid4().hex[:12]
        with self.connect() as db:
            db.execute('INSERT INTO events VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                       (event_id, utc_now(), source, title, level, zone, reason,
                        'open', clip_url, json.dumps(evidence or []), session_id))
        return event_id

    def upgrade(self, event_id, level, reason, evidence, title=None):
        with self.connect() as db:
            db.execute('UPDATE events SET level=?, reason=?, evidence=?, title=COALESCE(?,title) WHERE id=?',
                       (level, reason, json.dumps(evidence), title, event_id))

    def attach_clip(self, event_id, url):
        with self.connect() as db:
            db.execute('UPDATE events SET clip_url=? WHERE id=?', (url, event_id))

    def list(self):
        with self.connect() as db:
            rows = [dict(r) for r in db.execute('SELECT * FROM events ORDER BY created_at DESC LIMIT 100')]
            for row in rows:
                row['evidence'] = json.loads(row['evidence'])
                row['decisions'] = [dict(r) for r in db.execute(
                    'SELECT decision,note,created_at FROM decisions WHERE event_id=? ORDER BY id', (row['id'],))]
        return rows

    def decide(self, event_id, decision, note=''):
        if decision not in ('confirm', 'false_alarm', 'need_more'):
            raise ValueError('Unknown review decision')
        with self.connect() as db:
            if not db.execute('SELECT 1 FROM events WHERE id=?', (event_id,)).fetchone():
                raise KeyError(event_id)
            db.execute('INSERT INTO decisions(event_id,decision,note,created_at) VALUES (?,?,?,?)',
                       (event_id, decision, note[:1000], utc_now()))
            db.execute('UPDATE events SET status=? WHERE id=?', (decision, event_id))


@dataclass
class LightingZone:
    id: str
    name: str
    count: int = 0
    level: float = 100
    target: float = 100
    empty_since: float | None = None
    hold_until: float = 0
    override: float | None = None
    override_until: float = 0
    state: str = 'Waiting to dim'
    baseline_wh: float = 0
    used_wh: float = 0
    countdown: float = 0
    hold_label: str = 'Review hold'

    def update(self, now, dt, *, healthy=True, delay=5, dim=30, watts=60, comfort=100):
        # Input health and review hold override manual dimming.
        if not healthy:
            self.target, self.state, self.empty_since = 100, 'Input unavailable', None
            self.countdown = 0
        elif now < self.hold_until:
            self.target, self.state, self.empty_since = 100, self.hold_label, None
            self.countdown = max(0, self.hold_until-now)
        elif self.override is not None and now < self.override_until:
            self.target, self.state = self.override, 'Manual override'
            self.empty_since = None
            self.countdown = max(0, self.override_until-now)
        else:
            self.override = None
            if self.count > 0:
                self.target, self.state, self.empty_since = comfort, 'Occupied', None
                self.countdown = 0
            else:
                if self.empty_since is None:
                    self.empty_since = now
                self.countdown = max(0, delay-(now-self.empty_since))
                self.target = comfort if self.countdown > 0 else dim
                self.state = 'Waiting to dim' if self.countdown > 0 else 'Dimmed'
        # Brightening is immediate; dimming fades over approximately 2 seconds.
        self.level = self.target if self.target >= self.level else max(self.target, self.level-35*dt)
        self.baseline_wh += watts*dt/3600
        self.used_wh += watts*(self.level/100)*dt/3600

    def as_dict(self):
        return {k: round(v, 3) if isinstance(v, float) else v for k, v in vars(self).items()}


def along(t, points):
    """Time-indexed authored path, used only in explicitly labelled scenario mode."""
    if t <= points[0][0]:
        return points[0][1:]
    for a, b in zip(points, points[1:]):
        if t <= b[0]:
            f=(t-a[0])/(b[0]-a[0])
            return [a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f]
    return points[-1][1:]


def glide(t, points, blur=.35):
    """Authored path with rounded corners and softened starts and stops."""
    samples=[along(t+blur*k/2, points) for k in (-2,-1,0,1,2)]
    return [sum(p[0] for p in samples)/5, sum(p[1] for p in samples)/5]


def aisle_of(x, z):
    """Index of the camera zone containing a floor position, or None in the front and back walkways."""
    if not -4<=z<2.4:return None
    return 0 if x<-1.75 else 2 if x>1.75 else 1


class Plan:
    """Deterministic walk-and-act script for one authored figure.

    Steps are ('go', [(x,z),...], speed?) or ('do', action, seconds, heading). Walking eases in and out
    and rounds corners; the same time always gives the same pose, so every run of a scene is identical.
    """
    RAMP=.6
    def __init__(self, start, origin, steps, speed=1.15, leave=True):
        self.start=start;self.leave=leave;self.segs=[]
        t=start;pos=origin;item=False;bagged=False
        for step in steps:
            if step[0]=='go':
                pts=[pos,*step[1]];v=step[2] if len(step)>2 else speed
                cum=[0.]
                for a,b in zip(pts,pts[1:]):cum.append(cum[-1]+math.dist(a,b))
                end=t+cum[-1]/v+self.RAMP
                self.segs.append(('go',t,end,pts,cum,v,item,bagged));t=end;pos=pts[-1]
            else:
                _,action,seconds,heading=step
                self.segs.append(('do',t,t+seconds,pos,action,heading,item,bagged));t+=seconds
                if action=='picking':item=True
                elif action=='bagging':item,bagged=False,True
                elif action=='checkout':item=False
        self.end=t

    @staticmethod
    def _at(pts, cum, s):
        s=min(max(s,0),cum[-1])
        for i in range(1,len(pts)):
            if s<=cum[i] or i==len(pts)-1:
                span=cum[i]-cum[i-1];f=(s-cum[i-1])/span if span else 0
                a,b=pts[i-1],pts[i]
                return a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f
        return pts[-1]

    def _round(self, pts, cum, s):
        r=min(.45,s,cum[-1]-s)
        ps=[self._at(pts,cum,s+r*k/2) for k in (-2,-1,0,1,2)]
        return sum(p[0] for p in ps)/5, sum(p[1] for p in ps)/5

    def sample(self, t):
        if t<self.start or (self.leave and t>=self.end):return None
        seg=next((g for g in self.segs if t<g[2]),self.segs[-1])
        tau=min(t,seg[2])-seg[1]
        if seg[0]=='go':
            _,_,_,pts,cum,v,item,bagged=seg
            a=self.RAMP;length=cum[-1];total=length/v+a
            if length/v<a:f=tau/total;s=length*f*f*(3-2*f)
            elif tau<a:s=v*tau*tau/(2*a)
            elif tau>total-a:s=length-v*(total-tau)**2/(2*a)
            else:s=v*(tau-a/2)
            x,z=self._round(pts,cum,s)
            ax,az=self._round(pts,cum,max(0,s-.08));bx,bz=self._round(pts,cum,min(length,s+.08))
            return {'x':round(x,3),'z':round(z,3),'action':'walking','item':item,'bagged':bagged,
                    'heading':round(math.atan2(bx-ax,bz-az),3)}
        _,_,_,pos,action,heading,item,bagged=seg
        if action=='picking':item=tau>=1
        elif action=='bagging':item,bagged=False,bagged or tau>=1
        return {'x':pos[0],'z':pos[1],'action':action,'item':item,'bagged':bagged,'heading':heading}


LEFT,RIGHT,FRONT,BACK=-math.pi/2,math.pi/2,0.,math.pi
ENTRY=[(-2.9,4.4)]
WAY_OUT=[(2.2,2.8),(5.3,3.0),(5.75,4.3),(5.75,6.0)]
SUSPECT='S07'

def demo_cast():
    """Seven authored figures for the one-click demonstration: four ordinary shoppers, one concealment
    sequence, a cashier and a guard. Returns the cast and the moment the guard is sent."""
    door=(-2.9,6.0)
    suspect=Plan(2,door,[('go',[*ENTRY,(-3.5,2.6),(-3.6,.9),(-4.15,.3)]),
        ('do','browsing',3,LEFT),('do','looking',3.5,LEFT),('do','picking',3,LEFT),('do','looking',2.5,LEFT),
        ('do','bagging',3,LEFT),('do','looking',1.6,LEFT),
        ('go',[(-3.5,1.85),(2.6,1.85),(4.6,3.9)],1.3),('do','standing',60,-1.28)],leave=False)
    # The guard is sent when the shopper has passed the checkout lane without stopping.
    sent=next(t/20 for t in range(0,2400) if (p:=suspect.sample(t/20)) and p['bagged'] and p['x']>1 and p['z']>1.42)
    met=suspect.segs[-1][1]          # the shopper stops; the guard is already waiting there
    cast=[
     {'id':SUSPECT,'role':'shopper','look':1,'plan':suspect},
     {'id':'S03','role':'shopper','look':2,'plan':Plan(0,door,[('go',[*ENTRY,(-2.3,2.4),(-.5,1.9),(.3,.2),(.75,-.9)]),
        ('do','picking',3,RIGHT),('do','browsing',3,RIGHT),('go',[(.3,.4),(-.15,1.9),(-.15,2.7)]),
        ('do','checkout',5,FRONT),('go',WAY_OUT)])},
     {'id':'S04','role':'shopper','look':3,'plan':Plan(3,door,[('go',[*ENTRY,(-1.9,2.55),(1.6,2.3),(3.1,1.2),(2.85,-.6)],1.1),
        ('do','browsing',2.5,LEFT),('do','picking',3,LEFT),('do','browsing',1.5,LEFT),
        ('go',[(3.2,1.4),(1.5,1.95),(-.15,2.1),(-.15,2.7)],1.1),('do','checkout',5,FRONT),('go',WAY_OUT,1.1)],speed=1.1)},
     {'id':'S05','role':'shopper','look':4,'plan':Plan(12,door,[('go',[*ENTRY,(-3.1,2.4),(-2.85,-1.6)],1.05),
        ('do','browsing',3,RIGHT),('do','picking',3,RIGHT),('do','browsing',4,RIGHT),
        ('go',[(-3.2,1.9),(-1.4,2.6),(-.15,2.7)],1.05),('do','checkout',5,FRONT),('go',WAY_OUT,1.05)],speed=1.05)},
     {'id':'S06','role':'shopper','look':5,'plan':Plan(20,door,[('go',[*ENTRY,(-2.2,2.45),(-.9,1.8),(-.75,-1.9)],.95),
        ('do','browsing',4,LEFT),('do','picking',3,LEFT),('do','browsing',60,LEFT)],speed=.95,leave=False)},
     {'id':'C01','role':'staff','look':6,'label':'CASHIER','plan':Plan(0,(.3,4.5),[('do','standing',600,BACK)],leave=False)},
     {'id':'G01','role':'staff','look':7,'label':'GUARD','plan':Plan(0,(2.6,4.4),[('do','standing',sent+.8,BACK),
        ('go',[(3.75,4.15)],1.4),('do','standing',max(.2,met-sent-2.2),1.86),('do','talking',600,1.86)],leave=False)},
    ]
    return cast,sent


# ---------------------------------------------------------------- Smart Lighting: aisle-to-aisle journey
STOP_DURATION_MS = 1000     # how long the customer pauses at a shelf in each aisle; change this one value
JOURNEY_SPEED = 1.25        # walking speed in metres per second, constant between the stops

def lighting_journey():
    """One customer walks through all three aisles without doubling back more than once:
    in at the entrance, down A1, along the back wall, up A2, across the front, into A3 and out at the exit.
    He is already in his first step at time zero, so the scene starts moving the moment it is played."""
    stop=STOP_DURATION_MS/1000
    return Plan(-.4,(-2.9,5.7),[
        ('go',[(-2.9,4.4),(-3.5,2.6),(-3.95,-.3)]),('do','browsing',stop,LEFT),
        ('go',[(-3.5,-2.6),(-3.5,-4.15),(0,-4.15),(0,-2.6),(.45,-.3)]),('do','browsing',stop,RIGHT),
        ('go',[(0,1.3),(.7,2.1),(2.8,2.1),(3.5,1.3),(3.05,-.3)]),('do','browsing',stop,LEFT),
        ('go',[(3.5,1.5),(4.7,3.3),(5.15,4.6),(5.15,6.0)])],speed=JOURNEY_SPEED)


class DemoEngine:
    SCENARIOS = {'normal', 'concealment', 'empty', 'still', 'fault', 'lighting', 'aisle_a1', 'aisle_a2', 'aisle_a3', 'demo'}
    SPEEDS = (.5, 1, 2, 4)

    def __init__(self, store: EventStore):
        self.store = store
        self.lock = threading.RLock()
        self.mode = 'simulation'
        self.settings = {'empty_delay':5., 'dim_level':30., 'watts_per_zone':60., 'overhead_watts':15.}
        self.video = {'status':'idle', 'message':'Choose a video to begin.', 'progress':0, 'fps':0,
                      'people':0, 'frame_url':None, 'name':None, 'rule':'occupancy'}
        self.speed=1.
        self.reset()

    def reset(self):
        self.session_id=uuid.uuid4().hex[:10]
        self.elapsed=0.
        self.running=False
        self.scenario='empty'
        self.actors=[]
        self.stage='Ready for a scenario'
        self.healthy=True
        self.trace=[]
        self.emitted=set()
        self.active_event=None
        self.risk=0
        self.journey=None
        self.cast=[]
        self.linger_from=self.talk_from=None
        self.zones=[LightingZone('A1','Produce aisle'), LightingZone('A2','Everyday essentials'), LightingZone('A3','Household aisle')]

    def start(self, scenario):
        if scenario not in self.SCENARIOS:
            raise ValueError('Unknown scenario')
        with self.lock:
            self.reset()
            self.mode='simulation'
            self.scenario=scenario
            self.running=True
            self.stage='Scenario started'
            self.trace=[{'time':0, 'text':'Scripted scene started; no AI inference.'}]
            if scenario=='demo':self.cast,self.guard_sent=demo_cast()
            if scenario=='lighting':self.journey=lighting_journey()
            if scenario in ('lighting','demo') or scenario.startswith('aisle_'):
                # Begin after an explicitly preconditioned empty-store period.
                for zone in self.zones:
                    zone.level=zone.target=self.settings['dim_level']
                    zone.empty_since=-self.settings['empty_delay']
                    zone.state='Dimmed'
                self.trace.append({'time':0,'text':'Lighting demonstration starts with empty aisles already dimmed.'})
            # The first reply already contains the customer, so the view can draw him without waiting for a poll.
            if scenario=='lighting':self.update(0)

    def enter_video(self):
        with self.lock:
            self.reset()
            self.mode='video'
            self.running=True
            self.healthy=False
            self.stage='Loading recorded video'

    def mark(self, key, text):
        if key not in self.emitted:
            self.emitted.add(key)
            self.trace.append({'time':round(self.elapsed,1),'text':text})

    def update(self, dt):
        with self.lock:
            if not self.running:
                return
            self.elapsed += dt
            t=self.elapsed
            if self.mode=='simulation':
                self.healthy=not (self.scenario=='fault' and t>=4)
                self.actors=[]
                counts=[0,0,0]
                if self.scenario in ('normal','concealment'):
                    path=[(0,-2.9,6),(1.1,-2.9,4.4),(2.6,-3.6,2.4),(4,-4.15,.5),(10,-4.15,.5),(13,-3.4,2.2),
                          (17,-.15,2.7),(21,-.15,2.7),(22.5,1.9,2.75),(24.8,4.9,4.2),(26,5.15,5.9)]
                    if self.scenario=='concealment':
                        path=[(0,-2.9,6),(1.1,-2.9,4.4),(2.6,-3.6,2.4),(4,-4.15,.5),(10,-4.15,.5),(11.4,-3.5,1.9),
                              (15.6,2.6,1.9),(17.6,4.6,3.6),(19,5.15,5.7)]
                    end=26 if self.scenario=='normal' else 19
                    x,z=glide(t,path)
                    if t<end:
                        zone=aisle_of(x,z)
                        if zone is not None:counts[zone]=1
                        action='walking'
                        if 4<=t<7: action='picking'
                        elif 7<=t<10: action='bagging' if self.scenario=='concealment' else 'browsing'
                        elif self.scenario=='normal' and 17<=t<21: action='checkout'
                        concealing=self.scenario=='concealment'
                        actor={'id':'S01','x':x,'z':z,'action':action,'item':5<=t<7 or (self.scenario=='normal' and 5<=t<21),
                               'bagged':concealing and t>=8,'risk':(3 if t>=14 else 2 if t>=8 else 0) if concealing else 0}
                        if 4<=t<10:actor['heading']=LEFT
                        elif action=='checkout':actor['heading']=FRONT
                        self.actors=[actor]
                    self.stage='Shopper enters the store' if t<4 else 'Item picked from shelf' if t<7 else 'Item placed in bag' if self.scenario=='concealment' and t<10 else 'Shopper browsing' if t<13 else 'Approaching exit' if self.scenario=='concealment' else 'Heading to checkout' if t<17 else 'Checkout interaction' if t<21 else 'Shopper leaves'
                    if t>=5:self.mark('pick','Shopper picks an item (scripted action).')
                    if self.scenario=='concealment':
                        if t>=8 and not self.active_event:
                            self.mark('bag','Item placed inside bag (scripted action).')
                            self.active_event=self.store.create(source='simulation',title='Possible concealment · scenario',level=2,
                                zone='A1',reason='Scripted shelf-to-bag sequence. Floor staff offer assistance.',session_id=self.session_id,evidence=self.trace)
                        if t>=14 and 'exit' not in self.emitted:
                            self.mark('exit','Approaches exit without a checkout stop in this scenario; payment is not inferred from real video.')
                            self.store.upgrade(self.active_event,3,'Scripted bagging followed by exit approach. A guard reviews the sequence.',self.trace)
                            self.zones[0].hold_until=t+300
                            self.zones[2].hold_until=t+300
                    elif t>=18:
                        self.mark('checkout','Shopper stops at checkout (scripted normal scene). No alert raised.')
                    if t>=end:
                        self.stage='Scene complete · observe lighting response'
                        self.mark('complete','Shopper leaves; empty-aisle countdown begins.')
                elif self.scenario=='lighting' or self.scenario.startswith('aisle_'):
                    if self.scenario=='lighting':
                        pose=self.journey.sample(t)
                        if pose:self.actors=[{'id':'S01',**pose}]
                    else:
                        index=int(self.scenario[-1])-1
                        self.actors=[{'id':'S01','x':[-3.5,0,3.5][index],'z':0,'action':'standing','item':False,'bagged':False}]
                    for actor in self.actors:
                        # Authored camera-zone occupancy: only the aisle containing the shopper.
                        zone=aisle_of(actor['x'],actor['z'])
                        if zone is not None:counts[zone]=1
                    occupied=next((i for i,c in enumerate(counts) if c),None)
                    self.stage=f'Camera {occupied+1:02d}: one shopper in A{occupied+1} → brighten only this aisle' if occupied is not None else 'No shopper inside an aisle → empty aisles remain dim or finish their delay'
                    # The run ends once the last aisle has finished its empty delay and faded down.
                    if self.scenario=='lighting' and t>=self.journey.end+self.settings['empty_delay']+3:
                        self.running=False
                        self.stage='Lighting journey complete · all three aisles empty and dimmed'
                elif self.scenario=='demo':
                    self._demo(t,counts)
                elif self.scenario=='still':
                    self.actors=[{'id':'S01','x':0,'z':0,'action':'standing','item':False,'bagged':False}]
                    counts[1]=1
                    self.stage='Stationary shopper · lights stay bright'
                elif self.scenario=='fault':
                    self.stage='Input unavailable · fail-safe brightness' if not self.healthy else 'Disconnecting input in a moment'
                else:
                    self.stage='Empty store · wait for the dimming countdown'
                for zone,count in zip(self.zones,counts):zone.count=count
            else:
                # A stalled worker is never treated as an empty aisle.
                if time.monotonic()-getattr(self,'last_video_observation',0)>3:
                    self.healthy=False
                self.actors=[]
            for zone in self.zones:
                zone.update(t,dt,healthy=self.healthy,delay=self.settings['empty_delay'],
                            dim=self.settings['dim_level'],watts=self.settings['watts_per_zone'],
                            comfort=max(self.settings['dim_level'],80) if self.mode=='simulation' and self.scenario=='demo' else 100)

    def _demo(self, t, counts):
        """One-click demonstration: ordinary shoppers beside one scripted concealment sequence."""
        suspect=guard=None
        for spec in self.cast:
            pose=spec['plan'].sample(t)
            if pose is None:continue
            actor={'id':spec['id'],'role':spec['role'],'look':spec['look'],'risk':0,**pose}
            if 'label' in spec:actor['label']=spec['label']
            if spec['role']!='staff':
                zone=aisle_of(actor['x'],actor['z'])
                if zone is not None:counts[zone]+=1
            if spec['id']==SUSPECT:suspect=actor
            elif spec['id']=='G01':guard=actor
            self.actors.append(actor)
        if suspect:
            still=suspect['action']!='walking'
            if not still:self.linger_from=None
            elif self.linger_from is None:self.linger_from=t
            zone=aisle_of(suspect['x'],suspect['z'])
            name=f'A{zone+1}' if zone is not None else 'Front of store'
            if self.risk<1 and still and suspect['action']=='looking' and t-self.linger_from>=5:
                self.risk=1
                self.mark('linger',f'{SUSPECT} lingers at one shelf in {name} and keeps looking around: Level 1, low risk. Aisle light boosted for clearer footage.')
                self.active_event=self.store.create(source='simulation',title='Lingering near shelf · demo scenario',level=1,zone=name,
                    reason='Scripted shopper stays at one shelf and repeatedly looks around. Cameras keep watching; nobody is disturbed.',
                    session_id=self.session_id,evidence=self.trace)
            if suspect['item']:self.mark('pick','Shopper picks an item (scripted action).')
            if self.risk==1 and suspect['bagged']:
                self.risk=2
                self.mark('bag','Item placed inside bag (scripted action): Level 2, medium risk. Alert with clip sent to floor staff.')
                self.store.upgrade(self.active_event,2,'Scripted shelf-to-bag sequence after lingering. Floor staff are asked to offer assistance.',
                                   self.trace,'Possible concealment · demo scenario')
            if self.risk==2 and t>=self.guard_sent:
                self.risk=3
                self.mark('exit','Approaches exit without a checkout stop: Level 3, high risk. Alert sent to the guard.')
                self.store.upgrade(self.active_event,3,'Scripted concealment followed by an exit approach with no checkout stop. A guard reviews the sequence and decides what to do.',self.trace)
            if self.risk==3 and guard:
                if guard['action']=='walking':self.mark('guard','Guard acknowledges the alert and walks to the exit.')
                elif guard['action']=='talking' and 'talk' not in self.emitted:
                    self.mark('talk','Guard speaks with the shopper at the exit. A person makes the decision, not the system.')
                    self.store.upgrade(self.active_event,3,'Scripted concealment followed by an exit approach with no checkout stop. The guard has met the shopper; staff record the decision.',self.trace)
            suspect['risk']=self.risk
            if self.risk and zone is not None:
                self.zones[zone].hold_label='Evidence boost'
                self.zones[zone].hold_until=t+1.5
        marks=self.emitted
        self.stage=('Guard speaks with the shopper · staff decide what happens next' if 'talk' in marks else
                    'HIGH risk · guard alerted and walking to the exit' if 'exit' in marks else
                    'MEDIUM risk · item concealed in bag · alert sent to floor staff' if 'bag' in marks else
                    'LOW risk · shopper picks an item while being watched' if 'pick' in marks and self.risk else
                    'LOW risk · lingering and looking around · aisle light boosted' if 'linger' in marks else
                    'Shoppers enter · aisles brighten only where people are')
        if 'talk' in marks:
            if self.talk_from is None:self.talk_from=t
            if t-self.talk_from>=18.5:
                self.running=False
                self.stage='Demo complete · open the alert to record the staff decision'

    def observe_video(self, count, frame_url, **stats):
        with self.lock:
            if self.mode!='video':return
            self.last_video_observation=time.monotonic()
            self.healthy=True
            # The demo has one calibrated video zone. The other zones are not inferred.
            self.zones[0].count=count
            self.video.update(people=count,frame_url=frame_url,**stats)
            self.stage='Recorded video · local pose inference'

    def override(self, zone_id, level):
        with self.lock:
            zone=next((z for z in self.zones if z.id==zone_id),None)
            if zone is None:raise KeyError(zone_id)
            zone.override=level
            zone.override_until=self.elapsed+60 if level is not None else 0
            zone.empty_since=None

    def snapshot(self):
        with self.lock:
            zones=self.zones if self.mode=='simulation' else self.zones[:1]
            baseline=sum(z.baseline_wh for z in zones)
            used=sum(z.used_wh for z in zones)
            overhead=self.settings['overhead_watts']*self.elapsed/3600
            return {'mode':self.mode,'scenario':self.scenario,'session_id':self.session_id,'running':self.running,
                    'elapsed':round(self.elapsed,2),'stage':self.stage,'healthy':self.healthy,'speed':self.speed,'risk':self.risk,
                    'actors':self.actors,'zones':[z.as_dict() for z in zones],'trace':self.trace,
                    'settings':self.settings.copy(),'video':self.video.copy(),
                    'energy':{'baseline_wh':baseline,'used_wh':used,'saved_wh':baseline-used,
                              'overhead_wh':overhead,'net_saved_wh':baseline-used-overhead,
                              'saving_percent':100*(baseline-used)/baseline if baseline else 0,
                              'basis':'Illustrative linear power model; not meter readings.'}}
