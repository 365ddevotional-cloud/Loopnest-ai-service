import { db } from "./db";
import { biblePassages, devotionals } from "@shared/schema";
import { eq, and } from "drizzle-orm";

interface ScriptureEntry {
  reference: string;
  translations: {
    KJV: string;
    WEB: string;
    ASV: string;
    DRB: string;
  };
}

const SAMPLE_SCRIPTURES: ScriptureEntry[] = [
  {
    reference: "Romans 8:28",
    translations: {
      KJV: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.",
      WEB: "We know that all things work together for good for those who love God, for those who are called according to his purpose.",
      ASV: "And we know that to them that love God all things work together for good, even to them that are called according to his purpose.",
      DRB: "And we know that to them that love God all things work together unto good: to such as, according to his purpose, are called to be saints."
    }
  },
  {
    reference: "Jeremiah 29:11",
    translations: {
      KJV: "For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.",
      WEB: "For I know the thoughts that I think toward you,\" says Yahweh, \"thoughts of peace, and not of evil, to give you hope and a future.",
      ASV: "For I know the thoughts that I think toward you, saith Jehovah, thoughts of peace, and not of evil, to give you hope in your latter end.",
      DRB: "For I know the thoughts that I think towards you, saith the Lord, thoughts of peace, and not of affliction, to give you an end and patience."
    }
  },
  {
    reference: "Philippians 4:13",
    translations: {
      KJV: "I can do all things through Christ which strengtheneth me.",
      WEB: "I can do all things through Christ who strengthens me.",
      ASV: "I can do all things in him that strengtheneth me.",
      DRB: "I can do all things in him who strengtheneth me."
    }
  },
  {
    reference: "Psalm 23:1",
    translations: {
      KJV: "The LORD is my shepherd; I shall not want.",
      WEB: "Yahweh is my shepherd: I shall lack nothing.",
      ASV: "Jehovah is my shepherd; I shall not want.",
      DRB: "The Lord ruleth me: and I shall want nothing."
    }
  },
  {
    reference: "Isaiah 40:31",
    translations: {
      KJV: "But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.",
      WEB: "But those who wait for Yahweh will renew their strength. They will mount up with wings like eagles. They will run, and not be weary. They will walk, and not faint.",
      ASV: "But they that wait for Jehovah shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; they shall walk, and not faint.",
      DRB: "But they that hope in the Lord shall renew their strength, they shall take wings as eagles, they shall run and not be weary, they shall walk and not faint."
    }
  },
  {
    reference: "Proverbs 3:5-6",
    translations: {
      KJV: "Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.",
      WEB: "Trust in Yahweh with all your heart, and don't lean on your own understanding. In all your ways acknowledge him, and he will make your paths straight.",
      ASV: "Trust in Jehovah with all thy heart, and lean not upon thine own understanding: In all thy ways acknowledge him, and he will direct thy paths.",
      DRB: "Have confidence in the Lord with all thy heart, and lean not upon thy own prudence. In all thy ways think on him, and he will direct thy steps."
    }
  },
  {
    reference: "John 3:16",
    translations: {
      KJV: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.",
      WEB: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.",
      ASV: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth on him should not perish, but have eternal life.",
      DRB: "For God so loved the world, as to give his only begotten Son: that whosoever believeth in him may not perish, but may have life everlasting."
    }
  },
  {
    reference: "Matthew 6:33",
    translations: {
      KJV: "But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.",
      WEB: "But seek first God's Kingdom and his righteousness; and all these things will be given to you as well.",
      ASV: "But seek ye first his kingdom, and his righteousness; and all these things shall be added unto you.",
      DRB: "Seek ye therefore first the kingdom of God, and his justice, and all these things shall be added unto you."
    }
  },
  {
    reference: "Romans 12:2",
    translations: {
      KJV: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.",
      WEB: "Don't be conformed to this world, but be transformed by the renewing of your mind, so that you may prove what is the good, well-pleasing, and perfect will of God.",
      ASV: "And be not fashioned according to this world: but be ye transformed by the renewing of your mind, that ye may prove what is the good and acceptable and perfect will of God.",
      DRB: "And be not conformed to this world: but be reformed in the newness of your mind, that you may prove what is the good and the acceptable and the perfect will of God."
    }
  },
  {
    reference: "Psalm 46:10",
    translations: {
      KJV: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.",
      WEB: "Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.",
      ASV: "Be still, and know that I am God: I will be exalted among the nations, I will be exalted in the earth.",
      DRB: "Be still and see that I am God; I will be exalted among the nations, and I will be exalted in the earth."
    }
  }
];

export async function seedBiblePassages(): Promise<void> {
  console.log("Starting to seed Bible passages...");
  
  let inserted = 0;
  let skipped = 0;
  
  for (const entry of SAMPLE_SCRIPTURES) {
    for (const [translation, content] of Object.entries(entry.translations)) {
      const existing = await db
        .select()
        .from(biblePassages)
        .where(and(
          eq(biblePassages.reference, entry.reference),
          eq(biblePassages.translation, translation)
        ))
        .limit(1);
      
      if (existing.length === 0) {
        await db.insert(biblePassages).values({
          reference: entry.reference,
          translation,
          content,
        });
        inserted++;
      } else {
        skipped++;
      }
    }
  }
  
  console.log(`Bible passages seeding complete. Inserted: ${inserted}, Skipped: ${skipped}`);
}

export async function seedScripturesFromDevotionals(): Promise<void> {
  console.log("Extracting scripture references from existing devotionals...");
  
  const allDevotionals = await db.select().from(devotionals);
  const uniqueReferences = new Set<string>();
  
  for (const dev of allDevotionals) {
    uniqueReferences.add(dev.scriptureReference);
  }
  
  console.log(`Found ${uniqueReferences.size} unique scripture references in devotionals.`);
  
  let inserted = 0;
  let skipped = 0;
  
  for (const reference of Array.from(uniqueReferences)) {
    const devotional = allDevotionals.find(d => d.scriptureReference === reference);
    if (!devotional) continue;
    
    const existing = await db
      .select()
      .from(biblePassages)
      .where(and(
        eq(biblePassages.reference, reference),
        eq(biblePassages.translation, "KJV")
      ))
      .limit(1);
    
    if (existing.length === 0) {
      await db.insert(biblePassages).values({
        reference,
        translation: "KJV",
        content: devotional.scriptureText,
      });
      inserted++;
    } else {
      skipped++;
    }
  }
  
  console.log(`Devotional scriptures seeding complete. Inserted: ${inserted}, Skipped: ${skipped}`);
}

// To run manually: npx tsx server/seed-scripture.ts
// Functions are exported for manual execution only
