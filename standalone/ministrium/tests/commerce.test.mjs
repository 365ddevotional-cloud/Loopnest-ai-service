import {workspaceMigrations} from '../server/migration-list.mjs';
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import express from 'express';
import Stripe from 'stripe';
import {PGlite} from '@electric-sql/pglite';
import {applyWorkspaceMigration} from '../server/migrations.mjs';
import {createWorkspaceService} from '../server/workspaces.mjs';
import {createCommerce,commissionAmount} from '../server/commerce.mjs';
import {commerceConfiguration,createStripeProvider,sellerTermsVersion} from '../server/payment-provider.mjs';
import {registerWorkspaceRoutes} from '../server/workspace-routes.mjs';
import {registerPaymentWebhook} from '../server/commerce-routes.mjs';
const owner={uid:'shop-owner',email:'owner@example.com',email_verified:true},member={uid:'shop-member',email:'member@example.com',email_verified:true},buyer={uid:'shop-buyer',email:'buyer@example.com',email_verified:true},outsider={uid:'shop-outsider',email:'other@example.com',email_verified:true};
const config={enabled:true,mode:'sandbox',feeBps:500,origin:'https://ministrium.example.com'};
const terms={acceptTerms:true,feeBps:500,termsVersion:sellerTermsVersion};
const input={title:'Ministry workbook',description:'An original test resource.',priceCents:1200,content:'Paid text that must never appear in a catalogue.',published:true};
let db,workspace,other,group,commerce,product,draft,order,session,server,base,checkoutCalls=0,refundCalls=0,active=true,feeRefunded=0,disputeStatus=null,wrongAmount=false;
const provider={
 createSeller:async()=>({id:'acct_seller',livemode:false}),onboarding:async()=>({url:'https://connect.stripe.com/test-onboard'}),
 seller:async()=>({livemode:false,metadata:{ministrium_org:workspace.id},dashboard:'full',defaults:{responsibilities:{fees_collector:'stripe',losses_collector:'stripe'}},configuration:{merchant:{capabilities:{card_payments:{status:active?'active':'restricted'}}}}}),
 checkout:async o=>{checkoutCalls++;session={id:`cs_test_${o.id}`,url:'https://checkout.stripe.com/c/pay/test',livemode:false,metadata:{ministrium_order:o.id},client_reference_id:o.id,currency:'usd',amount_total:o.gross_cents,payment_status:'unpaid',status:'open',payment_intent:null};return session;},
 session:async()=>{if(wrongAmount)return {...session,amount_total:1};return structuredClone(session);},
 applicationFee:async()=>({id:'fee_test',account:'acct_seller',charge:'ch_test',amount:60,amount_refunded:feeRefunded,currency:'usd',livemode:false}),
 disputes:async()=>({data:disputeStatus?[{status:disputeStatus}]:[],has_more:false}),
 chargePaymentIntent:async()=>session.payment_intent.id,
 refund:async()=>{refundCalls++;return {status:'succeeded'};},
};
before(async()=>{
 db=new PGlite();for(const [i,name]of workspaceMigrations.entries())await applyWorkspaceMigration(db,await readFile(new URL(`../migrations/${name}`,import.meta.url),'utf8'),i+1);
 const groups=createWorkspaceService(db);workspace=await groups.create(owner,{name:'Test ministry',slug:'test-ministry-shop',kind:'ministry',country:'US'});other=await groups.create(outsider,{name:'Other ministry',slug:'other-ministry-shop',kind:'church',country:'US'});group=await groups.create(owner,{name:'Free family',slug:'free-family-shop',kind:'group',groupType:'family',country:'US'});const inv=await groups.invite(owner,workspace.id,{email:member.email});await groups.join(member,inv.token);
 commerce=createCommerce(db,config,provider);const app=express();app.use(express.json());registerWorkspaceRoutes(app,db,async token=>{const users={owner,member,buyer,outsider};if(!users[token])throw new Error('Invalid token');return users[token];},commerce);app.use((e,_q,res,_n)=>res.status(500).json({message:'Request failed'}));server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();});
