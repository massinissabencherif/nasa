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
