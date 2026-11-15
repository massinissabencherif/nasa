import type { ComponentType, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base(props: IconProps) {
  const { size = 18, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: '0 0 20 20',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  };
}

export function IconCrew(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="6.5" r="3" />
      <path d="M4 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    </svg>
  );
}

export function IconPantry(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="14" height="14" rx="1" />
      <path d="M3 8.3h14M3 13.3h14M9.6 3v14" />
    </svg>
  );
}

export function IconForecast(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 14.5l4.2-5 3 2.8L16.5 5" />
      <path d="M12.3 5h4.2v4.2" />
    </svg>
  );
}

export function IconAlert(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 3.3l7.3 12.7H2.7z" />
      <path d="M10 8.2v3.3" />
      <circle cx="10" cy="14" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconEarthLink(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="7" cy="13" r="3.3" />
      <path d="M10 10.3L16 4.3M16 4.3v3.2M16 4.3h-3.2" />
      <path d="M7 9.7v.1M9.8 15.2c1.1 0 1.8-.9 1.8-2" />
    </svg>
  );
}

export function IconSettings(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="2.6" />
      <path d="m8.3 2.4 3.4 0 .5 2.1 1.4.8 2.1-.6 1.7 2.9-1.6 1.5v1.8l1.6 1.5-1.7 2.9-2.1-.6-1.4.8-.5 2.1H8.3l-.5-2.1-1.4-.8-2.1.6-1.7-2.9 1.6-1.5V9.1L2.6 7.6l1.7-2.9 2.1.6 1.4-.8z" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M6.8 10.2l2.1 2.1 4.3-4.6" />
    </svg>
  );
}

export function IconCaution(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 3.3l7.3 12.7H2.7z" />
      <path d="M10 8.2v3" />
      <circle cx="10" cy="13.6" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconUnknown(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="7.2" strokeDasharray="2.6 2.6" />
      <path d="M7.4 10h5.2" />
    </svg>
  );
}

export function IconCritical(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M7.3 7.3l5.4 5.4M12.7 7.3l-5.4 5.4" />
    </svg>
  );
}

export function IconScan(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 7V4.5A1.5 1.5 0 014.5 3H7M13 3h2.5A1.5 1.5 0 0117 4.5V7M17 13v2.5a1.5 1.5 0 01-1.5 1.5H13M7 17H4.5A1.5 1.5 0 013 15.5V13" />
      <circle cx="10" cy="10" r="2.6" />
    </svg>
  );
}

/** Image import and supply capsule, drawn in HESTIA's instrument family. */
export function IconPhoto(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.5" y="3" width="15" height="14" rx="2" />
      <circle cx="7" cy="7.5" r="1.3" />
      <path d="m3 14 4-4 3 3 3-5 4 6" />
    </svg>
  );
}
export function IconCargo(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 5 4-3 4 3v10l-4 3-4-3zM6 8h8M6 12h8M3 7v6m14-6v6M2 10h4m8 0h4" />
    </svg>
  );
}

export function IconConnection(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 9a8 8 0 0111 0M7 11.7a4.3 4.3 0 016 0" />
      <circle cx="10" cy="15" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M10 6v4.2l2.8 1.6" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 9.5L10 4l6.5 5.5" />
      <path d="M5.3 8.5V16a.8.8 0 00.8.8h8a.8.8 0 00.8-.8V8.5" />
    </svg>
  );
}

export function IconCheckin(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5.5 4.3h9a1 1 0 011 1V15a1 1 0 01-1 1h-9a1 1 0 01-1-1V5.3a1 1 0 011-1z" />
      <path d="M7.3 8.3l1.8 1.8 3.2-3.6M7 12.6h6" />
    </svg>
  );
}

export function IconMeal(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.5v5.2a1.6 1.6 0 003.2 0V3.5M7.6 8.7V16.5" />
      <path d="M13.7 3.5c-1.3 0-2 1.6-2 4.4s.7 3 2 3 2-.2 2-.2v5.8" />
    </svg>
  );
}

export function IconHistory(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 10a6 6 0 106-6H7" />
      <path d="M5.5 2.3L7 4 5.3 5.6" />
      <path d="M10 7v3.3l2.3 1.4" />
    </svg>
  );
}

