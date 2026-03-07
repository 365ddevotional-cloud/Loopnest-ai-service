import type { ContentItem } from "./GameTypes";

export interface GameConfig {
  id: string;
  title: string;
  route: string;
  type: "internal" | "user";
  contentData: ContentItem[];
  audioTrack: string;
  themeMode: "auto" | "light" | "dark";
}

const TAP_THE_PROMISE_DATA: ContentItem[] = [
  { text: "Trust in the Lord with all your heart", ref: "Proverbs 3:5" },
  { text: "By grace you have been saved", ref: "Ephesians 2:8" },
  { text: "I can do all things through Christ", ref: "Philippians 4:13" },
  { text: "The Lord is my shepherd", ref: "Psalm 23:1" },
  { text: "Walk by the Spirit", ref: "Galatians 5:16" },
  { text: "Do not fear, for I am with you", ref: "Isaiah 41:10" },
  { text: "Come to me, all who are weary", ref: "Matthew 11:28" },
  { text: "The Lord is my light and my salvation", ref: "Psalm 27:1" },
  { text: "God is our refuge and strength", ref: "Psalm 46:1" },
  { text: "Be strong and courageous", ref: "Joshua 1:9" },
  { text: "He will never leave you nor forsake you", ref: "Deuteronomy 31:6" },
  { text: "My grace is sufficient for you", ref: "2 Corinthians 12:9" },
  { text: "In all things God works for the good", ref: "Romans 8:28" },
  { text: "Cast all your anxiety on Him", ref: "1 Peter 5:7" },
  { text: "The joy of the Lord is your strength", ref: "Nehemiah 8:10" },
  { text: "He gives strength to the weary", ref: "Isaiah 40:29" },
  { text: "No weapon formed against you shall prosper", ref: "Isaiah 54:17" },
  { text: "Delight yourself in the Lord", ref: "Psalm 37:4" },
  { text: "The Lord will fight for you", ref: "Exodus 14:14" },
  { text: "Peace I leave with you", ref: "John 14:27" },
  { text: "Ask and it will be given to you", ref: "Matthew 7:7" },
  { text: "With God all things are possible", ref: "Matthew 19:26" },
  { text: "He restores my soul", ref: "Psalm 23:3" },
  { text: "The Lord is close to the brokenhearted", ref: "Psalm 34:18" },
  { text: "You are the light of the world", ref: "Matthew 5:14" },
  { text: "Greater is He that is in you", ref: "1 John 4:4" },
  { text: "I have overcome the world", ref: "John 16:33" },
  { text: "His mercies are new every morning", ref: "Lamentations 3:23" },
  { text: "The Lord is gracious and compassionate", ref: "Psalm 145:8" },
  { text: "He heals the brokenhearted", ref: "Psalm 147:3" },
  { text: "Your faith has made you well", ref: "Mark 10:52" },
  { text: "Nothing can separate us from the love of God", ref: "Romans 8:39" },
  { text: "I will give you rest", ref: "Matthew 11:28" },
  { text: "The Lord is faithful in all His promises", ref: "Psalm 145:13" },
  { text: "Those who hope in the Lord will renew their strength", ref: "Isaiah 40:31" },
  { text: "God has not given us a spirit of fear", ref: "2 Timothy 1:7" },
  { text: "He who began a good work in you will complete it", ref: "Philippians 1:6" },
  { text: "The Lord bless you and keep you", ref: "Numbers 6:24" },
  { text: "Be still and know that I am God", ref: "Psalm 46:10" },
  { text: "For where two or three gather in my name, there am I", ref: "Matthew 18:20" },
  { text: "Your word is a lamp to my feet", ref: "Psalm 119:105" },
  { text: "Seek first the kingdom of God", ref: "Matthew 6:33" },
  { text: "The name of the Lord is a fortified tower", ref: "Proverbs 18:10" },
];

const MEMORY_VERSE_SPRINT_DATA: ContentItem[] = [
  { text: "Trust in the Lord with all your heart", ref: "Proverbs 3:5" },
  { text: "The Lord is my shepherd I shall not want", ref: "Psalm 23:1" },
  { text: "For God so loved the world that He gave His only Son", ref: "John 3:16" },
  { text: "I can do all things through Christ who strengthens me", ref: "Philippians 4:13" },
  { text: "The Lord is my light and my salvation", ref: "Psalm 27:1" },
  { text: "Be strong and courageous", ref: "Joshua 1:9" },
  { text: "Cast all your anxiety on Him because He cares for you", ref: "1 Peter 5:7" },
  { text: "Do not fear for I am with you", ref: "Isaiah 41:10" },
  { text: "God is our refuge and strength", ref: "Psalm 46:1" },
  { text: "My grace is sufficient for you", ref: "2 Corinthians 12:9" },
  { text: "In all things God works for the good", ref: "Romans 8:28" },
  { text: "The joy of the Lord is your strength", ref: "Nehemiah 8:10" },
  { text: "No weapon formed against you shall prosper", ref: "Isaiah 54:17" },
  { text: "Peace I leave with you my peace I give you", ref: "John 14:27" },
  { text: "With God all things are possible", ref: "Matthew 19:26" },
  { text: "He restores my soul", ref: "Psalm 23:3" },
  { text: "Greater is He that is in you than he that is in the world", ref: "1 John 4:4" },
  { text: "His mercies are new every morning", ref: "Lamentations 3:23" },
  { text: "Those who hope in the Lord will renew their strength", ref: "Isaiah 40:31" },
  { text: "God has not given us a spirit of fear", ref: "2 Timothy 1:7" },
  { text: "Be still and know that I am God", ref: "Psalm 46:10" },
];

export const GAME_REGISTRY: GameConfig[] = [
  {
    id: "tap-the-promise",
    title: "Tap The Promise",
    route: "/interactive/tap-the-promise",
    type: "internal",
    contentData: TAP_THE_PROMISE_DATA,
    audioTrack: "/audio/tap-theme.mp3",
    themeMode: "auto",
  },
  {
    id: "memory-verse-sprint",
    title: "Memory Verse Sprint",
    route: "/interactive/memory-verse-sprint",
    type: "internal",
    contentData: MEMORY_VERSE_SPRINT_DATA,
    audioTrack: "/audio/tap-theme.mp3",
    themeMode: "auto",
  },
];

export function getGameConfig(id: string): GameConfig | undefined {
  return GAME_REGISTRY.find((g) => g.id === id);
}

export function getGameByRoute(route: string): GameConfig | undefined {
  return GAME_REGISTRY.find((g) => g.route === route);
}
