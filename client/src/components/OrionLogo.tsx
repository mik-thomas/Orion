type OrionLogoProps = {
  className?: string;
};

export function OrionLogo({ className }: OrionLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="20" cy="20" r="17.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path
        d="M10 16 Q20 30 30 16"
        stroke="#5694ca"
        strokeWidth="1.25"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="13" cy="22" r="2" fill="currentColor" />
      <circle cx="20" cy="20" r="2.5" fill="currentColor" />
      <circle cx="27" cy="22" r="2" fill="currentColor" />
      <circle cx="11" cy="14" r="1.25" fill="currentColor" opacity="0.85" />
      <circle cx="29" cy="14" r="1.25" fill="currentColor" opacity="0.85" />
      <line x1="20" y1="8" x2="20" y2="12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <line x1="15" y1="12" x2="25" y2="12" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M15 12 L13 15 M25 12 L27 15"
        stroke="currentColor"
        strokeWidth="0.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
