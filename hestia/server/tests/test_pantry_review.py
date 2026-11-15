"""Real HTTP workflow on a throwaway DB; model replies stubbed, never accuracy claims."""
import json

import cv2
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.routes import pantry
from vision.pipeline import scan_mock
from vision.scene import check_shelf


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setattr('app.main.warmup', lambda: None)
    with TestClient(app) as client:
        client.post('/api/demo/scenario/demo-mars')
        yield client


def preview(client):
    response = client.post('/api/pantry/scan', params={'mode': 'mock', 'variant': 'after_removal', 'review': True})
    assert response.status_code == 200, response.text
    data = response.json()
    return data, {s['slot']: s['count'] for s in data['slots']}


def test_preview_never_changes_stock_and_save_is_explicit(client):
    before = client.get('/api/pantry').json()
    data, counts = preview(client)
    assert client.get('/api/pantry').json() == before
    assert client.get(f"/api/pantry/review/{data['proposal_id']}/image").status_code == 200
    url = f"/api/pantry/review/{data['proposal_id']}"
    assert client.post(url, json={'counts': counts}).status_code == 200
    assert int(client.get('/api/pantry').json()['autonomy_days']) == 398
    snapshot = client.get('/api/pantry').json()['snapshot_ts']
    assert client.post(url, json={'counts': counts}).status_code == 410
    assert client.get('/api/pantry').json()['snapshot_ts'] == snapshot


def test_discard_invalid_and_stale_proposals_do_not_write(client):
    before = client.get('/api/pantry').json()
    data, counts = preview(client)
    url = f"/api/pantry/review/{data['proposal_id']}"
    assert client.post(url, json={'counts': {**counts, 'A1': 999}}).status_code == 409
    assert client.post(url, json={'counts': {**counts, 'A1': True}}).status_code == 422
    assert client.get('/api/pantry').json() == before
    client.post('/api/pantry/confirm', json={'slot': 'A1', 'count': 1})
    changed = client.get('/api/pantry').json()
    assert client.post(url, json={'counts': counts}).status_code == 409
    assert client.get('/api/pantry').json() == changed
    assert client.delete(url).status_code == 200
    assert client.get(url + '/image').status_code == 410


def test_upload_uses_per_photo_frame_without_replacing_grid_or_inventory(client, monkeypatch):
    before = client.get('/api/pantry').json()
    seen = {}
    def scanner(**kwargs):
        seen.update(kwargs)
        result = scan_mock('full')
        result.image_path = kwargs['image_path']
        return result
    monkeypatch.setattr(pantry, 'run_scan', scanner)
    _, jpg = cv2.imencode('.jpg', np.full((200, 300, 3), 127, dtype=np.uint8))
    frame = {'left': .1, 'top': .2, 'right': .9, 'bottom': .8}
    response = client.post('/api/pantry/photo', data={'frame': json.dumps(frame)}, files={'file': ('p.jpg', jpg.tobytes(), 'image/jpeg')})
    assert response.status_code == 200, response.text
    assert seen['boxes']['A1'] == (.1, .2, .3, .4)
    assert client.get('/api/pantry').json() == before
    data = response.json()
    counts = {s['slot']: s['count'] for s in data['slots']}
    assert client.post(f"/api/pantry/review/{data['proposal_id']}", json={'counts': counts}).status_code == 200
    saved = client.get('/api/pantry').json()
    assert saved['boxes']['A1'] == [.1, .2, .3, .4]
    assert all(s['source'] == 'manual' for s in saved['slots'])


@pytest.mark.parametrize('answer', ['{"scene":"unrelated","description":"logo"}', '{"scene":"unclear"}', '[]', 'invalid'])
def test_scene_gate_abstains_on_unrelated_unclear_or_invalid_reply(monkeypatch, answer):
    monkeypatch.setattr('vision.scene.ollama_client.generate', lambda *a, **k: {'response': answer})
    with pytest.raises(ValueError, match='stock is unchanged'):
        check_shelf(np.zeros((20, 20, 3), dtype=np.uint8))


def test_rejected_image_does_not_replace_existing_stock(client, monkeypatch):
    before = client.get('/api/pantry').json()
    def reject(**kwargs):
        raise ValueError('This photo is not a food shelf')
    monkeypatch.setattr(pantry, 'run_scan', reject)
    response = client.post('/api/pantry/scan', params={'mode': 'image', 'image_path': 'vision/fixtures/shelf_full.png'})
    assert response.status_code == 400
    assert client.get('/api/pantry').json() == before



