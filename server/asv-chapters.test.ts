import {test} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { getAsvChapter,registerAsvChapters } from './asv-chapters';
test('publisher ASV preserves source words, numbering, chapter limits and delivery',async()=>{
 const app=express();registerAsvChapters(app);
 const r=await request(app).get('/api/bible/asv/20/4').expect(200);
 assert.equal(r.body.actualTranslation,'ASV');assert.match(r.body.verses.find((v:any)=>v.verse===7).text,/^Wisdom \[is\] the principal thing/);
 assert.match(r.headers['cache-control'],/public/);
 assert.equal((getAsvChapter(19,119) as any).verses.length,176);
 assert.equal((getAsvChapter(40,17) as any).verses.find((v:any)=>v.verse===21).text,'','publisher omission is preserved without renumbering');
 await request(app).get('/api/bible/asv/67/1').expect(400);
 await request(app).get('/api/bible/asv/1/999').expect(400);
 await request(app).get('/api/bible/asv/1/51').expect(404);
 const john=await request(app).get('/api/bible/asv/43/3').expect(200);assert.match(john.body.verses.find((v:any)=>v.verse===16).text,/For God so loved the world/);
});