test('commerce configuration refuses live keys/modes and requires explicit sandbox fee/webhook/origin',()=>{
 assert.equal(commerceConfiguration({STRIPE_SECRET_KEY:'inherited'}).enabled,false);
 const env={MINISTRIUM_COMMERCE_MODE:'sandbox',MINISTRIUM_STRIPE_TEST_KEY:['rk','test','fixture'].join('_'),MINISTRIUM_STRIPE_WEBHOOK_SECRET:'whsec_fixture',MINISTRIUM_COMMERCE_FEE_BPS:'500',MINISTRIUM_PUBLIC_ORIGIN:'https://ministrium.example.com'};
 assert.equal(commerceConfiguration(env).feeBps,500);
 for(const change of [{MINISTRIUM_COMMERCE_MODE:'live'},{MINISTRIUM_STRIPE_TEST_KEY:['rk','live','fixture'].join('_')},{MINISTRIUM_COMMERCE_FEE_BPS:undefined},{MINISTRIUM_COMMERCE_FEE_BPS:'500.1'},{MINISTRIUM_STRIPE_WEBHOOK_SECRET:undefined},{MINISTRIUM_PUBLIC_ORIGIN:'https://evil.test/path'}])assert.throws(()=>commerceConfiguration({...env,...change}));
 assert.equal(commissionAmount(1200,500),60);assert.equal(commissionAmount(101,500),5);
});
test('only church/ministry leaders manage resources; buyers see metadata without paid text or drafts',async()=>{
 product=await commerce.createProduct(owner,workspace.id,input);draft=await commerce.createProduct(owner,workspace.id,{...input,title:'Private draft',published:false});
 assert.equal((await commerce.catalogue(buyer,workspace.id)).products.length,1);assert.equal('content' in (await commerce.catalogue(buyer,workspace.id)).products[0],false);
 assert.equal((await commerce.products(owner,workspace.id))[0].content,input.content);
 await assert.rejects(commerce.products(member,workspace.id),{status:404});await assert.rejects(commerce.createProduct(owner,group.id,input),{status:404});await assert.rejects(commerce.updateProduct(outsider,other.id,product.id,{version:1,data:input}),{status:409});
 assert.throws(()=>commerce.createProduct(owner,workspace.id,{...input,organizationId:other.id}),{status:400});assert.throws(()=>commerce.createProduct(owner,workspace.id,{...input,priceCents:1.1}),{status:400});
});
test('seller setup is owner-only with current explicit terms and commission',async()=>{
 await assert.rejects(commerce.onboard(member,workspace.id,terms),{status:404});assert.throws(()=>commerce.onboard(owner,workspace.id,{...terms,feeBps:100}),{status:409});
 await commerce.onboard(owner,workspace.id,terms);assert.equal((await commerce.sellerStatus(owner,workspace.id)).ready,true);
 active=false;assert.equal((await commerce.sellerStatus(owner,workspace.id)).ready,false);active=true;
});
test('checkout prices and commission are server snapshots, with buyer/request idempotency',async()=>{
 const requestKey=randomUUID(),request={organizationId:workspace.id,productId:product.id,requestKey};
 await assert.rejects(commerce.checkout(buyer,{...request,grossCents:1}),{status:400});
 const first=await commerce.checkout(buyer,request),again=await commerce.checkout(buyer,request);assert.equal(first.orderId,again.orderId);
 assert.equal((await commerce.checkout(buyer,{...request,requestKey:randomUUID()})).orderId,first.orderId);
 active=false;await assert.rejects(commerce.checkout(buyer,request),{status:409});active=true;
 order=(await db.query('SELECT * FROM ministrium.orders WHERE id=$1',[first.orderId])).rows[0];assert.equal(order.gross_cents,1200);assert.equal(order.commission_cents,60);assert.equal((await commerce.orders(buyer)).length,1);
 await assert.rejects(commerce.checkout(buyer,{...request,productId:draft.id}),{status:409});await assert.rejects(commerce.checkout(outsider,{...request,requestKey:randomUUID(),productId:draft.id}),{status:404});
 await assert.rejects(commerce.delivery(buyer,order.id),{status:403});await assert.rejects(commerce.delivery(outsider,order.id),{status:404});assert.equal((await commerce.orders(outsider)).length,0);
});
test('only a matched paid provider session grants snapshot access, never a success-page visit',async()=>{
 await commerce.reconcileBuyer(buyer,order.id);assert.equal((await commerce.orders(buyer))[0].status,'pending');
 session.payment_status='paid';session.status='complete';session.payment_intent={id:'pi_test',status:'succeeded',amount:1200,currency:'usd',application_fee_amount:60,metadata:{ministrium_order:order.id},latest_charge:{id:'ch_test',paid:true,amount:1200,currency:'usd',amount_refunded:0,payment_intent:'pi_test',application_fee:'fee_test',disputed:false,balance_transaction:{currency:'usd',fee:125,net:1075}}};
 wrongAmount=true;await assert.rejects(commerce.reconcileBuyer(buyer,order.id),{status:409});await assert.rejects(commerce.delivery(buyer,order.id),{status:409});wrongAmount=false;
 await commerce.reconcileBuyer(buyer,order.id);assert.equal((await commerce.delivery(buyer,order.id)).content,input.content);assert.equal((await commerce.orders(buyer))[0].processorFeeCents,125);
 session.payment_intent.application_fee_amount=0;await assert.rejects(commerce.delivery(buyer,order.id),{status:409});session.payment_intent.application_fee_amount=60;
 assert.equal((await commerce.reconcileSeller(owner,workspace.id,order.id)).status,'paid');
 await commerce.updateProduct(owner,workspace.id,product.id,{version:1,data:{...input,priceCents:2500,content:'New edition'}});assert.equal((await commerce.delivery(buyer,order.id)).content,input.content);
});
test('webhooks require account scope, deduplicate and reread authoritative state',async()=>{
 const event={id:'evt_test',type:'checkout.session.completed',account:'acct_seller',livemode:false,data:{object:{id:session.id,payment_status:'unpaid'}}};
 assert.equal((await commerce.webhook({...event,account:'acct_other'})).ignored,true);await assert.rejects(commerce.webhook({...event,livemode:true}),{status:400});
 assert.equal((await commerce.webhook(event)).status,'paid');assert.equal((await commerce.webhook(event)).duplicate,true);
 assert.equal((await db.query('SELECT count(*)::int AS n FROM ministrium.commerce_events')).rows[0].n,1);
});
test('disputes suspend delivery; authoritative won status restores it',async()=>{
 session.payment_intent.latest_charge.disputed=true;disputeStatus='needs_response';await commerce.webhook({id:'evt_dispute',type:'charge.dispute.created',account:'acct_seller',livemode:false,data:{object:{charge:'ch_test'}}});await assert.rejects(commerce.delivery(buyer,order.id),{status:403});
 disputeStatus='won';await commerce.reconcileBuyer(buyer,order.id);assert.equal((await commerce.orders(buyer))[0].status,'paid');
});
test('owner full refunds use provider idempotency; partial/full refunds revoke access and reconcile commission',async()=>{
 await assert.rejects(commerce.refund(member,workspace.id,order.id,{confirm:true}),{status:404});
 await commerce.refund(owner,workspace.id,order.id,{confirm:true});assert.equal(refundCalls,1);
 session.payment_intent.latest_charge.amount_refunded=600;feeRefunded=30;await commerce.reconcileBuyer(buyer,order.id);assert.equal((await commerce.orders(buyer))[0].status,'partially_refunded');await assert.rejects(commerce.delivery(buyer,order.id),{status:403});
 await assert.rejects(commerce.refund(owner,workspace.id,order.id,{confirm:true}),{status:409});
 session.payment_intent.latest_charge.amount_refunded=1200;feeRefunded=60;await commerce.webhook({id:'evt_fee',type:'application_fee.refunded',livemode:false,data:{object:{account:'acct_seller',charge:'ch_test'}}});const row=(await commerce.sellerOrders(owner,workspace.id))[0];assert.equal(row.status,'refunded');assert.equal(row.commissionRefundedCents,60);await assert.rejects(commerce.delivery(buyer,order.id),{status:403});
 await commerce.refund(owner,workspace.id,order.id,{confirm:true});assert.equal(refundCalls,1);
});
test('resource versions/archive prevent stale edits and new sales, keeping existing order snapshots',async()=>{
 await assert.rejects(commerce.updateProduct(owner,workspace.id,product.id,{version:1,data:input}),{status:409});await commerce.archiveProduct(owner,workspace.id,product.id,{version:2,archived:true});assert.equal((await commerce.catalogue(buyer,workspace.id)).products.length,0);await assert.rejects(commerce.checkout(buyer,{organizationId:workspace.id,productId:product.id,requestKey:randomUUID()}),{status:404});await commerce.archiveProduct(owner,workspace.id,product.id,{version:3,archived:false});assert.equal((await commerce.catalogue(buyer,workspace.id)).products.length,1);
});
test('failed and expired sessions never unlock delivery; old unpaid snapshots cannot restore a refund',async()=>{
 session.payment_status='unpaid';session.status='expired';await commerce.reconcileBuyer(buyer,order.id);assert.equal((await commerce.orders(buyer))[0].status,'refunded');
 const resource=await commerce.createProduct(owner,workspace.id,{...input,title:'Failure test resource'}),request={organizationId:workspace.id,productId:resource.id,requestKey:randomUUID()};
 const pending=await commerce.checkout(buyer,request);session.payment_status='unpaid';session.status='complete';session.payment_intent={status:'requires_payment_method'};await commerce.reconcileBuyer(buyer,pending.orderId);assert.equal((await commerce.orders(buyer)).find(x=>x.id===pending.orderId).status,'failed');await assert.rejects(commerce.delivery(buyer,pending.orderId),{status:403});
 const retry=await commerce.checkout(buyer,{...request,requestKey:randomUUID()});session.status='expired';const expired=await commerce.checkout(buyer,{...request,requestKey:randomUUID()});assert.equal(expired.orderId,retry.orderId);assert.equal(expired.status,'expired');
});
test('disabled commerce fails closed while allowing draft catalogue preparation',async()=>{
 const off=createCommerce(db);assert.equal(off.status().livePaymentsEnabled,false);await assert.rejects(off.checkout(buyer,{}),{status:503});assert.throws(()=>off.onboard(owner,workspace.id,terms),{status:503});assert.equal((await off.catalogue(buyer,workspace.id)).products.length,2);
});
test('HTTP commerce endpoints bind identities, never leak content or accept anonymous requests',async()=>{
 assert.equal((await fetch(`${base}/api/commerce/orders`)).status,401);const r=await fetch(`${base}/api/commerce/catalogue/${workspace.id}`,{headers:{Authorization:'Bearer buyer'}});assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(JSON.stringify(await r.json()).includes('Paid text'),false);
 const access=await fetch(`${base}/api/commerce/orders/${order.id}/delivery`,{headers:{Authorization:'Bearer outsider'}});assert.equal(access.status,404);
});
test('Stripe adapter uses v2 hosted onboarding, direct fees, stable checkout retries and signed events',async()=>{
 const calls=[];const client={v2:{core:{accounts:{create:async(...x)=>calls.push(['account',...x]),retrieve:async()=>({})},accountLinks:{create:async(...x)=>calls.push(['link',...x])}}},checkout:{sessions:{create:async(...x)=>calls.push(['checkout',...x])}},refunds:{create:async(...x)=>calls.push(['refund',...x])}};
 const adapter=createStripeProvider({...config,webhookSecret:'whsec_fixture'},client);await adapter.createSeller({org:workspace.id,email:owner.email,name:'Test',country:'US'});await adapter.onboarding('acct_seller',workspace.id);await adapter.checkout(order);await adapter.checkout(order);await adapter.refund({...order,stripe_payment_intent:'pi_test'});
 assert.equal(calls[0][1].dashboard,'full');assert.equal(calls[0][1].defaults.responsibilities.fees_collector,'stripe');assert.equal(calls[1][1].use_case.type,'account_onboarding');assert.equal(calls[2][1].payment_intent_data.application_fee_amount,60);assert.equal(calls[2][2].stripeAccount,'acct_seller');assert.deepEqual(calls[2],calls[3]);assert.equal('payment_method_types' in calls[2][1],false);assert.equal(calls[4][1].refund_application_fee,true);
 const sdk=new Stripe(['sk','test','fixture'].join('_'));const signed=createStripeProvider({...config,webhookSecret:'whsec_fixture'},sdk),payload=JSON.stringify({id:'evt_signed',livemode:false});const signature=sdk.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'});assert.equal(signed.event(Buffer.from(payload),signature).id,'evt_signed');assert.throws(()=>signed.event(Buffer.from(payload),'invalid'));
});
test('HTTP webhook validates the raw-body signature before processing or retrying',async()=>{
 const sdk=new Stripe(['sk','test','fixture'].join('_')),signed=createStripeProvider({...config,webhookSecret:'whsec_fixture'},sdk),app=express();let called=0,fail=false;
 registerPaymentWebhook(app,()=>({webhook:async e=>{called++;if(fail)throw new Error('Retry');return {received:e.id};}}),signed);app.use(express.json());const s=await new Promise(resolve=>{const server=app.listen(0,'127.0.0.1',()=>resolve(server));}),url=`http://127.0.0.1:${s.address().port}/api/commerce/stripe-webhook`,payload=JSON.stringify({id:'evt_raw',livemode:false}),signature=sdk.webhooks.generateTestHeaderString({payload,secret:'whsec_fixture'});
 try{const send=(body,signature)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':signature},body});assert.equal((await send(payload,'bad')).status,400);assert.equal(called,0);assert.equal((await send(payload,signature)).status,200);assert.equal(called,1);assert.equal((await send(payload+' ',signature)).status,400);fail=true;assert.equal((await send(payload,signature)).status,500);}finally{await new Promise(resolve=>s.close(resolve));}
});
