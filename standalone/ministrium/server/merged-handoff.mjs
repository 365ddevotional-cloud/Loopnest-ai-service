export function mergedOrigin(value) {
 const url = new URL(value);
 if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Merged app must use a plain HTTPS origin.');
 return url.origin;
}
export function handoffPath(path) {
 if (path === '/' || path === '/signin' || path === '/sign-in') return '/ministry-account';
 if (path === '/preview' || path.endsWith('-preview')) return '/ministry-demo';
 if (path === '/join' || path.startsWith('/workspace') || path.startsWith('/shop/') || ['/start','/purchases','/reports','/admin','/sales-terms'].includes(path)) return '/community' + path;
 return '/community/workspace';
}
export function registerMergedHandoff(app, configuredOrigin) {
 const origin = mergedOrigin(configuredOrigin);
 app.disable('x-powered-by');
 app.use((_req,res,next) => { res.set('Cache-Control','no-store'); next(); });
 app.get('/api/health', (_req,res) => res.json({status:'ok',mode:'merged',destination:origin,workspacesEnabled:false,paymentsEnabled:false}));
 app.use('/api', (_req,res) => res.status(410).json({message:'Church and ministry workspaces have moved to Covenant Hub. Sign in there to continue.',destination:origin}));
 app.get(['/sw.js','/service-worker.js'], (_req,res) => res.type('application/javascript').send("self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',event=>event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.map(key=>caches.delete(key)))),self.registration.unregister()])));"));
 app.use((req,res) => {
  if (!['GET','HEAD'].includes(req.method)) return res.status(410).json({message:'Continue in Covenant Hub.',destination:origin});
  res.redirect(302, origin + handoffPath(req.path));
 });
}
