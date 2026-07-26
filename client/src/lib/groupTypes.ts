export const GROUP_TYPES = [
  { value: "family",            label: "Family" },
  { value: "prayer",            label: "Prayer Group" },
  { value: "workplace",         label: "Workplace" },
  { value: "school_class",      label: "School Class" },
  { value: "football_team",     label: "Football Team" },
  { value: "basketball_team",   label: "Basketball Team" },
  { value: "sports_team",       label: "Sports Team" },
  { value: "scouts",            label: "Boy Scouts / Girl Scouts" },
  { value: "military",          label: "Military Unit" },
  { value: "business_network",  label: "Business Network" },
  { value: "market_association",label: "Market Association" },
  { value: "community",         label: "Community" },
  { value: "neighborhood",      label: "Neighborhood" },
  { value: "volunteer",         label: "Volunteer Team" },
  { value: "ngo",               label: "NGO / Nonprofit" },
  { value: "bible_study",       label: "Bible Study" },
  { value: "youth",             label: "Youth Group" },
  { value: "womens",            label: "Women's Group" },
  { value: "mens",              label: "Men's Group" },
  { value: "couples",           label: "Couples Group" },
  { value: "choir",             label: "Choir" },
  { value: "music_band",        label: "Music Band" },
  { value: "alumni",            label: "Alumni Group" },
  { value: "friends",           label: "Friends" },
  { value: "custom",            label: "Other / Custom" },
] as const;

const BADGE_MAP: Record<string, { cls: string; label: string }> = {
  family:             { cls: "bg-amber-50 text-amber-800 border-amber-200",   label: "Family" },
  couples:            { cls: "bg-amber-50 text-amber-800 border-amber-200",   label: "Couples Group" },
  friends:            { cls: "bg-amber-50 text-amber-800 border-amber-200",   label: "Friends" },
  prayer:             { cls: "bg-purple-50 text-purple-800 border-purple-200",label: "Prayer Group" },
  bible_study:        { cls: "bg-purple-50 text-purple-800 border-purple-200",label: "Bible Study" },
  youth:              { cls: "bg-purple-50 text-purple-800 border-purple-200",label: "Youth Group" },
  womens:             { cls: "bg-purple-50 text-purple-800 border-purple-200",label: "Women's Group" },
  choir:              { cls: "bg-purple-50 text-purple-800 border-purple-200",label: "Choir" },
  music_band:         { cls: "bg-purple-50 text-purple-800 border-purple-200",label: "Music Band" },
  workplace:          { cls: "bg-blue-50 text-blue-800 border-blue-200",      label: "Workplace" },
  business_network:   { cls: "bg-blue-50 text-blue-800 border-blue-200",      label: "Business Network" },
  market_association: { cls: "bg-blue-50 text-blue-800 border-blue-200",      label: "Market Association" },
  school_class:       { cls: "bg-blue-50 text-blue-800 border-blue-200",      label: "School Class" },
  mens:               { cls: "bg-blue-50 text-blue-800 border-blue-200",      label: "Men's Group" },
  football_team:      { cls: "bg-green-50 text-green-800 border-green-200",   label: "Football Team" },
  basketball_team:    { cls: "bg-green-50 text-green-800 border-green-200",   label: "Basketball Team" },
  sports_team:        { cls: "bg-green-50 text-green-800 border-green-200",   label: "Sports Team" },
  scouts:             { cls: "bg-green-50 text-green-800 border-green-200",   label: "Boy Scouts / Girl Scouts" },
  military:           { cls: "bg-slate-100 text-slate-800 border-slate-300",  label: "Military Unit" },
  community:          { cls: "bg-teal-50 text-teal-800 border-teal-200",      label: "Community" },
  neighborhood:       { cls: "bg-teal-50 text-teal-800 border-teal-200",      label: "Neighborhood" },
  volunteer:          { cls: "bg-teal-50 text-teal-800 border-teal-200",      label: "Volunteer Team" },
  ngo:                { cls: "bg-teal-50 text-teal-800 border-teal-200",      label: "NGO / Nonprofit" },
  alumni:             { cls: "bg-stone-50 text-stone-700 border-stone-300",   label: "Alumni Group" },
  // Legacy values from previous implementation
  other:              { cls: "bg-teal-50 text-teal-800 border-teal-200",      label: "Community Group" },
  sports:             { cls: "bg-green-50 text-green-800 border-green-200",   label: "Sports Team" },
};

export function getGroupTypeBadge(groupType: string): { cls: string; label: string } {
  if (!groupType || groupType === "other") {
    return { cls: "bg-teal-50 text-teal-800 border-teal-200", label: "Community Group" };
  }
  const known = BADGE_MAP[groupType.toLowerCase()];
  if (known) return known;
  return { cls: "bg-stone-50 text-stone-700 border-stone-300", label: groupType };
}
