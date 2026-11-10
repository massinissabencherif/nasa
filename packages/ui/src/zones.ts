export type ZoneKey =
  | 'brain_morale'
  | 'eyes_sans'
  | 'heart'
  | 'bones'
  | 'muscles'
  | 'immunity'
  | 'skin'
  | 'digestive_nutrition';

export type ZoneMeta = {
  label: string;
  bodyPart: string;
  indicators: string[];
  function: string;
  why: string;
  action: string;
};

export const ZONES: ZoneKey[] = [
  'brain_morale',
  'eyes_sans',
  'heart',
  'bones',
  'muscles',
  'immunity',
  'skin',
  'digestive_nutrition',
];

export const ZONE_META: Record<ZoneKey, ZoneMeta> = {
  brain_morale: {
    label: 'Brain / morale',
    bodyPart: 'head',
    indicators: ['mood', 'sleep_h', 'symptom'],
    function: 'Mood, sleep quality, and reported symptoms — your behavioural and cognitive baseline.',
    why: 'Isolation and confinement wear on morale and decision-making over a long mission; catching a dip early keeps it from compounding.',
    action: "Talk to a crewmate, stick to your sleep schedule, and flag it in today's check-in.",
  },
  eyes_sans: {
    label: 'Eyes (SANS)',
    bodyPart: 'eyes',
    indicators: ['symptom'],
    function: 'Vision changes linked to Spaceflight-Associated Neuro-ocular Syndrome (SANS).',
    why: 'Fluid shifts in microgravity can raise pressure around the optic nerve and blur vision over a long mission.',
    action: 'Log any blurred vision as a symptom and mention it at the next check-in.',
  },
  heart: {
    label: 'Heart',
    bodyPart: 'chest',
    indicators: ['systolic_bp', 'diastolic_bp', 'heart_rate'],
    function: 'Blood pressure and resting heart rate — your cardiovascular baseline.',
    why: 'Microgravity shifts fluid toward the chest, changing how the heart and vessels regulate pressure.',
    action: 'Rest, hydrate, and recheck in a few hours. Repeated out-of-range readings should go to the crew lead.',
  },
  bones: {
    label: 'Bones',
    bodyPart: 'pelvis',
    indicators: ['exercise_streak'],
    function: 'Resistive-exercise streak — the main defense against bone density loss.',
    why: 'Altered gravity removes the mechanical load bones need; hip and spine density are the most-studied losses in spaceflight.',
    action: 'Log a resistive exercise session today — see Procedure: resistive exercise routine.',
  },
  muscles: {
    label: 'Muscles',
    bodyPart: 'legs',
    indicators: ['exercise_streak', 'weight_change_pct'],
    function: 'Exercise streak and weight trend — your muscle-maintenance baseline.',
    why: 'Altered gravity reduces the everyday load muscles normally carry, leading to atrophy without countermeasures.',
    action: 'The same resistive routine protects muscles and bones together.',
  },
  immunity: {
    label: 'Immunity',
    bodyPart: 'neck',
    indicators: ['temperature', 'sleep_h', 'symptom'],
    function: 'Temperature, sleep, and symptoms — signs of immune stress.',
    why: 'Confinement and stress in a closed environment can suppress immune response over time.',
    action: 'Rest and monitor your temperature. A fever should go to the crew lead right away.',
  },
  skin: {
    label: 'Skin',
    bodyPart: 'arms',
    indicators: ['radiation_pct_of_career_limit'],
    function: 'Cumulative radiation dose versus the 600 mSv career limit.',
    why: 'Radiation is one of the five HRP hazards; skin and underlying tissue absorb dose over the whole mission.',
    action: 'No same-day action — this accumulates over the mission. Track it and plan shelter time during solar events.',
  },
  digestive_nutrition: {
    label: 'Digestive / nutrition',
    bodyPart: 'abdomen',
    indicators: ['weight_change_pct', 'glucose'],
    function: 'Weight trend and glucose versus your energy need from the pantry.',
    why: 'Insufficient nutrition is one of the five HRP effects, and it shows up first as a weight trend.',
    action: 'Check the Meal screen — you may be under your daily kcal need.',
  },
};

export const INDICATOR_LABELS: Record<string, string> = {
  systolic_bp: 'Systolic BP',
  diastolic_bp: 'Diastolic BP',
  heart_rate: 'Heart rate',
  glucose: 'Glucose',
  temperature: 'Temperature',
  sleep_h: 'Sleep',
  mood: 'Mood',
  exercise_min: 'Exercise',
  exercise_streak: 'Exercise streak',
  weight_change_pct: 'Weight change',
  radiation_pct_of_career_limit: 'Radiation dose',
  symptom: 'Symptoms',
};
