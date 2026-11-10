from backend.vision import ActionRule

def pose(hand=(.2,.3)):
    p=[(.5,.5,1.) for _ in range(33)];p[15]=(*hand,1.);return p

def test_explanation_tracks_real_zone_dwell_without_mutating():
    r=ActionRule('zone_entry');r.update(0,pose());r.update(.5,pose())
    a=r.explain(.5,pose());assert a['zone_dwell_s']==.5 and not a['observation_emitted']
    assert a['visible_landmarks']==33 and a['stage']=='Timing region entry'
    assert r.update(.8,pose()) is not None
    assert r.explain(.8,pose())['observation_emitted']

def test_explanation_resets_after_lost_observation():
    r=ActionRule('zone_entry');r.update(0,pose());r.update(1,[])
    a=r.explain(1,[]);assert a['zone_dwell_s']==0 and a['visible_landmarks']==0
    assert not a['body_observed']

def test_explanation_shows_same_wrist_order_and_window():
    r=ActionRule('shelf_bag');r.update(0,pose());r.update(.4,pose())
    a=r.explain(.4,pose());assert a['wrists'][0]['armed']
    assert a['wrists'][0]['shelf_dwell_s']==.4
    r.update(.6,pose((.7,.6)))
    assert r.update(1,pose((.7,.6))) is not None
    assert r.explain(1,pose((.7,.6)))['observation_emitted']
    assert not r.explain(5,pose())['observation_emitted']