def test_partial_photo_preserves_unseen_counts_and_meals(client, monkeypatch):
    crew = client.get('/api/crew').json()[0]
    rice = next(s for s in client.get('/api/pantry').json()['slots'] if s['slot'] == 'B3')
    assert client.post(f"/api/crew/{crew['id']}/meal", json={'food_item_id': rice['food_item_id'], 'qty': 1}).status_code == 200
    before = client.get('/api/pantry').json()
    def scanner(**kwargs):
        result = scan_mock('full')
        result.image_path = kwargs['image_path']
        result.readings = {k: v for k, v in result.readings.items() if k in kwargs['boxes']}
        return result
    monkeypatch.setattr(pantry, 'run_scan', scanner)
    _, jpg = cv2.imencode('.jpg', np.full((200, 300, 3), 127, dtype=np.uint8))
    frame = {'left': .1, 'top': .1, 'right': .9, 'bottom': .9, 'rows': 1, 'columns': 2}
    response = client.post('/api/pantry/photo', data={'frame': json.dumps(frame)}, files={'file': ('p.jpg', jpg.tobytes(), 'image/jpeg')})
    data = response.json()
    assert set(data['boxes']) == {'A1', 'A2'}
    assert client.get('/api/pantry').json() == before
    counts = {s['slot']: s['count'] for s in data['slots']}
    assert client.post(f"/api/pantry/review/{data['proposal_id']}", json={'counts': counts}).status_code == 200
    after = client.get('/api/pantry').json()
    assert after['stock_kcal'] == before['stock_kcal']
    assert [s for s in after['slots'] if s['slot'] not in counts] == [s for s in before['slots'] if s['slot'] not in counts]


def test_dynamic_layout_prompts_and_row_crops_match_chosen_grid(monkeypatch):
    from vision import pipeline
    frame = pantry.GridFrameBody(left=.1, top=.1, right=.9, bottom=.9, rows=2, columns=2)
    boxes = pantry.boxes_from_frame(frame)
    items = {k: {'name': 'can'} for k in boxes}
    assert '2x2' in pipeline._prompt(list(boxes), items, True)
    calls = []
    def read(img, labels, slot_items, full, on_progress):
        calls.append(labels)
        return {label: 1 for label in labels}
    monkeypatch.setattr(pipeline, '_call', read)
    result = pipeline._read_rows(np.zeros((100, 100, 3), dtype=np.uint8), boxes, items, None)
    assert calls == [['A1', 'A2'], ['B1', 'B2']]
    assert set(result) == set(boxes)


def test_phone_link_uses_the_actual_preview_port(client):
    response = client.get('/api/station/info', headers={'host': '127.0.0.1:8011'})
    assert response.json()['port'] == 8011
    assert ':8011/crew/' in response.json()['crew_url']


def test_reassigning_a_slot_requires_a_new_count_and_invalidates_old_proposals(client):
    client.post('/api/pantry/confirm', json={'slot': 'A1', 'count': 3})
    proposal, counts = preview(client)
    # Reassign to a newly created food so we can check it is not proposed as a meal.
    food = client.post('/api/pantry/items', json={'name': 'New demo rice', 'kcal': 100}).json()
    response = client.put('/api/pantry/grid', json={'label': 'A1', 'food_item_id': food['id']})
    assert response.status_code == 200, response.text
    state = client.get('/api/pantry').json()
    slot = next(s for s in state['slots'] if s['slot'] == 'A1')
    assert slot['count'] is None
    assert slot['source'] == 'configuration_changed'
    assert slot['needs_confirmation'] is True
    assert slot['autonomy_days'] == 0
    from sqlmodel import Session
    from app.db import engine
    from app.engines.nutrition import available_items
    with Session(engine) as session:
        assert food['id'] not in [i.food_item_id for i in available_items(session)]
    assert client.post(f"/api/pantry/review/{proposal['proposal_id']}", json={'counts': counts}).status_code == 409
    assert client.post('/api/pantry/confirm', json={'slot': 'A1', 'count': 2}).status_code == 200
    confirmed = next(s for s in client.get('/api/pantry').json()['slots'] if s['slot'] == 'A1')
    assert confirmed['count'] == 2
    assert confirmed['needs_confirmation'] is False


