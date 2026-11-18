import { test } from 'node:test';
import assert from 'node:assert/strict';
import {createAudioCache,narrationConfig} from './shop-audio-provider';
import {audioTotal, audioOwnership, validReaderParagraphs} from '../shared/shop-audiobook';

test('audio upgrade is $2.99, bundle adds it once, and other currencies cannot use a guessed rate',()=> {
  assert.equal(audioTotal(399,'audio','USD'),299);assert.equal(audioTotal(399,'read-listen','USD'),698);
  assert.equal(audioTotal(499,'read-listen','USD'),798);assert.equal(audioTotal(399,'ebook','USD'),399);
  assert.equal(audioTotal(100000,'audio','NGN'),null);assert.equal(audioTotal(NaN,'audio','USD'),null);
});
test('reader paragraphs require unique stable identifiers and obey the UTF-8 byte limit',()=> {
  assert.ok(validReaderParagraphs([{id:'p1',text:'A useful passage.'}]));
  assert.equal(validReaderParagraphs([{id:'p1',text:'a'},{id:'p1',text:'b'}]),false);
  assert.equal(validReaderParagraphs([{id:'p1',text:'界'.repeat(1501)}]),false);
});
test('provider is disabled without an explicit flag, valid dedicated credentials and spending cap',()=> {
  assert.equal(narrationConfig({}),null);
  assert.equal(narrationConfig({SHOP_AUDIO_ENABLED:'true',SHOP_AUDIO_CHARACTER_BUDGET:'100000',SHOP_AUDIO_GOOGLE_SERVICE_ACCOUNT_JSON:'{"private_key":"bad","client_email":"x","project_id":"x"}'}),null);
});
function fixture() {
  const rows=new Map<string,any>();const objects=new Map<string,Buffer>();let count=0;
  const cache=createAudioCache({
    read:async id=>rows.get(id),claim:async id=>{if(rows.has(id))return false;rows.set(id,{status:'generating'});return true;},
    ready:async(id,key)=>{rows.set(id,{status:'ready',object_key:key});},failed:async id=>{rows.set(id,{status:'failed'});},
    save:async(key,bytes)=>{objects.set(key,bytes);},
  },async text=>{count++;await new Promise(r=>setTimeout(r,5));if(text==='fail')throw new Error('Ambiguous timeout');return Buffer.from('recorded '+text);});
  return {cache,rows,objects,count:()=>count};
}
test('concurrent listeners share one recording; replay and cached playback never regenerate',async()=> {
  const f=fixture();const results=await Promise.all(Array.from({length:12},()=>f.cache('edition','p1','Read me',true)));
  assert.equal(f.count(),1);assert.equal(f.objects.size,1);assert.equal(results.filter(r=>r.key).length,1);
  const replay=await f.cache('edition','p1','Read me',false);assert.ok(replay.key);assert.equal(f.count(),1);
  await f.cache('edition2','p1','Read me',true);assert.equal(f.count(),2,'another edition cannot play a stale recording');
});
test('failed or ambiguous generation is never retried and disabled generation cannot spend',async()=> {
  const f=fixture();assert.deepEqual(await f.cache('e','p','read',false),{pending:true});assert.equal(f.count(),0);
  await assert.rejects(()=>f.cache('e','p','fail',true),/timeout/);
  await assert.rejects(()=>f.cache('e','p','fail',true),/recording repair/);assert.equal(f.count(),1);
});

test('disabled offers and older or unpaid editions never turn an eBook checkout into an audio upgrade',()=> {
 const order={productId:'book',status:'paid',purchaseKind:'ebook',sessionId:'owned'};
 assert.equal(audioOwnership('book',undefined,[order]).ownedBook,undefined);
 assert.equal(audioOwnership('book','edition',[order]).ownedBook,undefined);
 assert.equal(audioOwnership('book','edition',[{...order,readerEditionId:'edition',status:'pending'}]).ownedBook,undefined);
 assert.equal(audioOwnership('book','edition',[{...order,readerEditionId:'edition'}]).ownedBook?.sessionId,'owned');
});
