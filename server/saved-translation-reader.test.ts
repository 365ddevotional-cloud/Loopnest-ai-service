import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {createSavedTranslationReader,isAllowedLanguage,translationPolicy} from './saved-translation-reader';
test('saved translations survive misses and concurrent readers without generation or mutation',async()=>{
 const db=new PGlite();await db.exec('CREATE TABLE saved(id integer,lang text,body text,UNIQUE(id,lang));');
 const original='Texte enregistré — ne pas réécrire la doctrine.';await db.query('INSERT INTO saved VALUES($1,$2,$3)',[1,'fr',original]);
 let queries=0;const read=createSavedTranslationReader(async(id,lang)=>{queries++;return(await db.query<{body:string}>('SELECT body FROM saved WHERE id=$1 AND lang=$2',[id,lang])).rows[0]??null;});
 assert.equal((await read({id:1},'fr'))?.body,original);
 assert.deepEqual(await Promise.all([read({id:2},'yo'),read({id:2},'yo')]),[null,null]);
 const before=queries;for(const lang of ['en','constructor','__proto__','xx'])assert.equal(await read({id:1},lang),null);assert.equal(queries,before);
 assert.equal(isAllowedLanguage('constructor'),false);assert.equal(isAllowedLanguage('ha'),true);
 assert.deepEqual(translationPolicy,{mode:'saved-only',automaticGeneration:false,approvedGenerationBudget:0});
 assert.equal((await db.query('SELECT * FROM saved')).rows.length,1);assert.equal((await db.query<{body:string}>('SELECT body FROM saved')).rows[0].body,original);
 await db.close();
});
