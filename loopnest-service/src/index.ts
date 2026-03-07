import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

interface ScriptureItem {
  text: string;
  ref: string;
}

const SCRIPTURE_POOL: ScriptureItem[] = [
  { text: "Trust in the Lord with all your heart", ref: "Proverbs 3:5" },
  { text: "I can do all things through Christ who strengthens me", ref: "Philippians 4:13" },
  { text: "The Lord is my shepherd I shall not want", ref: "Psalm 23:1" },
  { text: "For God so loved the world that He gave His only Son", ref: "John 3:16" },
  { text: "Be strong and courageous", ref: "Joshua 1:9" },
  { text: "Do not fear for I am with you", ref: "Isaiah 41:10" },
  { text: "God is our refuge and strength", ref: "Psalm 46:1" },
  { text: "My grace is sufficient for you", ref: "2 Corinthians 12:9" },
  { text: "In all things God works for the good", ref: "Romans 8:28" },
  { text: "The joy of the Lord is your strength", ref: "Nehemiah 8:10" },
  { text: "No weapon formed against you shall prosper", ref: "Isaiah 54:17" },
  { text: "Peace I leave with you my peace I give you", ref: "John 14:27" },
  { text: "With God all things are possible", ref: "Matthew 19:26" },
  { text: "Cast all your anxiety on Him because He cares for you", ref: "1 Peter 5:7" },
  { text: "Those who hope in the Lord will renew their strength", ref: "Isaiah 40:31" },
  { text: "God has not given us a spirit of fear", ref: "2 Timothy 1:7" },
  { text: "Be still and know that I am God", ref: "Psalm 46:10" },
  { text: "Greater is He that is in you than he that is in the world", ref: "1 John 4:4" },
  { text: "His mercies are new every morning", ref: "Lamentations 3:23" },
  { text: "He who began a good work in you will complete it", ref: "Philippians 1:6" },
  { text: "The Lord bless you and keep you", ref: "Numbers 6:24" },
  { text: "Your word is a lamp to my feet", ref: "Psalm 119:105" },
  { text: "Seek first the kingdom of God", ref: "Matthew 6:33" },
  { text: "The name of the Lord is a fortified tower", ref: "Proverbs 18:10" },
  { text: "He restores my soul", ref: "Psalm 23:3" },
  { text: "The Lord is close to the brokenhearted", ref: "Psalm 34:18" },
  { text: "Nothing can separate us from the love of God", ref: "Romans 8:39" },
  { text: "He heals the brokenhearted", ref: "Psalm 147:3" },
  { text: "Delight yourself in the Lord", ref: "Psalm 37:4" },
  { text: "The Lord will fight for you", ref: "Exodus 14:14" },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: T[], count: number): T[] {
  return shuffle(arr).slice(0, Math.min(count, arr.length));
}

app.get("/", (_req, res) => {
  res.send("LoopNest AI Service Running");
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "loopnest",
    timestamp: new Date().toISOString(),
  });
});

app.post("/generate-game", (req, res) => {
  const { title, type = "tap-the-promise", count = 7, themeMode = "auto" } = req.body;

  if (!title || typeof title !== "string") {
    return res.status(400).json({ error: "title is required" });
  }

  const contentData = pickRandom(SCRIPTURE_POOL, count);

  res.json({
    id: `game-${Date.now()}`,
    title: title.trim(),
    type,
    themeMode,
    contentData,
    sessionSize: contentData.length,
    createdAt: new Date().toISOString(),
  });
});