def test_empty_stock_requires_confirmation_preserves_people_and_invalidates_preview(client):
    proposal, counts = preview(client)
    before = client.get('/api/pantry').json()
    people = client.get('/api/crew').json()
    catalogue = client.get('/api/pantry/items').json()
    grid = client.get('/api/pantry/grid').json()
    history = client.get('/api/pantry/consumption').json()
    readings = client.get(f"/api/crew/{people[0]['id']}/latest").json()
    assert client.post('/api/pantry/empty', json={'confirmed': False}).status_code == 400
    assert client.get('/api/pantry').json() == before
    assert client.post('/api/pantry/empty', json={'confirmed': True}).status_code == 200
    after = client.get('/api/pantry').json()
    assert all(s['count'] == 0 for s in after['slots'])
    assert after['stock_kcal'] == 0
    assert after['has_photo'] is False
    assert client.get('/api/pantry/snapshot-image').status_code == 404
    assert client.get('/api/crew').json() == people
    assert client.get('/api/pantry/items').json() == catalogue
    assert client.get('/api/pantry/grid').json() == grid
    assert client.get('/api/pantry/consumption').json() == history
    assert client.get(f"/api/crew/{people[0]['id']}/latest").json() == readings
    assert client.post(f"/api/pantry/review/{proposal['proposal_id']}", json={'counts': counts}).status_code == 409


def test_whole_reserve_replacement_does_not_count_moved_rice_and_water_twice(client, monkeypatch):
    original = client.get('/api/pantry').json()['slots']
    rice = next(s['food_item_id'] for s in original if s['slot'] == 'B3')
    water = next(s['food_item_id'] for s in original if s['slot'] == 'C3')
    client.put('/api/pantry/grid', json={'label': 'A1', 'food_item_id': rice})
    client.put('/api/pantry/grid', json={'label': 'B1', 'food_item_id': water})
    def scanner(**kwargs):
        result = scan_mock('full')
        result.image_path = kwargs['image_path']
        result.readings = {k: v for k, v in result.readings.items() if k in kwargs['boxes']}
        return result
    monkeypatch.setattr(pantry, 'run_scan', scanner)
    _, jpg = cv2.imencode('.jpg', np.full((200, 300, 3), 127, dtype=np.uint8))
    frame = {'left': .1, 'top': .1, 'right': .9, 'bottom': .9, 'rows': 2, 'columns': 1}
    response = client.post('/api/pantry/photo', data={'frame': json.dumps(frame)}, files={'file': ('p.jpg', jpg.tobytes(), 'image/jpeg')})
    assert response.status_code == 200, response.text
    data = response.json()
    assert client.post(f"/api/pantry/review/{data['proposal_id']}", json={'counts': {'A1': 3, 'B1': 3}, 'replace_stock': True}).status_code == 200
    after = client.get('/api/pantry').json()
    assert sum(s['count'] or 0 for s in after['slots']) == 6
    assert all(s['count'] == 0 for s in after['slots'] if s['slot'] not in {'A1','B1'})
    items = client.get('/api/pantry/items').json()
    rice_food = next(f for f in items if f['id'] == rice)
    water_food = next(f for f in items if f['id'] == water)
    assert after['stock_kcal'] == pytest.approx(3 * (rice_food['kcal'] * rice_food['units_per_lot'] + water_food['kcal'] * water_food['units_per_lot']))


def test_frame_minimum_tolerates_browser_float_rounding():
    frame = pantry.GridFrameBody(left=.6000000000000001, top=.6, right=.8, bottom=.8, rows=1, columns=1)
    assert pantry.boxes_from_frame(frame) == {'A1': (.6,.6,.8,.8)}


