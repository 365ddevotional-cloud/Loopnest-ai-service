import { db } from "./db";
import { devotionals } from "@shared/schema";
import { eq } from "drizzle-orm";

const CHRISTIAN_QUOTES_POOL = [
  ['"Faith is the bird that feels the light and sings when the dawn is still dark." — Rabindranath Tagore', '"God never said that the journey would be easy, but He did say that the arrival would be worthwhile." — Max Lucado'],
  ['"Prayer is not asking. It is a longing of the soul." — Mahatma Gandhi', '"The will of God will not take us where the grace of God cannot sustain us." — Billy Graham'],
  ['"God is most glorified in us when we are most satisfied in Him." — John Piper', '"Faith does not eliminate questions. But faith knows where to take them." — Elisabeth Elliot'],
  ['"To fall in love with God is the greatest romance; to seek Him the greatest adventure; to find Him, the greatest human achievement." — Augustine', '"We are not cisterns made for hoarding; we are channels made for sharing." — Billy Graham'],
  ['"He is no fool who gives what he cannot keep to gain that which he cannot lose." — Jim Elliot', '"Let God\'s promises shine on your problems." — Corrie ten Boom'],
  ['"True faith means holding nothing back. It means putting every hope in God\'s fidelity to His promises." — Francis Chan', '"The Bible is alive, it speaks to me; it has feet, it runs after me; it has hands, it lays hold of me." — Martin Luther'],
  ['"When we pray, God hears more than we say, answers more than we ask, gives more than we imagine." — Unknown', '"If you look at the world, you\'ll be distressed. If you look within, you\'ll be depressed. But if you look at Christ, you\'ll be at rest." — Corrie ten Boom'],
  ['"Grace means that all of your mistakes now serve a purpose instead of serving shame." — Brené Brown', '"A prayerless Christian is a powerless Christian." — Billy Sunday'],
  ['"God does not give us everything we want, but He does fulfill His promises." — Dietrich Bonhoeffer', '"Do not have your concert first, and then tune your instrument afterwards. Begin the day with the Word of God and prayer." — Hudson Taylor'],
  ['"I have found that there are three stages in every great work of God: first, it is impossible, then it is difficult, then it is done." — Hudson Taylor', '"The gospel is this: We are more sinful than we ever dared believe, yet more loved than we ever dared hope." — Timothy Keller'],
  ['"Faith is taking the first step even when you don\'t see the whole staircase." — Martin Luther King Jr.', '"God doesn\'t call the qualified, He qualifies the called." — Mark Batterson'],
  ['"Worry does not empty tomorrow of its sorrow; it empties today of its strength." — Corrie ten Boom', '"The Christian life is not a constant high. I have my moments of deep discouragement." — Billy Graham'],
  ['"God loves each of us as if there were only one of us." — Augustine', '"Prayer does not change God, but it changes him who prays." — Søren Kierkegaard'],
  ['"Our God is a God who saves; from the Sovereign Lord comes escape from death." — Charles Spurgeon', '"Be assured, if you walk with Him and look to Him, and expect help from Him, He will never fail you." — George Müller'],
  ['"God uses broken things. Broken soil to produce a crop, broken clouds to give rain, broken grain to give bread, broken bread to give strength." — Vance Havner', '"Nearness to Christ, intimacy with Him, assimilation to His character—these are the elements of a ministry of power." — Robert Murray M\'Cheyne'],
  ['"When God pushes you to the edge, trust Him fully. He will either catch you or teach you to fly." — Unknown', '"The measure of a life is not its duration, but its donation." — Peter Marshall'],
  ['"Faith never knows where it is being led, but it loves and knows the One who is leading." — Oswald Chambers', '"You can never learn that Christ is all you need, until Christ is all you have." — Corrie ten Boom'],
  ['"It is not the ship in the water but the water in the ship that sinks it." — D.L. Moody', '"Where God guides, He provides." — Frank Buchman'],
  ['"God\'s work done in God\'s way will never lack God\'s supply." — Hudson Taylor', '"The darker the night, the brighter the stars." — Fyodor Dostoevsky'],
  ['"Joy is the simplest form of gratitude." — Karl Barth', '"A Christian is a person who makes it easy for others to believe in God." — Robert Murray M\'Cheyne'],
  ['"Obedience is the key that opens every door." — Charles Stanley', '"God is not looking for extraordinary characters as His instruments, but He is looking for humble instruments through whom He can be honored." — A.B. Simpson'],
  ['"When you go through deep waters, I will be with you." — Isaiah 43:2 paraphrase', '"In Christ alone my hope is found. He is my light, my strength, my song." — Keith Getty'],
  ['"Give me one hundred preachers who fear nothing but sin and desire nothing but God, and I will shake the world." — John Wesley', '"The only way to learn strong faith is to endure great trials." — George Müller'],
  ['"He who kneels before God can stand before anyone." — Unknown', '"The beginning of anxiety is the end of faith, and the beginning of true faith is the end of anxiety." — George Müller'],
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

function getQuotePair(id: number): string[] {
  return CHRISTIAN_QUOTES_POOL[id % CHRISTIAN_QUOTES_POOL.length];
}

function generatePropheticDeclaration(title: string): string {
  const themes = [
    `I declare that the power of God concerning "${title}" is released over your life today. Every chain of limitation is broken, and you shall walk in the fullness of God's purpose. Heaven backs your steps, and no weapon formed against you shall prosper. In Jesus' mighty name — Amen.`,
    `I prophesy over your life: the truth of "${title}" is now established in your heart and circumstances. God is opening doors that no one can shut, and His favor surrounds you like a shield. Rise in confidence, for your season of breakthrough has come. In the name of Jesus — Amen.`,
    `I decree and declare that as you embrace "${title}," God's supernatural grace empowers you beyond natural ability. Every obstacle is removed, every delay is cancelled, and divine acceleration is your portion. Walk boldly into your God-ordained destiny. In Jesus' name — Amen.`,
    `I speak over your life today: the word of God concerning "${title}" will not return void. It will accomplish everything God intended and produce abundant fruit in your life. You are positioned for divine encounter and supernatural provision. In the mighty name of Jesus — Amen.`,
    `I declare that the Lord is doing a new thing in your life through "${title}." Former things are passing away, and fresh mercies are arising. You shall see the goodness of God in the land of the living, and your testimony will inspire generations. In Jesus' powerful name — Amen.`,
    `I prophesy: as you walk in the truth of "${title}," God's glory covers you and His presence goes before you. Mountains become pathways, and valleys become places of springs. Nothing shall be impossible for you because God fights your battles. In the name of Jesus Christ — Amen.`,
  ];
  return themes[Math.abs(hashCode(title)) % themes.length];
}

const EXTRA_PRAYER_TEMPLATES = [
  (title: string) => `Lord, help me to walk daily in the revelation of ${title.toLowerCase()}`,
  (title: string) => `Holy Spirit, deepen my understanding of ${title.toLowerCase()} in my life`,
  (title: string) => `Father, remove every hindrance to my experience of ${title.toLowerCase()}`,
  (title: string) => `God, let the truth of ${title.toLowerCase()} transform my heart and mind`,
  (title: string) => `Lord, let Your Word concerning ${title.toLowerCase()} produce lasting fruit in me`,
  (title: string) => `Father, strengthen my faith as I meditate on ${title.toLowerCase()}`,
  (title: string) => `Holy Spirit, empower me to live out the reality of ${title.toLowerCase()}`,
  (title: string) => `Lord, let ${title.toLowerCase()} become my daily experience and testimony`,
];

const EXTRA_DECLARATION_TEMPLATES = [
  (title: string) => `I walk in the fullness of ${title.toLowerCase()} every day`,
  (title: string) => `The truth of ${title.toLowerCase()} is established in my life`,
  (title: string) => `I am empowered by God to live in ${title.toLowerCase()}`,
  (title: string) => `By faith, I declare that ${title.toLowerCase()} is my portion in Christ`,
  (title: string) => `I stand firm in the promise of ${title.toLowerCase()}`,
];

const CONTENT_EXTENSION_TEMPLATES = [
  (title: string, ref: string) => `As we reflect on ${ref}, the truth of ${title.toLowerCase()} becomes even more evident. God's Word is not merely information — it is transformation. When we allow Scripture to penetrate our hearts, it reshapes our thinking, realigns our priorities, and renews our perspective. The Holy Spirit uses these sacred words to bring about lasting change in every area of our lives.`,
  (title: string, _ref: string) => `The principle of ${title.toLowerCase()} extends beyond personal devotion into every aspect of daily living. Whether in our workplaces, families, or communities, God calls us to be living demonstrations of His truth. When others see the consistency of our faith, it becomes a powerful witness that draws them toward the love of Christ.`,
  (title: string, _ref: string) => `Today, choose to anchor your heart in the reality of ${title.toLowerCase()}. The enemy will try to distract you with doubt, discouragement, and delay — but God's promises stand forever. Let your faith rise above your feelings, and trust that the One who began a good work in you will carry it to completion. You are not alone in this journey; the same God who called you is faithful to sustain you.`,
];

function cleanEmoji(str: string): string {
  return str.replace(/[✨🔥🙌🕊️🌟📖🚫🌱💬✝️🌿🙏🛤️💡⸻\u2600-\u26FF\u2700-\u27BF]/g, '').trim();
}

function isQuoteLine(line: string): boolean {
  return (line.includes('—') && (line.includes('"') || line.includes('"') || line.includes('"'))) ||
    line.startsWith('"') || line.startsWith('"') || line.startsWith('\\"');
}

function isPropheticLine(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.startsWith('i prophesy') || lower.startsWith('i decree');
}

function isHeaderOrSeparator(line: string): boolean {
  const cleaned = cleanEmoji(line).trim();
  return cleaned === '' || cleaned === '⸻' || cleaned === '---' ||
    line.includes('🗣️') || line.includes('💬') || line.includes('🔔') ||
    /^\d+\s*(Faith|Christian|Prophetic|Prayer)/i.test(cleaned) ||
    /^(Faith Declarations|Christian Quotes|Prophetic Declaration)/i.test(cleaned);
}

function extractFromFaithDeclarations(fd: string[]): {
  cleanDeclarations: string[];
  extractedQuotes: string[];
  extractedProphetic: string[];
} {
  const cleanDeclarations: string[] = [];
  const extractedQuotes: string[] = [];
  const extractedProphetic: string[] = [];

  for (const item of fd) {
    const trimmed = item.trim();
    if (!trimmed || isHeaderOrSeparator(trimmed)) continue;

    if (isQuoteLine(trimmed)) {
      const cleaned = trimmed.replace(/^[""\u201C\u201D]+/, '').replace(/[""\u201C\u201D]+$/, '').trim();
      if (cleaned.length > 10) extractedQuotes.push(cleaned);
    } else if (isPropheticLine(trimmed)) {
      extractedProphetic.push(trimmed);
    } else {
      const cleaned = trimmed.replace(/^\d+[\.\t\s]+/, '').trim();
      if (cleaned.length > 5) cleanDeclarations.push(cleaned);
    }
  }

  return { cleanDeclarations, extractedQuotes, extractedProphetic };
}

function cleanPrayerPoints(pp: string[]): string[] {
  return pp.filter(p => {
    const cleaned = cleanEmoji(p).trim();
    return cleaned.length > 5 && !isHeaderOrSeparator(p) && !/^\d+\s*(Powerful\s+)?Prayer/i.test(cleaned);
  }).map(p => p.replace(/^\d+[\.\t\s]+/, '').trim());
}

function countParagraphs(content: string): number {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 30);
  return paragraphs.length;
}

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

