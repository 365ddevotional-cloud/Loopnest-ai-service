import { useState } from "react";
import { SONG_LANGUAGES, songLanguages, serializeSongLanguages } from "@shared/song-languages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SongLanguagePicker({ value, onChange }: {
  value: string | null | undefined;
  onChange: (value: string) => void;
}) {
  const [custom, setCustom] = useState("");
  const selected = songLanguages(value);
  const options = Array.from(new Set([...SONG_LANGUAGES, ...selected]));
  return <fieldset className="space-y-2">
    <legend className="text-xs font-medium">Languages</legend>
    <p className="text-xs text-muted-foreground">Select every language used. Nigerian Pidgin also appears under English.</p>
    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-md border p-2">
      {options.map(language => <label key={language} className="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" checked={selected.includes(language)} onChange={event => {
          const next = event.target.checked ? [...selected, language] : selected.filter(l => l !== language);
          onChange(serializeSongLanguages(next.join(", ")));
        }} />
        {language}
      </label>)}
    </div>
    <div className="flex gap-2">
      <Input aria-label="Other song language" placeholder="Other language" value={custom} onChange={e => setCustom(e.target.value)} />
      <Button type="button" variant="outline" disabled={!custom.trim()} onClick={() => {
        onChange(serializeSongLanguages([...selected, custom.trim()].join(", ")));
        setCustom("");
      }}>Add</Button>
    </div>
  </fieldset>;
}
