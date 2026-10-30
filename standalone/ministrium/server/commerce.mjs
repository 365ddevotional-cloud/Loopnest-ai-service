import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {WorkspaceError} from './workspaces.mjs';
import {sellerTermsVersion} from './payment-provider.mjs';
const uuid=z.string().uuid(),version=z.number().int().positive(),text=(min,max)=>z.string().trim().min(min).max(max);
const productInput=z.object({title:text(2,120),description:text(0,2000),priceCents:z.number().int().min(100).max(100000),content:text(1,100000),published:z.boolean()}).strict();
const columns='id,title,description,price_cents AS "priceCents",currency,published,archived,version';
const orderColumns='id,organization_id AS "organizationId",product_id AS "productId",title,gross_cents AS "grossCents",commission_cents AS "commissionCents",fee_bps AS "feeBps",currency,status,refunded_cents AS "refundedCents",commission_refunded_cents AS "commissionRefundedCents",processor_fee_cents AS "processorFeeCents",balance_net_cents AS "balanceNetCents",dispute_status AS "disputeStatus",reconciled_at AS "reconciledAt",created_at AS "createdAt"';
function parse(schema,value){const r=schema.safeParse(value);if(!r.success)throw new WorkspaceError(400,'Check the sales fields and try again.');return r.data;}
export const commissionAmount=(gross,bps)=>Math.round(gross*bps/10000);
/** @param {any} db @param {any} config @param {any} provider */
export function createCommerce(db,config={enabled:false,mode:'disabled'},provider=null){
 const ready=()=>{if(!config.enabled||!provider)throw new WorkspaceError(503,'Checkout is not available yet. No payment has been taken.');};
 async function leader(user,orgId,fn,ownerOnly=false){const org=parse(uuid,orgId);return db.transaction(async tx=>{
  const workspace=(await tx.query('SELECT * FROM ministrium.organizations WHERE id=$1 FOR UPDATE',[org])).rows[0];
  const membership=(await tx.query('SELECT role FROM ministrium.memberships WHERE organization_id=$1 AND uid=$2',[org,user.uid])).rows[0];
  if(!workspace||workspace.kind==='group'||!membership||!(ownerOnly?['owner']:['owner','admin']).includes(membership.role))throw new WorkspaceError(404,'Seller workspace unavailable.');
  return fn(tx,workspace);
 });}
 async function validSeller(seller){
  ready();if(!seller?.stripe_account||seller.fee_bps!==config.feeBps||seller.terms_version!==sellerTermsVersion)throw new WorkspaceError(409,'The seller must complete setup and accept the current commission.');
  const account=await provider.seller(seller.stripe_account);
  if(account.livemode!==false||account.metadata?.ministrium_org!==seller.organization_id||account.configuration?.merchant?.capabilities?.card_payments?.status!=='active'||account.dashboard!=='full'||account.defaults?.responsibilities?.fees_collector!=='stripe'||account.defaults?.responsibilities?.losses_collector!=='stripe')throw new WorkspaceError(409,'The seller is not ready for test checkout.');
 }
 async function rawOrder(user,id,tx=db){const row=(await tx.query('SELECT * FROM ministrium.orders WHERE id=$1 AND buyer_uid=$2',[parse(uuid,id),user.uid])).rows[0];if(!row)throw new WorkspaceError(404,'Order unavailable.');return row;}
 async function snapshot(order){
  ready();if(!order.stripe_session)return null;
  const s=await provider.session(order.stripe_account,order.stripe_session);
  if(s.livemode!==false||s.id!==order.stripe_session||s.metadata?.ministrium_order!==order.id||s.client_reference_id!==order.id||s.currency!==order.currency||s.amount_total!==order.gross_cents)throw new WorkspaceError(409,'Payment details do not match this order.');
  if(s.payment_status!=='paid')return {state:s.status==='expired'?'expired':s.status==='complete'&&['canceled','requires_payment_method'].includes(s.payment_intent?.status)?'failed':'pending'};
  const pi=s.payment_intent,charge=pi?.latest_charge;
  if(!pi||typeof pi!=='object'||pi.status!=='succeeded'||pi.amount!==order.gross_cents||pi.currency!==order.currency||pi.application_fee_amount!==order.commission_cents||pi.metadata?.ministrium_order!==order.id||!charge||typeof charge!=='object'||charge.paid!==true||charge.amount!==order.gross_cents||charge.currency!==order.currency||charge.payment_intent!==pi.id)throw new WorkspaceError(409,'Verified payment is not ready for delivery.');
  const refunds=charge.amount_refunded??0;
  if(!Number.isInteger(refunds)||refunds<0||refunds>order.gross_cents)throw new WorkspaceError(409,'Refund details require reconciliation.');
  const disputes=charge.disputed?await provider.disputes(order.stripe_account,charge.id):{data:[]};
  if(disputes.has_more)throw new WorkspaceError(409,'Dispute history requires review.');
  const dispute=disputes.data.find(x=>!['won','warning_closed'].includes(x.status));
  const feeId=typeof charge.application_fee==='string'?charge.application_fee:charge.application_fee?.id;
  const fee=feeId?await provider.applicationFee(feeId):null;
  if(order.commission_cents>0&&(!fee||fee.account!==order.stripe_account||fee.charge!==charge.id||fee.amount!==order.commission_cents||fee.currency!==order.currency||fee.livemode!==false))throw new WorkspaceError(409,'Commission details require reconciliation.');
  const bt=typeof charge.balance_transaction==='object'?charge.balance_transaction:null;
  return {state:refunds===order.gross_cents?'refunded':refunds>0?'partially_refunded':dispute?'disputed':'paid',refunds,commissionRefunded:fee?.amount_refunded??0,paymentIntent:pi.id,disputeStatus:dispute?.status??null,processorFee:bt?.currency===order.currency?bt.fee:null,balanceNet:bt?.currency===order.currency?bt.net:null};
 }
 async function reconcile(order,event,connection){
  const apply=async tx=>{
   // Serialize all reconciliation for this order, including replayed/out-of-order webhooks.
   const row=(await tx.query('SELECT * FROM ministrium.orders WHERE id=$1 FOR UPDATE',[order.id])).rows[0];
   if(event){const inserted=await tx.query('INSERT INTO ministrium.commerce_events(stripe_account,event_id,event_type) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING event_id',[row.stripe_account,event.id,event.type]);if(!inserted.rows.length)return {duplicate:true};}
   // Retrieve current provider state under this order lock, never trust the event snapshot.
   const current=await snapshot(row);if(!current)return {pending:true};
   // Older unpaid/expired snapshots cannot revoke an already verified payment.
   if(['pending','expired','failed'].includes(current.state)&&!['pending','expired','failed'].includes(row.status))return {status:row.status};
   // Refund totals are cumulative; a slower snapshot cannot restore refunded access.
   if((current.refunds??0)<row.refunded_cents)return {status:row.status};
   await tx.query('UPDATE ministrium.orders SET status=$1,stripe_payment_intent=coalesce($2,stripe_payment_intent),refunded_cents=$3,commission_refunded_cents=$4,processor_fee_cents=$5,balance_net_cents=$6,dispute_status=$7,reconciled_at=now() WHERE id=$8',[current.state,current.paymentIntent??null,current.refunds??0,current.commissionRefunded??0,current.processorFee??null,current.balanceNet??null,current.disputeStatus??null,row.id]);
   return {status:current.state};
  };
  return connection?apply(connection):db.transaction(apply);
 }
 const service={
  status:()=>({mode:config.mode,checkoutEnabled:!!config.enabled,livePaymentsEnabled:false,feeBps:config.enabled?config.feeBps:null,termsVersion:sellerTermsVersion,currency:'usd',digitalTextOnly:true}),
  products:(user,orgId,archived=false)=>leader(user,orgId,async(tx,org)=>(await tx.query(`SELECT ${columns},content FROM ministrium.products WHERE organization_id=$1 AND archived=$2 ORDER BY created_at DESC,id LIMIT 100`,[org.id,archived])).rows),
  createProduct:(user,orgId,input)=>{const d=parse(productInput,input);return leader(user,orgId,async(tx,org)=>{if((await tx.query('SELECT count(*)::int AS n FROM ministrium.products WHERE organization_id=$1',[org.id])).rows[0].n>=100)throw new WorkspaceError(409,'The pilot supports up to 100 resources per seller.');return (await tx.query(`INSERT INTO ministrium.products(id,organization_id,title,description,price_cents,content,published,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${columns}`,[randomUUID(),org.id,d.title,d.description,d.priceCents,d.content,d.published,user.uid])).rows[0];});},
  updateProduct:(user,orgId,id,input)=>{const d=parse(z.object({version,data:productInput}).strict(),input);return leader(user,orgId,async(tx,org)=>{const v=d.data,row=(await tx.query(`UPDATE ministrium.products SET title=$1,description=$2,price_cents=$3,content=$4,published=$5,version=version+1 WHERE organization_id=$6 AND id=$7 AND version=$8 AND archived=false RETURNING ${columns}`,[v.title,v.description,v.priceCents,v.content,v.published,org.id,parse(uuid,id),d.version])).rows[0];if(!row)throw new WorkspaceError(409,'Resource changed. Refresh before saving.');return row;});},
  archiveProduct:(user,orgId,id,input)=>{const d=parse(z.object({version,archived:z.boolean()}).strict(),input);return leader(user,orgId,async(tx,org)=>{const r=await tx.query('UPDATE ministrium.products SET archived=$1,version=version+1 WHERE organization_id=$2 AND id=$3 AND version=$4 RETURNING id',[d.archived,org.id,parse(uuid,id),d.version]);if(!r.rows.length)throw new WorkspaceError(409,'Resource changed. Refresh before saving.');return {archived:d.archived};});},
  catalogue:async(user,orgId)=>{const org=parse(uuid,orgId),workspace=(await db.query("SELECT id,name FROM ministrium.organizations WHERE id=$1 AND kind<>'group'",[org])).rows[0];if(!workspace)throw new WorkspaceError(404,'Shop unavailable.');return {organization:workspace,products:(await db.query(`SELECT ${columns} FROM ministrium.products WHERE organization_id=$1 AND published=true AND archived=false ORDER BY created_at DESC,id LIMIT 100`,[org])).rows};},
  sellerStatus:(user,orgId)=>leader(user,orgId,async(tx,org)=>{const seller=(await tx.query('SELECT * FROM ministrium.sellers WHERE organization_id=$1',[org.id])).rows[0];let ready=false;if(config.enabled&&seller){try{await validSeller(seller);ready=true;}catch(e){if(!(e instanceof WorkspaceError))throw e;}}return {configured:!!seller,ready,feeBps:seller?.fee_bps??null,...service.status()};}),
  onboard:(user,orgId,input)=>{ready();const d=parse(z.object({acceptTerms:z.literal(true),feeBps:z.number().int(),termsVersion:z.literal(sellerTermsVersion)}).strict(),input);if(d.feeBps!==config.feeBps)throw new WorkspaceError(409,'Commission changed. Review the current rate.');return leader(user,orgId,async(tx,org)=>{let seller=(await tx.query('SELECT * FROM ministrium.sellers WHERE organization_id=$1',[org.id])).rows[0];if(!seller?.stripe_account){const account=await provider.createSeller({org:org.id,name:org.name,email:user.email,country:org.country});if(account.livemode!==false||!/^acct_/.test(account.id))throw new WorkspaceError(409,'A sandbox seller account is required.');seller={stripe_account:account.id};}await tx.query('INSERT INTO ministrium.sellers(organization_id,stripe_account,accepted_by,fee_bps,terms_version) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (organization_id) DO UPDATE SET fee_bps=$4,terms_version=$5,accepted_by=$3,accepted_at=now()',[org.id,seller.stripe_account,user.uid,config.feeBps,sellerTermsVersion]);const link=await provider.onboarding(seller.stripe_account,org.id);return {url:link.url};},true);},
  checkout:async(user,input)=>{
   ready();const d=parse(z.object({organizationId:uuid,productId:uuid,requestKey:uuid}).strict(),input);
   const order=await db.transaction(async tx=>{
    await tx.query('INSERT INTO ministrium.identities(uid,email) VALUES ($1,$2) ON CONFLICT (uid) DO UPDATE SET email=$2',[user.uid,user.email.toLowerCase()]);
    // Same buyer/request key is serialized before any order creation.
    await tx.query('SELECT uid FROM ministrium.identities WHERE uid=$1 FOR UPDATE',[user.uid]);
    const prior=(await tx.query('SELECT * FROM ministrium.orders WHERE buyer_uid=$1 AND request_key=$2',[user.uid,d.requestKey])).rows[0];
    if(prior){if(prior.organization_id!==d.organizationId||prior.product_id!==d.productId)throw new WorkspaceError(409,'This checkout request belongs to another resource.');return prior;}
    const existing=(await tx.query("SELECT * FROM ministrium.orders WHERE buyer_uid=$1 AND organization_id=$2 AND product_id=$3 AND status IN ('pending','paid')",[user.uid,d.organizationId,d.productId])).rows[0];if(existing)return existing;
    if((await tx.query('SELECT count(*)::int AS n FROM ministrium.orders WHERE buyer_uid=$1',[user.uid])).rows[0].n>=200)throw new WorkspaceError(409,'The pilot purchase limit has been reached. Contact support.');
    const product=(await tx.query('SELECT p.* FROM ministrium.products p JOIN ministrium.organizations o ON o.id=p.organization_id WHERE p.organization_id=$1 AND p.id=$2 AND p.published=true AND p.archived=false AND o.kind<>$3 FOR SHARE OF p',[d.organizationId,d.productId,'group'])).rows[0];if(!product)throw new WorkspaceError(404,'Resource unavailable.');
    const seller=(await tx.query('SELECT * FROM ministrium.sellers WHERE organization_id=$1',[d.organizationId])).rows[0];await validSeller(seller);
    const fee=commissionAmount(product.price_cents,config.feeBps);
    return (await tx.query('INSERT INTO ministrium.orders(id,organization_id,product_id,buyer_uid,request_key,title,content,gross_cents,fee_bps,commission_cents,currency,stripe_account) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',[randomUUID(),d.organizationId,d.productId,user.uid,d.requestKey,product.title,product.content,product.price_cents,config.feeBps,fee,product.currency,seller.stripe_account])).rows[0];
   });
   if(order.status!=='pending')return {orderId:order.id,url:null,status:order.status};
   await validSeller((await db.query('SELECT * FROM ministrium.sellers WHERE organization_id=$1',[order.organization_id])).rows[0]);
   if(order.stripe_session){const prior=await provider.session(order.stripe_account,order.stripe_session);if(prior.status==='expired'||prior.payment_status==='paid'){const result=await reconcile(order);return {orderId:order.id,url:null,status:result.status};}}
   // Stripe idempotency makes retries return the same session even after a network timeout.
   const s=await provider.checkout(order);
   if(s.livemode!==false||!/^cs_test_/.test(s.id)||!s.url?.startsWith('https://checkout.stripe.com/'))throw new WorkspaceError(409,'Sandbox checkout was not returned.');
   await db.query('UPDATE ministrium.orders SET stripe_session=$1 WHERE id=$2 AND (stripe_session IS NULL OR stripe_session=$1)',[s.id,order.id]);
   return {orderId:order.id,url:s.url,status:order.status};
  },
  orders:async user=>(await db.query(`SELECT ${orderColumns} FROM ministrium.orders WHERE buyer_uid=$1 ORDER BY created_at DESC,id LIMIT 100`,[user.uid])).rows,
  sellerOrders:(user,orgId)=>leader(user,orgId,async(tx,org)=>(await tx.query(`SELECT ${orderColumns} FROM ministrium.orders WHERE organization_id=$1 ORDER BY created_at DESC,id LIMIT 100`,[org.id])).rows),
  reconcileBuyer:async(user,id)=>{const order=await rawOrder(user,id);return reconcile(order);},
  reconcileSeller:(user,orgId,id)=>leader(user,orgId,async(tx,org)=>{const order=(await tx.query('SELECT * FROM ministrium.orders WHERE organization_id=$1 AND id=$2',[org.id,parse(uuid,id)])).rows[0];if(!order)throw new WorkspaceError(404,'Order unavailable.');return reconcile(order,undefined,tx);}),
  delivery:async(user,id)=>{let order=await rawOrder(user,id);if(config.enabled&&order.stripe_session){await reconcile(order);order=await rawOrder(user,id);}if(order.status!=='paid'||order.refunded_cents!==0||order.dispute_status)throw new WorkspaceError(403,'This resource is available after a verified payment. Refunded or disputed orders cannot access it.');return {title:order.title,content:order.content};},
  refund:(user,orgId,id,input)=>{ready();parse(z.object({confirm:z.literal(true)}).strict(),input);return leader(user,orgId,async(tx,org)=>{const order=(await tx.query('SELECT * FROM ministrium.orders WHERE organization_id=$1 AND id=$2 FOR UPDATE',[org.id,parse(uuid,id)])).rows[0];if(!order||!['paid','partially_refunded','refunded'].includes(order.status)||!order.stripe_payment_intent)throw new WorkspaceError(409,'Only verified orders can be refunded.');if(order.status==='refunded')return {status:'refunded'};if(order.refunded_cents>0)throw new WorkspaceError(409,'Use the seller Stripe Dashboard to review a partial refund before further action.');const r=await provider.refund(order);return {status:r.status==='succeeded'?'submitted':'pending',message:'Refund submitted. Access and totals update after signed payment reconciliation.'};},true);},
  webhook:async event=>{
   ready();if(event.livemode!==false)throw new WorkspaceError(400,'Live events are not accepted.');
   const obj=event.data?.object,feeEvent=/^application_fee\./.test(event.type),account=event.account??(feeEvent?obj?.account:null);
   if(!account||!obj)return {ignored:true};
   const sessionEvent=/^checkout\.session\./.test(event.type),chargeEvent=/^charge\.(refunded|dispute\.)/.test(event.type),refundEvent=/^refund\./.test(event.type);
   if(!sessionEvent&&!chargeEvent&&!refundEvent&&!feeEvent)return {ignored:true};
   const pi=typeof obj.payment_intent==='string'?obj.payment_intent:obj.payment_intent?.id;
   // A dispute payload may omit payment_intent; recover its charge via provider session in seller reconciliation.
   let order=sessionEvent?(await db.query('SELECT * FROM ministrium.orders WHERE stripe_account=$1 AND stripe_session=$2',[account,obj.id])).rows[0]:pi?(await db.query('SELECT * FROM ministrium.orders WHERE stripe_account=$1 AND stripe_payment_intent=$2',[account,pi])).rows[0]:null;
   if(!order&&sessionEvent&&obj.metadata?.ministrium_order){order=(await db.query('SELECT * FROM ministrium.orders WHERE stripe_account=$1 AND id=$2',[account,parse(uuid,obj.metadata.ministrium_order)])).rows[0];if(order&&!order.stripe_session){await db.query('UPDATE ministrium.orders SET stripe_session=$1 WHERE id=$2 AND stripe_session IS NULL',[obj.id,order.id]);order.stripe_session=obj.id;}}
   if(!order&&(chargeEvent||refundEvent||feeEvent)&&obj.charge){const charge=typeof obj.charge==='string'?obj.charge:obj.charge.id;order=(await db.query('SELECT * FROM ministrium.orders WHERE stripe_account=$1 AND stripe_payment_intent=$2',[account,await provider.chargePaymentIntent(account,charge)])).rows[0];}
   if(!order)return {ignored:true};
   return reconcile(order,event);
  },
 };
 return service;
}
