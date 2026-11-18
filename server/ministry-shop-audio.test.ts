import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import {PgDialect} from 'drizzle-orm/pg-core';
import {S3Client} from '@aws-sdk/client-s3';
process.env.DATABASE_URL='postgres://fixture:fixture@localhost/unused';
const {db,pool}=await import('./db');
const {registerShopAudiobooks}=await import('./ministry-shop-audio');
test('reader and narration require the correct paid book and separate audio ownership; refunds revoke access',async()=> {
  const sha='a'.repeat(64);
  const edition={id:'edition',product_id:'book',asset_sha256:sha,title:'Book',reviewed:true,audio_reviewed:true,paragraphs:[{id:'p1',text:'A verified paragraph.'}]};
  const orders:any[]=[{session_id:'ebook',firebase_uid:'owner',product_id:'book',status:'paid',purchase_kind:'ebook',assets:[{object_key:'files/'+sha,content_type:'application/pdf'}]}];
  const dialect=new PgDialect();let writes=0;
  const dbMock=mock.method(db,'execute',async(query:any)=> {
    const {sql:q,params:p}=dialect.sqlToQuery(query);
    if(q.includes('FROM ministry_shop_reader_editions WHERE id='))return {rows:p[0]==='edition'?[edition]:[]};
    if(q.includes('FROM ministry_shop_orders WHERE firebase_uid='))return {rows:orders.filter(o=>o.firebase_uid===p[0] && o.product_id===p[1] && ['paid','pending'].includes(o.status))};
    if(q.includes('FROM ministry_shop_orders WHERE session_id='))return {rows:orders.filter(o=>o.session_id===p[0])};
    if(q.includes('SELECT id, payload, published FROM ministry_shop_managed_products'))return {rows:[]};
    if(q.includes('FROM ministry_shop_reader_positions'))return {rows:[]};
    if(q.includes('INSERT INTO ministry_shop_reader_positions')){writes++;return {rows:[]};}
    if(q.includes('FROM ministry_shop_audio_budgets'))return {rows:[]};
    if(q.includes('FROM ministry_shop_audio_segments'))return {rows:[{status:'ready',object_key:'shop-audio/fixture.mp3'}]};
    throw new Error('Unexpected query '+q);
  });
  let confirmations=0;
  const app=express();app.use(express.json());
  registerShopAudiobooks(app,{
    viewer:async req=>{const uid=req.get('authorization');if(!uid)throw Object.assign(new Error('Sign in'),{status:401});return {uid};},
    confirm:async order=>{confirmations++;if(order.status!=='paid')throw Object.assign(new Error('Unpaid'),{status:403});return order;},
    requireAdmin:(_req,res)=>{res.sendStatus(401);},
    r2:new S3Client({region:'auto',endpoint:'https://fixture.r2.cloudflarestorage.com',credentials:{accessKeyId:'fixture',secretAccessKey:'fixture'}}),bucket:'private-fixture',
  });
  try {
    assert.equal((await request(app).get('/api/ministry-shop/reader/edition')).status,401);
    assert.equal((await request(app).get('/api/ministry-shop/reader/edition').set('authorization','stranger')).status,403);
    const text=await request(app).get('/api/ministry-shop/reader/edition').set('authorization','owner');
    assert.equal(text.status,200);assert.equal(text.body.audioOwned,false);assert.equal(text.body.paragraphs[0].text,edition.paragraphs[0].text);assert.ok(confirmations>0);
    assert.equal((await request(app).post('/api/ministry-shop/reader/edition/audio').set('authorization','owner').send({paragraphId:'p1'})).status,403);
    assert.equal((await request(app).put('/api/ministry-shop/reader/edition/position').set('authorization','owner').send({paragraphId:'unknown',seconds:1,speed:1})).status,400);
    assert.equal((await request(app).put('/api/ministry-shop/reader/edition/position').set('authorization','owner').send({paragraphId:'p1',seconds:12,speed:1.25})).status,200);assert.equal(writes,1);
    orders.push({session_id:'audio',firebase_uid:'owner',product_id:'book',status:'paid',purchase_kind:'audio',reader_edition_id:'edition',book_session_id:'ebook'});
    const audio=await request(app).post('/api/ministry-shop/reader/edition/audio').set('authorization','owner').send({paragraphId:'p1'});
    assert.equal(audio.status,200);assert.match(audio.body.url,/shop-audio\/fixture.mp3/);
    assert.equal((await request(app).post('/api/ministry-shop/reader/edition/audio').set('authorization','owner').send({paragraphId:'p1',text:'Arbitrary synthesis attack'})).status,400);
    orders[1].status='revoked';
    assert.equal((await request(app).post('/api/ministry-shop/reader/edition/audio').set('authorization','owner').send({paragraphId:'p1'})).status,403);
    orders[1].status='paid';orders[0].status='revoked';
    assert.equal((await request(app).get('/api/ministry-shop/reader/edition').set('authorization','owner')).status,403);
    assert.equal((await request(app).get('/api/admin/ministry-shop/audiobooks')).status,401);
  }finally{dbMock.mock.restore();await pool.end();}
});
