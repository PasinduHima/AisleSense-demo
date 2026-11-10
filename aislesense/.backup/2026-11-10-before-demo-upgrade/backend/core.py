"""Deterministic demo rules. Simulation observations are never presented as AI results."""
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
import json
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

    def upgrade(self, event_id, level, reason, evidence):
        with self.connect() as db:
            db.execute('UPDATE events SET level=?, reason=?, evidence=? WHERE id=?',
                       (level, reason, json.dumps(evidence), event_id))

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

    def update(self, now, dt, *, healthy=True, delay=5, dim=30, watts=60):
        # Input health and review hold override manual dimming.
        if not healthy:
            self.target, self.state, self.empty_since = 100, 'Input unavailable', None
            self.countdown = 0
        elif now < self.hold_until:
            self.target, self.state, self.empty_since = 100, 'Review hold', None
            self.countdown = max(0, self.hold_until-now)
        elif self.override is not None and now < self.override_until:
            self.target, self.state = self.override, 'Manual override'
            self.empty_since = None
            self.countdown = max(0, self.override_until-now)
        else:
            self.override = None
            if self.count > 0:
                self.target, self.state, self.empty_since = 100, 'Occupied', None
                self.countdown = 0
            else:
                if self.empty_since is None:
                    self.empty_since = now
                self.countdown = max(0, delay-(now-self.empty_since))
                self.target = 100 if self.countdown > 0 else dim
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


class DemoEngine:
    SCENARIOS = {'normal', 'concealment', 'empty', 'still', 'fault', 'lighting', 'aisle_a1', 'aisle_a2', 'aisle_a3'}

    def __init__(self, store: EventStore):
        self.store = store
        self.lock = threading.RLock()
        self.mode = 'simulation'
        self.settings = {'empty_delay':5., 'dim_level':30., 'watts_per_zone':60., 'overhead_watts':15.}
        self.video = {'status':'idle', 'message':'Choose a video to begin.', 'progress':0, 'fps':0,
                      'people':0, 'frame_url':None, 'name':None, 'rule':'occupancy'}
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
            if scenario=='lighting' or scenario.startswith('aisle_'):
                # Begin after an explicitly preconditioned empty-store period.
                for zone in self.zones:
                    zone.level=zone.target=self.settings['dim_level']
                    zone.empty_since=-self.settings['empty_delay']
                    zone.state='Dimmed'
                self.trace.append({'time':0,'text':'Lighting demonstration starts with empty aisles already dimmed.'})

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
                    path=[(0,-5,4.8),(4,-3.7,-.4),(9,-3.7,-.4),(13,-3.7,2.5),
                          (17,0,3.4),(21,0,3.4),(25,5.5,4.8)]
                    if self.scenario=='concealment':
                        path=[(0,-5,4.8),(4,-3.7,-.4),(10,-3.7,-.4),(15,5,4.3),(19,6.2,5.3)]
                    end=25 if self.scenario=='normal' else 19
                    x,z=along(t,path)
                    if t<end:
                        if z<2.4:counts[0]=1
                        action='walking'
                        if 4<=t<7: action='picking'
                        elif 7<=t<10: action='bagging' if self.scenario=='concealment' else 'browsing'
                        elif self.scenario=='normal' and 17<=t<21: action='checkout'
                        self.actors=[{'id':'S01','x':x,'z':z,'action':action,'item':5<=t<7 or (self.scenario=='normal' and 5<=t<21),
                                      'bagged':self.scenario=='concealment' and t>=8}]
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
                        path=[(4,-3.5,4.4),(8,-3.5,0),(14,-3.5,0),(17,-3.5,3.1),
                              (20,0,3.1),(23,0,0),(29,0,0),(32,0,3.1),
                              (35,3.5,3.1),(38,3.5,0),(44,3.5,0),(48,3.5,4.7)]
                        x,z=along(t,path)
                        visible=4<=t<48
                        standing=8<=t<14 or 23<=t<29 or 38<=t<44
                    else:
                        index=int(self.scenario[-1])-1
                        x,z=[-3.5,0,3.5][index],0
                        visible,standing=True,True
                    if visible:
                        self.actors=[{'id':'S01','x':x,'z':z,'action':'standing' if standing else 'walking','item':False,'bagged':False}]
                        # Authored camera-zone occupancy: only the aisle containing the shopper.
                        if -4<=z<2.4:
                            index=0 if x<-1.75 else 2 if x>1.75 else 1
                            counts[index]=1
                    occupied=next((i for i,c in enumerate(counts) if c),None)
                    self.stage=f'Camera {occupied+1:02d}: one shopper in A{occupied+1} → brighten only this aisle' if occupied is not None else 'No shopper inside an aisle → empty aisles remain dim or finish their delay'
                    if self.scenario=='lighting' and t>=55:
                        self.running=False
                        self.stage='Lighting journey complete · all three aisles empty and dimmed'
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
                            dim=self.settings['dim_level'],watts=self.settings['watts_per_zone'])

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
                    'elapsed':round(self.elapsed,2),'stage':self.stage,'healthy':self.healthy,
                    'actors':self.actors,'zones':[z.as_dict() for z in zones],'trace':self.trace,
                    'settings':self.settings.copy(),'video':self.video.copy(),
                    'energy':{'baseline_wh':baseline,'used_wh':used,'saved_wh':baseline-used,
                              'overhead_wh':overhead,'net_saved_wh':baseline-used-overhead,
                              'saving_percent':100*(baseline-used)/baseline if baseline else 0,
                              'basis':'Illustrative linear power model; not meter readings.'}}
