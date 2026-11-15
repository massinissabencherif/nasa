export type FieldExplanation = {
  label: string;
  unit: string;
  how: string;
  why: string;
  risk: string;
};

export const EXPLANATIONS: Record<string, FieldExplanation> = {
  systolic_bp: {
    label: 'Blood pressure (systolic)',
    unit: 'mmHg',
    how: "Rest a few minutes, then read the cuff's top number.",
    why: 'Microgravity shifts fluid toward the head and chest, changing how the heart and vessels regulate pressure.',
    risk: 'Sustained high or low readings are a cardiovascular hazard linked to altered gravity.',
  },
  diastolic_bp: {
    label: 'Blood pressure (diastolic)',
    unit: 'mmHg',
    how: "Same reading as systolic — the cuff's bottom number.",
    why: 'Tracks how relaxed your vessels are between heartbeats.',
    risk: 'Persistently abnormal readings point to the same cardiovascular hazard.',
  },
  heart_rate: {
    label: 'Resting heart rate',
    unit: 'bpm',
    how: 'Count your pulse seated, at rest, before exercise or caffeine.',
    why: 'A quick proxy for cardiovascular strain and deconditioning in flight.',
    risk: 'Persistently high or low rates can signal cardiovascular adaptation problems.',
  },
  glucose: {
    label: 'Glucose',
    unit: 'mg/dL',
    how: 'A fingerstick reading, ideally at a consistent time of day.',
    why: 'Stress and energy balance in isolation can shift blood sugar regulation.',
    risk: 'Out-of-range glucose affects energy, mood, and long-term metabolic health.',
  },
  temperature: {
    label: 'Temperature',
    unit: '°C',
    how: 'An oral or ear thermometer reading.',
    why: 'Core temperature reflects infection, inflammation, and circadian health.',
    risk: 'Fever is an early infection sign — harder to treat without a doctor on board.',
  },
  weight: {
    label: 'Weight',
    unit: 'kg',
    how: 'Step on the scale at the same time each day, ideally on waking.',
    why: 'Energy balance — food in versus energy out — shows up first as a weight trend.',
    risk: 'Unplanned loss points to insufficient nutrition, one of the five HRP effects.',
  },
  sleep_h: {
    label: 'Sleep',
    unit: 'h',
    how: 'Hours actually asleep, not just time in bed.',
    why: 'Isolation, confinement, and shifted light cycles disrupt sleep.',
    risk: 'Poor sleep affects mood, immunity, and decision-making.',
  },
  mood: {
    label: 'Mood',
    unit: '1-5',
    how: 'A quick self-rating — 1 low, 5 good. No overthinking.',
    why: 'Behavioural health is one of the five HRP hazards: isolation and confinement wear on morale.',
    risk: 'A sustained low mood is worth a check-in with the crew before it compounds.',
  },
  exercise_min: {
    label: 'Exercise',
    unit: 'min',
    how: 'Minutes of resistive or cardio exercise logged today.',
    why: 'Exercise is the main countermeasure to bone and muscle loss in altered gravity.',
    risk: 'Too little, too consistently, accelerates bone density loss.',
  },
  reaction_ms: {
    label: 'Reaction time test',
    unit: 'ms',
    how: 'Complete one practice trial, then five measured trials. Respond only when the panel says “Tap now”. Results are saved separately from this check-in.',
    why: 'View response times and compare complete sessions using the same protocol and installation. The first five comparable sessions build a personal reference.',
    risk: 'Distraction and device latency affect timing. This is not a validated PVT, a fatigue diagnosis or an operational fitness test. It does not change a body-zone colour.',
  },
  symptoms: {
    label: 'Symptoms',
    unit: '',
    how: "Tap anything you're noticing today, even mild.",
    why: 'Free-text symptoms catch what the numbers miss.',
    risk: 'A pattern across days can flag something before it becomes serious.',
  },
};

export const SYMPTOM_OPTIONS = ['Headache', 'Fatigue', 'Nausea', 'Vision blur', 'Dizziness', 'Congestion'];
