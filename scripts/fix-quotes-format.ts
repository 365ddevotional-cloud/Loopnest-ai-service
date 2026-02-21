import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function fixQuoteFormatting(quotes: string): string {
  const lines = quotes.split('\n');
  const fixed = lines.map(line => {
    let l = line.trim();
    if (!l) return l;
    l = l.replace(/^[""\u201C\u201D]+/, '').replace(/[""\u201C\u201D]+$/, '').trim();
    if (l.includes('—')) {
      const parts = l.split('—');
      const quote = parts.slice(0, -1).join('—').trim().replace(/[""\u201C\u201D]+$/, '').trim();
      const author = parts[parts.length - 1].trim();
      return `"${quote}" — ${author}`;
    }
    return `"${l}"`;
  });
  return fixed.join('\n');
}

async function main() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT id, christian_quotes FROM devotionals WHERE is_deleted = false AND christian_quotes IS NOT NULL AND christian_quotes != ''`
    );

    let fixed = 0;
    for (const row of rows) {
      const original = row.christian_quotes;
      const corrected = fixQuoteFormatting(original);
      if (corrected !== original) {
        await client.query(`UPDATE devotionals SET christian_quotes = $1 WHERE id = $2`, [corrected, row.id]);
        fixed++;
      }
    }

    console.log(`Fixed quote formatting for ${fixed} devotionals`);

    const { rows: sample } = await client.query(
      `SELECT id, title, christian_quotes FROM devotionals WHERE is_deleted = false ORDER BY id ASC LIMIT 5`
    );
    for (const s of sample) {
      console.log(`\nID ${s.id} (${s.title}):`);
      console.log(s.christian_quotes);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
