import fs from 'node:fs/promises';
import {runtimeMode} from '../server/policy.mjs';
import {createDatabase} from '../server/database.mjs';
import {applyWorkspaceMigration} from '../server/migrations.mjs';

if(runtimeMode(process.env)!=='workspace')throw new Error('Configure and confirm a dedicated Ministrium database first.');
const migrations=['001_workspaces.sql','002_community.sql','003_ministry_tools.sql','004_private_group_study.sql','005_commerce.sql'];
const db=createDatabase(process.env.MINISTRIUM_DATABASE_URL);
try{
 for(const [index,file] of migrations.entries()){
  const sql=await fs.readFile(new URL(`../migrations/${file}`,import.meta.url),'utf8');
  const result=await applyWorkspaceMigration(db,sql,index+1);
  console.log(`Ministrium migration ${index+1}: ${result.applied?'applied':'already current'}.`);
 }
}finally{await db.close();}
