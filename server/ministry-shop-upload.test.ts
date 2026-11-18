import { test, mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import request from "supertest";
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { PgDialect } from "drizzle-orm/pg-core";
import { ministryShopPrice } from "./ministry-shop-pricing";
import { S3Client, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

process.env.DATABASE_URL = "postgres://fixture:fixture@localhost/unused";
process.env.R2_ACCOUNT_ID = "fixture";
process.env.R2_BUCKET_NAME = "public-fixture";
process.env.SHOP_R2_PRIVATE_BUCKET = "private-fixture";
process.env.SHOP_R2_ACCESS_KEY_ID = "fixture";
process.env.SHOP_R2_SECRET_ACCESS_KEY = "fixture";
const { db, pool } = await import("./db");
const { registerShopUploads } = await import("./ministry-shop-upload");

test("admin upload creates private drafts, verifies bytes, publishes explicitly, and preserves history", async () => {
  const products = new Map<string, any>();
  const uploads = new Map<string, any>();
  const assets = new Map<string, any[]>();
  const dialect = new PgDialect();
  const executed: string[] = [];
  const execute = async (query: any) => {
    const { sql, params: p } = dialect.sqlToQuery(query);
    const q = sql.replace(/\s+/g, " ").trim().toLowerCase();
    executed.push(q);
    if (q.startsWith("select pg_advisory")) return { rows: [] };
    if (q === "select id, payload, published from ministry_shop_managed_products") return { rows: [...products.values()] };
    if (q.startsWith("insert into ministry_shop_managed_products")) {
      const existing = products.get(p[0] as string);
      products.set(p[0] as string, { id:p[0], payload: JSON.parse(p[1] as string), published: existing?.published ?? p[2] });
      return { rows: [] };
    }
    if (q.startsWith("insert into ministry_shop_uploads")) {
      const [id, product_id, slot, object_key, sha256, file_name, content_type, size_bytes] = p;
      uploads.set(id as string, { id, product_id,slot,object_key,sha256,file_name,content_type,size_bytes,completed:false,created_at:new Date() });
      return { rows: [] };
    }
    if (q === "select * from ministry_shop_uploads where id=$1") return { rows:[uploads.get(p[0] as string)] };
    if (q.startsWith("select * from ministry_shop_uploads")) return { rows:[...uploads.values()].filter(u => u.id === p[0] && u.product_id === p[1]) };
    if (q.startsWith("select completed")) return { rows:[uploads.get(p[0] as string)] };
    if (q.startsWith("select payload")) return { rows: products.has(p[0] as string) ? [products.get(p[0] as string)] : [] };
    if (q.startsWith("delete from ministry_shop_assets")) { assets.delete(p[0] as string); return { rows:[] }; }
    if (q.startsWith("insert into ministry_shop_assets")) {
      assets.set(p[0] as string,[{content_type:p[4],object_key:p[2],size_bytes:p[5]}]); return {rows:[]};
    }
    if (q.startsWith("insert into ministry_shop_sales_controls")) return {rows:[]};
    if (q.startsWith("update ministry_shop_uploads")) { uploads.get(p[0] as string).completed=true; return {rows:[]}; }
    if (q.startsWith("update ministry_shop_managed_products set payload")) { products.get(p[1] as string).payload.coverKey=p[0]; return {rows:[]}; }
    if (q.startsWith("update ministry_shop_managed_products set published")) { products.get(p[0] as string).published=true; return {rows:[]}; }
    if (q.startsWith("select content_type")) return {rows:assets.get(p[0] as string) ?? []};
    throw new Error("Unexpected database mutation: "+q);
  };
  const dbMock = mock.method(db,"execute",execute);
  const transactionMock = mock.method(db,"transaction",async (fn: any) => {
    const snapshot=structuredClone({products,uploads,assets});
    try { return await fn({execute}); } catch (error) {
      for (const [map,prior] of [[products,snapshot.products],[uploads,snapshot.uploads],[assets,snapshot.assets]]) {
        map.clear(); for(const [k,v] of prior) map.set(k,v);
      }
      throw error;
    }
  });
  const bytesByKey = new Map<string,Buffer>();
  const sdkMock = mock.method(S3Client.prototype,"send",async (command: any) => {
    const u=[...uploads.values()].find(u => u.object_key===command.input.Key);
    const bytes=bytesByKey.get(command.input.Key)!;
    if(command instanceof HeadObjectCommand) return {ContentLength:bytes.length,ContentType:u.content_type,Metadata:{sha256:u.sha256}};
    if(command instanceof GetObjectCommand) return {Body:Readable.from([bytes])};
    throw new Error("Unexpected storage command");
  });
  const app=express(); app.use(express.json());
  registerShopUploads(app,(req,res,next)=>req.get("x-fixture-admin")==="yes"?next():res.sendStatus(401));
  const send=(method: "put"|"post",path:string,body:any,admin=true)=> {
    const r=request(app)[method](path); if(admin) r.set("x-fixture-admin","yes"); return r.send(body);
  };
  const product={ title:"Fixture book unique",kind:"Book",author:"Moses Afolabi",priceCents:399,description:"A detailed original teaching book for this fixture.",lyrics:"" };
  try {
    assert.equal((await send("put","/api/admin/ministry-shop/products",product,false)).status,401);
    const created=await send("put","/api/admin/ministry-shop/products",product);
    assert.equal(created.status,200); const id=created.body.id;
    assert.ok(!(await request(app).get("/api/ministry-shop/catalog")).body.some((p:any)=>p.id===id));
    assert.equal((await send("put","/api/admin/ministry-shop/products",product)).status,409);
    assert.equal((await send("post",`/api/admin/ministry-shop/products/${id}/publish`,{rightsConfirmed:true,contentReviewed:true})).status,409);
    async function upload(slot:string,bytes:Buffer,type:string,bad=false) {
      const sha256=createHash("sha256").update(bytes).digest("hex");
      const ticket=await send("post",`/api/admin/ministry-shop/products/${id}/upload`,{slot,name:"fixture",bytes:bytes.length,sha256,contentType:type});
      assert.equal(ticket.status,200);
      const row=uploads.get(ticket.body.uploadId); bytesByKey.set(row.object_key,bad?Buffer.alloc(bytes.length,65):bytes);
      const done=await send("post",`/api/admin/ministry-shop/products/${id}/uploads/${row.id}/complete`,{});
      return {done,row};
    }
    assert.equal((await upload("download",Buffer.from("%PDF-1.7\nfixture-bad"),"application/pdf",true)).done.status,503);
    assert.equal(assets.has(id),false);
    const first=await upload("download",Buffer.from("%PDF-1.7\nfixture"),"application/pdf");
    assert.equal(first.done.status,200);
    assert.equal((await upload("cover",Buffer.from([137,80,78,71,13,10,26,10,0]),"image/png")).done.status,200);
    assert.equal((await send("post",`/api/admin/ministry-shop/products/${id}/publish`,{rightsConfirmed:false,contentReviewed:true})).status,400);
    assert.equal((await send("post",`/api/admin/ministry-shop/products/${id}/publish`,{rightsConfirmed:true,contentReviewed:true})).status,200);
    const publicRecord=(await request(app).get("/api/ministry-shop/catalog")).body.find((p:any)=>p.id===id);
    assert.ok(publicRecord.artworkUrl); assert.equal(publicRecord.coverKey,undefined);
    const replacement=await upload("download",Buffer.from("%PDF-1.7\nreplacement"),"application/pdf");
    assert.equal(replacement.done.status,200);
    const currentKey=assets.get(id)![0].object_key;
    assert.equal((await send("post",`/api/admin/ministry-shop/products/${id}/uploads/${first.row.id}/complete`,{})).status,200);
    assert.equal(assets.get(id)![0].object_key,currentKey,"replayed completion must not restore an old edition");
    assert.ok(bytesByKey.has(first.row.object_key),"old paid download stays stored");
    assert.equal(executed.some(q=>q.includes("ministry_shop_orders")),false,"orders must not be mutated");
    const music = {id:"fixturemusic",kind:"Music",sourcePrice:"$4.99",useBasePrice:true};
    const price = ministryShopPrice(music, "US", {US:{single:89,five:189}} as any);
    assert.equal(price?.amount,499,"uploaded music must honor its chosen base price");
    assert.equal((await send("put","/api/admin/ministry-shop/products",{...product,title:"Fixture music unique",kind:"Music"})).status,200);
  } finally { dbMock.mock.restore(); transactionMock.mock.restore(); sdkMock.mock.restore(); await pool.end(); }
});
