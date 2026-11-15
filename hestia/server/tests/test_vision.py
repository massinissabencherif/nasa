import pytest

from vision.catalogue_loader import load_ground_truth, load_slot_items
from vision.schema import SlotReading, ValidationError


def test_ground_truth_matches_29_unit_shelf():
    gt = load_ground_truth()
    assert len(gt) == 12
    assert sum(gt.values()) == 29


def test_slot_items_has_two_empty_slots():
    items = load_slot_items()
    assert len(items) == 12
    empty = [label for label, item in items.items() if item is None]
    assert sorted(empty) == ["A4", "C2"]


def test_slot_reading_rejects_out_of_range_values():
    SlotReading(count=0, confidence=0)
    SlotReading(count=12, confidence=1)
    with pytest.raises(ValidationError):
        SlotReading(count=-1, confidence=0.5)
    with pytest.raises(ValidationError):
        SlotReading(count=1, confidence=1.5)


def test_plausibility_flags_what_code_can_check():
    from vision.pipeline import LOW_CONFIDENCE_THRESHOLD, _plausibility

    tuna = {"name": "Tuna can", "stacked": True}
    soup = {"name": "Tomato soup can"}
    assert _plausibility("A1", 3, soup, 6)[0] >= LOW_CONFIDENCE_THRESHOLD
    assert _plausibility("A1", 9, soup, 6)[0] < LOW_CONFIDENCE_THRESHOLD  # above capacity
    assert _plausibility("A4", 1, None, 4)[0] < LOW_CONFIDENCE_THRESHOLD  # should be empty
    assert _plausibility("A4", 0, None, 4)[0] >= LOW_CONFIDENCE_THRESHOLD
    assert _plausibility("A3", 2, tuna, 8)[0] < LOW_CONFIDENCE_THRESHOLD  # stacked: confirm
    assert _plausibility("A1", None, soup, 6)[0] == 0


def test_parse_counts_rejects_garbage():
    from vision.pipeline import _parse_counts

    assert _parse_counts('{"A1": 3, "A2": "two", "A3": -1}', ["A1", "A2", "A3", "A4"]) == {
        "A1": 3, "A2": None, "A3": None, "A4": None,
    }
    assert _parse_counts("not json", ["A1"]) == {"A1": None}


def test_mock_variants():
    from vision.pipeline import scan_mock

    full = scan_mock("full")
    removed = scan_mock("after_removal")
    assert sum(r.count for r in full.readings.values()) == 29
    assert removed.readings["A1"].count == 0
    assert sum(r.count for r in removed.readings.values()) == 26
    with pytest.raises(ValueError):
        scan_mock("nope")


def test_cross_check_flags_disagreements_and_keeps_the_row_reading():
    from vision.pipeline import cross_check

    full = {"A1": 1, "A2": 2, "A3": 2, "A4": 0}
    rows = {"A1": 0, "A2": 2, "A3": 2, "A4": 0}
    counts, flagged = cross_check(full, rows)
    assert counts == rows
    assert set(flagged) == {"A1"}
    assert "whole shelf 1, by rows 0" in flagged["A1"]


def test_cross_check_flags_a_missing_reading():
    from vision.pipeline import cross_check

    _counts, flagged = cross_check({"A1": None, "A2": 2}, {"A1": 3, "A2": 2})
    assert set(flagged) == {"A1"}
    _counts, flagged = cross_check({"A1": 3}, {"A1": None})
    assert set(flagged) == {"A1"}


