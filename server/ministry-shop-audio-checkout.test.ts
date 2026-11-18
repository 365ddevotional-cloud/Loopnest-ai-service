import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {PgDialect} from 'drizzle-orm/pg-core';
import {S3Client,HeadObjectCommand} from '@aws-sdk/client-s3';
process.env.DATABASE_URL='postgres://fixture:fixture@localhost/unused';
Object.assign(process.env,{NODE_ENV:'test',R2_ACCOUNT_ID:'fixture',R2_BUCKET_NAME:'public-fixture',SHOP_R2_PRIVATE_BUCKET:'private-fixture',SHOP_R2_ACCESS_KEY_ID:'fixture',SHOP_R2_SECRET_ACCESS_KEY:'fixture',STRIPE_SECRET_KEY:'sk_test_fixture',STRIPE_SHOP_WEBHOOK_SECRET:'whsec_fixture',SHOP_STRIPE_COUNTRIES:'US',SHOP_CHECKOUT_ENABLED:'true'});
const {db,pool}=await import('./db');
const {registerMinistryShopCommerce}=await import('./ministry-shop-commerce');
test('checkout preserves PDF sales, prices audio on the server, binds editions, and revokes refunded upgrades',async()=> {
 const sha='a'.repeat(64);const bookId='fixture-book';
 const asset={object_key:'ministry-shop/fixture-book/'+sha,file_name:'Book.pdf',content_type:'application/pdf',size_bytes:'123'};
 const product={id:bookId,title:'Fixture book',kind:'Book',sourcePrice:'$3.99',useBasePrice:true,requiredFileCount:1,packageFormat:'pdf'};
 const edition={id:'edition',product_id:bookId,asset_sha256:sha,title:'Fixture book',reviewed:true,audio_reviewed:true,paragraphs:[{id:'p1',text:'A complete passage.'}]};
 const orders:any[]=[];const sessions=new Map<string,any>();let created=0;let reserved=0;
 const dialect=new PgDialect();
 const execute=async(query:any)=> {
  const {sql:raw,params:p}=dialect.sqlToQuery(query);const q=raw.replace(/\s+/g,' ').trim().replace(/\s*=\s*/g,'=');
  if(q==='SELECT id, payload, published FROM ministry_shop_managed_products')return {rows:[{id:bookId,payload:product,published:true}]};
  if(q.includes('FROM ministry_shop_sales_controls'))return {rows:[]};
  if(q.includes('FROM ministry_shop_assets WHERE product_id='))return {rows:[asset]};
  if(q.includes('SELECT assets.*'))return {rows:[{...asset,product_id:bookId}]};
  if(q.includes('FROM ministry_shop_reader_editions e'))return {rows:p[0]===bookId?[edition]:[]};
  if(q.startsWith('SELECT pg_advisory'))return {rows:[]};
  if(q.includes('SELECT cache_id FROM ministry_shop_audio_budgets'))return {rows:reserved?[{cache_id:p[0]}]:[]};
  if(q.includes('SUM(characters)'))return {rows:[{total:String(reserved)}]};
  if(q.startsWith('INSERT INTO ministry_shop_audio_budgets')){reserved=Number(p[1]);return {rows:[]};}
  if(q.startsWith('SELECT session_id, status FROM ministry_shop_orders'))return {rows:[]};
  if(q.startsWith('SELECT * FROM ministry_shop_orders WHERE session_id='))return {rows:orders.filter(o=>o.session_id===p[0])};
  if(q.startsWith('SELECT * FROM ministry_shop_orders WHERE firebase_uid='))return {rows:orders.filter(o=>o.firebase_uid===p[0] && o.product_id===p[1] && o.purchase_kind!=='audio' && ['paid','pending'].includes(o.status))};
  if(q.startsWith('INSERT INTO ministry_shop_orders')){
   orders.push({session_id:p[0],firebase_uid:p[1],product_id:p[2],amount:p[3],currency:p[4],assets:JSON.parse(p[5] as string),purchase_kind:p[6],reader_edition_id:p[7],book_session_id:p[8],status:'pending',payment_intent_id:null,download_expires_at:null});return {rows:[]};
  }
  if(q.startsWith("UPDATE ministry_shop_orders SET status='paid'")){
   const order=orders.find(o=>o.session_id===p[2]);if(['pending','paid'].includes(order.status)){order.status='paid';order.payment_intent_id=p[0];order.download_expires_at??=p[1];}return {rows:[]};
  }
  if(q.startsWith("UPDATE ministry_shop_orders SET status='revoked'")){orders.filter(o=>o.payment_intent_id===p[0]).forEach(o=>o.status='revoked');return {rows:[]};}
  console.error('Unexpected fixture query',q);throw new Error('Unexpected query '+q);
 };
 const dbMock=mock.method(db,'execute',execute);const transaction=mock.method(db,'transaction',async(fn:any)=>fn({execute}));
 const storage=mock.method(S3Client.prototype,'send',async(command:any)=>{assert.ok(command instanceof HeadObjectCommand);return {ContentLength:123,Metadata:{sha256:sha}};});
 const stripe:any={checkout:{sessions:{
  retrieve:async(id:string)=>sessions.get(id),
  create:async(data:any)=>{const id='cs_test_fixture'+(++created);const session={id,status:'open',url:'https://checkout.stripe.com/fixture',...data,amount_total:data.line_items[0].price_data.unit_amount,currency:data.line_items[0].price_data.currency};sessions.set(id,session);return session;},
 }},webhooks:{constructEvent:(body:Buffer,signature:string)=>{assert.equal(signature,'fixture');return JSON.parse(body.toString());}}};
 const app=express();app.use(express.json({verify:(req:any,_res,buf)=>{req.rawBody=buf;}}));
 registerMinistryShopCommerce(app,async(token)=>({uid:token,email:'fixture@example.com',email_verified:true}),(_req,res)=>{res.sendStatus(401);},{stripe});
 const checkout=(body:any,uid='owner')=>request(app).post('/api/ministry-shop/checkout').set('authorization','Bearer '+uid).send({productId:bookId,country:'US',currency:'USD',acceptedDownloadPolicy:true,...body});
 function paid(id:string) {
  const s=sessions.get(id);Object.assign(s,{mode:'payment',status:'complete',payment_status:'paid',payment_intent:{id:'pi_'+id,status:'succeeded',latest_charge:{paid:true,amount_refunded:0,disputed:false,created:Math.floor(Date.now()/1000)}}});
 }
 try {
  delete process.env.SHOP_AUDIO_ENABLED;
  const ebook=await checkout({amount:399});assert.equal(ebook.status,200);assert.equal(orders[0].purchase_kind,'ebook');
  assert.equal((await checkout({amount:698,purchaseKind:'read-listen'})).status,409,'provider off cannot sell audio');
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});
  Object.assign(process.env,{SHOP_AUDIO_ENABLED:'true',SHOP_AUDIO_CHARACTER_BUDGET:'100000',SHOP_AUDIO_GOOGLE_SERVICE_ACCOUNT_JSON:JSON.stringify({client_email:'fixture@example.com',project_id:'fixture',private_key:privateKey.export({type:'pkcs8',format:'pem'})})});
  assert.equal((await checkout({amount:399,purchaseKind:'read-listen'})).status,409,'browser cannot underprice bundle');
  assert.equal((await checkout({amount:299,purchaseKind:'audio'},'stranger')).status,403,'audio-only requires book ownership');
  assert.equal((await checkout({amount:299,purchaseKind:'audio'})).status,403,'pending unpaid ebook does not unlock upgrade');
  paid(orders[0].session_id);
  const audio=await checkout({amount:299,purchaseKind:'audio'});assert.equal(audio.status,200,JSON.stringify(audio.body));
  const audioOrder=orders[1];assert.equal(audioOrder.book_session_id,orders[0].session_id);assert.equal(audioOrder.reader_edition_id,'edition');assert.equal(audioOrder.amount,299);assert.ok(reserved>0);
  assert.equal((await request(app).post('/api/ministry-shop/download').set('authorization','Bearer owner').send({sessionId:audioOrder.session_id})).status,409,'audio upgrade cannot download PDF as a second book purchase');
  const bundle=await checkout({amount:698,purchaseKind:'read-listen'},'new-owner');assert.equal(bundle.status,200);
  assert.equal(orders[2].amount,698);assert.equal(sessions.get(orders[2].session_id).metadata.editionId,'edition');
  paid(audioOrder.session_id);
  const session=sessions.get(audioOrder.session_id);
  session.metadata.editionId='tampered';
  const event={type:'checkout.session.completed',data:{object:session}};
  assert.equal((await request(app).post('/api/ministry-shop/webhook').set('stripe-signature','fixture').send(event)).status,204);assert.equal(audioOrder.status,'pending','wrong edition metadata must not unlock audio');
  session.metadata.editionId='edition';
  await request(app).post('/api/ministry-shop/webhook').set('stripe-signature','fixture').send(event);
  assert.equal(audioOrder.status,'paid');
  await request(app).post('/api/ministry-shop/webhook').set('stripe-signature','fixture').send({type:'charge.refunded',data:{object:{payment_intent:audioOrder.payment_intent_id}}});
  assert.equal(audioOrder.status,'revoked');
  process.env.SHOP_AUDIO_CHARACTER_BUDGET='1';reserved=0;
  assert.equal((await checkout({amount:698,purchaseKind:'read-listen'},'over-budget')).status,409,'budget reserved before taking a payment');
 }finally{dbMock.mock.restore();transaction.mock.restore();storage.mock.restore();await pool.end();}
});
