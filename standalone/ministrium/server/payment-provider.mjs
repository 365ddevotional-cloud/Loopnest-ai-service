import Stripe from 'stripe';
export const sellerTermsVersion='ministrium-digital-sales-sandbox-v1';
export function commerceConfiguration(env){
 const mode=env.MINISTRIUM_COMMERCE_MODE??'disabled';
 if(mode==='disabled')return {enabled:false,mode};
 if(mode!=='sandbox')throw new Error('Ministrium commerce supports sandbox only until launch review.');
 const key=env.MINISTRIUM_STRIPE_TEST_KEY;
 if(!/^(rk|sk)_test_\S+$/.test(key??''))throw new Error('A dedicated Stripe sandbox key is required. Live and inherited keys are not used.');
 if(!env.MINISTRIUM_STRIPE_WEBHOOK_SECRET?.startsWith('whsec_'))throw new Error('A dedicated signed Connect webhook is required.');
 const feeBps=Number(env.MINISTRIUM_COMMERCE_FEE_BPS);
 if(!Number.isInteger(feeBps)||feeBps<1||feeBps>3000)throw new Error('Set an explicitly approved commission rate in basis points.');
 const origin=new URL(env.MINISTRIUM_PUBLIC_ORIGIN);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('A fixed HTTPS Ministrium origin is required.');
 return {enabled:true,mode,key,feeBps,origin:origin.origin,webhookSecret:env.MINISTRIUM_STRIPE_WEBHOOK_SECRET};
}
// Stable across deployments: Stripe retries must use identical request parameters.
const identifier='ministrium_nxqvhmta';
export function createStripeProvider(config,client){
 if(!config.enabled)return null;
 const stripe=client??new Stripe(config.key,{apiVersion:'2026-09-30.endive',maxNetworkRetries:2,timeout:20000});
 return {
  createSeller:({org,email,name,country})=>stripe.v2.core.accounts.create({contact_email:email,display_name:name,identity:{country},dashboard:'full',defaults:{responsibilities:{fees_collector:'stripe',losses_collector:'stripe'}},configuration:{merchant:{capabilities:{card_payments:{requested:true}}}},metadata:{ministrium_org:org}},{idempotencyKey:`ministrium-seller-${org}`}),
  seller:account=>stripe.v2.core.accounts.retrieve(account,{include:['configuration.merchant','defaults','requirements']}),
  onboarding:(account,org)=>stripe.v2.core.accountLinks.create({account,use_case:{type:'account_onboarding',account_onboarding:{refresh_url:`${config.origin}/workspace/${org}/shop?onboarding=refresh`,return_url:`${config.origin}/workspace/${org}/shop?onboarding=returned`}}}),
  checkout:(order)=>stripe.checkout.sessions.create({mode:'payment',integration_identifier:identifier,line_items:[{price_data:{currency:order.currency,unit_amount:order.gross_cents,product_data:{name:order.title}},quantity:1}],payment_intent_data:{application_fee_amount:order.commission_cents,metadata:{ministrium_order:order.id}},metadata:{ministrium_order:order.id},client_reference_id:order.id,success_url:`${config.origin}/purchases?order=${order.id}`,cancel_url:`${config.origin}/shop/${order.organization_id}?order=${order.id}`},{stripeAccount:order.stripe_account,idempotencyKey:`ministrium-checkout-${order.id}`}),
  session:(account,id)=>stripe.checkout.sessions.retrieve(id,{expand:['payment_intent.latest_charge.balance_transaction']},{stripeAccount:account}),
  disputes:(account,charge)=>stripe.disputes.list({charge,limit:10},{stripeAccount:account}),
  chargePaymentIntent:async(account,id)=>{const charge=await stripe.charges.retrieve(id,{stripeAccount:account});return typeof charge.payment_intent==='string'?charge.payment_intent:charge.payment_intent?.id;},
  applicationFee:id=>stripe.applicationFees.retrieve(id),
  refund:order=>stripe.refunds.create({payment_intent:order.stripe_payment_intent,refund_application_fee:true},{stripeAccount:order.stripe_account,idempotencyKey:`ministrium-full-refund-${order.id}`}),
  event:(body,signature)=>stripe.webhooks.constructEvent(body,signature,config.webhookSecret),
 };
}