export async function syncProductionData() {
  console.log("[SYNC] Starting production data standardization...");

  const allDevs = await db.select().from(devotionals);
  const activeDevs = allDevs.filter(d => !d.isDeleted);
  console.log(`[SYNC] Total active devotionals: ${activeDevs.length}`);

  let updated = 0;

  for (let i = 0; i < activeDevs.length; i++) {
    const dev = activeDevs[i];
    const changes: Record<string, any> = {};
    let needsUpdate = false;

    const { cleanDeclarations, extractedQuotes, extractedProphetic } =
      extractFromFaithDeclarations(dev.faithDeclarations);

    let currentPP = cleanPrayerPoints(dev.prayerPoints);
    if (currentPP.length < 7) {
      const needed = 7 - currentPP.length;
      const startIdx = Math.abs(hashCode(dev.title)) % EXTRA_PRAYER_TEMPLATES.length;
      for (let j = 0; j < needed; j++) {
        const templateIdx = (startIdx + j) % EXTRA_PRAYER_TEMPLATES.length;
        const newPP = EXTRA_PRAYER_TEMPLATES[templateIdx](dev.title);
        if (!currentPP.some(p => p.toLowerCase() === newPP.toLowerCase())) {
          currentPP.push(newPP);
        }
      }
      currentPP = currentPP.slice(0, 7);
      if (currentPP.length === 7) {
        changes.prayerPoints = currentPP;
        needsUpdate = true;
      }
    }

    let currentFD = cleanDeclarations;
    if (currentFD.length < 5) {
      const needed = 5 - currentFD.length;
      const startIdx = Math.abs(hashCode(dev.title + 'fd')) % EXTRA_DECLARATION_TEMPLATES.length;
      for (let j = 0; j < needed; j++) {
        const templateIdx = (startIdx + j) % EXTRA_DECLARATION_TEMPLATES.length;
        const newFD = EXTRA_DECLARATION_TEMPLATES[templateIdx](dev.title);
        if (!currentFD.some(d => d.toLowerCase() === newFD.toLowerCase())) {
          currentFD.push(newFD);
        }
      }
      currentFD = currentFD.slice(0, 5);
    }

    if (currentFD.length !== dev.faithDeclarations.length ||
        dev.faithDeclarations.length > 5 ||
        currentFD.some((d, idx) => d !== dev.faithDeclarations[idx])) {
      if (currentFD.length >= 5) {
        changes.faithDeclarations = currentFD.slice(0, 5);
        needsUpdate = true;
      }
    }

    if (!dev.christianQuotes || dev.christianQuotes.trim() === '') {
      if (extractedQuotes.length >= 2) {
        changes.christianQuotes = fixQuoteFormatting(extractedQuotes.slice(0, 2).join('\n'));
      } else {
        const quotePair = getQuotePair(dev.id);
        changes.christianQuotes = quotePair.join('\n');
      }
      needsUpdate = true;
    }

    if (!dev.propheticDeclaration || dev.propheticDeclaration.trim() === '') {
      if (extractedProphetic.length > 0) {
        changes.propheticDeclaration = extractedProphetic.join(' ');
      } else {
        changes.propheticDeclaration = generatePropheticDeclaration(dev.title);
      }
      needsUpdate = true;
    }

    const paragraphCount = countParagraphs(dev.content);
    if (paragraphCount < 3) {
      const needed = 3 - paragraphCount;
      let extendedContent = dev.content.trim();
      const startIdx = Math.abs(hashCode(dev.title + 'content')) % CONTENT_EXTENSION_TEMPLATES.length;
      for (let j = 0; j < needed; j++) {
        const templateIdx = (startIdx + j) % CONTENT_EXTENSION_TEMPLATES.length;
        extendedContent += '\n\n' + CONTENT_EXTENSION_TEMPLATES[templateIdx](dev.title, dev.scriptureReference);
      }
      changes.content = extendedContent;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await db.update(devotionals)
        .set(changes)
        .where(eq(devotionals.id, dev.id));
      updated++;
    }

    if ((i + 1) % 100 === 0) {
      console.log(`[SYNC] Processed ${i + 1}/${activeDevs.length} (updated: ${updated})`);
    }
  }

  console.log(`[SYNC] Complete. Scanned: ${activeDevs.length}, Updated: ${updated}`);
  console.log(`[SYNC] Titles changed: 0, Scripture references changed: 0, Dates changed: 0`);
  return { scanned: activeDevs.length, updated };
}
