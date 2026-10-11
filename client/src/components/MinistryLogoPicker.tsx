import { MINISTRY_LOGOS, normalizeMinistryLogo } from "@/lib/ministry-logo";

export function MinistryLogoPicker({ value, onChange, allowAlternate = false }: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  allowAlternate?: boolean;
}) {
  const selected = normalizeMinistryLogo(value) ?? (allowAlternate ? MINISTRY_LOGOS.preferred : "");
  const custom = Boolean(selected && selected !== MINISTRY_LOGOS.preferred && selected !== MINISTRY_LOGOS.still);
  return (
    <label className="block space-y-1 text-xs">
      <span>Ministry logo style</span>
      <select className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={selected} onChange={event => onChange(event.target.value)}>
        <option value={MINISTRY_LOGOS.preferred}>Gold scrolling logo — JESUS CHRIST IS LORD (GIF)</option>
        <option value={MINISTRY_LOGOS.still}>Original still logo</option>
        <option value="">No logo</option>
        {custom && <option value={selected}>Custom uploaded logo</option>}
      </select>
    </label>
  );
}
