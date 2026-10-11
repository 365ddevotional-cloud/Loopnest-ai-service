import { useState } from "react";
import { MINISTRY_LOGOS, logoForSeed } from "@/lib/ministry-logo";

export function MinistryLogo({ seed, animated = true, still = MINISTRY_LOGOS.still, className = "" }: {
  seed: string | number;
  animated?: boolean;
  still?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <picture>
      <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
      <img src={animated && !failed ? logoForSeed(seed) : still}
        alt="365 Daily Devotional" className={className}
        onError={() => { if (!failed) setFailed(true); }} />
    </picture>
  );
}
