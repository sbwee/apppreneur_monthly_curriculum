export type BotanicalGrowthStage = "seed" | "sprout" | "growing" | "canopy";

type BotanicalGrowthIconProps = {
  stage: BotanicalGrowthStage;
  className?: string;
};

export function getBotanicalGrowthStage(percent: number): {
  stage: BotanicalGrowthStage;
  label: string;
} {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));

  if (clamped === 0) {
    return { stage: "seed", label: "Just Planted" };
  }
  if (clamped < 40) {
    return { stage: "sprout", label: "Sprout Stage" };
  }
  if (clamped < 80) {
    return { stage: "growing", label: "Deep Roots" };
  }
  return { stage: "canopy", label: "Harvest Ready" };
}

export function BotanicalGrowthIcon({ stage, className }: BotanicalGrowthIconProps) {
  const shared = {
    className,
    viewBox: "0 0 48 48",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true as const,
  };

  if (stage === "seed") {
    return (
      <svg {...shared}>
        <ellipse cx="24" cy="36" rx="14" ry="3" fill="#e8dfce" />
        <path
          d="M24 34c-4.5-6-4.5-12 0-16.5 4.5 4.5 4.5 10.5 0 16.5z"
          fill="#b8956a"
          stroke="#8f6f4a"
          strokeWidth="1.2"
        />
        <ellipse cx="24" cy="19" rx="2.2" ry="3.2" fill="#d4b88a" opacity="0.55" />
      </svg>
    );
  }

  if (stage === "sprout") {
    return (
      <svg {...shared}>
        <ellipse cx="24" cy="38" rx="14" ry="3" fill="#e8dfce" />
        <path d="M24 38V24" stroke="#2d4a3e" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M24 27c-5-2.5-7.5-1.5-9 2 4.5-1 7-0.5 9 2z"
          fill="#8ec3b2"
          stroke="#446d5d"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M24 24c5-2.5 7.5-1.5 9 2-4.5-1-7-0.5-9 2z"
          fill="#a8d4c0"
          stroke="#446d5d"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (stage === "growing") {
    return (
      <svg {...shared}>
        <ellipse cx="24" cy="38" rx="14" ry="3" fill="#e8dfce" />
        <path d="M18 38v-2.5M24 38v-3M30 38v-2.5" stroke="#9a8b72" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M24 35V20" stroke="#2d4a3e" strokeWidth="2" strokeLinecap="round" />
        <path d="M24 26h-7M24 22h6" stroke="#446d5d" strokeWidth="1.6" strokeLinecap="round" />
        <path
          d="M17 26c-1.5-4 0.5-7 4-8.5-1 3.5 0 6.5 3 8.5z"
          fill="#8ec3b2"
          stroke="#446d5d"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M30 22c1.5-3.5 0-6.5-3.5-8 1 3 0.5 5.5-1.5 8z"
          fill="#a8d4c0"
          stroke="#446d5d"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M24 20c-4.5-1.5-6.5-4.5-5.5-8.5 2.5 2.5 4 5 5.5 8.5z"
          fill="#6b9a82"
          stroke="#2d4a3e"
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg {...shared}>
      <ellipse cx="24" cy="38" rx="14" ry="3" fill="#e8dfce" />
      <path d="M24 38V30" stroke="#5c4a38" strokeWidth="2.2" strokeLinecap="round" />
      <path
        d="M24 30c-9-1-13.5-5.5-12.5-12 3.5 4 7.5 6.5 12.5 8 5-1.5 9-4 12.5-8 1 6.5-3.5 11-12.5 12z"
        fill="#446d5d"
        stroke="#2d4a3e"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M15 24c2-3 5-4.5 9-4.5s7 1.5 9 4.5"
        fill="#6b9a82"
        opacity="0.85"
      />
      <circle cx="17" cy="22" r="1.6" fill="#e8b4b4" stroke="#a64444" strokeWidth="0.8" />
      <circle cx="24" cy="18" r="1.8" fill="#f0d4d4" stroke="#a64444" strokeWidth="0.8" />
      <circle cx="31" cy="22" r="1.6" fill="#e8b4b4" stroke="#a64444" strokeWidth="0.8" />
      <circle cx="21" cy="26" r="1.3" fill="#dcebe3" stroke="#8ec3b2" strokeWidth="0.7" />
      <circle cx="28" cy="26" r="1.3" fill="#dcebe3" stroke="#8ec3b2" strokeWidth="0.7" />
    </svg>
  );
}
