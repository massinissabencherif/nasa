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
    function: 'Mood, sleep quality, and symptoms such as headache, fatigue or dizziness: your behavioural and cognitive baseline.',
    why: 'Isolation and confinement wear on morale and decision-making over a long mission; catching a dip early keeps it from compounding.',
    action: "Talk to a crewmate, stick to your sleep schedule, and flag it in today's check-in.",
  },
  eyes_sans: {
    label: 'Eyes (SANS)',
    bodyPart: 'eyes',
    indicators: ['symptom'],
    function: 'Reported vision changes. Spaceflight-Associated Neuro-ocular Syndrome (SANS) is detected by eye imaging (OCT), not by symptoms: this zone cannot rule it out.',
    why: 'Fluid shifts in microgravity can swell the optic disc. Most long-duration crew members show some sign of it on imaging, often without noticing a change.',
    action: 'Log any blurred vision as a symptom, and keep the scheduled eye imaging sessions even when you see well.',
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
    function: 'Adherence to resistive exercise, the main countermeasure against bone density loss. This is not a bone measurement: bone density cannot be measured with this app.',
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
    function: 'Temperature, sleep, and symptoms such as fatigue or congestion: signs of immune stress.',
    why: 'Confinement and stress in a closed environment can suppress immune response over time.',
    action: 'Rest and monitor your temperature. A fever should go to the crew lead right away.',
  },
  skin: {
    label: 'Radiation exposure',
    bodyPart: 'arms',
    indicators: ['radiation_pct_of_career_limit'],
    function: 'Cumulative whole-body radiation dose versus the 600 mSv career limit (NASA-STD-3001). Shown on the arms for lack of a better place: the dose concerns the whole body.',
    why: 'Space radiation is one of the five HRP hazards. The career limit exists to cap the added risk of cancer; radiation can also affect the central nervous system.',
    action: 'No same-day action — this accumulates over the mission. Track it and plan shelter time during solar events.',
  },
  digestive_nutrition: {
    label: 'Digestive / nutrition',
    bodyPart: 'abdomen',
    indicators: ['weight_change_pct', 'glucose', 'symptom'],
    function: 'Weight trend and glucose versus your energy need from the pantry.',
    why: 'Inadequate nutrition is one of the health problems of long missions, and it shows up first as a weight trend.',
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

export function indicatorLabel(indicator: string): string {
  return INDICATOR_LABELS[indicator] ?? indicator.replace(/_/g, ' ');
}

/** Risk text shown in the zone panel, adapted to the active mission context. */
export const CONTEXT_ZONE_NOTES: Record<string, Partial<Record<ZoneKey, string>>> = {
  mars_base: {
    brain_morale: 'Mars base: a reply from Earth takes up to 44 min round trip. The crew is its own support.',
    bones: 'Mars gravity is 0.38 g: partial loading, countermeasures still required.',
    skin: 'Mars surface: about 0.67 mSv/day (Curiosity RAD).',
    digestive_nutrition: 'Mars base: next cargo is months away, every ration counts.',
  },
  mars_transit: {
    brain_morale: 'Transit: the longest confinement of the mission, with a growing delay to Earth.',
    bones: 'Transit is full microgravity: the fastest bone loss of the mission.',
    muscles: 'Transit is full microgravity: muscles lose load every day.',
    skin: 'Deep space: about 1.8 mSv/day, the highest of all contexts, and no resupply.',
    digestive_nutrition: 'Transit: no resupply at all, the stock must last the whole leg.',
  },
  moon_base: {
    bones: 'Moon gravity is 0.16 g: very little loading, keep the resistive routine.',
    skin: "Lunar surface: about 1.37 mSv/day (Chang'e-4 lander), no atmosphere or magnetic field.",
    immunity: 'Lunar dust is abrasive and irritant: watch airways and eyes after EVAs.',
  },
  iss: {
    eyes_sans: 'ISS microgravity: SANS has been observed on long-duration crews.',
    bones: 'ISS microgravity: about 1-1.5 % bone loss per month on average.',
    skin: 'Low Earth orbit: about 0.5 mSv/day (assumption), partly shielded by the magnetosphere.',
  },
};
