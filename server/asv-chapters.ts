import type { Express } from 'express';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
let chapters: Record<string, unknown> | undefined;
export function getAsvChapter(book: number, chapter: number) {
  if (!chapters) chapters = JSON.parse(gunzipSync(readFileSync(path.join(typeof __dirname === 'string' ? __dirname : path.join(process.cwd(),'server'),'scripture-data/asv1901.json.gz'))).toString('utf8'));
  return chapters![`${book}:${chapter}`] ?? null;
}
export function registerAsvChapters(app: Express) {
  app.get('/api/bible/asv/:book/:chapter', (req,res) => {
    const book=Number(req.params.book),chapter=Number(req.params.chapter);
    if(!Number.isInteger(book)||book<1||book>66||!Number.isInteger(chapter)||chapter<1||chapter>150) {res.status(400).json({message:'Invalid chapter.'});return;}
    try {
      const data=getAsvChapter(book,chapter);
      if(!data){res.status(404).json({message:'Chapter unavailable.'});return;}
      res.setHeader('Cache-Control','public, max-age=3600');
      res.setHeader('X-Scripture-Source','eBible.org ASV1901 2026-10-30');
      res.json(data);
    } catch {res.status(503).json({message:'ASV source unavailable.'});}
  });
}
