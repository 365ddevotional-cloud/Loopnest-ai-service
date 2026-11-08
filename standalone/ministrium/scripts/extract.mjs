import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';
export const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.resolve(appRoot, '../..');
const generated = path.join(appRoot, 'source');

export async function extract() {
  await fs.rm(generated, { recursive: true, force: true });
  await fs.mkdir(path.join(generated, 'server'), { recursive: true });
  await fs.cp(path.join(sourceRoot, 'shared'), path.join(generated, 'shared'), { recursive: true });
  for (const name of ['storage.ts', 'db.ts']) {
    await fs.copyFile(path.join(sourceRoot, 'server', name), path.join(generated, 'server', name));
  }
  // Extract only the church registration body, never the parent's startup/seeding jobs.
  const routes = await fs.readFile(path.join(sourceRoot, 'server/routes.ts'), 'utf8');
  const start = routes.indexOf('  async function getUid(');
  const boundary = routes.lastIndexOf('  // ─', routes.indexOf('  // ADMIN — APP ANALYTICS'));
  if (start < 0 || boundary <= start) throw new Error('Church route extraction boundary changed; review source before building.');
  const source = ts.createSourceFile('routes.ts', routes, ts.ScriptTarget.Latest, true);
  const fn = source.statements.find(s => ts.isFunctionDeclaration(s) && s.name?.text === 'registerRoutes');
  if (!fn?.body) throw new Error('Cannot locate source registerRoutes.');
  const statements = fn.body.statements.filter(s => s.getStart(source) >= start && s.getStart(source) < boundary);
  const included = [];
  const selected = statements.filter(s => {
    if (ts.isFunctionDeclaration(s) || ts.isVariableStatement(s)) return true;
    if (!ts.isExpressionStatement(s) || !ts.isCallExpression(s.expression)) return false;
    const call = s.expression;
    if (!ts.isPropertyAccessExpression(call.expression) || call.expression.expression.getText(source) !== 'app') return false;
    const route = call.arguments[0];
    if (!route || !ts.isStringLiteral(route)) return false;
    if (!/^\/api\/(church|public\/church|admin\/(church|giving)|user\/(profile|activity))/.test(route.text)) return false;
    included.push({ method: call.expression.name.text.toUpperCase(), path: route.text });
    return true;
  });
  if (included.length < 90 || !included.some(r => r.path === '/api/churches')) throw new Error('Incomplete Church Mode extraction.');
  const imports = `import type {} from 'express-session';
declare module 'express-session' { interface SessionData { isAdmin?: boolean; } }
import type {Express,Request,Response,NextFunction} from 'express';
import {storage} from './storage';
import {db} from './db';
import {eq,sql,desc,gte} from 'drizzle-orm';
import {z} from 'zod';
import {randomBytes} from 'node:crypto';
import {churchTransactions} from '@shared/schema';
import {auth} from './firebase-admin';
import {sendChurchWelcomeEmail,sendChurchNameChangeSecurityEmail,sendChurchComplianceEmail} from './sendgrid';
const ADMIN_PASSWORD = undefined;
const verifyFirebaseToken = async (token:string) => (await auth.verifyIdToken(token)).uid;
function requireUser(req:Request,res:Response,next:NextFunction){
  const token=req.headers.authorization?.replace(/^Bearer /,'');
  if(!token)return res.status(401).json({message:'Please sign in.'});
  auth.verifyIdToken(token).then(p=>{(req as any).uid=p.uid;next();}).catch(()=>res.status(401).json({message:'Invalid sign-in session.'}));
}
function requireAdmin(_req:Request,res:Response){return res.status(503).json({message:'Platform administration is not enabled in this build.'});}
export function registerChurchRoutes(app:Express){\n`;
  let extractedRoutes = imports + selected.map(s=>s.getText(source)).join('\n') + '\n}\n';
  extractedRoutes=extractedRoutes.replace(/const \{ getAuth \} = await import\("firebase-admin\/auth"\);\s*const decoded = await getAuth\(\).verifyIdToken/g,'const decoded = await auth.verifyIdToken').replace('churchId, "submitted", null, uid','churchId, "submitted", undefined, uid');
  // The staged legacy payment route is blocked; omit its obsolete Stripe allowlist for SDK 23 compatibility.
  extractedRoutes=extractedRoutes.replace(/\s*payment_method_types: \[\"card\"\],/g,'');
  await fs.writeFile(path.join(generated,'server/church-routes.ts'),extractedRoutes);
  await fs.copyFile(path.join(appRoot,'server/firebase-admin.ts'),path.join(generated,'server/firebase-admin.ts'));
  await fs.copyFile(path.join(appRoot,'server/firebase-verifier.mjs'),path.join(generated,'server/firebase-verifier.mjs'));
  await fs.writeFile(path.join(generated,'server/sendgrid.ts'), `// Outbound delivery stays disabled until a dedicated sender is configured.\nconst disabled=async(..._args:unknown[])=>({success:false,status:'Ministrium email delivery is not configured'});\nexport const sendChurchWelcomeEmail=disabled,sendChurchNameChangeSecurityEmail=disabled,sendChurchComplianceEmail=disabled;\nexport async function getUncachableSendGridClient():Promise<{client:any;fromEmail:string}>{throw new Error("Dedicated Ministrium email is not configured.");}\n`);
  await fs.writeFile(path.join(generated, 'routes.json'), JSON.stringify(included,null,2));

  const copied = new Set();
  async function copyClient(relative) {
    if(copied.has(relative)) return;
    copied.add(relative);
    let text = await fs.readFile(path.join(sourceRoot,'client/src',relative),'utf8');
    if(relative==='components/ChurchModeShell.tsx') {
      text=text.replace(/import \{ useMusicPlayer \}[^;]+;/,'').replace('const { currentSong, isPlaying } = useMusicPlayer();','const [currentSong] = useState<{title:string}|null>(null); const isPlaying = false;');
    }
    if(relative==='pages/ChurchAdminPage.tsx')text=text.replaceAll('queryClient.invalidateQueries','qc.invalidateQueries').replaceAll('auth.currentUser','auth?.currentUser');
    text=text.replaceAll('https://365dailydevotional.com','__MINISTRIUM_ORIGIN__')
      .replace(/"__MINISTRIUM_ORIGIN__"/g,'window.location.origin')
      .replaceAll('365 Daily Devotional','Ministrium')
      .replaceAll('365dailydevotional.com','Ministrium')
      .replaceAll('devotionalLang','ministriumLang');
    const destination=path.join(generated,'client',relative);
    await fs.mkdir(path.dirname(destination),{recursive:true}); await fs.writeFile(destination,text);
    for(const match of text.matchAll(/(?:from\s*|import\s*\()\s*["']([^"']+)["']/g)) {
      const spec=match[1];
      if(!spec.startsWith('@/')&&!spec.startsWith('.'))continue;
      let base=spec.startsWith('@/')?spec.slice(2):path.posix.join(path.posix.dirname(relative),spec);
      if(['contexts/UserContext','lib/firebase'].includes(base))continue;
      let found=false;
      for(const suffix of ['', '.tsx','.ts','/index.tsx','/index.ts','.css']){
        const candidate=base+suffix;
        try{if((await fs.stat(path.join(sourceRoot,'client/src',candidate))).isFile()){await copyClient(candidate);found=true;break;}}catch(e){if(e.code!=='ENOENT'&&e.code!=='ENOTDIR')throw e;}
      }
      if(!found)throw new Error('Missing client dependency: '+spec+' from '+relative);
    }
  }
  const pages=(await fs.readdir(path.join(sourceRoot,'client/src/pages'))).filter(f=>/^Church.*\.tsx$/.test(f)||f==='PastorDashboard.tsx');
  for(const name of [...pages.map(p=>'pages/'+p),'index.css','lib/queryClient.ts','components/ui/toaster.tsx','components/ui/tooltip.tsx']) await copyClient(name);
  for(const name of ['UserContext.tsx']){
    await fs.mkdir(path.join(generated,'client/contexts'),{recursive:true});
    await fs.copyFile(path.join(appRoot,'client',name),path.join(generated,'client/contexts',name));
  }
  await fs.mkdir(path.join(generated,'client/lib'),{recursive:true});
  await fs.writeFile(path.join(generated,'client/lib/firebase.ts'),"export {auth,authConfigured} from '../../../client/firebase';\n");
  return {routes:included.length,pages:pages.length,clientFiles:copied.size};
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(await extract());
