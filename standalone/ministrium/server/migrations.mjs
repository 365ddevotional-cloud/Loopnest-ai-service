import {createHash} from 'node:crypto';
export function migrationChecksum(sql){return createHash('sha256').update(sql).digest('hex');}
export async function applyWorkspaceMigration(db,sql){
 const checksum=migrationChecksum(sql);
 return db.transaction(async tx=>{
  await tx.query("SELECT pg_advisory_xact_lock(hashtext('ministrium-migrations'))");
  await tx.query('CREATE SCHEMA IF NOT EXISTS ministrium');
  await tx.query('CREATE TABLE IF NOT EXISTS ministrium.migrations(version integer PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  const {rows}=await tx.query('SELECT checksum FROM ministrium.migrations WHERE version=1');
  if(rows.length){
   if(rows[0].checksum!==checksum)throw new Error('Migration checksum changed. Do not modify an applied migration.');
   return {applied:false};
  }
  await tx.exec(sql);
  await tx.query('INSERT INTO ministrium.migrations(version,checksum) VALUES (1,$1)',[checksum]);
  return {applied:true};
 });
}
