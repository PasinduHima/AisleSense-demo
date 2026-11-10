"""Route checks use their own database; never change the presenter's review history."""
import importlib
import sys
import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv('AISLESENSE_DATA',str(tmp_path))
    sys.modules.pop('backend.app',None)
    module=importlib.import_module('backend.app')
    with TestClient(module.app) as c:
        yield c,module


def test_invalid_inputs_do_not_start_worker(client):
    c,m=client
    assert c.post('/api/scenario',json={'scenario':'not-a-scene'}).status_code==400
    assert c.post('/api/video/start',json={'filename':'../outside.mp4'}).status_code==400
    assert c.post('/api/light-zones/A1/override',json={'level':0}).status_code==422
    assert m.worker.thread is None


def test_settings_reset_session_without_erasing_reviews(client):
    c,m=client
    c.post('/api/scenario',json={'scenario':'concealment'})
    m.engine.update(15)
    event=c.get('/api/events').json()[0]
    assert c.post(f"/api/events/{event['id']}/decision",json={'decision':'need_more','note':'QA fixture'}).status_code==200
    old=m.engine.session_id
    result=c.put('/api/settings',json={'empty_delay':8,'dim_level':40,'watts_per_zone':50,'overhead_watts':10})
    state=result.json()
    assert state['session_id']!=old and state['elapsed']==0
    assert state['settings']['dim_level']==40
    assert c.get('/api/events').json()[0]['decisions'][0]['note']=='QA fixture'
    assert c.post(f"/api/events/{event['id']}/decision",json={'decision':'invalid'}).status_code==400


def test_video_stop_immediately_restores_safe_light(client):
    c,m=client
    m.engine.enter_video();m.engine.zones[0].level=30
    s=c.post('/api/video/stop').json()
    assert s['zones'][0]['level']==100
    assert s['zones'][0]['state']=='Input unavailable'
    assert not s['running'] and not s['healthy']


def test_upload_is_local_and_invalid_region_is_rejected(client):
    c,m=client
    assert c.post('/api/videos/upload',files={'file':('no.txt',b'not video')}).status_code==400
    # A dummy MP4 tests storage/validation only; it is never decoded as evidence.
    uploaded=c.post('/api/videos/upload',files={'file':('example.mp4',b'fixture')}).json()['filename']
    assert (m.DATA/'sources'/uploaded).read_bytes()==b'fixture'
    response=c.post('/api/video/start',json={'filename':uploaded,'zone':[.8,0,.2,1]})
    assert response.status_code==400 and m.worker.thread is None
