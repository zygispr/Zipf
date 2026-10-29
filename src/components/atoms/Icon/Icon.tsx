import styles from './Icon.module.scss';

// 24×24 stroke icons, drawn with currentColor so they follow the surrounding text color.
const ICON_PATHS = {
  upload: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'],
  book: ['M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z', 'M5 17a3 3 0 0 1 3-3h11'],
  shield: ['M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6l7-3z', 'M9 12l2 2 4-4'],
  alert: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 8v5', 'M12 16.5v.01'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  'chart-bar': ['M4 20h16', 'M7 16v-5', 'M12 16V6', 'M17 16v-8'],
  cloud: ['M7 18a4 4 0 0 1-.6-7.96A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7z'],
  zipf: ['M4 4v16h16', 'M7 6c1 6 4 10 12 11'],
  search: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4-4'],
  download: ['M12 4v12', 'M7 11l5 5 5-5', 'M4 20h16'],
  refresh: ['M20 12a8 8 0 1 1-2.34-5.66', 'M20 4v5h-5'],
  'chevron-left': ['M15 6l-6 6 6 6'],
  'chevron-right': ['M9 6l6 6-6 6'],
} as const satisfies Record<string, readonly string[]>;

export type IconName = keyof typeof ICON_PATHS;

export const ICON_NAMES = Object.keys(ICON_PATHS) as IconName[];

export interface IconProps {
  name: IconName;
  /** Width and height in px. */
  size?: number;
  /** Makes the icon meaningful (`role="img"`); without it the icon is decorative. */
  label?: string;
  className?: string;
}

export function Icon({ name, size = 20, label, className }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      className={[styles.icon, className].filter(Boolean).join(' ')}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
