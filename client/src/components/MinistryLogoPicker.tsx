import { MINISTRY_LOGOS } from "@/lib/ministry-logo";

export function MinistryLogoPicker({ value, onChange, allowAlternate = false }: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  allowAlternate?: boolean;
}) {
  const selected = value ?? (allowAlternate ? "alternate" : "");
  const custom = Boolean(selected && selected !== "alternate" && !Object.values(MINISTRY_LOGOS).some(url => url === selected));
  return (
    <label className="block space-y-1 text-xs">
      <span>Ministry logo style</span>
      <select className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={selected} onChange={event => onChange(event.target.value)}>
        {allowAlternate && <option value="alternate">Alternate white and gold — JESUS CHRIST IS LORD</option>}
        <option value={MINISTRY_LOGOS.white}>White outline — JESUS CHRIST IS LORD (GIF)</option>
        <option value={MINISTRY_LOGOS.gold}>Gold outline — JESUS CHRIST IS LORD (GIF)</option>
        <option value={MINISTRY_LOGOS.still}>Original still logo</option>
        <option value="">No logo</option>
        {custom && <option value={selected}>Custom uploaded logo</option>}
      </select>
    </label>
  );
}
