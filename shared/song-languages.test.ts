import test from "node:test";
import assert from "node:assert/strict";
import { songLanguageCategories, serializeSongLanguages } from "./song-languages";

test("existing English and Mandarin releases keep their categories", () => {
  assert.deepEqual(songLanguageCategories("English"), ["English"]);
  assert.deepEqual(songLanguageCategories("Mandarin Chinese"), ["Mandarin Chinese"]);
  assert.deepEqual(songLanguageCategories(null), []);
});
test("Punjabi and Pidgin release appears in three separate collections", () => {
  const categories = songLanguageCategories("Punjabi, Pidgin English");
  assert.deepEqual(categories, ["Punjabi", "Nigerian Pidgin", "English"]);
  assert.equal(categories.includes("Hindi"), false);
  for (const filter of ["Punjabi", "Nigerian Pidgin", "English"]) {
    assert.equal([{language: "Punjabi, Pidgin English"}, {language: "Mandarin Chinese"}]
      .filter(song => songLanguageCategories(song.language).includes(filter)).length, 1);
  }
});
test("aliases, custom languages and repeated saves retain stable categories", () => {
  const saved = serializeSongLanguages("Punjabi + Pidgin / English, Punjabi");
  assert.equal(saved, "Punjabi, Nigerian Pidgin, English");
  assert.equal(serializeSongLanguages(saved), saved);
  assert.equal(serializeSongLanguages("Mandrain"), "Mandarin Chinese");
  assert.equal(serializeSongLanguages("Twi; English"), "Twi, English");
});
