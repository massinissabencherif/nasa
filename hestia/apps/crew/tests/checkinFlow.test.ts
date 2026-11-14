import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answerCount, buildCheckinBody, emptyMeasureCount, filledMeasures, isFilled, reviewRows } from '../src/lib/checkinFlow.ts';

const keys = ['systolic_bp', 'heart_rate', 'exercise_min'];
const meta = {
  systolic_bp: { label: 'Blood pressure (systolic)', unit: 'mmHg' },
  heart_rate: { label: 'Resting heart rate', unit: 'bpm' },
  exercise_min: { label: 'Exercise', unit: 'min' },
};
const moods = ['Very low', 'Low', 'OK', 'Good', 'Great'];
const empty = { values: {}, mood: null, symptoms: [] };

test('an empty draft has no answer and sends only an empty symptom list', () => {
  assert.equal(answerCount(empty, keys), 0);
  assert.deepEqual(buildCheckinBody(empty, keys), { symptoms: [] });
  assert.equal(emptyMeasureCount(empty, keys), 3);
});

test('zero is an answer, an empty string is not', () => {
  assert.equal(isFilled(0), true);
  assert.equal(isFilled(''), false);
  assert.equal(isFilled(undefined), false);
  const draft = { values: { exercise_min: 0, heart_rate: '' as const }, mood: null, symptoms: [] };
  assert.deepEqual(filledMeasures(draft, keys), ['exercise_min']);
  assert.deepEqual(buildCheckinBody(draft, keys), { symptoms: [], exercise_min: 0 });
});

test('the body keeps what was answered and nothing else', () => {
  const draft = { values: { systolic_bp: 118 }, mood: 4, symptoms: ['Fatigue'] };
  assert.deepEqual(buildCheckinBody(draft, keys), { symptoms: ['Fatigue'], systolic_bp: 118, mood: 4 });
  assert.equal(answerCount(draft, keys), 3);
});

test('review rows show units, name an unanswered mood and never say "none" for symptoms', () => {
  const rows = reviewRows({ values: { heart_rate: 64 }, mood: null, symptoms: [] }, keys, meta, moods);
  assert.deepEqual(rows.map((row) => [row.key, row.value]), [
    ['mood', 'Not answered'],
    ['symptoms', 'None selected'],
    ['heart_rate', '64 bpm'],
  ]);
  const answered = reviewRows({ values: {}, mood: 5, symptoms: ['Headache', 'Nausea'] }, keys, meta, moods);
  assert.deepEqual(answered.map((row) => row.value), ['5 of 5, Great', 'Headache, Nausea']);
});
