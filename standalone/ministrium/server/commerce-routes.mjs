import express from 'express';
export function registerPaymentWebhook(app,getCommerce,provider){
 app.post('/api/commerce/stripe-webhook',express.raw({type:'application/json',limit:'256kb'}),async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  const commerce=getCommerce();if(!commerce||!provider)return res.status(503).json({message:'Payment verification is not configured.'});
  let event;try{event=provider.event(req.body,req.headers['stripe-signature']);}catch{return res.status(400).json({message:'Invalid payment signature.'});}
  try{return res.json(await commerce.webhook(event));}catch{return res.status(500).json({message:'Payment verification will be retried.'});}
 });
}
export function registerCommerceRoutes(app,commerce,wrap){
 app.get('/api/commerce/status',wrap(async(_req,res)=>res.json(commerce.status())));
 app.get('/api/commerce/catalogue/:orgId',wrap(async(req,res,user)=>res.json(await commerce.catalogue(user,req.params.orgId))));
 app.post('/api/commerce/checkout',wrap(async(req,res,user)=>res.status(201).json(await commerce.checkout(user,req.body))));
 app.get('/api/commerce/orders',wrap(async(_req,res,user)=>res.json(await commerce.orders(user))));
 app.post('/api/commerce/orders/:orderId/reconcile',wrap(async(req,res,user)=>res.json(await commerce.reconcileBuyer(user,req.params.orderId))));
 app.get('/api/commerce/orders/:orderId/delivery',wrap(async(req,res,user)=>res.json(await commerce.delivery(user,req.params.orderId))));
 const root='/api/workspaces/:id/shop';
 app.get(`${root}/products`,wrap(async(req,res,user)=>res.json(await commerce.products(user,req.params.id,req.query.archived==='true'))));
 app.post(`${root}/products`,wrap(async(req,res,user)=>res.status(201).json(await commerce.createProduct(user,req.params.id,req.body))));
 app.put(`${root}/products/:productId`,wrap(async(req,res,user)=>res.json(await commerce.updateProduct(user,req.params.id,req.params.productId,req.body))));
 app.post(`${root}/products/:productId/archive`,wrap(async(req,res,user)=>res.json(await commerce.archiveProduct(user,req.params.id,req.params.productId,req.body))));
 app.get(`${root}/seller`,wrap(async(req,res,user)=>res.json(await commerce.sellerStatus(user,req.params.id))));
 app.post(`${root}/seller/onboard`,wrap(async(req,res,user)=>res.json(await commerce.onboard(user,req.params.id,req.body))));
 app.get(`${root}/orders`,wrap(async(req,res,user)=>res.json(await commerce.sellerOrders(user,req.params.id))));
 app.post(`${root}/orders/:orderId/reconcile`,wrap(async(req,res,user)=>res.json(await commerce.reconcileSeller(user,req.params.id,req.params.orderId))));
 app.post(`${root}/orders/:orderId/refund`,wrap(async(req,res,user)=>res.json(await commerce.refund(user,req.params.id,req.params.orderId,req.body))));
}
