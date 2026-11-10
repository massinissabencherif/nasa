import type { SVGProps } from 'react';

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
      <path d="M10 3.6v1.6M10 14.8v1.6M16.4 10h-1.6M5.2 10H3.6M14.5 5.5l-1.1 1.1M6.6 13.4l-1.1 1.1M14.5 14.5l-1.1-1.1M6.6 6.6L5.5 5.5" />
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
