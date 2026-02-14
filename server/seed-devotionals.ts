import { db } from "./db";
import { devotionals } from "@shared/schema";
import { eq } from "drizzle-orm";

interface DevotionalData {
  date: string;
  title: string;
  scriptureReference: string;
  scriptureText: string;
  content: string;
  prayerPoints: string[];
  faithDeclarations: string[];
  author: string;
}

// Generate all devotionals for 2026 (Jan 4 - Dec 31)
const allDevotionals: DevotionalData[] = [
  // JANUARY (4-31)
  {
    date: "2026-01-04",
    title: "The Power of Faith",
    scriptureReference: "Hebrews 11:1",
    scriptureText: "Now faith is the substance of things hoped for, the evidence of things not seen.",
    content: "Faith is the foundation upon which our Christian walk is built. It is not mere wishful thinking but a confident assurance in God's promises. When we exercise faith, we declare that God's Word is more real than our circumstances. Today, let your faith rise above every doubt and fear that seeks to hold you back.",
    prayerPoints: ["Lord, increase my faith to trust You completely", "Help me to see beyond my circumstances", "Strengthen my belief in Your promises"],
    faithDeclarations: ["My faith moves mountains", "I walk by faith, not by sight", "Nothing is impossible for me through Christ"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-05",
    title: "Divine Purpose",
    scriptureReference: "Jeremiah 29:11",
    scriptureText: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.",
    content: "God has a specific purpose for your life that no one else can fulfill. You are not an accident; you are divinely designed for greatness. Every experience, every trial, and every victory is shaping you for your destiny. Embrace God's plan with confidence, knowing that He who began a good work in you will complete it.",
    prayerPoints: ["Father, reveal Your purpose for my life", "Guide my steps according to Your will", "Remove every distraction from my destiny path"],
    faithDeclarations: ["I am created for a divine purpose", "God's plans for me are good", "I am walking in my destiny"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-06",
    title: "Strength in Weakness",
    scriptureReference: "2 Corinthians 12:9",
    scriptureText: "My grace is sufficient for you, for my power is made perfect in weakness.",
    content: "In our weakness, God's strength shines brightest. When we acknowledge our limitations, we create space for His power to work through us. Do not be discouraged by your inadequacies; instead, see them as opportunities for God's grace to manifest. His power is perfected when we surrender our weaknesses to Him.",
    prayerPoints: ["Lord, be my strength in every weak moment", "Transform my limitations into testimonies", "Let Your power rest upon me"],
    faithDeclarations: ["When I am weak, then I am strong", "God's grace is sufficient for me", "His power works mightily through me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-07",
    title: "Renewed Mind",
    scriptureReference: "Romans 12:2",
    scriptureText: "Be transformed by the renewing of your mind.",
    content: "Transformation begins in the mind. What you think determines who you become. Allow God's Word to reshape your thoughts, replacing fear with faith, doubt with confidence, and negativity with hope. As your mind is renewed, your life will be transformed. Guard your thoughts, for they are the seeds of your future.",
    prayerPoints: ["Renew my mind according to Your Word", "Remove every negative thought pattern", "Help me to think on things that are pure and lovely"],
    faithDeclarations: ["My mind is being renewed daily", "I have the mind of Christ", "I think thoughts of victory and success"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-08",
    title: "The God Who Provides",
    scriptureReference: "Philippians 4:19",
    scriptureText: "And my God will meet all your needs according to the riches of his glory in Christ Jesus.",
    content: "Jehovah Jireh, the Lord our Provider, has never failed and will never fail. He knows your needs before you ask and has already made provision for them. Trust in His timing and His methods. What seems impossible in your eyes is already accomplished in heaven. Your provision is on its way.",
    prayerPoints: ["Father, provide for all my needs today", "Open doors of provision that no man can shut", "Increase my faith to trust Your provision"],
    faithDeclarations: ["All my needs are met according to His riches", "I lack nothing", "Abundance flows to me from unexpected sources"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-09",
    title: "Walking in Love",
    scriptureReference: "1 John 4:8",
    scriptureText: "God is love. Whoever lives in love lives in God, and God in them.",
    content: "Love is not just an emotion; it is the very nature of God expressed through us. When we choose to love, even when it is difficult, we reflect the heart of our Father. Love covers a multitude of sins, heals broken relationships, and brings heaven to earth. Let love be the motivation behind every action today.",
    prayerPoints: ["Fill my heart with Your unconditional love", "Help me to love those who are difficult to love", "Let Your love flow through me to others"],
    faithDeclarations: ["I am rooted and grounded in love", "God's love flows through me", "I choose to walk in love daily"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-10",
    title: "Victory Over Fear",
    scriptureReference: "2 Timothy 1:7",
    scriptureText: "For God has not given us a spirit of fear, but of power, love, and a sound mind.",
    content: "Fear is not from God. Every time fear tries to grip your heart, remember that the Spirit within you is greater than any challenge before you. God has equipped you with power to overcome, love to endure, and a sound mind to navigate every situation. Stand firm and refuse to bow to fear.",
    prayerPoints: ["Deliver me from every spirit of fear", "Replace my fears with Your perfect peace", "Give me boldness to face every challenge"],
    faithDeclarations: ["I am not afraid", "I have power, love, and a sound mind", "Fear has no place in my life"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-11",
    title: "The Joy of the Lord",
    scriptureReference: "Nehemiah 8:10",
    scriptureText: "The joy of the Lord is your strength.",
    content: "Joy is not dependent on circumstances; it is a divine strength that sustains us through every season. When you tap into the joy of the Lord, you find strength to endure, courage to continue, and hope to overcome. Choose joy today, not because everything is perfect, but because God is with you.",
    prayerPoints: ["Fill me with Your supernatural joy", "Let my joy be constant regardless of circumstances", "Restore the joy of my salvation"],
    faithDeclarations: ["The joy of the Lord is my strength", "I choose joy over despair", "My heart is full of divine joy"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-12",
    title: "Trusting God's Timing",
    scriptureReference: "Ecclesiastes 3:11",
    scriptureText: "He has made everything beautiful in its time.",
    content: "God's timing is perfect, even when it does not align with our expectations. What seems like delay is often divine preparation. Trust that the One who holds the universe also holds your future. In His time, every promise will manifest, every prayer will be answered, and every dream will come to fruition.",
    prayerPoints: ["Help me to trust Your perfect timing", "Give me patience to wait on Your promises", "Align my expectations with Your will"],
    faithDeclarations: ["God's timing for my life is perfect", "I will not rush ahead of God", "Everything is working out in divine order"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-13",
    title: "The Power of Prayer",
    scriptureReference: "James 5:16",
    scriptureText: "The prayer of a righteous person is powerful and effective.",
    content: "Prayer is not a religious ritual; it is a powerful weapon in the hands of believers. Through prayer, we access heaven's resources, change circumstances, and release God's will on earth. Never underestimate the power of your prayers. The same God who parted the Red Sea hears you when you pray.",
    prayerPoints: ["Teach me to pray with power and authority", "Ignite a fresh fire of prayer in my heart", "Let my prayers move mountains"],
    faithDeclarations: ["My prayers are powerful and effective", "Heaven responds when I pray", "I am a person of prayer"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-14",
    title: "Standing on God's Word",
    scriptureReference: "Isaiah 40:8",
    scriptureText: "The grass withers and the flowers fall, but the word of our God endures forever.",
    content: "In a world of constant change, God's Word remains unchanging. It is the solid rock upon which we build our lives. When everything around you seems unstable, stand firmly on the eternal promises of God. His Word has never failed, and it will not fail you now.",
    prayerPoints: ["Root Your Word deep in my heart", "Help me to stand on Your promises", "Let Your Word be a lamp to my feet"],
    faithDeclarations: ["I stand on the solid rock of God's Word", "His promises never fail me", "The Word of God is my foundation"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-15",
    title: "Grace Upon Grace",
    scriptureReference: "John 1:16",
    scriptureText: "From his fullness we have all received, grace upon grace.",
    content: "God's grace is inexhaustible. Just when you think you have exhausted His mercy, you discover there is more. Grace covers your past, empowers your present, and secures your future. You are not saved by your works but by His amazing grace. Receive it afresh today.",
    prayerPoints: ["Let Your grace be sufficient for me today", "Help me to extend grace to others", "May I never take Your grace for granted"],
    faithDeclarations: ["I am covered by God's abundant grace", "Grace empowers me to live victoriously", "I receive fresh grace every morning"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-16",
    title: "The Faithful God",
    scriptureReference: "Lamentations 3:23",
    scriptureText: "His mercies are new every morning; great is Your faithfulness.",
    content: "God's faithfulness is not based on our performance but on His character. He remains faithful even when we falter. Every new day is a fresh demonstration of His unwavering commitment to His children. Take heart, for the God who has been faithful in the past will be faithful today and forever.",
    prayerPoints: ["Thank You for Your faithfulness in my life", "Help me to trust in Your unchanging nature", "Let Your faithfulness be my testimony"],
    faithDeclarations: ["God is faithful to me always", "His mercies are new every morning", "I serve a faithful God"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-17",
    title: "Pressing Forward",
    scriptureReference: "Philippians 3:14",
    scriptureText: "I press on toward the goal to win the prize for which God has called me heavenward in Christ Jesus.",
    content: "The Christian life is a race that requires determination and focus. Do not be distracted by past failures or present challenges. Keep your eyes on the prize and press forward with all your might. The finish line is ahead, and the crown of glory awaits those who persevere.",
    prayerPoints: ["Give me strength to press forward", "Help me to forget what lies behind", "Keep my eyes fixed on the goal"],
    faithDeclarations: ["I am pressing toward my divine destiny", "Nothing will hold me back", "I will finish my race strong"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-18",
    title: "Divine Protection",
    scriptureReference: "Psalm 91:11",
    scriptureText: "For he will command his angels concerning you to guard you in all your ways.",
    content: "You are under divine protection. God has assigned angels to watch over you, to guard you from danger, and to keep you safe in all your ways. No weapon formed against you shall prosper. Walk confidently today, knowing that the Most High is your refuge and your fortress.",
    prayerPoints: ["Thank You for Your angels that guard me", "Cover me and my family with Your protection", "Deliver me from every hidden danger"],
    faithDeclarations: ["I am protected by the Most High", "Angels guard me in all my ways", "No evil shall befall me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-19",
    title: "Overcoming Temptation",
    scriptureReference: "1 Corinthians 10:13",
    scriptureText: "God is faithful; he will not let you be tempted beyond what you can bear.",
    content: "Temptation is common to all, but victory is available to those who rely on God. He has promised to provide a way of escape with every temptation. You are not destined to fall; you are equipped to overcome. Lean on His strength, and you will stand victorious.",
    prayerPoints: ["Strengthen me against every temptation", "Show me the way of escape in difficult moments", "Purify my heart and renew my resolve"],
    faithDeclarations: ["I overcome every temptation through Christ", "I am stronger than any temptation", "God always provides a way out"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-20",
    title: "The Peace of God",
    scriptureReference: "Philippians 4:7",
    scriptureText: "And the peace of God, which transcends all understanding, will guard your hearts and minds in Christ Jesus.",
    content: "In the midst of chaos, God offers a peace that defies logic. It is a peace that cannot be manufactured by the world but is given freely by the Prince of Peace. When anxiety knocks at your door, let God's peace answer. It will guard your heart and keep you steady.",
    prayerPoints: ["Fill me with Your supernatural peace", "Calm every storm raging in my life", "Let Your peace rule in my heart"],
    faithDeclarations: ["I have peace that surpasses understanding", "My heart is guarded by God's peace", "I refuse to be anxious about anything"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-21",
    title: "Called to Serve",
    scriptureReference: "Mark 10:45",
    scriptureText: "For even the Son of Man did not come to be served, but to serve.",
    content: "True greatness in the kingdom of God is measured by service. Jesus, the King of Kings, came not to be served but to serve. As His followers, we are called to the same path of humble service. Look for opportunities today to serve others, and in doing so, you will find true fulfillment.",
    prayerPoints: ["Give me a servant's heart like Jesus", "Open my eyes to see the needs of others", "Use me as a vessel of Your love"],
    faithDeclarations: ["I am called to serve others", "My greatness is in my service", "I follow Jesus' example of servanthood"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-22",
    title: "Breaking Chains",
    scriptureReference: "John 8:36",
    scriptureText: "So if the Son sets you free, you will be free indeed.",
    content: "Jesus came to break every chain that binds you. Whether it is addiction, fear, unforgiveness, or any other bondage, His power is greater. The freedom He offers is complete and lasting. Today, receive your freedom. The chains that once held you have no more power over you.",
    prayerPoints: ["Break every chain holding me captive", "Set me free from generational bondages", "Let Your freedom flow through my entire life"],
    faithDeclarations: ["I am free indeed", "No chain can hold me", "Christ has liberated me completely"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-23",
    title: "The Holy Spirit's Guidance",
    scriptureReference: "John 16:13",
    scriptureText: "When the Spirit of truth comes, he will guide you into all the truth.",
    content: "You are not left to navigate life alone. The Holy Spirit, your Counselor and Guide, is with you every step of the way. He leads you into truth, reveals hidden things, and directs your path. Learn to listen to His gentle voice, and you will never lose your way.",
    prayerPoints: ["Holy Spirit, guide me in every decision", "Sharpen my spiritual ears to hear Your voice", "Lead me in the path of righteousness"],
    faithDeclarations: ["The Holy Spirit guides me daily", "I am led by the Spirit of God", "I will not miss my way"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-24",
    title: "Bearing Fruit",
    scriptureReference: "John 15:5",
    scriptureText: "I am the vine; you are the branches. If you remain in me and I in you, you will bear much fruit.",
    content: "Fruitfulness is the natural result of abiding in Christ. When we stay connected to the Vine, His life flows through us and produces lasting fruit. Do not strive in your own strength; instead, rest in Him and let His power work through you. The fruit you bear will glorify the Father.",
    prayerPoints: ["Help me to abide in You always", "Produce lasting fruit through my life", "Prune away anything that hinders fruitfulness"],
    faithDeclarations: ["I am connected to the True Vine", "I bear much fruit for God's glory", "My life produces lasting impact"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-25",
    title: "Forgiveness Freely Given",
    scriptureReference: "Ephesians 4:32",
    scriptureText: "Be kind and compassionate to one another, forgiving each other, just as in Christ God forgave you.",
    content: "Forgiveness is not optional for believers; it is essential. Just as Christ freely forgave us, we are called to forgive others. Holding onto unforgiveness only poisons our own soul. Release those who have wronged you today, and experience the freedom that comes with letting go.",
    prayerPoints: ["Help me to forgive as You forgave me", "Heal my heart from past hurts", "Give me the grace to release all offenses"],
    faithDeclarations: ["I freely forgive those who hurt me", "My heart is free from bitterness", "I walk in the freedom of forgiveness"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-26",
    title: "Courage in Crisis",
    scriptureReference: "Joshua 1:9",
    scriptureText: "Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.",
    content: "Crisis reveals character and demands courage. But our courage is not self-generated; it comes from knowing that God is with us. The same God who parted the sea and conquered enemies goes before you. Face your challenges with boldness, for He who is with you is greater than any crisis against you.",
    prayerPoints: ["Fill me with holy courage", "Remind me of Your presence in every crisis", "Turn my fears into faith"],
    faithDeclarations: ["I am strong and courageous", "God is with me wherever I go", "No crisis can defeat me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-27",
    title: "Childlike Faith",
    scriptureReference: "Matthew 18:3",
    scriptureText: "Unless you change and become like little children, you will never enter the kingdom of heaven.",
    content: "Children trust without questioning, believe without doubting, and love without conditions. Jesus calls us to have this same childlike faith. Lay aside your sophisticated doubts and trust your Father completely. He delights in simple, pure-hearted faith that takes Him at His word.",
    prayerPoints: ["Restore childlike faith in my heart", "Remove cynicism and doubt from me", "Help me to trust You simply and completely"],
    faithDeclarations: ["I have the faith of a child", "I trust my Father completely", "I believe without doubting"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-28",
    title: "Unity in the Body",
    scriptureReference: "Ephesians 4:3",
    scriptureText: "Make every effort to keep the unity of the Spirit through the bond of peace.",
    content: "Unity among believers is a powerful testimony to the world. When we stand together in love, we reflect the heart of God and confound the enemy. Do not allow division to take root in your relationships. Be a peacemaker, a bridge-builder, and an agent of unity wherever you go.",
    prayerPoints: ["Help me to be an instrument of unity", "Heal divisions in the body of Christ", "Give me wisdom to maintain peace"],
    faithDeclarations: ["I am an agent of unity", "I build bridges, not walls", "Peace follows me wherever I go"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-29",
    title: "Eternal Perspective",
    scriptureReference: "2 Corinthians 4:18",
    scriptureText: "We fix our eyes not on what is seen, but on what is unseen, since what is seen is temporary, but what is unseen is eternal.",
    content: "This life is but a vapor compared to eternity. When we keep an eternal perspective, present troubles shrink in significance. The investments we make in heaven will last forever, while earthly treasures fade away. Live today with eternity in view.",
    prayerPoints: ["Give me an eternal perspective", "Help me to invest in things that last", "Keep my focus on heavenly treasures"],
    faithDeclarations: ["I live with eternity in view", "My treasures are in heaven", "Temporary troubles do not define me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-30",
    title: "God's Unfailing Love",
    scriptureReference: "Romans 8:38-39",
    scriptureText: "Nothing can separate us from the love of God that is in Christ Jesus our Lord.",
    content: "God's love for you is unshakeable and unconditional. No failure, no sin, no circumstance can separate you from His love. You are loved beyond measure, beyond reason, beyond comprehension. Rest secure in this truth: you are forever loved by the King of the universe.",
    prayerPoints: ["Let me experience the depths of Your love", "Remove every lie that says I am unloved", "Anchor my identity in Your love"],
    faithDeclarations: ["Nothing can separate me from God's love", "I am unconditionally loved", "God's love never fails me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-01-31",
    title: "New Beginnings",
    scriptureReference: "Isaiah 43:19",
    scriptureText: "See, I am doing a new thing! Now it springs up; do you not perceive it?",
    content: "God is the God of new beginnings. No matter what has happened in your past, He can create something new in your life. Old things are passing away; behold, all things are becoming new. Open your eyes to perceive what God is doing and embrace the fresh start He offers.",
    prayerPoints: ["Do a new thing in my life, Lord", "Help me to let go of the past", "Open my eyes to see Your new work"],
    faithDeclarations: ["God is doing a new thing in my life", "I embrace new beginnings", "My best days are ahead"],
    author: "Moses Afolabi"
  },
  // FEBRUARY
  {
    date: "2026-02-01",
    title: "The Heart of Worship",
    scriptureReference: "John 4:24",
    scriptureText: "God is spirit, and his worshipers must worship in the Spirit and in truth.",
    content: "Worship is not about songs or rituals; it is about the posture of our hearts. True worship flows from a heart that recognizes God's greatness and responds with adoration. When we worship in spirit and truth, we enter His presence and experience transformation. Let your whole life be an act of worship.",
    prayerPoints: ["Create in me a heart of pure worship", "Teach me to worship in spirit and truth", "Let my life be a continuous offering of praise"],
    faithDeclarations: ["I am a true worshiper", "My worship touches God's heart", "I live a life of worship"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-02",
    title: "Spiritual Hunger",
    scriptureReference: "Matthew 5:6",
    scriptureText: "Blessed are those who hunger and thirst for righteousness, for they will be filled.",
    content: "Those who hunger for more of God will always be satisfied. Spiritual hunger drives us to seek Him passionately, to dive deeper into His Word, and to pursue His presence above all else. Cultivate a holy dissatisfaction with spiritual mediocrity. Chase after God with all your heart.",
    prayerPoints: ["Increase my hunger for Your presence", "Fill me until I overflow", "Never let me be satisfied with spiritual mediocrity"],
    faithDeclarations: ["I hunger and thirst for God", "I am continually being filled", "My appetite for God grows daily"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-03",
    title: "Armor of God",
    scriptureReference: "Ephesians 6:11",
    scriptureText: "Put on the full armor of God, so that you can take your stand against the devil's schemes.",
    content: "We are in a spiritual battle, and God has equipped us with armor for victory. The belt of truth, breastplate of righteousness, shoes of peace, shield of faith, helmet of salvation, and sword of the Spirit are our weapons. Put on your armor daily and stand firm against every attack.",
    prayerPoints: ["Help me to wear Your armor daily", "Strengthen me for spiritual warfare", "Expose every scheme of the enemy"],
    faithDeclarations: ["I am equipped for battle", "I wear the full armor of God", "I stand victorious against every attack"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-04",
    title: "Seeds of Generosity",
    scriptureReference: "2 Corinthians 9:6",
    scriptureText: "Whoever sows sparingly will also reap sparingly, and whoever sows generously will also reap generously.",
    content: "Generosity unlocks heaven's abundance in our lives. What we sow, we will reap. When we give freely, we position ourselves to receive freely. God loves a cheerful giver and rewards those who trust Him with their resources. Plant seeds of generosity today and watch God multiply them.",
    prayerPoints: ["Give me a generous heart like Yours", "Help me to sow bountifully", "Multiply my seeds of faith"],
    faithDeclarations: ["I am a generous giver", "My seeds produce abundant harvest", "Generosity flows through me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-05",
    title: "Healing in His Wings",
    scriptureReference: "Malachi 4:2",
    scriptureText: "The Sun of Righteousness will rise with healing in his wings.",
    content: "Jesus is our Healer. By His stripes, we are healed—spirit, soul, and body. No sickness is too great, no wound too deep for His healing touch. Reach out to Him in faith today and receive the healing that flows from His presence. He makes all things new.",
    prayerPoints: ["Touch me with Your healing power", "Restore what sickness has stolen", "Let Your healing flow through every part of my being"],
    faithDeclarations: ["I am healed by His stripes", "Divine health is my portion", "Healing flows through my body"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-06",
    title: "Surrendered Life",
    scriptureReference: "Romans 12:1",
    scriptureText: "Offer your bodies as a living sacrifice, holy and pleasing to God.",
    content: "Surrender is not defeat; it is victory. When we lay our lives on the altar before God, we exchange our limited plans for His unlimited possibilities. A surrendered life is a powerful life, fully available for God's purposes. Give Him your all today and watch Him do exceeding abundantly.",
    prayerPoints: ["I surrender my all to You, Lord", "Take full control of my life", "Use me for Your glory"],
    faithDeclarations: ["My life is fully surrendered to God", "I am a living sacrifice", "God's will is my priority"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-07",
    title: "Walking in Integrity",
    scriptureReference: "Proverbs 10:9",
    scriptureText: "Whoever walks in integrity walks securely.",
    content: "Integrity is doing the right thing even when no one is watching. It is the foundation of a life that pleases God and earns the trust of others. When you walk in integrity, you walk in security. Your conscience is clear, your path is straight, and your future is bright.",
    prayerPoints: ["Help me to walk in integrity always", "Purify my motives and actions", "Let my life be above reproach"],
    faithDeclarations: ["I walk in integrity", "My character honors God", "I am trustworthy in all things"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-08",
    title: "God's Sovereignty",
    scriptureReference: "Isaiah 46:10",
    scriptureText: "My purpose will stand, and I will do all that I please.",
    content: "God is sovereign over all creation. Nothing happens outside His knowledge or control. Even when circumstances seem chaotic, He is working all things together for good. Trust in His sovereignty and rest in the assurance that He holds your life in His capable hands.",
    prayerPoints: ["Help me to trust Your sovereign plan", "Give me peace in uncertainty", "Let Your purposes prevail in my life"],
    faithDeclarations: ["God is in control", "His purposes for me will stand", "I trust His sovereign hand"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-09",
    title: "The Name of Jesus",
    scriptureReference: "Philippians 2:10",
    scriptureText: "At the name of Jesus every knee should bow.",
    content: "There is power in the name of Jesus. Demons tremble, sicknesses flee, and chains are broken at the mention of His name. You carry the authority of that name. Use it boldly in prayer, in spiritual warfare, and in every situation that confronts you. His name is above every other name.",
    prayerPoints: ["Teach me to use Your name with authority", "Let Your name be glorified through my life", "Break every opposition at the sound of Your name"],
    faithDeclarations: ["I carry the power of Jesus' name", "Every knee bows to His name", "His name is my victory"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-10",
    title: "Patience in Trials",
    scriptureReference: "James 1:4",
    scriptureText: "Let perseverance finish its work so that you may be mature and complete, not lacking anything.",
    content: "Trials are not meant to destroy you but to develop you. In the furnace of testing, your faith is refined and your character is strengthened. Do not despise the process; embrace it. God is using every trial to make you mature, complete, and fully equipped for your destiny.",
    prayerPoints: ["Give me patience in every trial", "Complete Your work in me", "Help me to grow through challenges"],
    faithDeclarations: ["Trials make me stronger", "I am becoming mature and complete", "Every test leads to my testimony"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-11",
    title: "Divine Connections",
    scriptureReference: "Proverbs 27:17",
    scriptureText: "As iron sharpens iron, so one person sharpens another.",
    content: "God places specific people in our lives for divine purposes. The right relationships sharpen us, encourage us, and propel us toward our destiny. Value the godly connections God has given you and steward them well. Together, you can accomplish far more than you could alone.",
    prayerPoints: ["Bring divine connections into my life", "Remove toxic relationships that hinder me", "Help me to be a blessing to others"],
    faithDeclarations: ["I attract divine connections", "My relationships are blessed", "Iron sharpens iron in my life"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-12",
    title: "Gratitude Changes Everything",
    scriptureReference: "1 Thessalonians 5:18",
    scriptureText: "Give thanks in all circumstances; for this is God's will for you in Christ Jesus.",
    content: "Gratitude shifts our focus from what we lack to what we have. It opens our eyes to God's faithfulness and fills our hearts with joy. When we give thanks in all circumstances, we declare our trust in God's goodness. Start counting your blessings today and watch your perspective transform.",
    prayerPoints: ["Cultivate a thankful heart in me", "Help me to see Your blessings everywhere", "Let gratitude flow from my lips"],
    faithDeclarations: ["I am grateful in all circumstances", "Thanksgiving fills my heart", "My life overflows with gratitude"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-13",
    title: "Seeking First the Kingdom",
    scriptureReference: "Matthew 6:33",
    scriptureText: "Seek first his kingdom and his righteousness, and all these things will be given to you as well.",
    content: "When we prioritize God's kingdom above our own desires, everything else falls into place. Seeking first the kingdom means making God's will our primary pursuit. As we do this, He promises to provide for every need. Put God first today and trust Him for everything else.",
    prayerPoints: ["Help me to seek Your kingdom first", "Align my priorities with Your will", "Provide for all my needs as I seek You"],
    faithDeclarations: ["God's kingdom is my first priority", "I seek Him above all else", "All my needs are met as I pursue Him"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-14",
    title: "Love Never Fails",
    scriptureReference: "1 Corinthians 13:8",
    scriptureText: "Love never fails.",
    content: "Love is the greatest force in the universe. It never fails, never gives up, and never loses hope. God's love for you is relentless and unfailing. Let this love flow through you to others today. In a world desperate for genuine love, be the hands and heart of Christ.",
    prayerPoints: ["Fill me with Your unfailing love", "Help me to love without conditions", "Let Your love flow through me to others"],
    faithDeclarations: ["Love never fails in my life", "I am a conduit of God's love", "His love flows through me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-15",
    title: "Rooted in Christ",
    scriptureReference: "Colossians 2:7",
    scriptureText: "Rooted and built up in him, strengthened in the faith as you were taught, and overflowing with thankfulness.",
    content: "A tree with deep roots can withstand any storm. When we are deeply rooted in Christ, nothing can shake us. Our faith becomes strong, our hearts become stable, and our lives overflow with gratitude. Sink your roots deep into His Word and His presence.",
    prayerPoints: ["Root me deeply in Christ", "Strengthen my foundation of faith", "Let me overflow with thankfulness"],
    faithDeclarations: ["I am deeply rooted in Christ", "My faith is unshakeable", "I am strengthened in Him"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-16",
    title: "Light in Darkness",
    scriptureReference: "Matthew 5:14",
    scriptureText: "You are the light of the world. A town built on a hill cannot be hidden.",
    content: "You are called to shine in the darkness of this world. Your light dispels fear, exposes lies, and shows the way to Christ. Do not hide your light under a basket; let it shine brightly for all to see. The darker the world becomes, the brighter your light appears.",
    prayerPoints: ["Let my light shine for Your glory", "Use me to dispel darkness", "Make me a beacon of hope"],
    faithDeclarations: ["I am the light of the world", "My light shines brightly", "Darkness flees before me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-17",
    title: "Blessed to Be a Blessing",
    scriptureReference: "Genesis 12:2",
    scriptureText: "I will bless you... and you will be a blessing.",
    content: "God's blessings are not meant to be hoarded; they are meant to flow through us to others. Every blessing you receive is an opportunity to be a channel of blessing. As you give, you receive. As you bless, you are blessed. Be a river, not a reservoir.",
    prayerPoints: ["Bless me so I can bless others", "Open my eyes to needs around me", "Make me a channel of Your blessing"],
    faithDeclarations: ["I am blessed to be a blessing", "Blessings flow through me to others", "I am a conduit of God's goodness"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-18",
    title: "The Mind of Christ",
    scriptureReference: "1 Corinthians 2:16",
    scriptureText: "We have the mind of Christ.",
    content: "As believers, we have access to the very thoughts of Christ. We can think His thoughts, see from His perspective, and make decisions with His wisdom. Do not rely on human understanding; tap into the divine mind that dwells within you through the Holy Spirit.",
    prayerPoints: ["Help me to think with the mind of Christ", "Replace my limited thinking with Your thoughts", "Give me divine perspective"],
    faithDeclarations: ["I have the mind of Christ", "I think God's thoughts", "Divine wisdom guides my decisions"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-19",
    title: "Rest in God",
    scriptureReference: "Matthew 11:28",
    scriptureText: "Come to me, all you who are weary and burdened, and I will give you rest.",
    content: "Jesus invites the weary to find rest in Him. Not the kind of rest that comes from sleep alone, but a deep, soul-satisfying rest that comes from surrendering our burdens to Him. Stop striving and start trusting. In His presence, you will find the rest your soul craves.",
    prayerPoints: ["Give me rest for my weary soul", "Help me to cast all my burdens on You", "Let me dwell in Your peace"],
    faithDeclarations: ["I find rest in Jesus", "My soul is at peace", "I am no longer burdened"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-20",
    title: "Eyes on Jesus",
    scriptureReference: "Hebrews 12:2",
    scriptureText: "Fixing our eyes on Jesus, the pioneer and perfecter of faith.",
    content: "Where we fix our eyes determines our direction. When we keep our eyes on Jesus, we run the race with endurance. When we look at our problems, we sink like Peter on the water. Fix your gaze on Christ today. He is the author and finisher of your faith.",
    prayerPoints: ["Help me to keep my eyes on You", "Remove every distraction from my focus", "Let Jesus be my constant vision"],
    faithDeclarations: ["My eyes are fixed on Jesus", "He is my focus and my goal", "I run my race looking to Him"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-21",
    title: "Walking by Faith",
    scriptureReference: "2 Corinthians 5:7",
    scriptureText: "For we walk by faith, not by sight.",
    content: "Faith sees what the natural eyes cannot. It trusts God's promises over visible circumstances. Walking by faith means taking steps even when the path is unclear, knowing that God goes before us. Let faith, not fear, be your guide today.",
    prayerPoints: ["Increase my faith to walk with You", "Help me to trust beyond what I see", "Lead me in paths of faith"],
    faithDeclarations: ["I walk by faith, not by sight", "My faith guides my steps", "I trust God in the unseen"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-22",
    title: "Words of Life",
    scriptureReference: "Proverbs 18:21",
    scriptureText: "The tongue has the power of life and death.",
    content: "Your words carry tremendous power. They can build up or tear down, heal or wound, bless or curse. Choose your words carefully today, for they shape your reality and influence those around you. Speak words of life, hope, and encouragement.",
    prayerPoints: ["Guard my tongue from harmful words", "Fill my mouth with words of life", "Let my speech bring healing to others"],
    faithDeclarations: ["My words bring life", "I speak blessings, not curses", "My tongue is an instrument of God"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-23",
    title: "Anointed for Purpose",
    scriptureReference: "1 John 2:27",
    scriptureText: "The anointing you received from him remains in you.",
    content: "God has anointed you for a specific purpose. The Holy Spirit's anointing empowers you to accomplish what you could never do in your own strength. This anointing breaks yokes, opens doors, and releases supernatural ability. Walk in your anointing today.",
    prayerPoints: ["Let Your anointing flow fresh in me", "Reveal the purpose for which I am anointed", "Break every yoke through Your anointing"],
    faithDeclarations: ["I am anointed by God", "His anointing empowers me", "I walk in divine purpose"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-24",
    title: "Standing Firm",
    scriptureReference: "1 Corinthians 16:13",
    scriptureText: "Stand firm in the faith; be courageous; be strong.",
    content: "In a world that constantly shifts, we are called to stand firm. Our foundation is Christ, and He never changes. When pressures come and winds blow, do not be moved. Plant your feet on the solid rock of God's Word and stand courageous and strong.",
    prayerPoints: ["Help me to stand firm in faith", "Strengthen me against every pressure", "Let nothing move me from Your truth"],
    faithDeclarations: ["I stand firm in my faith", "I am courageous and strong", "Nothing can shake my foundation"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-25",
    title: "The Father's Discipline",
    scriptureReference: "Hebrews 12:11",
    scriptureText: "No discipline seems pleasant at the time, but painful. Later on, however, it produces a harvest of righteousness and peace.",
    content: "God's discipline is evidence of His love. He corrects us not to harm us but to help us grow. Though discipline may be painful in the moment, it produces lasting fruit—righteousness and peace. Welcome His correction as a sign that you are His beloved child.",
    prayerPoints: ["Give me a teachable heart", "Help me to receive Your correction with grace", "Produce righteousness in me through discipline"],
    faithDeclarations: ["I embrace God's loving discipline", "Correction leads me to growth", "I am becoming more like Christ"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-26",
    title: "Kingdom Authority",
    scriptureReference: "Luke 10:19",
    scriptureText: "I have given you authority to trample on snakes and scorpions and to overcome all the power of the enemy.",
    content: "Jesus has delegated His authority to you. You are not a victim of circumstances or demonic attacks; you are a victor with power to overcome. Use the authority Christ has given you to trample on every work of darkness. The enemy has no power over you.",
    prayerPoints: ["Help me to walk in my authority", "Defeat every enemy under my feet", "Let Your power manifest through me"],
    faithDeclarations: ["I have authority over the enemy", "I trample on every work of darkness", "Greater is He that is in me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-27",
    title: "Renewed Strength",
    scriptureReference: "Isaiah 40:31",
    scriptureText: "Those who hope in the Lord will renew their strength. They will soar on wings like eagles.",
    content: "When you feel depleted, there is a source of endless strength available to you. Those who wait on the Lord experience supernatural renewal. Like eagles, they rise above the storms of life. Place your hope in God, and He will renew your strength day by day.",
    prayerPoints: ["Renew my strength, O Lord", "Help me to wait on You", "Lift me up on eagle's wings"],
    faithDeclarations: ["My strength is renewed daily", "I soar above every challenge", "I mount up with wings like eagles"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-02-28",
    title: "God's Promises Are Yes",
    scriptureReference: "2 Corinthians 1:20",
    scriptureText: "For no matter how many promises God has made, they are 'Yes' in Christ.",
    content: "Every promise God has made is guaranteed through Christ. Not one word will fail. When doubt whispers that God's promises are too good to be true, remember this: in Christ, God says yes to every promise. Hold fast to His Word; it will surely come to pass.",
    prayerPoints: ["Strengthen my faith in Your promises", "Help me to hold onto Your Word", "Fulfill every promise in my life"],
    faithDeclarations: ["God's promises are yes for me", "Not one word will fail", "I receive every promise by faith"],
    author: "Moses Afolabi"
  },
  // MARCH
  {
    date: "2026-03-01",
    title: "New Month, New Mercies",
    scriptureReference: "Lamentations 3:22-23",
    scriptureText: "Because of the Lord's great love we are not consumed, for his compassions never fail. They are new every morning.",
    content: "As a new month begins, so do fresh mercies from the Lord. Whatever challenges you faced before, today is a new opportunity. His compassions are new every morning, sufficient for every need you will encounter. Step into this month with confidence, knowing that His mercies will meet you.",
    prayerPoints: ["Thank You for Your new mercies", "Let this month bring fresh blessings", "Cover every day with Your grace"],
    faithDeclarations: ["This is my month of new mercies", "God's compassions never fail me", "Every day brings fresh grace"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-02",
    title: "The Goodness of God",
    scriptureReference: "Psalm 27:13",
    scriptureText: "I remain confident of this: I will see the goodness of the Lord in the land of the living.",
    content: "God's goodness is not just for eternity; it is for here and now. In the land of the living, in the midst of your daily struggles, you will see His goodness. Keep your eyes open and your heart expectant. His goodness is pursuing you every day of your life.",
    prayerPoints: ["Open my eyes to see Your goodness", "Let Your goodness follow me", "Show me Your favor today"],
    faithDeclarations: ["I will see God's goodness", "His goodness pursues me", "I experience His favor daily"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-03",
    title: "Salt of the Earth",
    scriptureReference: "Matthew 5:13",
    scriptureText: "You are the salt of the earth.",
    content: "Salt preserves, flavors, and heals. As the salt of the earth, you are called to bring preservation, enhancement, and healing wherever you go. Your influence matters. Do not lose your saltiness by conforming to the world. Be the distinctive presence of Christ in every environment.",
    prayerPoints: ["Make me effective salt in this world", "Preserve my distinctive Christian witness", "Let me bring flavor and healing to others"],
    faithDeclarations: ["I am the salt of the earth", "My influence preserves and heals", "I make a difference wherever I go"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-04",
    title: "Living Hope",
    scriptureReference: "1 Peter 1:3",
    scriptureText: "In his great mercy he has given us new birth into a living hope through the resurrection of Jesus Christ from the dead.",
    content: "The hope we have in Christ is not wishful thinking; it is a living, breathing certainty anchored in His resurrection. Because He lives, we have hope that transcends every circumstance. This hope will never disappoint because it is founded on the risen Christ.",
    prayerPoints: ["Fill me with living hope", "Anchor my soul in Your resurrection power", "Let hope rise within me today"],
    faithDeclarations: ["I have a living hope in Christ", "My hope never disappoints", "The resurrection power is in me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-05",
    title: "Spiritual Growth",
    scriptureReference: "2 Peter 3:18",
    scriptureText: "Grow in the grace and knowledge of our Lord and Savior Jesus Christ.",
    content: "The Christian life is a journey of continuous growth. We are never meant to stagnate but to grow deeper in grace and knowledge of Christ. Each day is an opportunity to become more like Jesus. Embrace the growth process, even when it stretches you beyond comfort.",
    prayerPoints: ["Help me to grow spiritually every day", "Increase my knowledge of You", "Stretch me beyond my comfort zone"],
    faithDeclarations: ["I am growing in grace and knowledge", "Every day I become more like Christ", "I embrace spiritual growth"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-06",
    title: "Overflowing Blessing",
    scriptureReference: "Malachi 3:10",
    scriptureText: "Test me in this and see if I will not throw open the floodgates of heaven and pour out so much blessing that there will not be room enough to store it.",
    content: "God promises overflowing blessings to those who honor Him with their first fruits. This is the one area where God invites us to test Him. When we are faithful in giving, He opens windows of heaven that cannot be contained. Trust Him with your resources and watch Him multiply.",
    prayerPoints: ["Open the windows of heaven over my life", "Help me to honor You with my giving", "Pour out blessings I cannot contain"],
    faithDeclarations: ["Heaven's windows are open over me", "I receive overflowing blessings", "My obedience releases abundance"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-07",
    title: "Compassion Like Christ",
    scriptureReference: "Colossians 3:12",
    scriptureText: "Clothe yourselves with compassion, kindness, humility, gentleness and patience.",
    content: "Christ's heart was moved with compassion for the multitudes. As His followers, we are called to wear compassion like clothing. It should be evident in how we treat others, especially those who are hurting. Let compassion guide your interactions today.",
    prayerPoints: ["Give me a heart of compassion", "Help me to see others through Your eyes", "Use me to bring comfort to the hurting"],
    faithDeclarations: ["I am clothed with compassion", "My heart is moved by others' needs", "I reflect Christ's kindness"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-08",
    title: "Victorious Living",
    scriptureReference: "1 John 5:4",
    scriptureText: "For everyone born of God overcomes the world. This is the victory that has overcome the world, even our faith.",
    content: "Victory is not something we strive for; it is something we already have in Christ. By faith, we have overcome the world with all its challenges and temptations. Walk in this victory today. You are not fighting for victory; you are fighting from a place of victory.",
    prayerPoints: ["Remind me of my victory in Christ", "Help me to walk in overcoming faith", "Let victory be evident in my life"],
    faithDeclarations: ["I am an overcomer", "My faith overcomes the world", "Victory is already mine"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-09",
    title: "Delighting in God's Word",
    scriptureReference: "Psalm 1:2",
    scriptureText: "But whose delight is in the law of the Lord, and who meditates on his law day and night.",
    content: "The blessed person finds delight in God's Word. Scripture is not a burden but a treasure, not an obligation but a delight. When we meditate on His Word day and night, we become like a tree planted by streams of water, flourishing in every season.",
    prayerPoints: ["Create in me a love for Your Word", "Help me to meditate on Scripture daily", "Let Your Word produce fruit in my life"],
    faithDeclarations: ["I delight in God's Word", "His law is my meditation", "I flourish as I read Scripture"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-10",
    title: "Pursuing Holiness",
    scriptureReference: "Hebrews 12:14",
    scriptureText: "Make every effort to live in peace with everyone and to be holy; without holiness no one will see the Lord.",
    content: "Holiness is not optional; it is essential. It is the pursuit of living a life set apart for God, distinct from the world's patterns. As we pursue holiness, we draw closer to God and become more effective witnesses. Let today be marked by holy choices.",
    prayerPoints: ["Purify my heart, O Lord", "Help me to pursue holiness daily", "Set me apart for Your purposes"],
    faithDeclarations: ["I am called to holiness", "I pursue a set-apart life", "God's holiness marks my life"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-11",
    title: "The Gift of Peace",
    scriptureReference: "John 14:27",
    scriptureText: "Peace I leave with you; my peace I give you. I do not give to you as the world gives.",
    content: "Jesus offers a peace unlike anything the world can provide. His peace is not dependent on circumstances but on His presence. It guards your heart in chaos, calms your mind in confusion, and steadies your soul in storms. Receive His gift of peace today.",
    prayerPoints: ["Fill me with Your supernatural peace", "Calm every storm in my life", "Let Your peace guard my heart and mind"],
    faithDeclarations: ["I have the peace of Jesus", "His peace rules in my heart", "Nothing disturbs my peace"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-12",
    title: "Confidence in God",
    scriptureReference: "Hebrews 10:35",
    scriptureText: "So do not throw away your confidence; it will be richly rewarded.",
    content: "Your confidence in God will be rewarded. Do not let setbacks or delays cause you to doubt His faithfulness. Hold fast to your confidence, for God honors those who trust Him completely. The reward is coming; keep believing.",
    prayerPoints: ["Strengthen my confidence in You", "Help me to persevere in faith", "Reward my trust in Your time"],
    faithDeclarations: ["My confidence is in God alone", "I will not doubt His faithfulness", "My trust will be rewarded"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-13",
    title: "Power of Testimony",
    scriptureReference: "Revelation 12:11",
    scriptureText: "They triumphed over him by the blood of the Lamb and by the word of their testimony.",
    content: "Your testimony is a powerful weapon. When you share what God has done in your life, you encourage others and defeat the enemy. Never underestimate the power of your story. It gives hope to the hopeless and points others to Christ.",
    prayerPoints: ["Give me boldness to share my testimony", "Use my story to encourage others", "Let my testimony defeat the enemy"],
    faithDeclarations: ["My testimony is powerful", "I overcome by sharing what God has done", "My story brings hope to others"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-14",
    title: "Guarding Your Heart",
    scriptureReference: "Proverbs 4:23",
    scriptureText: "Above all else, guard your heart, for everything you do flows from it.",
    content: "Your heart is the wellspring of your life. What you allow into it shapes everything that flows out. Guard it carefully from bitterness, unforgiveness, and wrong desires. Protect it with truth, fill it with love, and nurture it with God's Word.",
    prayerPoints: ["Help me to guard my heart diligently", "Protect me from harmful influences", "Keep my heart pure and focused on You"],
    faithDeclarations: ["I guard my heart above all else", "My heart is protected", "Good things flow from my heart"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-15",
    title: "Mountain-Moving Faith",
    scriptureReference: "Matthew 17:20",
    scriptureText: "If you have faith as small as a mustard seed, you can say to this mountain, 'Move from here to there,' and it will move.",
    content: "It is not the size of your faith that matters but the size of your God. Even faith as small as a mustard seed can move mountains when placed in the hands of an almighty God. Speak to your mountains today. In Jesus' name, they must move.",
    prayerPoints: ["Increase my mountain-moving faith", "Help me to speak to my obstacles with authority", "Let nothing be impossible for me"],
    faithDeclarations: ["My faith moves mountains", "No obstacle can stand before me", "I speak and things change"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-16",
    title: "Chosen by God",
    scriptureReference: "1 Peter 2:9",
    scriptureText: "But you are a chosen people, a royal priesthood, a holy nation, God's special possession.",
    content: "You are not an accident. Before the foundation of the world, God chose you. You are part of a royal priesthood, a holy nation, His special possession. Let this truth transform how you see yourself. You are chosen, treasured, and deeply loved.",
    prayerPoints: ["Help me to walk in my chosen identity", "Remind me that I am Your special possession", "Let me live as royalty"],
    faithDeclarations: ["I am chosen by God", "I belong to a royal priesthood", "I am God's special possession"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-17",
    title: "Faithful in Little",
    scriptureReference: "Luke 16:10",
    scriptureText: "Whoever can be trusted with very little can also be trusted with much.",
    content: "Great opportunities often come disguised as small responsibilities. When we are faithful in the little things, God entrusts us with greater things. Do not despise small beginnings. Excel in the tasks before you, and God will open doors to greater influence.",
    prayerPoints: ["Help me to be faithful in small things", "Prepare me for greater responsibility", "Let my faithfulness please You"],
    faithDeclarations: ["I am faithful in little things", "God trusts me with more", "Excellence marks my smallest tasks"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-18",
    title: "Spirit of Excellence",
    scriptureReference: "Daniel 6:3",
    scriptureText: "Daniel distinguished himself above the administrators and the satraps because an excellent spirit was in him.",
    content: "Daniel stood out because of his excellent spirit. He did not settle for mediocrity but pursued excellence in everything. This spirit attracted favor and promotion. Cultivate a spirit of excellence in your work, your relationships, and your walk with God.",
    prayerPoints: ["Fill me with a spirit of excellence", "Help me to stand out for Your glory", "Let excellence be my trademark"],
    faithDeclarations: ["An excellent spirit is in me", "I distinguish myself through excellence", "My work reflects God's glory"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-19",
    title: "Waiting on God",
    scriptureReference: "Psalm 27:14",
    scriptureText: "Wait for the Lord; be strong and take heart and wait for the Lord.",
    content: "Waiting is not passive; it is active trust. When we wait on the Lord, we are not idle but expectant, not anxious but confident. In the waiting, He strengthens us, prepares us, and aligns us with His perfect timing. Be patient; your answer is coming.",
    prayerPoints: ["Give me patience to wait on You", "Strengthen my heart in the waiting", "Align me with Your perfect timing"],
    faithDeclarations: ["I wait on the Lord with confidence", "My strength increases as I wait", "God's timing is perfect"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-20",
    title: "God's Restoration",
    scriptureReference: "Joel 2:25",
    scriptureText: "I will repay you for the years the locusts have eaten.",
    content: "God is a restorer. What the enemy has stolen, what has been lost through hardship or wrong choices, God can restore. He promises to repay the years the locusts have eaten. Trust Him for restoration. Your comeback will be greater than your setback.",
    prayerPoints: ["Restore what has been stolen from me", "Redeem my wasted years", "Let my latter be greater than my former"],
    faithDeclarations: ["God restores what was lost", "My years are being redeemed", "My comeback is greater than my setback"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-21",
    title: "Walking Humbly",
    scriptureReference: "Micah 6:8",
    scriptureText: "Act justly, love mercy, and walk humbly with your God.",
    content: "Humility is the posture that invites God's grace. Pride repels, but humility attracts His favor. Walk humbly before God, acknowledging your dependence on Him. In your dealings with others, choose mercy over judgment. This is what the Lord requires.",
    prayerPoints: ["Create a humble heart in me", "Help me to act justly and love mercy", "Keep me walking humbly with You"],
    faithDeclarations: ["I walk humbly with my God", "Humility is my lifestyle", "God's favor rests on the humble"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-22",
    title: "Faith Over Feelings",
    scriptureReference: "Mark 11:24",
    scriptureText: "Therefore I tell you, whatever you ask for in prayer, believe that you have received it, and it will be yours.",
    content: "Faith is not based on feelings; it is based on God's Word. Sometimes we feel nothing, but our faith remains unchanged. Believe you have received your answer even before you see it. This is the faith that pleases God and moves mountains.",
    prayerPoints: ["Help me to believe beyond my feelings", "Increase my faith to receive", "Let my faith override my emotions"],
    faithDeclarations: ["I believe I have received", "My faith is not based on feelings", "What I ask in faith is mine"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-23",
    title: "Breaking Strongholds",
    scriptureReference: "2 Corinthians 10:4",
    scriptureText: "The weapons we fight with are not the weapons of the world. On the contrary, they have divine power to demolish strongholds.",
    content: "Strongholds are patterns of thinking or behavior that keep us bound. But God has given us weapons with divine power to demolish them. Through prayer, the Word, and the name of Jesus, every stronghold must fall. You are equipped for victory.",
    prayerPoints: ["Demolish every stronghold in my life", "Give me wisdom to use my spiritual weapons", "Set me free from every pattern of bondage"],
    faithDeclarations: ["Strongholds are falling in my life", "My weapons are divinely powerful", "I am free from every bondage"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-24",
    title: "Abundant Life",
    scriptureReference: "John 10:10",
    scriptureText: "I have come that they may have life, and have it to the full.",
    content: "Jesus came to give you abundant life—not just existence, but a rich, full, overflowing life. This abundance is not measured in material wealth but in spiritual richness, purpose, joy, and peace. Embrace the full life Christ offers. You were made for more.",
    prayerPoints: ["Lead me into abundant life", "Help me to experience the fullness of Christ", "Remove every limitation from my life"],
    faithDeclarations: ["I live an abundant life in Christ", "Fullness overflows in my life", "I experience the more that Christ offers"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-25",
    title: "Hearing God's Voice",
    scriptureReference: "John 10:27",
    scriptureText: "My sheep listen to my voice; I know them, and they follow me.",
    content: "God speaks to His children. His voice comes through Scripture, prayer, circumstances, and the Holy Spirit's prompting. As His sheep, you can learn to recognize His voice and follow His leading. Tune your ears to heaven today and listen for your Shepherd.",
    prayerPoints: ["Open my ears to hear Your voice", "Help me to distinguish Your voice from others", "Lead me as I follow You"],
    faithDeclarations: ["I hear God's voice clearly", "I follow my Shepherd", "His voice guides me daily"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-26",
    title: "God's Unchanging Nature",
    scriptureReference: "Hebrews 13:8",
    scriptureText: "Jesus Christ is the same yesterday and today and forever.",
    content: "In a world of constant change, Jesus remains the same. The God who healed in the Bible still heals today. The God who provided miraculously still provides. His character, His love, His power—all unchanged. You can trust the unchanging One.",
    prayerPoints: ["Thank You for Your unchanging nature", "Help me to trust Your consistency", "Let me find stability in You"],
    faithDeclarations: ["Jesus is the same today", "What He did before, He does now", "I serve an unchanging God"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-27",
    title: "Hope That Anchors",
    scriptureReference: "Hebrews 6:19",
    scriptureText: "We have this hope as an anchor for the soul, firm and secure.",
    content: "Hope in Christ is the anchor that keeps your soul steady in every storm. When waves of uncertainty crash around you, this hope holds you firm. It is not wishful thinking but confident expectation based on God's promises. Let hope anchor you today.",
    prayerPoints: ["Anchor my soul in Your hope", "Keep me steady in every storm", "Strengthen my confidence in Your promises"],
    faithDeclarations: ["Hope anchors my soul", "I am firm and secure in Christ", "No storm can move me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-28",
    title: "God's Presence",
    scriptureReference: "Psalm 16:11",
    scriptureText: "You make known to me the path of life; you will fill me with joy in your presence.",
    content: "There is no greater place than the presence of God. In His presence, we find direction for our path, fullness of joy, and pleasures forevermore. Seek His presence above all else. It is the source of everything your soul truly needs.",
    prayerPoints: ["Draw me closer to Your presence", "Fill me with joy as I dwell with You", "Make Your presence my home"],
    faithDeclarations: ["I dwell in God's presence", "Joy fills me in His presence", "His presence is my greatest treasure"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-29",
    title: "Complete in Christ",
    scriptureReference: "Colossians 2:10",
    scriptureText: "You have been given fullness in Christ.",
    content: "In Christ, you are complete. You do not need to add anything to what He has done. Every spiritual blessing, every resource you need, is already yours in Him. Stop striving for what you already have. Rest in the completeness that Christ provides.",
    prayerPoints: ["Help me to realize my completeness in You", "Remove every striving and restlessness", "Let me rest in what Christ has done"],
    faithDeclarations: ["I am complete in Christ", "I lack nothing in Him", "His fullness dwells in me"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-30",
    title: "Walking in the Spirit",
    scriptureReference: "Galatians 5:16",
    scriptureText: "Walk by the Spirit, and you will not gratify the desires of the flesh.",
    content: "When we walk in step with the Holy Spirit, we find strength to overcome fleshly desires. The Spirit's power enables what willpower alone cannot achieve. Stay sensitive to His leading today. Let Him direct your thoughts, words, and actions.",
    prayerPoints: ["Help me to walk in the Spirit daily", "Strengthen me against fleshly desires", "Keep me in step with Your leading"],
    faithDeclarations: ["I walk by the Spirit", "The Spirit empowers me to overcome", "I am led by God's Spirit"],
    author: "Moses Afolabi"
  },
  {
    date: "2026-03-31",
    title: "Faithful to Complete",
    scriptureReference: "Philippians 1:6",
    scriptureText: "He who began a good work in you will carry it on to completion until the day of Christ Jesus.",
    content: "God does not start what He cannot finish. The work He has begun in your life will be completed. Your setbacks do not disqualify you; His faithfulness ensures your progress. Trust the One who started this journey with you. He will see it through.",
    prayerPoints: ["Thank You for the work You are doing in me", "Complete what You have started", "Help me to cooperate with Your process"],
    faithDeclarations: ["God will complete His work in me", "My transformation is guaranteed", "He who started will finish"],
    author: "Moses Afolabi"
  },
  // Continue with remaining months...
];

// Generate remaining devotionals programmatically
function generateRemainingDevotionals(): DevotionalData[] {
  const themes = [
    // April themes - Resurrection & New Life
    { title: "The Power of the Cross", ref: "1 Corinthians 1:18", text: "For the message of the cross is foolishness to those who are perishing, but to us who are being saved it is the power of God." },
    { title: "Risen with Christ", ref: "Colossians 3:1", text: "Since, then, you have been raised with Christ, set your hearts on things above." },
    { title: "Death Has No Sting", ref: "1 Corinthians 15:55", text: "Where, O death, is your victory? Where, O death, is your sting?" },
    { title: "Living Stones", ref: "1 Peter 2:5", text: "You also, like living stones, are being built into a spiritual house." },
    { title: "The Empty Tomb", ref: "Matthew 28:6", text: "He is not here; he has risen, just as he said." },
    { title: "Newness of Life", ref: "Romans 6:4", text: "We were therefore buried with him through baptism into death in order that we may live a new life." },
    { title: "Alive in Christ", ref: "Ephesians 2:5", text: "Even when we were dead in transgressions, made us alive with Christ." },
    { title: "Resurrection Power", ref: "Philippians 3:10", text: "I want to know Christ—yes, to know the power of his resurrection." },
    { title: "From Death to Life", ref: "John 5:24", text: "Whoever hears my word and believes him who sent me has eternal life." },
    { title: "Spring of Living Water", ref: "John 4:14", text: "The water I give them will become in them a spring of water welling up to eternal life." },
    { title: "Blooming Where Planted", ref: "Jeremiah 17:8", text: "They will be like a tree planted by the water that sends out its roots by the stream." },
    { title: "Seeds of Faith", ref: "Mark 4:31-32", text: "It is like a mustard seed, which is the smallest of all seeds on earth." },
    { title: "Spiritual Springtime", ref: "Song of Songs 2:11-12", text: "See! The winter is past; the rains are over and gone. Flowers appear on the earth." },
    { title: "Growing in Grace", ref: "2 Peter 3:18", text: "But grow in the grace and knowledge of our Lord and Savior Jesus Christ." },
    { title: "Planted by Water", ref: "Psalm 1:3", text: "That person is like a tree planted by streams of water, which yields its fruit in season." },
    { title: "Fresh Anointing", ref: "Psalm 92:10", text: "You have exalted my horn like that of a wild ox; fine oils have been poured on me." },
    { title: "New Wine", ref: "Matthew 9:17", text: "Neither do people pour new wine into old wineskins." },
    { title: "Flourishing Life", ref: "Psalm 92:12", text: "The righteous will flourish like a palm tree." },
    { title: "God's Garden", ref: "1 Corinthians 3:9", text: "For we are co-workers in God's service; you are God's field." },
    { title: "Season of Harvest", ref: "Galatians 6:9", text: "At the proper time we will reap a harvest if we do not give up." },
    { title: "Fruitful Branches", ref: "John 15:8", text: "This is to my Father's glory, that you bear much fruit." },
    { title: "Daily Renewal", ref: "2 Corinthians 4:16", text: "Though outwardly we are wasting away, yet inwardly we are being renewed day by day." },
    { title: "Steadfast Hope", ref: "Romans 15:13", text: "May the God of hope fill you with all joy and peace as you trust in him." },
    { title: "Unshakeable Kingdom", ref: "Hebrews 12:28", text: "Since we are receiving a kingdom that cannot be shaken, let us be thankful." },
    { title: "Hidden with Christ", ref: "Colossians 3:3", text: "For you died, and your life is now hidden with Christ in God." },
    { title: "Transformed Mind", ref: "Romans 12:2", text: "Be transformed by the renewing of your mind." },
    { title: "Walking in Truth", ref: "3 John 1:4", text: "I have no greater joy than to hear that my children are walking in the truth." },
    { title: "Divine Appointments", ref: "Esther 4:14", text: "And who knows but that you have come to your royal position for such a time as this?" },
    { title: "Seasons of Blessing", ref: "Ecclesiastes 3:1", text: "There is a time for everything, and a season for every activity under the heavens." },
    { title: "End of Month Reflection", ref: "Psalm 90:12", text: "Teach us to number our days, that we may gain a heart of wisdom." },
    // May themes - Motherhood & Family
    { title: "Honoring Parents", ref: "Exodus 20:12", text: "Honor your father and your mother, so that you may live long in the land." },
    { title: "A Mother's Love", ref: "Isaiah 66:13", text: "As a mother comforts her child, so will I comfort you." },
    { title: "Training Children", ref: "Proverbs 22:6", text: "Start children off on the way they should go, and even when they are old they will not turn from it." },
    { title: "Family Blessings", ref: "Psalm 128:3", text: "Your wife will be like a fruitful vine within your house; your children will be like olive shoots around your table." },
    { title: "Godly Heritage", ref: "Psalm 127:3", text: "Children are a heritage from the Lord, offspring a reward from him." },
    { title: "United in Love", ref: "Colossians 3:14", text: "And over all these virtues put on love, which binds them all together in perfect unity." },
    { title: "House of Prayer", ref: "Isaiah 56:7", text: "My house will be called a house of prayer for all nations." },
    { title: "Passing the Torch", ref: "2 Timothy 1:5", text: "I am reminded of your sincere faith, which first lived in your grandmother Lois and in your mother Eunice." },
    { title: "Protecting the Family", ref: "Psalm 91:1", text: "Whoever dwells in the shelter of the Most High will rest in the shadow of the Almighty." },
    { title: "Legacy of Faith", ref: "Deuteronomy 6:6-7", text: "These commandments that I give you today are to be on your hearts. Impress them on your children." },
    { title: "Peace in the Home", ref: "Proverbs 17:1", text: "Better a dry crust with peace and quiet than a house full of feasting with strife." },
    { title: "Generational Blessings", ref: "Proverbs 13:22", text: "A good person leaves an inheritance for their children's children." },
    { title: "Servant Leadership", ref: "Mark 10:43-44", text: "Whoever wants to become great among you must be your servant." },
    { title: "Wisdom for Families", ref: "James 1:5", text: "If any of you lacks wisdom, you should ask God, who gives generously to all." },
    { title: "Restoration in Relationships", ref: "Malachi 4:6", text: "He will turn the hearts of the parents to their children, and the hearts of the children to their parents." },
    { title: "Building Together", ref: "Psalm 127:1", text: "Unless the Lord builds the house, the builders labor in vain." },
    { title: "Love That Covers", ref: "1 Peter 4:8", text: "Above all, love each other deeply, because love covers over a multitude of sins." },
    { title: "Teaching Diligently", ref: "Deuteronomy 11:19", text: "Teach them to your children, talking about them when you sit at home." },
    { title: "Family Altar", ref: "Joshua 24:15", text: "As for me and my household, we will serve the Lord." },
    { title: "Comfort in Trials", ref: "2 Corinthians 1:4", text: "Who comforts us in all our troubles, so that we can comfort those in any trouble." },
    { title: "Walking in Unity", ref: "Psalm 133:1", text: "How good and pleasant it is when God's people live together in unity!" },
    { title: "Nurturing Faith", ref: "Ephesians 6:4", text: "Fathers, do not exasperate your children; instead, bring them up in the training and instruction of the Lord." },
    { title: "Household Salvation", ref: "Acts 16:31", text: "Believe in the Lord Jesus, and you will be saved—you and your household." },
    { title: "Loving Discipline", ref: "Proverbs 3:11-12", text: "Do not despise the Lord's discipline, and do not resent his rebuke." },
    { title: "Prayer Covering", ref: "Job 1:5", text: "Early in the morning he would sacrifice a burnt offering for each of them." },
    { title: "Grafted In", ref: "Romans 11:17", text: "You have been grafted in among the others and now share in the nourishing sap." },
    { title: "Celebrating Milestones", ref: "Deuteronomy 16:15", text: "For the Lord your God will bless you in all your harvest." },
    { title: "Anchored in Christ", ref: "Colossians 2:7", text: "Rooted and built up in him, strengthened in the faith." },
    { title: "Abiding Together", ref: "John 15:4", text: "Remain in me, as I also remain in you." },
    { title: "Memorial Stones", ref: "Joshua 4:6-7", text: "These stones are to be a memorial to the people of Israel forever." },
    { title: "Future Hope", ref: "Jeremiah 31:17", text: "So there is hope for your descendants, declares the Lord." },
    // June themes - Holy Spirit & Power
    { title: "Pentecost Fire", ref: "Acts 2:3-4", text: "They saw what seemed to be tongues of fire that separated and came to rest on each of them. All of them were filled with the Holy Spirit." },
    { title: "Spirit Baptism", ref: "Acts 1:8", text: "You will receive power when the Holy Spirit comes on you." },
    { title: "Fruits of the Spirit", ref: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness, gentleness and self-control." },
    { title: "The Comforter", ref: "John 14:26", text: "But the Advocate, the Holy Spirit, whom the Father will send in my name, will teach you all things." },
    { title: "Spirit-Led Living", ref: "Romans 8:14", text: "For those who are led by the Spirit of God are the children of God." },
    { title: "Power Within", ref: "Ephesians 3:20", text: "Now to him who is able to do immeasurably more than all we ask or imagine, according to his power that is at work within us." },
    { title: "Temple of the Spirit", ref: "1 Corinthians 6:19", text: "Do you not know that your bodies are temples of the Holy Spirit?" },
    { title: "Spiritual Gifts", ref: "1 Corinthians 12:7", text: "Now to each one the manifestation of the Spirit is given for the common good." },
    { title: "Praying in the Spirit", ref: "Jude 1:20", text: "Build yourselves up in your most holy faith and pray in the Holy Spirit." },
    { title: "Anointed Worship", ref: "Psalm 150:6", text: "Let everything that has breath praise the Lord." },
    { title: "Fire and Wind", ref: "Acts 2:2", text: "Suddenly a sound like the blowing of a violent wind came from heaven." },
    { title: "Boldness to Witness", ref: "Acts 4:31", text: "They were all filled with the Holy Spirit and spoke the word of God boldly." },
    { title: "Rivers of Living Water", ref: "John 7:38", text: "Whoever believes in me, as Scripture has said, rivers of living water will flow from within them." },
    { title: "Spirit of Wisdom", ref: "Ephesians 1:17", text: "That the God of our Lord Jesus Christ may give you the Spirit of wisdom and revelation." },
    { title: "Holy Conviction", ref: "John 16:8", text: "When he comes, he will prove the world to be in the wrong about sin and righteousness and judgment." },
    { title: "Divine Revelation", ref: "1 Corinthians 2:10", text: "These are the things God has revealed to us by his Spirit." },
    { title: "Walking in Power", ref: "Zechariah 4:6", text: "Not by might nor by power, but by my Spirit, says the Lord Almighty." },
    { title: "Unity in Spirit", ref: "Ephesians 4:3", text: "Make every effort to keep the unity of the Spirit through the bond of peace." },
    { title: "Empowered Service", ref: "Acts 6:8", text: "Now Stephen, a man full of God's grace and power, performed great wonders and signs." },
    { title: "Spirit Intercession", ref: "Romans 8:26", text: "The Spirit himself intercedes for us through wordless groans." },
    { title: "Supernatural Faith", ref: "1 Corinthians 12:9", text: "To another faith by the same Spirit, to another gifts of healing by that one Spirit." },
    { title: "Discerning Spirits", ref: "1 John 4:1", text: "Dear friends, do not believe every spirit, but test the spirits to see whether they are from God." },
    { title: "Presence and Glory", ref: "2 Corinthians 3:18", text: "We all, who with unveiled faces contemplate the Lord's glory, are being transformed." },
    { title: "Spirit of Truth", ref: "John 15:26", text: "When the Advocate comes, whom I will send to you from the Father—the Spirit of truth." },
    { title: "Joy Unspeakable", ref: "1 Peter 1:8", text: "You are filled with an inexpressible and glorious joy." },
    { title: "Spirit Liberation", ref: "2 Corinthians 3:17", text: "Where the Spirit of the Lord is, there is freedom." },
    { title: "Filled Again", ref: "Ephesians 5:18", text: "Be filled with the Spirit." },
    { title: "Signs Following", ref: "Mark 16:17", text: "These signs will accompany those who believe." },
    { title: "Holy Boldness", ref: "Proverbs 28:1", text: "The righteous are as bold as a lion." },
    { title: "Outpouring", ref: "Joel 2:28", text: "I will pour out my Spirit on all people." },
    // July themes - Freedom & Independence
    { title: "Freedom in Christ", ref: "Galatians 5:1", text: "It is for freedom that Christ has set us free." },
    { title: "Truth Sets Free", ref: "John 8:32", text: "Then you will know the truth, and the truth will set you free." },
    { title: "Liberty Proclaimed", ref: "Isaiah 61:1", text: "To proclaim freedom for the captives and release from darkness for the prisoners." },
    { title: "No Condemnation", ref: "Romans 8:1", text: "There is now no condemnation for those who are in Christ Jesus." },
    { title: "Breaking Chains", ref: "Psalm 107:14", text: "He brought them out of darkness, the utter darkness, and broke away their chains." },
    { title: "Delivered from Fear", ref: "Psalm 34:4", text: "I sought the Lord, and he answered me; he delivered me from all my fears." },
    { title: "Redeemed Life", ref: "Psalm 103:4", text: "Who redeems your life from the pit and crowns you with love and compassion." },
    { title: "Spirit of Liberty", ref: "2 Corinthians 3:17", text: "Now the Lord is the Spirit, and where the Spirit of the Lord is, there is freedom." },
    { title: "Free Indeed", ref: "John 8:36", text: "So if the Son sets you free, you will be free indeed." },
    { title: "Captives Released", ref: "Luke 4:18", text: "He has sent me to proclaim freedom for the prisoners." },
    { title: "Walking in Liberty", ref: "Psalm 119:45", text: "I will walk about in freedom, for I have sought out your precepts." },
    { title: "Bondage Breaker", ref: "Isaiah 58:6", text: "Is not this the kind of fasting I have chosen: to loose the chains of injustice?" },
    { title: "New Creature", ref: "2 Corinthians 5:17", text: "If anyone is in Christ, the new creation has come: The old has gone, the new is here!" },
    { title: "Debt Cancelled", ref: "Colossians 2:14", text: "Having canceled the charge of our legal indebtedness." },
    { title: "Liberated Heart", ref: "Psalm 119:32", text: "I run in the path of your commands, for you have broadened my understanding." },
    { title: "Ransomed People", ref: "Isaiah 35:10", text: "The ransomed of the Lord will return. They will enter Zion with singing." },
    { title: "Yoke Destroyed", ref: "Isaiah 10:27", text: "The yoke will be broken because you have grown so fat." },
    { title: "Peace with God", ref: "Romans 5:1", text: "Therefore, since we have been justified through faith, we have peace with God." },
    { title: "Access to Grace", ref: "Romans 5:2", text: "Through whom we have gained access by faith into this grace in which we now stand." },
    { title: "Citizenship in Heaven", ref: "Philippians 3:20", text: "But our citizenship is in heaven." },
    { title: "Glorious Freedom", ref: "Romans 8:21", text: "The creation itself will be liberated from its bondage to decay." },
    { title: "Adopted Children", ref: "Galatians 4:5", text: "To redeem those under the law, that we might receive adoption to sonship." },
    { title: "Joint Heirs", ref: "Romans 8:17", text: "Now if we are children, then we are heirs—heirs of God and co-heirs with Christ." },
    { title: "Blessed Nation", ref: "Psalm 33:12", text: "Blessed is the nation whose God is the Lord." },
    { title: "Righteous Rule", ref: "Proverbs 29:2", text: "When the righteous thrive, the people rejoice." },
    { title: "Proclaiming Liberty", ref: "Leviticus 25:10", text: "Consecrate the fiftieth year and proclaim liberty throughout the land." },
    { title: "Free to Serve", ref: "Galatians 5:13", text: "You were called to be free. But do not use your freedom to indulge the flesh." },
    { title: "Unchained Worship", ref: "Psalm 149:3", text: "Let them praise his name with dancing." },
    { title: "Victory Celebration", ref: "1 Corinthians 15:57", text: "But thanks be to God! He gives us the victory through our Lord Jesus Christ." },
    { title: "Standing Firm", ref: "Galatians 5:1", text: "Stand firm, then, and do not let yourselves be burdened again by a yoke of slavery." },
    { title: "Month of Freedom", ref: "Isaiah 43:19", text: "See, I am doing a new thing! Now it springs up; do you not perceive it?" },
    // Continue with similar patterns for remaining months...
    // August - Faith & Perseverance
    // September - Harvest & Thanksgiving
    // October - Spiritual Warfare
    // November - Gratitude & Praise
    // December - Advent & Christ's Coming
  ];

  const monthData: { [key: string]: { start: number; end: number; themes: any[] } } = {
    "04": { start: 1, end: 30, themes: themes.slice(0, 30) },
    "05": { start: 1, end: 31, themes: themes.slice(30, 61) },
    "06": { start: 1, end: 30, themes: themes.slice(61, 91) },
    "07": { start: 1, end: 31, themes: themes.slice(91, 122) },
  };

  const additionalDevotionals: DevotionalData[] = [];

  // Shared arrays for all months
  const prayerPointsSets = [
    ["Lord, fill me with Your peace that surpasses understanding", "Guide my steps according to Your will", "Protect me and my loved ones today"],
    ["Father, increase my faith to trust You completely", "Open doors of opportunity before me", "Help me to be a blessing to others"],
    ["Holy Spirit, lead me in the path of righteousness", "Give me wisdom in every decision", "Strengthen me for the challenges ahead"],
    ["Lord, let Your favor go before me", "Remove every obstacle in my path", "Crown this day with Your goodness"],
    ["Father, renew my strength like the eagle", "Help me to soar above my circumstances", "Fill me with supernatural energy"],
    ["Lord, give me a grateful heart", "Help me to see Your hand in every situation", "Let praise continually be on my lips"],
    ["Father, protect me from the schemes of the enemy", "Cover me with Your precious blood", "Station Your angels around me"],
    ["Lord, heal every area of brokenness in my life", "Restore what the enemy has stolen", "Make me whole in Jesus' name"],
    ["Father, align my desires with Your will", "Remove anything that distracts from Your purpose", "Keep my focus on eternal things"],
    ["Holy Spirit, fill me afresh today", "Use me as a vessel of Your love", "Let Your power flow through me"]
  ];

  const faithDeclarationsSets = [
    ["I am blessed and highly favored", "God's grace is upon my life", "I walk in divine victory"],
    ["Today is a day of breakthrough", "I receive supernatural favor", "My latter is greater than my former"],
    ["I am more than a conqueror", "Nothing shall be impossible for me", "I overcome by the blood of the Lamb"],
    ["The Lord is my shepherd, I lack nothing", "Goodness and mercy follow me", "I dwell in the house of the Lord"],
    ["I am strong in the Lord", "His power works mightily in me", "I can do all things through Christ"],
    ["My faith pleases God", "Mountains move at my command", "I speak and things happen"],
    ["I am healed by His stripes", "Divine health is my portion", "Sickness has no place in my body"],
    ["Abundance flows to me", "My needs are met according to His riches", "I am a generous giver"],
    ["I hear God's voice clearly", "I am led by the Holy Spirit", "I will not miss my way"],
    ["My family is blessed", "Salvation reigns in my household", "Generational curses are broken"]
  ];

  // Generate April through December
  const monthThemes = [
    // August themes
    { month: "08", days: 31, prefix: "Faith Journey", themes: [
      { title: "Enduring Faith", ref: "James 1:12", text: "Blessed is the one who perseveres under trial." },
      { title: "Running the Race", ref: "Hebrews 12:1", text: "Let us run with perseverance the race marked out for us." },
      { title: "Finishing Strong", ref: "2 Timothy 4:7", text: "I have fought the good fight, I have finished the race, I have kept the faith." },
    ]},
    // September themes
    { month: "09", days: 30, prefix: "Harvest Time", themes: [
      { title: "Reaping in Joy", ref: "Psalm 126:5", text: "Those who sow with tears will reap with songs of joy." },
      { title: "Gathering Souls", ref: "Matthew 9:37-38", text: "The harvest is plentiful but the workers are few." },
      { title: "First Fruits", ref: "Proverbs 3:9", text: "Honor the Lord with your wealth, with the firstfruits of all your crops." },
    ]},
    // October themes
    { month: "10", days: 31, prefix: "Spiritual Battle", themes: [
      { title: "Armor of Light", ref: "Romans 13:12", text: "Let us put aside the deeds of darkness and put on the armor of light." },
      { title: "Victory Assured", ref: "Romans 8:37", text: "We are more than conquerors through him who loved us." },
      { title: "Weapons of Warfare", ref: "2 Corinthians 10:4", text: "The weapons we fight with are not the weapons of the world." },
    ]},
    // November themes
    { month: "11", days: 30, prefix: "Thankful Heart", themes: [
      { title: "Enter with Thanksgiving", ref: "Psalm 100:4", text: "Enter his gates with thanksgiving and his courts with praise." },
      { title: "Grateful in All", ref: "1 Thessalonians 5:18", text: "Give thanks in all circumstances." },
      { title: "Counting Blessings", ref: "Psalm 103:2", text: "Praise the Lord, my soul, and forget not all his benefits." },
    ]},
    // December themes
    { month: "12", days: 31, prefix: "Advent Hope", themes: [
      { title: "The Promise Fulfilled", ref: "Isaiah 9:6", text: "For to us a child is born, to us a son is given." },
      { title: "Emmanuel", ref: "Matthew 1:23", text: "The virgin will conceive and give birth to a son, and they will call him Immanuel." },
      { title: "Light of the World", ref: "John 8:12", text: "I am the light of the world. Whoever follows me will never walk in darkness." },
    ]},
  ];

  // Generate content for each remaining month
  for (const monthInfo of monthThemes) {
    for (let day = 1; day <= monthInfo.days; day++) {
      const dateStr = `2026-${monthInfo.month}-${day.toString().padStart(2, '0')}`;
      const themeIndex = (day - 1) % monthInfo.themes.length;
      const theme = monthInfo.themes[themeIndex];

      const devotionalTitles = [
        "Walking in Victory", "Divine Favor", "Heavenly Peace", "Abounding Grace",
        "Supernatural Joy", "Kingdom Authority", "Blessed Assurance", "Perfect Love",
        "Abundant Life", "Faithful Promise", "Endless Mercy", "Eternal Hope",
        "Righteous Path", "Holy Calling", "Sacred Trust", "Divine Appointment",
        "Spiritual Strength", "Unwavering Faith", "Glorious Light", "Triumphant Spirit",
        "Healing Power", "Restoration Glory", "Covenant Blessing", "Prophetic Word",
        "Anointed Purpose", "Overcoming Power", "Resurrection Life", "Victorious Living",
        "Kingdom Reign", "Holy Ground", "Sacred Moment"
      ];

      const scriptures = [
        { ref: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing." },
        { ref: "Isaiah 41:10", text: "Fear not, for I am with you; be not dismayed, for I am your God." },
        { ref: "Romans 8:28", text: "All things work together for good to those who love God." },
        { ref: "Jeremiah 33:3", text: "Call to me and I will answer you and tell you great and unsearchable things." },
        { ref: "Psalm 46:10", text: "Be still, and know that I am God." },
        { ref: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding." },
        { ref: "Matthew 6:33", text: "Seek first his kingdom and his righteousness, and all these things will be given to you." },
        { ref: "Philippians 4:13", text: "I can do all things through Christ who strengthens me." },
        { ref: "Joshua 1:9", text: "Be strong and courageous. Do not be afraid; do not be discouraged." },
        { ref: "Psalm 37:4", text: "Delight yourself in the Lord, and he will give you the desires of your heart." },
        { ref: "Isaiah 40:31", text: "Those who hope in the Lord will renew their strength." },
        { ref: "John 14:27", text: "Peace I leave with you; my peace I give you." },
        { ref: "2 Timothy 1:7", text: "God has not given us a spirit of fear, but of power and of love and of a sound mind." },
        { ref: "Psalm 34:8", text: "Taste and see that the Lord is good; blessed is the one who takes refuge in him." },
        { ref: "Romans 12:12", text: "Be joyful in hope, patient in affliction, faithful in prayer." },
        { ref: "Philippians 4:6-7", text: "Do not be anxious about anything, but in every situation, by prayer and petition, with thanksgiving, present your requests to God." },
        { ref: "Hebrews 11:6", text: "Without faith it is impossible to please God." },
        { ref: "1 John 4:4", text: "Greater is he that is in you than he that is in the world." },
        { ref: "Psalm 121:1-2", text: "I lift up my eyes to the mountains—where does my help come from? My help comes from the Lord." },
        { ref: "Colossians 3:15", text: "Let the peace of Christ rule in your hearts." },
        { ref: "James 4:8", text: "Come near to God and he will come near to you." },
        { ref: "Psalm 91:2", text: "I will say of the Lord, 'He is my refuge and my fortress, my God, in whom I trust.'" },
        { ref: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." },
        { ref: "Isaiah 54:17", text: "No weapon formed against you shall prosper." },
        { ref: "Ephesians 3:20", text: "Now to him who is able to do immeasurably more than all we ask or imagine." },
        { ref: "Psalm 103:1", text: "Bless the Lord, O my soul, and all that is within me, bless his holy name." },
        { ref: "Romans 15:13", text: "May the God of hope fill you with all joy and peace as you trust in him." },
        { ref: "Psalm 30:5", text: "Weeping may stay for the night, but rejoicing comes in the morning." },
        { ref: "1 Peter 5:7", text: "Cast all your anxiety on him because he cares for you." },
        { ref: "Deuteronomy 31:6", text: "Be strong and courageous. The Lord your God goes with you; he will never leave you." },
        { ref: "Psalm 118:24", text: "This is the day the Lord has made; let us rejoice and be glad in it." }
      ];

      const contents = [
        "Today, let the peace of God rule in your heart. Whatever challenges you face, remember that His presence goes with you. He is your shield and your very great reward. Trust in His unfailing love and walk confidently into this day.",
        "God's promises are yes and amen. Every word He has spoken over your life will come to pass. Hold onto hope, for the One who promised is faithful. Your breakthrough is closer than you think.",
        "The Lord is working behind the scenes on your behalf. What seems like delay is divine preparation. Trust His timing and His methods. He makes all things beautiful in His time.",
        "You are more than a conqueror through Christ. Every obstacle is an opportunity for God to show His power. Face today with boldness, knowing that victory is already yours.",
        "God's grace is sufficient for every challenge you will encounter today. His strength is made perfect in your weakness. Lean on Him and watch Him carry you through.",
        "The joy of the Lord is your strength. Do not let circumstances steal your joy. Choose to rejoice in the Lord always, for He is working all things together for your good.",
        "Heaven is backing you today. Angels are on assignment for your protection and provision. Walk in confidence, knowing that the Creator of the universe is fighting for you.",
        "Let faith arise in your heart. The same God who parted the Red Sea is able to make a way for you. Nothing is too difficult for Him. Believe and receive His miracle power.",
        "Today is a day of divine favor. Doors that were closed are opening. Opportunities are coming your way. Position yourself to receive what God has prepared for you.",
        "The Holy Spirit is your guide, comforter, and empowerer. Lean into His leading today. He will direct your paths and give you wisdom for every decision.",
        "God's love for you is unconditional and unwavering. You cannot do anything to make Him love you more or less. Rest secure in His perfect love today.",
        "Prayer changes things. As you bring your concerns to God, trust that He hears and answers. Your prayers are powerful and effective. Keep praying without ceasing.",
        "The Word of God is your anchor. Stand firm on His promises, and you will not be shaken. Let Scripture guide your thoughts, words, and actions today.",
        "You are called for such a time as this. God has positioned you strategically for His purposes. Embrace your assignment and fulfill your divine calling.",
        "Mercy triumphs over judgment. Extend grace to others as God has extended grace to you. Forgiveness frees your heart and opens the door to blessing.",
        "Your latter will be greater than your former. God is doing a new thing in your life. Embrace the changes He is bringing and trust His perfect plan.",
        "Worship unlocks heaven's resources. As you praise God in every situation, you create an atmosphere for miracles. Let praise be your first response today.",
        "The blood of Jesus speaks on your behalf. You are covered, protected, and redeemed. Walk in the confidence of your identity as a child of God.",
        "Seeds planted in faith will produce a harvest. Be patient and persistent. The fruit of your labor will be manifest in due season. Keep sowing good seeds.",
        "God's thoughts toward you are thoughts of peace and not of evil. His plans for you are good. Align your expectations with His promises and watch Him move.",
        "You are an ambassador of Christ. Everywhere you go, you represent His kingdom. Let your light shine and be a beacon of hope to those around you.",
        "Transformation happens from the inside out. Allow the Holy Spirit to renew your mind and transform your heart. Become more like Christ every day.",
        "The battle belongs to the Lord. You do not fight alone. Stand firm in faith, and watch God fight on your behalf. Victory is assured.",
        "Every trial is producing perseverance and character in you. Do not despise the process. God is using every circumstance to shape you for greatness.",
        "Obedience unlocks blessing. When you follow God's commands, you position yourself in the path of His favor. Choose obedience today.",
        "The Lord is your healer. Whatever needs restoration in your life—body, soul, or spirit—He is able to make it whole. Receive your healing by faith.",
        "Unity in the body of Christ brings strength. Stand together with your brothers and sisters in faith. Together, you are stronger and more effective.",
        "God goes before you, making crooked paths straight. He prepares the way for your success. Follow where He leads with confidence and expectation.",
        "Your testimony is powerful. Share what God has done in your life. Your story has the power to encourage others and bring glory to God.",
        "This is a season of breakthrough. Walls are falling, barriers are breaking, and new doors are opening. Step forward boldly into what God has for you.",
        "End this month in praise and gratitude. Reflect on God's faithfulness and look forward with expectation. The best is yet to come."
      ];

      const titleIndex = (day - 1) % devotionalTitles.length;
      const scriptureIndex = (day - 1) % scriptures.length;
      const contentIndex = (day - 1) % contents.length;
      const prayerIndex = (day - 1) % prayerPointsSets.length;
      const declarationIndex = (day - 1) % faithDeclarationsSets.length;

      additionalDevotionals.push({
        date: dateStr,
        title: devotionalTitles[titleIndex],
        scriptureReference: scriptures[scriptureIndex].ref,
        scriptureText: scriptures[scriptureIndex].text,
        content: contents[contentIndex],
        prayerPoints: prayerPointsSets[prayerIndex],
        faithDeclarations: faithDeclarationsSets[declarationIndex],
        author: "Moses Afolabi"
      });
    }
  }

  // Generate April through July from the themes array
  for (let month = 4; month <= 7; month++) {
    const monthStr = month.toString().padStart(2, '0');
    const daysInMonth = month === 4 || month === 6 ? 30 : 31;
    const startThemeIndex = (month - 4) * 31;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `2026-${monthStr}-${day.toString().padStart(2, '0')}`;
      const themeIndex = startThemeIndex + day - 1;
      
      if (themes[themeIndex]) {
        const theme = themes[themeIndex];
        const prayerIndex = (day - 1) % prayerPointsSets.length;
        const declarationIndex = (day - 1) % faithDeclarationsSets.length;

        const aprilJulyContents = [
          "Today, let the peace of God rule in your heart. Whatever challenges you face, remember that His presence goes with you. Trust in His unfailing love and walk confidently.",
          "God's promises are yes and amen. Every word He has spoken over your life will come to pass. Hold onto hope, for the One who promised is faithful.",
          "The Lord is working behind the scenes on your behalf. What seems like delay is divine preparation. Trust His timing and His methods.",
          "You are more than a conqueror through Christ. Every obstacle is an opportunity for God to show His power. Face today with boldness.",
          "God's grace is sufficient for every challenge you will encounter today. His strength is made perfect in your weakness.",
        ];

        additionalDevotionals.push({
          date: dateStr,
          title: theme.title,
          scriptureReference: theme.ref,
          scriptureText: theme.text,
          content: aprilJulyContents[(day - 1) % aprilJulyContents.length],
          prayerPoints: prayerPointsSets[prayerIndex],
          faithDeclarations: faithDeclarationsSets[declarationIndex],
          author: "Moses Afolabi"
        });
      }
    }
  }

  return additionalDevotionals;
}

export async function seedAllDevotionals() {
  console.log("Starting to seed devotionals for the entire year...");

  // First, combine the manually written devotionals with generated ones
  const allData = [...allDevotionals, ...generateRemainingDevotionals()];

  // Sort by date
  allData.sort((a, b) => a.date.localeCompare(b.date));

  // Remove duplicates based on date
  const uniqueDevotionals = allData.reduce((acc, curr) => {
    if (!acc.find(d => d.date === curr.date)) {
      acc.push(curr);
    }
    return acc;
  }, [] as DevotionalData[]);

  console.log(`Total devotionals to seed: ${uniqueDevotionals.length}`);

  let inserted = 0;
  let skipped = 0;

  for (const devotional of uniqueDevotionals) {
    // Check if exists
    const existing = await db.select().from(devotionals).where(eq(devotionals.date, devotional.date));
    
    if (existing.length === 0) {
      await db.insert(devotionals).values(devotional);
      inserted++;
    } else {
      skipped++;
    }
  }

  console.log(`Seeding complete. Inserted: ${inserted}, Skipped (already existed): ${skipped}`);
}

// Note: When imported as a module, seedAllDevotionals is called from server/index.ts
// This file can also be run directly with: npx tsx server/seed-devotionals.ts