export function IconInfo(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="7.2" />
      <path d="M10 9.2v4.3" />
      <circle cx="10" cy="6.8" r="0.15" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCalibrate(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 3l5 5M17 3l-5 5M3 17l5-5M17 17l-5-5" />
      <circle cx="10" cy="10" r="2.2" />
    </svg>
  );
}

/* Instrument icons for the measures of the check-in. They sit next to the
   label and the unit, they never replace them. Same 20 x 20 grid and 1.6
   stroke as the rest of the family; checked at 16, 20 and 24 px. */

export function IconPressure(props: IconProps) {
  // arm cuff, tube and gauge
  return (
    <svg {...base(props)}>
      <rect x="2.4" y="5.4" width="8" height="9.2" rx="1.8" />
      <path d="M6.4 5.4v9.2" />
      <path d="M10.4 10h2" />
      <circle cx="15.2" cy="10" r="2.8" />
      <path d="M15.2 10l1-1.1" />
    </svg>
  );
}

export function IconPulse(props: IconProps) {
  // heart with a pulse trace
  return (
    <svg {...base(props)}>
      <path d="M10 16.4S3.6 12.9 3.6 8.2a3.3 3.3 0 0 1 6.4-1.1 3.3 3.3 0 0 1 6.4 1.1c0 4.7-6.4 8.2-6.4 8.2z" />
      <path d="M6.6 9.6h2l1-2 1.3 3.6 1-1.6h1.4" />
    </svg>
  );
}

export function IconGlucose(props: IconProps) {
  // test strip, meter and separate sample drop remain distinct at small sizes
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="9" height="12" rx="2" />
      <path d="M6 5V2h3v3M5.5 8h4M5.5 10.5h4" />
      <path d="M16 6c-1.2 1.7-2 2.8-2 3.8a2 2 0 0 0 4 0C18 8.8 17.2 7.7 16 6Z" />
    </svg>
  );
}

export function IconThermometer(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8.4 11.2V4.6a1.6 1.6 0 0 1 3.2 0v6.6a3.2 3.2 0 1 1-3.2 0z" />
      <path d="M10 8v5.4" />
    </svg>
  );
}

export function IconScale(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3.6" width="14" height="12.8" rx="3" />
      <path d="M6.9 8.8a3.8 3.8 0 0 1 6.2 0" />
      <path d="M10 8.9l1.2-1.5" />
    </svg>
  );
}

export function IconSleep(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M16.2 12.4A6.4 6.4 0 0 1 7.6 3.8a6.4 6.4 0 1 0 8.6 8.6z" />
    </svg>
  );
}

export function IconMood(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 2.8c4.1 0 6.4 2.8 6.4 6.7v1c0 3.9-2.3 6.7-6.4 6.7s-6.4-2.8-6.4-6.7v-1c0-3.9 2.3-6.7 6.4-6.7z" />
      <circle cx="7.2" cy="8.5" r=".8" fill="currentColor" stroke="none" />
      <circle cx="12.8" cy="8.5" r=".8" fill="currentColor" stroke="none" />
      <path d="M7.5 12.6h5" />
    </svg>
  );
}

export function IconReaction(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="11.4" r="5.9" />
      <path d="M8 2.7h4M10 2.7v2.8M14.5 6.8l1.8-1.8M15.5 4.2l1.6 1.6M10 8v3.4l-1.9 1.9" />
    </svg>
  );
}

export function IconSymptoms(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4.5" y="3" width="11.5" height="14" rx="1.8" />
      <path d="M3 6h3M3 10h3M3 14h3M8.5 7h4.5M8.5 10h4.5M8.5 13h2.5" />
    </svg>
  );
}

export function IconExercise(props: IconProps) {
  // dumbbell
  return (
    <svg {...base(props)}>
      <path d="M3.2 7.8v4.4M5.8 6v8M14.2 6v8M16.8 7.8v4.4M5.8 10h8.4" />
    </svg>
  );
}

