from contextlib import asynccontextmanager
from pathlib import Path
import asyncio
import os
import time
import uuid
from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from .core import DemoEngine, EventStore
from .vision import VideoWorker

ROOT=Path(__file__).resolve().parent.parent
DATA=Path(os.environ.get('AISLESENSE_DATA',ROOT/'data'))
DATA.mkdir(exist_ok=True,parents=True)
for folder in ('clips','sources'):(DATA/folder).mkdir(exist_ok=True)
store=EventStore(DATA/'events.sqlite3')
engine=DemoEngine(store)
worker=VideoWorker(ROOT,engine,store,DATA)

@asynccontextmanager
async def lifespan(app):
    async def tick():
        last=time.monotonic()
        while True:
            await asyncio.sleep(.1)
            now=time.monotonic();engine.update(min(now-last,1));last=now
    job=asyncio.create_task(tick())
    yield
    job.cancel()
    await asyncio.to_thread(worker.stop)

app=FastAPI(title='AisleSense local demo',lifespan=lifespan)

class ScenarioRequest(BaseModel):
    scenario:str
class ReviewRequest(BaseModel):
    decision:str
    note:str=Field(default='',max_length=1000)
class OverrideRequest(BaseModel):
    level:float|None=Field(default=None,ge=30,le=100)
class SettingsRequest(BaseModel):
    empty_delay:float=Field(default=5,ge=1,le=120)
    dim_level:float=Field(default=30,ge=30,le=100)
    watts_per_zone:float=Field(default=60,gt=0,le=1000)
    overhead_watts:float=Field(default=15,ge=0,le=1000)
class VideoRequest(BaseModel):
    filename:str
    rule:str='occupancy'
    shelf:list[float]=Field(default=[.05,.1,.4,.8],min_length=4,max_length=4)
    bag:list[float]=Field(default=[.55,.35,.95,.95],min_length=4,max_length=4)
    zone:list[float]=Field(default=[.35,.1,.8,1.],min_length=4,max_length=4)

@app.get('/api/state')
def state():return engine.snapshot()

@app.get('/api/health')
def health():return {'app':'AisleSense','status':'ok','version':'0.1.0','model_cached':(ROOT/'models'/'pose_landmarker_lite.task').exists()}

@app.post('/api/scenario')
async def scenario(payload:ScenarioRequest):
    if payload.scenario not in engine.SCENARIOS:raise HTTPException(400,'Unknown scenario')
    await asyncio.to_thread(worker.stop)
    engine.start(payload.scenario)
    return engine.snapshot()

@app.post('/api/reset')
async def reset():
    await asyncio.to_thread(worker.stop)
    with engine.lock:engine.reset();engine.mode='simulation'
    return engine.snapshot()

@app.post('/api/pause')
def pause():
    if engine.mode=='video':raise HTTPException(400,'Use Stop for recorded video.')
    with engine.lock:engine.running=not engine.running
    return engine.snapshot()

@app.get('/api/events')
def events():return store.list()

@app.post('/api/events/{event_id}/decision')
def decision(event_id:str,payload:ReviewRequest):
    try:store.decide(event_id,payload.decision,payload.note)
    except ValueError as e:raise HTTPException(400,str(e))
    except KeyError:raise HTTPException(404,'Event not found')
    return {'ok':True}

@app.post('/api/light-zones/{zone_id}/override')
def override(zone_id:str,payload:OverrideRequest):
    try:engine.override(zone_id,payload.level)
    except KeyError:raise HTTPException(404,'Zone not found')
    return engine.snapshot()

@app.put('/api/settings')
async def settings(payload:SettingsRequest):
    await asyncio.to_thread(worker.stop)
    with engine.lock:
        # New assumptions begin a new energy comparison, not a mixed retrospective counter.
        engine.settings=payload.model_dump()
        engine.reset()
        engine.mode='simulation'
    return engine.snapshot()

@app.get('/api/videos')
def videos():
    return [{'filename':p.name,'bytes':p.stat().st_size,'source':'Kampus Production / Pexels' if p.name.startswith('normal-shopping') else 'Local upload'}
            for p in (DATA/'sources').iterdir() if p.suffix.lower() in ('.mp4','.mov','.avi','.mkv') and 'original' not in p.name]

@app.post('/api/videos/upload')
async def upload(file:UploadFile):
    if not file.filename or not file.filename.lower().endswith(('.mp4','.mov','.avi','.mkv')):
        raise HTTPException(400,'Choose an MP4, MOV, AVI or MKV video.')
    suffix=Path(file.filename).suffix.lower()
    path=DATA/'sources'/f'upload-{uuid.uuid4().hex[:8]}{suffix}'
    total=0
    try:
        with path.open('wb') as out:
            while chunk:=await file.read(1024*1024):
                total+=len(chunk)
                if total>100*1024*1024:raise HTTPException(413,'Video limit is 100 MB.')
                out.write(chunk)
    except Exception:
        path.unlink(missing_ok=True);raise
    finally:await file.close()
    return {'filename':path.name}

@app.post('/api/video/start')
async def video_start(payload:VideoRequest):
    if payload.rule not in ('occupancy','zone_entry','shelf_bag'):raise HTTPException(400,'Unknown rule')
    if Path(payload.filename).name!=payload.filename:raise HTTPException(400,'Invalid filename')
    base=(DATA/'sources').resolve();path=(base/payload.filename).resolve()
    if path.parent!=base or not path.is_file():raise HTTPException(404,'Video not found')
    regions={}
    for key in ('shelf','bag','zone'):
        r=getattr(payload,key)
        if not all(0<=v<=1 for v in r) or r[0]>=r[2] or r[1]>=r[3]:raise HTTPException(400,'Regions must be ordered coordinates between 0 and 1.')
        regions[key]=tuple(r)
    await asyncio.to_thread(worker.start,path,payload.rule,regions)
    return engine.snapshot()

@app.post('/api/video/stop')
async def video_stop():
    await asyncio.to_thread(worker.stop)
    with engine.lock:
        engine.healthy=False;engine.running=False
        for zone in engine.zones:zone.update(engine.elapsed,0,healthy=False)
    return engine.snapshot()

@app.get('/api/video/frame')
def frame():
    with worker.frame_lock:data=worker.latest_jpeg
    if data is None:return Response(status_code=204)
    return Response(data,media_type='image/jpeg',headers={'Cache-Control':'no-store'})

@app.get('/api/evidence')
def evidence():
    import json
    p=DATA/'last_video_run.json'
    return {'video_benchmark':json.loads(p.read_text()) if p.exists() else None,
            'feedback':'Judges asked for a working system or evidence of the idea.',
            'implemented':['Interactive 3D scenario controls','Persistent human review','Shared occupancy/lighting state','Planned circuit illustration','Assumption-based energy comparison'],
            'not_claimed':['Validated concealment accuracy','Payment verification','Measured energy savings','Physical circuit testing','Production privacy or access controls']}

app.mount('/media/clips',StaticFiles(directory=DATA/'clips'),name='clips')
if (ROOT/'dist').exists():app.mount('/',StaticFiles(directory=ROOT/'dist',html=True),name='frontend')
