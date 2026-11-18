import type { Express, Request, RequestHandler } from "express";
import { GetObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import type { ShopAsset } from "./ministry-shop-admin";
import { getShopProduct } from "./ministry-shop-catalog";
import { AUDIO_VOICE, AUDIO_VOICE_LABEL, validReaderParagraphs, type ReaderParagraph } from "../shared/shop-audiobook";
import { createAudioCache, googleNarrator, hash, narrationConfig } from "./shop-audio-provider";

export type ShopOrder = {
  session_id: string; firebase_uid: string; product_id: string; amount: number; currency: string;
  status: string; payment_intent_id: string | null; assets: ShopAsset[];
  download_expires_at: Date | null; purchase_kind: string; reader_edition_id: string | null; book_session_id: string | null;
};
type Edition = { id: string; product_id: string; asset_sha256: string; title: string; paragraphs: ReaderParagraph[]; reviewed: boolean; audio_reviewed: boolean; sample_ready?:boolean };
type Services = {
  viewer(req: Request): Promise<{uid: string}>;
  confirm(order: ShopOrder): Promise<ShopOrder>;
  r2: S3Client | null; bucket?: string; requireAdmin: RequestHandler;
  synthesize?: (text: string) => Promise<Buffer>;
};
function fail(status: number, message: string): never { throw Object.assign(new Error(message), {status}); }
const paragraphSchema = z.object({ id: z.string().max(80), text: z.string().max(4500), heading: z.boolean().optional(), page: z.number().int().min(1).max(5000).optional() }).strict();
const manuscriptSchema = z.object({ assetSha256: z.string().regex(/^[a-f0-9]{64}$/), paragraphs: z.array(paragraphSchema).max(5000), reviewed: z.boolean() }).strict();
export const assetHash = (order: Pick<ShopOrder,"assets">) => order.assets.length === 1 && order.assets[0].content_type === "application/pdf" ? order.assets[0].object_key.split("/").pop() : undefined;

export function registerShopAudiobooks(app: Express, services: Services) {
  const { viewer, confirm, requireAdmin, r2, bucket } = services;
  const configured = () => !!r2 && !!bucket && !!narrationConfig(process.env);
  const editionById = async (id: string) => (await db.execute<Edition>(sql`SELECT * FROM ministry_shop_reader_editions WHERE id=${id}`)).rows[0];
  const editionForAssets = async (productId: string, assets: ShopOrder["assets"]) => {
    const sha=assetHash({assets});
    if(!sha)return undefined;
    return (await db.execute<Edition>(sql`SELECT * FROM ministry_shop_reader_editions WHERE product_id=${productId}
      AND asset_sha256=${sha} AND reviewed=true ORDER BY created_at DESC LIMIT 1`)).rows[0];
  };
  const currentEdition = async (productId: string) => (await db.execute<Edition>(sql`SELECT e.* FROM ministry_shop_reader_editions e
    JOIN ministry_shop_assets a ON a.product_id=e.product_id
    WHERE e.product_id=${productId} AND e.reviewed=true AND a.content_type='application/pdf'
    AND a.object_key LIKE '%/' || e.asset_sha256 ORDER BY e.created_at DESC LIMIT 1`)).rows[0];
  const reserve = async (edition: Edition, sample?: ReaderParagraph) => {
    const config = narrationConfig(process.env);
    if (!config) fail(503,"Audiobook checkout is unavailable.");
    const bookKey = hash(`${edition.id}:${AUDIO_VOICE}`);
    const key = sample ? hash(`${edition.id}:${AUDIO_VOICE}:sample:${sample.id}`) : bookKey;
    await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(365, 25)`);
      if ((await tx.execute(sql`SELECT cache_id FROM ministry_shop_audio_budgets WHERE cache_id=${bookKey}`)).rows.length) return;
      if (sample && (await tx.execute(sql`SELECT cache_id FROM ministry_shop_audio_budgets WHERE cache_id=${key}`)).rows.length) return;
      const {rows} = await tx.execute<{total: string}>(sql`SELECT COALESCE(SUM(characters),0) AS total FROM ministry_shop_audio_budgets`);
      const characters = sample ? Array.from(sample.text).length : edition.paragraphs.reduce((n,p)=>n+Array.from(p.text).length,0);
      if (Number(rows[0].total) + characters > config!.cap) fail(409,"Audiobook checkout is temporarily unavailable. Your eBook is still available.");
      await tx.execute(sql`INSERT INTO ministry_shop_audio_budgets(cache_id,characters) VALUES(${key},${characters})`);
    });
  };
  const ready = (edition?: Edition) => process.env.SHOP_AUDIO_SAMPLE_ONLY !== "true" && configured() && !!edition?.reviewed && !!edition.audio_reviewed;
  const wrap = (handler: (req: Request, res: any) => Promise<any>): RequestHandler => async (req,res) => {
    res.setHeader("Cache-Control","private, no-store");
    try { await handler(req,res); } catch(error) {
      const status = (error as any).status;
      res.status(status >=400 && status <500 ? status : 503).json({message: status >=400 && status <500 ? (error as Error).message : "The book reader is temporarily unavailable. Your purchases are safe."});
    }
  };
  const orderById = async (id: string) => (await db.execute<ShopOrder>(sql`SELECT * FROM ministry_shop_orders WHERE session_id=${id}`)).rows[0];
  async function bookOrder(uid: string, productId: string, edition: Edition, sessionId?: string) {
    const {rows} = await db.execute<ShopOrder>(sql`SELECT * FROM ministry_shop_orders WHERE firebase_uid=${uid}
      AND product_id=${productId} AND purchase_kind IN ('ebook','read-listen') AND status IN ('paid','pending') ORDER BY created_at DESC LIMIT 100`);
    for (const order of rows) {
      if (sessionId && order.session_id !== sessionId) continue;
      if (assetHash(order) !== edition.asset_sha256) continue;
      try { return await confirm(order); } catch(error) { if ((error as any).status !==403) throw error; }
    }
    return fail(403,"A verified purchase of this book edition is required.");
  }
  async function access(uid: string, editionId: string, verifyPayment: boolean) {
    const edition = await editionById(editionId);
    if (!edition?.reviewed) fail(404,"Book reader unavailable.");
    const {rows} = await db.execute<ShopOrder>(sql`SELECT * FROM ministry_shop_orders WHERE firebase_uid=${uid}
      AND product_id=${edition.product_id} AND status IN ('paid','pending') ORDER BY created_at DESC LIMIT 100`);
    let book: ShopOrder | undefined;
    for (const row of rows.filter(r=>r.purchase_kind !== 'audio' && assetHash(r) === edition.asset_sha256)) {
      try { book = verifyPayment ? await confirm(row) : row.status === 'paid' ? row : undefined; if(book) break; }
      catch(error) { if ((error as any).status !==403) throw error; }
    }
    if (!book) fail(403,"A verified book purchase is required.");
    let audioOwned = false;
    for (const row of rows.filter(r=>r.reader_edition_id === edition.id && ['audio','read-listen'].includes(r.purchase_kind))) {
      if(row.purchase_kind === 'audio') {
        const source = row.book_session_id && await orderById(row.book_session_id);
        if (!source || source.firebase_uid !== uid || source.status !== 'paid' || source.product_id !== edition.product_id || assetHash(source) !== edition.asset_sha256) continue;
      }
      try { if (verifyPayment ? (await confirm(row)).status === 'paid' : row.status === 'paid') {audioOwned = true; break;} }
      catch(error) { if ((error as any).status !==403) throw error; }
    }
    return {edition,audioOwned};
  }
  let generating = 0;
  const cached = createAudioCache({
    read: async id => (await db.execute<{status: string;object_key: string|null}>(sql`SELECT status,object_key FROM ministry_shop_audio_segments WHERE id=${id}`)).rows[0],
    claim: async id => (await db.execute(sql`INSERT INTO ministry_shop_audio_segments(id,status) VALUES(${id},'generating') ON CONFLICT DO NOTHING RETURNING id`)).rows.length > 0,
    ready: async (id,key) => { await db.execute(sql`UPDATE ministry_shop_audio_segments SET status='ready',object_key=${key} WHERE id=${id}`); },
    failed: async id => { await db.execute(sql`UPDATE ministry_shop_audio_segments SET status='failed' WHERE id=${id}`); },
    save: async (key,bytes) => { if(!r2 || !bucket) throw new Error("Storage unavailable"); await r2.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:"audio/mpeg",IfNoneMatch:"*"})); },
  }, services.synthesize ?? googleNarrator(process.env));
  app.get('/api/admin/ministry-shop/audiobooks',requireAdmin,wrap(async (_req,res)=> {
    const {rows}=await db.execute<Omit<Edition,'paragraphs'>>(sql`SELECT id,product_id,asset_sha256,title,reviewed,audio_reviewed FROM ministry_shop_reader_editions ORDER BY created_at DESC`);
    const budget=await db.execute(sql`SELECT COALESCE(SUM(characters),0) AS reserved FROM ministry_shop_audio_budgets`);
    res.json({configured:configured(), sampleOnly:process.env.SHOP_AUDIO_SAMPLE_ONLY === "true", voice:AUDIO_VOICE_LABEL, characterBudget:narrationConfig(process.env)?.cap??0,reserved:budget.rows[0]?.reserved??0,editions:rows});
  }));
  app.put('/api/admin/ministry-shop/audiobooks/:productId',requireAdmin,wrap(async(req,res)=> {
    const product = await getShopProduct(String(req.params.productId),true);
    const data = manuscriptSchema.safeParse(req.body);
    if(!product || product.kind !== 'Book' || !data.success || !validReaderParagraphs(data.data.paragraphs)) fail(400,"Choose a book and a valid paragraph manuscript (maximum 4,500 UTF-8 bytes per paragraph).");
    const {assetSha256,paragraphs,reviewed} = data.data;
    const {rows:assets} = await db.execute<{object_key:string;content_type:string}>(sql`SELECT object_key,content_type FROM ministry_shop_assets WHERE product_id=${product.id}`);
    if(assets.length!==1 || assets[0].content_type!=='application/pdf' || !assets[0].object_key.endsWith('/'+assetSha256)) fail(409,"The manuscript must match the current verified PDF.");
    const id=hash(JSON.stringify([product.id,assetSha256,paragraphs]));
    await db.execute(sql`INSERT INTO ministry_shop_reader_editions(id,product_id,asset_sha256,title,paragraphs,reviewed)
      VALUES(${id},${product.id},${assetSha256},${product.title},${JSON.stringify(paragraphs)}::jsonb,${reviewed}) ON CONFLICT(id) DO NOTHING`);
    res.json({id,paragraphs:paragraphs.length,characters:paragraphs.reduce((n,p)=>n+p.text.length,0)});
  }));
  app.get('/api/admin/ministry-shop/audiobooks/:editionId',requireAdmin,wrap(async(req,res)=> {
    const edition = await editionById(String(req.params.editionId));
    if(!edition) fail(404,"Edition not found.");
    res.json(edition);
  }));
  // Explicit review is separate from importing a manuscript. It never synthesizes
  // or enables a provider. First audition and review the fixed launch voice.
  app.post('/api/admin/ministry-shop/audiobooks/:editionId/review',requireAdmin,wrap(async(req,res)=> {
    const data=z.object({textReviewed:z.literal(true),voiceReviewed:z.boolean()}).strict().safeParse(req.body);
    if(!data.success) fail(400,"Review the manuscript and narration before release.");
    const edition=await editionById(String(req.params.editionId));
    if(!edition) fail(404,"Edition not found.");
    if(data.data.voiceReviewed && (!configured() || !edition.sample_ready)) fail(409,"Configure and audition the narration service before enabling audio sales.");
    await db.execute(sql`UPDATE ministry_shop_reader_editions SET reviewed=true,audio_reviewed=${data.data.voiceReviewed} WHERE id=${String(req.params.editionId)}`);
    res.json({saved:true});
  }));
  app.post('/api/admin/ministry-shop/audiobooks/:editionId/sample',requireAdmin,wrap(async(req,res)=> {
    const edition=await editionById(String(req.params.editionId));
    const input=z.object({paragraphId:z.string()}).strict().safeParse(req.body);
    const paragraph=edition && input.success && edition.paragraphs.find(p=>p.id===input.data.paragraphId);
    if(!edition || !paragraph || !configured() || !r2 || !bucket) fail(409,"Configure the narration service and choose a manuscript passage first.");
    await reserve(edition,paragraph);
    if(generating>=2) return res.status(202).json({pending:true});
    generating++;
    try {
      const result=await cached(edition.id,paragraph.id,paragraph.text,true);
      if(!result.key) return res.status(202).json({pending:true});
      await db.execute(sql`UPDATE ministry_shop_reader_editions SET sample_ready=true WHERE id=${edition.id}`);
      res.json({url:await getSignedUrl(r2!,new GetObjectCommand({Bucket:bucket,Key:result.key,ResponseContentType:'audio/mpeg'}),{expiresIn:120})});
    } finally {generating--;}
  }));
  app.get('/api/ministry-shop/reader/:editionId',wrap(async(req,res)=> {
    const user=await viewer(req);
    const {edition,audioOwned}=await access(user.uid,String(req.params.editionId),true);
    const {rows}=await db.execute(sql`SELECT paragraph_id AS "paragraphId",seconds,speed FROM ministry_shop_reader_positions WHERE firebase_uid=${user.uid} AND edition_id=${edition.id}`);
    const product=await getShopProduct(edition.product_id,true);
    res.json({id:edition.id,productId:edition.product_id,title:edition.title,author:product?.author,paragraphs:edition.paragraphs,audioOwned,voice:AUDIO_VOICE_LABEL,position:rows[0]});
  }));
  app.put('/api/ministry-shop/reader/:editionId/position',wrap(async(req,res)=> {
    const user=await viewer(req);
    const {edition}=await access(user.uid,String(req.params.editionId),false);
    const data=z.object({paragraphId:z.string(),seconds:z.number().finite().min(0).max(86400),speed:z.number().min(.5).max(2)}).strict().safeParse(req.body);
    if(!data.success || !edition.paragraphs.some(p=>p.id===data.data.paragraphId)) fail(400,"Invalid reading position.");
    await db.execute(sql`INSERT INTO ministry_shop_reader_positions(firebase_uid,edition_id,paragraph_id,seconds,speed)
      VALUES(${user.uid},${edition.id},${data.data.paragraphId},${data.data.seconds},${data.data.speed}) ON CONFLICT(firebase_uid,edition_id)
      DO UPDATE SET paragraph_id=EXCLUDED.paragraph_id,seconds=EXCLUDED.seconds,speed=EXCLUDED.speed,updated_at=now()`);
    res.json({saved:true});
  }));
  app.post('/api/ministry-shop/reader/:editionId/audio',wrap(async(req,res)=> {
    const user=await viewer(req);
    const {edition,audioOwned}=await access(user.uid,String(req.params.editionId),false);
    if(!audioOwned) fail(403,"Add the audiobook to listen to this book.");
    const data=z.object({paragraphId:z.string()}).strict().safeParse(req.body);
    const paragraph=data.success && edition.paragraphs.find(p=>p.id===data.data.paragraphId);
    if(!paragraph) fail(400,"Choose a passage in this book.");
    if(!r2 || !bucket) fail(503,"Audio storage unavailable.");
    const reserved=(await db.execute(sql`SELECT cache_id FROM ministry_shop_audio_budgets WHERE cache_id=${hash(`${edition.id}:${AUDIO_VOICE}`)}`)).rows.length>0;
    if(generating>=2) return res.status(202).json({pending:true});
    generating++;
    try {
      const result=await cached(edition.id,paragraph.id,paragraph.text,configured() && reserved);
      if(!result.key) return res.status(202).json({pending:true});
      res.json({url:await getSignedUrl(r2!,new GetObjectCommand({Bucket:bucket,Key:result.key,ResponseContentType:'audio/mpeg'}),{expiresIn:120})});
    } finally {generating--;}
  }));
  return {currentEdition,editionForAssets,configured,ready,reserve,bookOrder,editionById};
}
