import fs from 'node:fs/promises';
import {runtimeMode} from '../server/policy.mjs';
import {createDatabase} from '../server/database.mjs';
import {applyWorkspaceMigration} from '../server/migrations.mjs';

if(runtimeMode(process.env)!=='workspace')throw new Error('Configure and confirm a dedicated Ministrium database first.');
const sql=await fs.readFile(new URL('../migrations/001_workspaces.sql',import.meta.url),'utf8');
const db=createDatabase(process.env.MINISTRIUM_DATABASE_URL);
try{
 const result=await applyWorkspaceMigration(db,sql);
 console.log(result.applied?'Ministrium workspace schema v1 installed in the dedicated database.':'Ministrium schema already current.');
}finally{await db.close();}
