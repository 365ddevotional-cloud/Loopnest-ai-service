import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {validReaderParagraphs} from '../shared/shop-audiobook';
test('all fourteen prepared readers are private drafts tied to distinct finished PDFs',async()=> {
 const names=await readdir('server/shop-reader-drafts');
 const drafts=await Promise.all(names.map(async name=>JSON.parse(await readFile('server/shop-reader-drafts/'+name,'utf8'))));
 assert.equal(drafts.length,14);assert.equal(new Set(drafts.map((d:any)=>d.productId)).size,14);
 for(const d of drafts){assert.match(d.assetSha256,/^[a-f0-9]{64}$/);assert.equal(d.reviewed,false);assert.ok(validReaderParagraphs(d.paragraphs),d.title);assert.ok(d.paragraphs.length>100);}
 assert.equal(drafts.find((d:any)=>d.productId==='ca1b6edd72b64b469d81956f03c4b288').assetSha256,'ebefbe359a77f60cf6dad84f5c250058bea9166fbcf949c08400f963badf156a','Listen First uses the completed sixty-page edition');
});
