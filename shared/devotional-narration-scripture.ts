// Verified John 8:12 quotations selected by the ministry on 2026-11-20.
// Preserve published spelling. Never machine-retranslate a Scripture quotation.
// Biblica Open Yoruba Contemporary Bible © 2009, 2017; Open Igbo Contemporary
// Bible © 1980, 1988, 2019, 2020. CC BY-SA 4.0.
export function narrationScripture(reference:string,language:string,original:string) {
  if(!/^John\s+8:12$/i.test(reference.trim()))return original;
  if(language==='yo')return 'Jesu sì tún sọ fún wọn pé, “Èmi ni ìmọ́lẹ̀ ayé, ẹni tí ó bá tọ̀ mí lẹ́yìn kì yóò rìn nínú òkùnkùn, ṣùgbọ́n yóò ní ìmọ́lẹ̀ ìyè.”';
  if(language==='ig')return 'Ọzọ, Jisọs gwara ha sị, “Abụ m ihe nke ụwa. Onye ọbụla na-eso m agaghị ejegharị nʼọchịchịrị, kama ọ ga-enwe ìhè nke ndụ.”';
  return original;
}
