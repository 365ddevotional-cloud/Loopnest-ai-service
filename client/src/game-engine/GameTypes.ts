export interface ContentItem {
  text: string;
  ref: string;
}

export interface ClaimedItem {
  text: string;
  ref: string;
  affirmation: string;
}

export interface ColorTheme {
  text: string;
  glow: string;
}

export const DIRECTIONS = ["right", "left", "top", "bottom"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export type Phase = "enter" | "visible" | "tapped" | "exit" | "done";
export type Screen = "landing" | "playing" | "results";

export const DEFAULT_SESSION_SIZE = 7;

export const DEFAULT_AFFIRMATIONS = [
  "Hold on to this Word.",
  "Stand on this Truth.",
  "This Promise is Alive in You.",
  "Let this Word strengthen you.",
  "Faith Activated.",
  "Carry this Promise with you.",
  "This Word is working for you.",
];

export const DEFAULT_COLOR_THEMES: readonly ColorTheme[] = [
  { text: "#FFD700", glow: "rgba(255,215,0,0.3)" },
  { text: "#E8D0AA", glow: "rgba(232,208,170,0.25)" },
  { text: "#FF6B6B", glow: "rgba(255,107,107,0.25)" },
  { text: "#7B9CFF", glow: "rgba(123,156,255,0.25)" },
  { text: "#5DCEA0", glow: "rgba(93,206,160,0.25)" },
];

export const TIMING = {
  ENTER: 700,
  VISIBLE: 2500,
  EXIT: 800,
  AFFIRMATION: 1500,
  AFFIRMATION_EXIT: 600,
} as const;

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface GameEngineProps {
  gameId: string;
  gameTitle: string;
  contentData: ContentItem[];
  themeMode: "light" | "dark";
  audioTrack?: string;
  sessionSize?: number;
  affirmations?: string[];
  colorThemes?: readonly ColorTheme[];
  onBack?: () => void;
  onDonate?: () => void;
  brandText?: string;
}
