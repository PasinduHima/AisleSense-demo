import pytest
from backend.core import DemoEngine, EventStore

def advance(engine, seconds):
    for _ in range(round(seconds*10)): engine.update(.1)

@pytest.mark.parametrize('aisle',[1,2,3])
def test_one_customer_brightens_only_their_aisle(tmp_path,aisle):
    e=DemoEngine(EventStore(tmp_path/'events.sqlite3'));e.start(f'aisle_a{aisle}')
    advance(e,1)
    assert [z.count for z in e.zones]==[int(i==aisle-1) for i in range(3)]
    assert [z.level for z in e.zones]==[100 if i==aisle-1 else 30 for i in range(3)]
    advance(e,20) # stationary presence must not dim the occupied aisle
    assert e.zones[aisle-1].level==100
    assert e.store.list()==[]

def test_camera_zone_journey_leaves_other_aisles_dim(tmp_path):
    from backend.core import STOP_DURATION_MS, JOURNEY_SPEED, aisle_of
    e=DemoEngine(EventStore(tmp_path/'events.sqlite3'));e.start('lighting')
    # The customer is in the very first reply and already walking.
    assert e.actors and e.actors[0]['action']=='walking'
    assert [z.level for z in e.zones]==[30,30,30]
    visited=[];stops={};previous=None;last_seen={}
    while e.running and e.elapsed<90:
        e.update(.05);t=e.elapsed
        if not e.actors:previous=None;continue
        a=e.actors[0];zone=aisle_of(a['x'],a['z'])
        # Never inside shelving or the checkout counter.
        assert not any(abs(a['x']-c)<.5 and -3.72<a['z']<1.42 for c in (-5.2,-1.8,1.8,5.2))
        assert not (-.95<a['x']<1.45 and 3<a['z']<4)
        if zone is not None:
            if not visited or visited[-1]!=zone:visited.append(zone)
            last_seen[zone]=t
            # The occupied aisle is fully lit at once; the lights never make him wait.
            assert e.zones[zone].level==100
        for i,z in enumerate(e.zones):
            if i!=zone and t-last_seen.get(i,-99)>e.settings['empty_delay']+2.2:assert z.level==30,(t,i,z.level)
        if a['action']!='walking':stops[zone]=stops.get(zone,0)+.05
        elif previous:
            # Constant pace: never faster than the walking speed, and no freezes while walking.
            step=((a['x']-previous[0])**2+(a['z']-previous[1])**2)**.5
            assert step<=JOURNEY_SPEED*.05+.01
        previous=(a['x'],a['z']) if a['action']=='walking' else None
    assert visited==[0,1,2]
    assert sorted(stops)==[0,1,2] and all(abs(d-STOP_DURATION_MS/1000)<.11 for d in stops.values())
    assert not e.running and e.elapsed<45 and e.actors==[]
    assert all(z.level==30 and z.count==0 for z in e.zones) and e.store.list()==[]

def test_journey_replay_restarts_cleanly(tmp_path):
    e=DemoEngine(EventStore(tmp_path/'events.sqlite3'));e.start('lighting');advance(e,9);first=e.session_id
    e.start('lighting')
    assert e.session_id!=first and e.elapsed==0 and len(e.actors)==1
    assert [z.level for z in e.zones]==[30,30,30] and e.actors[0]['z']>5