def test_counted_packages_and_editable_scale_are_separate(client):
    foods = client.get('/api/pantry/items').json()
    bean = next(f for f in foods if f['name'] == 'Bean can')
    water = next(f for f in foods if f['name'] == 'Water pouch')
    client.post('/api/pantry/empty', json={'confirmed': True})
    for label, food, count in [('A1', bean, 3), ('A2', water, 2)]:
        client.put('/api/pantry/grid', json={'label': label, 'food_item_id': food['id']})
        assert client.post('/api/pantry/confirm', json={'slot': label, 'count': count}).status_code == 200
    before = client.get('/api/pantry').json()
    assert before['counted_package_kcal'] == 750 and before['stock_kcal'] == 159000
    assert client.put('/api/pantry/scale', json={'multiplier': 1}).status_code == 200
    after = client.get('/api/pantry').json()
    assert after['counted_package_kcal'] == after['stock_kcal'] == 750
    assert after['units_per_lot'] == 1 and after['default_units_per_lot'] == 212
    assert [s['count'] for s in after['slots']] == [s['count'] for s in before['slots']]
    for invalid in (0, -1, 10001, 1.5, True):
        assert client.put('/api/pantry/scale', json={'multiplier': invalid}).status_code == 422
    assert client.get('/api/pantry').json() == after
    assert client.post('/api/pantry/items', json={'name': 'New label', 'kcal': 200}).json()['units_per_lot'] == 1


def test_product_edits_preserve_counts_and_reject_stale_proposals(client):
    proposal, counts = preview(client)
    before = client.get('/api/pantry').json()
    bean = next(f for f in client.get('/api/pantry/items').json() if f['name'] == 'Bean can')
    fields = {'name': 'Beans from my label', 'kcal': 400, 'protein_g': 20, 'carbs_g': 65, 'fat_g': 5}
    url = f"/api/pantry/items/{bean['id']}"
    edited = client.put(url, json=fields)
    assert edited.status_code == 200 and edited.json()['id'] == bean['id']
    after = client.get('/api/pantry').json()
    assert [s['count'] for s in before['slots']] == [s['count'] for s in after['slots']]
    assert after['counted_package_kcal'] == before['counted_package_kcal'] + 4 * 150
    assert client.post(f"/api/pantry/review/{proposal['proposal_id']}", json={'counts': counts}).status_code == 409
    for invalid in ({**fields, 'name': '  '}, {**fields, 'kcal': -1}):
        assert client.put(url, json=invalid).status_code == 422
    assert client.get('/api/pantry').json() == after
    assert client.put('/api/pantry/items/999999', json=fields).status_code == 404


def test_scale_change_rejects_a_staged_photo(client):
    proposal, counts = preview(client)
    assert client.put('/api/pantry/scale', json={'multiplier': 10}).status_code == 200
    assert client.post(f"/api/pantry/review/{proposal['proposal_id']}", json={'counts': counts}).status_code == 409


def test_repeated_food_deducts_meals_once_and_edits_recalculate_meals(client):
    from sqlmodel import Session, select
    from app.db import engine
    from app.engines.nutrition import available_items, kcal_eaten_today
    from app.models import ConsumptionEvent
    from datetime import datetime, timezone
    bean = next(f for f in client.get('/api/pantry/items').json() if f['name'] == 'Bean can')
    client.post('/api/pantry/empty', json={'confirmed': True})
    for label, count in [('A1', 1), ('A2', 2)]:
        client.put('/api/pantry/grid', json={'label': label, 'food_item_id': bean['id']})
        client.post('/api/pantry/confirm', json={'slot': label, 'count': count})
    client.put('/api/pantry/scale', json={'multiplier': 1})
    crew_id = client.get('/api/crew').json()[0]['id']
    response = client.post(f'/api/crew/{crew_id}/meal', json={'food_item_id': bean['id'], 'qty': 2})
    assert response.status_code == 200, response.text
    after = client.get('/api/pantry').json()
    assert after['counted_package_kcal'] == 750 and after['stock_kcal'] == 250
    with Session(engine) as session:
        remaining = [f for f in available_items(session) if f.food_item_id == bean['id']]
        assert len(remaining) == 1 and remaining[0].available_portions == 1
        events_before = len(session.exec(select(ConsumptionEvent)).all())
    fields = {'name': 'Bean can', 'kcal': 400, 'protein_g': 20, 'carbs_g': 65, 'fat_g': 5}
    assert client.put(f"/api/pantry/items/{bean['id']}", json=fields).status_code == 200
    assert client.get('/api/pantry').json()['stock_kcal'] == 400
    with Session(engine) as session:
        assert len(session.exec(select(ConsumptionEvent)).all()) == events_before
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        assert kcal_eaten_today(session, crew_id, today) == 800
