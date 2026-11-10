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
