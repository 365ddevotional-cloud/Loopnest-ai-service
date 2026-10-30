import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {applyWorkspaceMigration} from '../server/migrations.mjs';

test('workspace migration is repeatable, isolated and rejects checksum changes',async()=>{
 const db=new PGlite();
 try{
  const sql=await readFile(new URL('../migrations/001_workspaces.sql',import.meta.url),'utf8');
  await db.exec('CREATE TABLE public.devotional_sentinel(id integer); INSERT INTO public.devotional_sentinel VALUES(7)');
  assert.deepEqual(await applyWorkspaceMigration(db,sql),{applied:true});
  await db.query("INSERT INTO ministrium.identities(uid,email) VALUES ('kept','kept@example.com')");
  assert.deepEqual(await applyWorkspaceMigration(db,sql),{applied:false});
  assert.equal((await db.query('SELECT uid FROM ministrium.identities')).rows[0].uid,'kept');
  assert.equal((await db.query('SELECT id FROM public.devotional_sentinel')).rows[0].id,7);
  await assert.rejects(applyWorkspaceMigration(db,sql+'\n-- changed'),/checksum changed/);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM ministrium.migrations')).rows[0].n,1);
 }finally{await db.close();}
});