app.post("/generate-quiz", (req, res) => {
  const { topic = "general", count = 5 } = req.body;

  const quizTemplates = [
    {
      question: "Which book of the Bible contains the verse 'Trust in the Lord with all your heart'?",
      options: ["Proverbs", "Psalms", "Isaiah", "Ecclesiastes"],
      answer: "Proverbs",
      reference: "Proverbs 3:5",
    },
    {
      question: "Complete this verse: 'I can do all things through...'",
      options: ["Christ who strengthens me", "my own strength", "prayer and fasting", "the Holy Spirit alone"],
      answer: "Christ who strengthens me",
      reference: "Philippians 4:13",
    },
    {
      question: "Which Psalm begins with 'The Lord is my shepherd'?",
      options: ["Psalm 23", "Psalm 1", "Psalm 91", "Psalm 119"],
      answer: "Psalm 23",
      reference: "Psalm 23:1",
    },
    {
      question: "'Be strong and courageous' was spoken to which biblical figure?",
      options: ["Joshua", "David", "Moses", "Abraham"],
      answer: "Joshua",
      reference: "Joshua 1:9",
    },
    {
      question: "Which verse says 'For God so loved the world that He gave His only Son'?",
      options: ["John 3:16", "Romans 8:28", "Matthew 5:14", "Ephesians 2:8"],
      answer: "John 3:16",
      reference: "John 3:16",
    },
    {
      question: "'God is our refuge and strength' comes from which Psalm?",
      options: ["Psalm 46", "Psalm 23", "Psalm 91", "Psalm 100"],
      answer: "Psalm 46",
      reference: "Psalm 46:1",
    },
    {
      question: "Which verse says 'My grace is sufficient for you'?",
      options: ["2 Corinthians 12:9", "Ephesians 2:8", "Romans 3:24", "Titus 2:11"],
      answer: "2 Corinthians 12:9",
      reference: "2 Corinthians 12:9",
    },
    {
      question: "'No weapon formed against you shall prosper' is found in which book?",
      options: ["Isaiah", "Jeremiah", "Psalms", "Deuteronomy"],
      answer: "Isaiah",
      reference: "Isaiah 54:17",
    },
    {
      question: "Who said 'Peace I leave with you, my peace I give you'?",
      options: ["Jesus", "Paul", "Peter", "John"],
      answer: "Jesus",
      reference: "John 14:27",
    },
    {
      question: "'Those who hope in the Lord will renew their strength' is from which chapter?",
      options: ["Isaiah 40", "Isaiah 53", "Isaiah 9", "Isaiah 61"],
      answer: "Isaiah 40",
      reference: "Isaiah 40:31",
    },
  ];

  const selected = pickRandom(quizTemplates, count);

  res.json({
    id: `quiz-${Date.now()}`,
    topic,
    questions: selected,
    totalQuestions: selected.length,
    createdAt: new Date().toISOString(),
  });
});

app.post("/generate-puzzle", (req, res) => {
  const { difficulty = "medium", count = 5 } = req.body;

  const puzzleTemplates = [
    { type: "fill-in-blank", prompt: "Trust in the ____ with all your heart", answer: "Lord", hint: "Proverbs 3:5" },
    { type: "fill-in-blank", prompt: "I can do all things through ____ who strengthens me", answer: "Christ", hint: "Philippians 4:13" },
    { type: "fill-in-blank", prompt: "The Lord is my ____; I shall not want", answer: "shepherd", hint: "Psalm 23:1" },
    { type: "fill-in-blank", prompt: "Be strong and ____", answer: "courageous", hint: "Joshua 1:9" },
    { type: "fill-in-blank", prompt: "Do not ____, for I am with you", answer: "fear", hint: "Isaiah 41:10" },
    { type: "unscramble", prompt: "Unscramble: ACGER", answer: "GRACE", hint: "2 Corinthians 12:9" },
    { type: "unscramble", prompt: "Unscramble: HFAIT", answer: "FAITH", hint: "Hebrews 11:1" },
    { type: "unscramble", prompt: "Unscramble: EACEP", answer: "PEACE", hint: "John 14:27" },
    { type: "match", prompt: "Match the verse to its book: 'In all things God works for the good'", answer: "Romans", hint: "Romans 8:28" },
    { type: "match", prompt: "Match the verse to its book: 'The joy of the Lord is your strength'", answer: "Nehemiah", hint: "Nehemiah 8:10" },
  ];

  const selected = pickRandom(puzzleTemplates, count);

  res.json({
    id: `puzzle-${Date.now()}`,
    difficulty,
    puzzles: selected,
    totalPuzzles: selected.length,
    createdAt: new Date().toISOString(),
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`LoopNest service running on port ${PORT}`);
});
