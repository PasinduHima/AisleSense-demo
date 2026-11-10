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
    e=DemoEngine(EventStore(tmp_path/'events.sqlite3'));e.start('lighting')
    advance(e,3);assert all(z.level==30 and z.count==0 for z in e.zones)
    advance(e,7);assert [z.level for z in e.zones]==[100,30,30]
    advance(e,16);assert [z.level for z in e.zones]==[30,100,30]
    advance(e,15);assert [z.level for z in e.zones]==[30,30,100]
    advance(e,15);assert all(z.level==30 and z.count==0 for z in e.zones)
    assert not e.running and e.store.list()==[]
