import { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { strokeWidth?: number };

function base(props: P) {
  const { strokeWidth = 1.8, ...rest } = props;
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const CalendarIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
    <path d="M3.5 9.5h17M8 2.8V6M16 2.8V6" />
    <path d="M7.5 13.5h3M7.5 17h6" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3.2 2.2" />
  </svg>
);

export const MailIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="m4 7.5 8 6 8-6" />
  </svg>
);

export const UserIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c1.4-3.4 4.2-5 7.5-5s6.1 1.6 7.5 5" />
  </svg>
);

export const LockIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    <path d="M12 14.5v2.5" />
  </svg>
);

export const ShieldIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 5 5.8v5.4c0 4.4 2.9 7.7 7 9.3 4.1-1.6 7-4.9 7-9.3V5.8L12 3Z" />
    <path d="m9 11.6 2.2 2.2L15.4 9.6" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m4.5 12.5 5 5L19.5 7" />
  </svg>
);

export const CopyIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2" />
    <path d="M15.5 5.5v-.7a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h.7" />
  </svg>
);

export const DownloadIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3.5v11M7.5 10 12 14.5 16.5 10" />
    <path d="M4 16.5v2A2.5 2.5 0 0 0 6.5 21h11a2.5 2.5 0 0 0 2.5-2.5v-2" />
  </svg>
);

export const DoorIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20.5h16" />
    <path d="M6.5 20.5V5a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 17.5 5v15.5" />
    <path d="M14.2 12.4h.01" strokeWidth={2.6} />
  </svg>
);

export const ArrowIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12h15M13.5 5.5 20 12l-6.5 6.5" />
  </svg>
);

export const FileIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M13.5 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L13.5 3Z" />
    <path d="M13.5 3v5.5H19" />
  </svg>
);

export const TerminalIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <path d="m7 9.5 3 2.7-3 2.7M12.5 15.5H17" />
  </svg>
);

export const DbIcon = (p: P) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
    <path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13" />
    <path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
  </svg>
);

export const FunnelIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h16l-6.2 7.4v5.1L10.2 20v-7.6L4 5Z" />
  </svg>
);

export const CodeIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="m8 8-4.5 4L8 16M16 8l4.5 4L16 16" />
    <path d="m13.2 5.5-2.4 13" />
  </svg>
);

export const KeyIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="8" cy="15.5" r="4.5" />
    <path d="m11.5 12 7.5-7.5M16 7.5l2.5 2.5M13.5 10l2 2" />
  </svg>
);

export const SendIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20.5 3.5 3.5 10l6.5 2.5L12.5 19l8-15.5Z" />
    <path d="M10 12.5 20.5 3.5" />
  </svg>
);

export const DiamondIcon = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M12 4.5 19.5 12 12 19.5 4.5 12 12 4.5Z" />
  </svg>
);

/** Logotipo: sala con puerta batiente y punto de estado. */
export const LogoMark = ({ className = "h-8 w-8" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" className={className} aria-hidden>
    <rect width="32" height="32" rx="7" fill="var(--color-pine)" />
    <path
      d="M11 24V8h6a6 6 0 0 1 0 12h-4"
      stroke="var(--color-paper)"
      strokeWidth="2.4"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="22.5" cy="23" r="2.2" fill="var(--color-amber)" />
  </svg>
);