/** Shared measure icons for check-in fields and zone readings. */
const MEASURE_ICONS: Record<string, ComponentType<IconProps>> = {
  systolic_bp: IconPressure,
  diastolic_bp: IconPressure,
  heart_rate: IconPulse,
  glucose: IconGlucose,
  temperature: IconThermometer,
  weight: IconScale,
  weight_change_pct: IconScale,
  mood: IconMood,
  sleep_h: IconSleep,
  exercise_min: IconExercise,
  exercise_streak: IconExercise,
  reaction_ms: IconReaction,
  reaction_change_pct: IconReaction,
  symptom: IconSymptoms,
  radiation_pct_of_career_limit: IconRadiation,
};
export function measureIcon(key: string): ComponentType<IconProps> | undefined {
  return MEASURE_ICONS[key];
}
export function MeasurementIcon({ name, ...props }: IconProps & { name: string }) {
  const Icon = MEASURE_ICONS[name];
  return Icon ? <Icon {...props} /> : null;
}

/* Body-zone icons, same family: 20 x 20 grid, 1.6 stroke, round ends. They
   sit next to the zone name, never instead of it. */

export function IconBrain(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 4.4a2.9 2.9 0 0 0-5.3 1.3 2.9 2.9 0 0 0-1.1 4.4 2.9 2.9 0 0 0 1.7 4.3 2.7 2.7 0 0 0 4.7 1.2z" />
      <path d="M10 4.4a2.9 2.9 0 0 1 5.3 1.3 2.9 2.9 0 0 1 1.1 4.4 2.9 2.9 0 0 1-1.7 4.3 2.7 2.7 0 0 1-4.7 1.2" />
      <path d="M10 4.4v11.2" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.6 10s2.8-4.6 7.4-4.6 7.4 4.6 7.4 4.6-2.8 4.6-7.4 4.6S2.6 10 2.6 10z" />
      <circle cx="10" cy="10" r="2.2" />
    </svg>
  );
}

export function IconBone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.2 9.4l3.4 3.4" />
      <path d="M12.9 7.1l-5.8 5.8a1.9 1.9 0 1 1-2.2 3 1.9 1.9 0 1 1-1.8-3.2 1.9 1.9 0 0 1 1.2-.6l5.8-5.8a1.9 1.9 0 1 1 3-2.2 1.9 1.9 0 1 1 1.8 3.2 1.9 1.9 0 0 1-2 -.2z" />
    </svg>
  );
}

export function IconImmunity(props: IconProps) {
  // shield with a check
  return (
    <svg {...base(props)}>
      <path d="M10 3l5.6 2v4.6c0 3.4-2.4 5.9-5.6 7.4-3.2-1.5-5.6-4-5.6-7.4V5z" />
      <path d="M7.6 10l1.8 1.8 3.200-3.400" />
    </svg>
  );
}

export function IconRadiation(props: IconProps) {
  // a source and three waves
  return (
    <svg {...base(props)}>
      <circle cx="10" cy="10" r="1.8" />
      <path d="M7 4.8A6 6 0 0 1 13 4.8M16 10a6 6 0 0 1-3 5.2M7 15.2A6 6 0 0 1 4 10" />
    </svg>
  );
}

/** The HESTIA mark: a habitat dome with a vital-signs trace inside. */
export function HestiaMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.5 19.5V12a8.5 8.5 0 0 1 17 0v7.5z"
        stroke="var(--accent)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 14.5h3l1.5-3.5 2 6 1.5-2.5h3"
        stroke="var(--text)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** The icon of a body zone, by its key. */
const ZONE_ICONS: Record<string, ComponentType<IconProps>> = {
  brain_morale: IconBrain,
  eyes_sans: IconEye,
  heart: IconPulse,
  bones: IconBone,
  muscles: IconExercise,
  immunity: IconImmunity,
  skin: IconRadiation,
  digestive_nutrition: IconMeal,
};
export function zoneIcon(zone: string): ComponentType<IconProps> | undefined {
  return ZONE_ICONS[zone];
}
export function ZoneIcon({ zone, ...props }: IconProps & { zone: string }) {
  const Icon = ZONE_ICONS[zone];
  return Icon ? <Icon {...props} /> : null;
}

export function IconPhone(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="2" width="10" height="16" rx="2" />
      <path d="M8 4h4M9 15h2" />
    </svg>
  );
}
export function IconReplay(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6a7 7 0 1 1-1 7M4 2v4h4" />
      <path d="m8 7 5 3-5 3z" />
    </svg>
  );
}