def test_cross_strategy_sends_a_disagreeing_slot_to_confirmation(monkeypatch):
    import numpy as np

    from vision import pipeline

    labels = ["A1", "A2"]
    boxes = {"A1": (0.0, 0.0, 0.5, 1.0), "A2": (0.5, 0.0, 1.0, 1.0)}
    items = {"A1": {"name": "Soup"}, "A2": {"name": "Oats"}}
    calls = []

    def fake_call(img, call_labels, slot_items, full, on_progress):
        calls.append(full)
        # whole shelf: A1 read 1; by rows: A1 read 0 and A2 read 2 (rows are called with full=False)
        return {"A1": 1, "A2": 2} if full else {"A1": 0, "A2": 2}

    monkeypatch.setattr(pipeline, "_call", fake_call)
    monkeypatch.setattr(pipeline.grid, "ROWS", {"A": labels})
    image = np.full((100, 200, 3), 127, dtype=np.uint8)
    result = pipeline.scan_live(image, boxes, items, strategy="cross", capacities={"A1": 6, "A2": 4})
    assert calls == [True, False]  # one whole-shelf call, one row call
    assert result.readings["A1"].count == 0 and "A1" in result.needs_confirmation
    assert "disagree" in result.readings["A1"].note
    assert "A2" not in result.needs_confirmation and result.readings["A2"].count == 2
    assert result.raw_json["disagreements"] == ["A1"]
    assert result.raw_json["full"]["A1"] == 1 and result.raw_json["rows"]["A1"] == 0
    assert result.raw_json["stacks"] == {}  # no product declared as stacked here


def test_a_stacked_product_gets_a_second_look_and_stays_flagged(monkeypatch):
    import numpy as np

    from vision import pipeline

    labels = ["A1", "A2"]
    boxes = {"A1": (0.0, 0.0, 0.5, 1.0), "A2": (0.5, 0.0, 1.0, 1.0)}
    items = {"A1": {"name": "Tuna can", "stacked": True}, "A2": {"name": "Oats"}}
    monkeypatch.setattr(pipeline, "_call", lambda img, call_labels, slot_items, full, on_progress: {"A1": 2, "A2": 2})
    monkeypatch.setattr(pipeline.grid, "ROWS", {"A": labels})
    answers = iter(['{"rows": 2, "per_row": 2, "count": 4}'])
    monkeypatch.setattr(pipeline.ollama_client, "generate", lambda *a, **k: {"response": next(answers)})
    image = np.full((100, 200, 3), 127, dtype=np.uint8)
    result = pipeline.scan_live(image, boxes, items, strategy="cross", capacities={"A1": 8, "A2": 4})
    assert result.readings["A1"].count == 4  # the stack question replaces the two readings that agreed on 2
    assert "A1" in result.needs_confirmation  # a stack is always checked by a person
    assert result.raw_json["stacks"] == {"A1": 4}
    assert result.readings["A2"].count == 2 and "A2" not in result.needs_confirmation


def test_an_inconsistent_stack_answer_is_ignored(monkeypatch):
    import numpy as np

    from vision import pipeline

    monkeypatch.setattr(pipeline.ollama_client, "generate", lambda *a, **k: {"response": '{"rows": 2, "per_row": 2, "count": 3}'})
    image = np.full((100, 200, 3), 127, dtype=np.uint8)
    assert pipeline.read_stack(image, (0.0, 0.0, 1.0, 1.0), {"name": "Tuna can"}) is None
    monkeypatch.setattr(pipeline.ollama_client, "generate", lambda *a, **k: {"response": "not json"})
    assert pipeline.read_stack(image, (0.0, 0.0, 1.0, 1.0), {"name": "Tuna can"}) is None


def test_quality_warns_about_blur_and_light_and_picks_the_sharpest_frame():
    import cv2
    import numpy as np

    from vision import quality
    from vision.capture import load_image
    from vision.pipeline import FIXTURES_DIR

    sharp = load_image(str(FIXTURES_DIR / "shelf_full.png"))
    blurred = cv2.GaussianBlur(sharp, (0, 0), 9)
    assert quality.assess(sharp) == []
    assert any("blurred" in w for w in quality.assess(blurred))
    assert any("dark" in w for w in quality.assess((sharp * 0.1).astype(np.uint8)))
    assert quality.sharpest([blurred, sharp, blurred]) is sharp


def test_stack_answer_with_non_object_json_is_ignored(monkeypatch):
    import numpy as np
    from vision import pipeline

    image = np.full((100, 100, 3), 127, dtype=np.uint8)
    for payload in ['[]', 'null', '42', '"four cans"']:
        monkeypatch.setattr(pipeline.ollama_client, "generate", lambda *a, value=payload, **k: {"response": value})
        assert pipeline.read_stack(image, (0.0, 0.0, 1.0, 1.0), {"name": "Tuna can"}) is None
