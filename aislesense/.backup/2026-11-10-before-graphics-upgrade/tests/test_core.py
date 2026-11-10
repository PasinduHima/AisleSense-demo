import pytest
from backend.core import LightingZone, EventStore, DemoEngine
from backend.vision import ActionRule

def step(engine,seconds):
    for _ in range(round(seconds*10)):engine.update(.1)

@pytest.fixture
def store(tmp_path):return EventStore(tmp_path/'events.sqlite3')

def test_empty_delay_and_immediate_entry():
    z=LightingZone('A1','Aisle')
    for i in range(51):z.update(i/10,.1)
    assert z.target==30
    for i in range(51,72):z.update(i/10,.1)
    assert z.level==30
    z.count=1;z.update(7.3,.1)
    assert z.level==100 and z.empty_since is None

def test_still_person_is_not_empty():
    z=LightingZone('A1','Aisle',count=1)
    for i in range(610):z.update(i/10,.1)
    assert z.level==100 and z.state=='Occupied'

def test_input_failure_overrides_manual_dim():
    z=LightingZone('A1','Aisle',level=30,override=30,override_until=100)
    z.update(10,.1,healthy=False)
    assert z.level==100 and z.state=='Input unavailable'

def test_review_hold_has_priority_and_expires():
    z=LightingZone('A1','Aisle',level=30,hold_until=20,override=30,override_until=100)
    z.update(10,.1);assert z.level==100 and z.state=='Review hold'
    z.update(21,2);assert z.level==30 and z.state=='Manual override'

def test_override_expiry_restarts_empty_timer():
    z=LightingZone('A1','Aisle',override=100,override_until=10)
    z.update(9,1);z.update(10,1)
    assert z.state=='Waiting to dim' and z.countdown==5

def test_energy_uses_time_not_frame_count():
    a=LightingZone('A1','Aisle',count=1);b=LightingZone('A1','Aisle',count=1)
    for t in range(360):a.update(t*10,10,watts=60)
    for t in range(3600):b.update(t,1,watts=60)
    assert a.used_wh==pytest.approx(60) and b.used_wh==pytest.approx(60)

def test_normal_scenario_has_no_security_alert(store):
    e=DemoEngine(store);e.start('normal');step(e,30)
    assert store.list()==[] and e.actors==[]

def test_concealment_one_event_upgrades_not_duplicates(store):
    e=DemoEngine(store);e.start('concealment');step(e,9)
    rows=store.list();assert len(rows)==1 and rows[0]['level']==2 and rows[0]['source']=='simulation'
    event_id=rows[0]['id'];step(e,12)
    rows=store.list();assert len(rows)==1 and rows[0]['id']==event_id and rows[0]['level']==3
    assert e.zones[0].state=='Review hold'

def test_review_decision_persists_and_preserves_audit(store):
    i=store.create(source='simulation',title='Test',level=2,zone='A1',reason='Test',session_id='test')
    store.decide(i,'need_more','Check context');store.decide(i,'false_alarm','Ordinary shopping')
    reopened=EventStore(store.path).list()[0]
    assert reopened['status']=='false_alarm' and len(reopened['decisions'])==2
    with pytest.raises(ValueError):store.decide(i,'thief')

def test_reset_clears_state_not_history(store):
    e=DemoEngine(store);e.start('concealment');step(e,15);old=e.session_id
    e.start('normal')
    assert e.session_id!=old and e.elapsed==0 and e.active_event is None
    assert len(store.list())==1 and all(z.hold_until==0 for z in e.zones)

def pose(x=.5,y=.5,hand=None):
    p=[(x,y,1.) for _ in range(33)]
    if hand:p[15]=(*hand,1.)
    return p

def test_zone_entry_debounced_and_single_per_entry():
    r=ActionRule('zone_entry')
    assert r.update(0,pose()) is None
    assert r.update(.5,pose()) is None
    assert r.update(.8,pose()) is not None
    assert r.update(1.2,pose()) is None
    r.update(2,pose(.1));r.update(3,pose());assert r.update(4,pose()) is not None

def test_missing_pose_cancels_partial_action():
    r=ActionRule('shelf_bag')
    r.update(0,pose(hand=(.2,.3)));r.update(.5,pose(hand=(.2,.3)))
    r.update(2,[]);r.update(2.2,pose(hand=(.7,.6)))
    assert r.update(2.7,pose(hand=(.7,.6))) is None


def test_low_visibility_torso_cancels_partial_action():
    r=ActionRule('shelf_bag')
    r.update(0,pose(hand=(.2,.3)));r.update(.5,pose(hand=(.2,.3)))
    hidden=[(x,y,.1) for x,y,_ in pose()]
    r.update(2,hidden);r.update(2.2,pose(hand=(.7,.6)))
    assert r.update(2.7,pose(hand=(.7,.6))) is None


def test_lost_wrist_cancels_sequence():
    r=ActionRule('shelf_bag')
    r.update(0,pose(hand=(.2,.3)));r.update(.5,pose(hand=(.2,.3)))
    p=pose();p[15]=(.5,.5,.1)
    r.update(.7,p);r.update(1,pose(hand=(.7,.6)))
    assert r.update(1.5,pose(hand=(.7,.6))) is None

def test_wrist_sequence_requires_order_and_dwell():
    r=ActionRule('shelf_bag')
    assert r.update(0,pose(hand=(.7,.6))) is None
    assert r.update(.5,pose(hand=(.7,.6))) is None
    r.update(1,pose(hand=(.2,.3)));r.update(1.5,pose(hand=(.2,.3)))
    assert r.update(2,pose(hand=(.7,.6))) is None
    assert r.update(2.5,pose(hand=(.7,.6))) is not None
    assert r.update(2.8,pose(hand=(.7,.6))) is None

def test_occupancy_rule_never_fabricates_security_events():
    r=ActionRule('occupancy')
    for i in range(50):assert r.update(i*.2,pose()) is None

def test_fault_scenario_reports_safe_state(store):
    e=DemoEngine(store);e.start('fault');step(e,10)
    assert not e.healthy and all(z.level==100 for z in e.zones)

def test_pause_does_not_advance_energy(store):
    e=DemoEngine(store);e.start('empty');step(e,10);e.running=False;a=e.snapshot()
    step(e,15);b=e.snapshot()
    assert a['energy']==b['energy'] and a['elapsed']==b['elapsed']
