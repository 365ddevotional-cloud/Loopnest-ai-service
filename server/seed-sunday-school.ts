import { storage } from "./storage";
import type { InsertSundaySchoolLesson } from "@shared/schema";

function getNextSunday(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay();
  const diff = day === 0 ? 7 : 7 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getSeedLessons(): InsertSundaySchoolLesson[] {
  const today = new Date();
  const sunday1 = getNextSunday(today);
  const sunday2 = new Date(sunday1);
  sunday2.setDate(sunday2.getDate() + 7);
  const sunday3 = new Date(sunday2);
  sunday3.setDate(sunday3.getDate() + 7);
  const sunday4 = new Date(sunday3);
  sunday4.setDate(sunday4.getDate() + 7);

  return [
    {
      title: "Salvation by Grace",
      date: formatDate(sunday1),
      scriptureReferences: "Ephesians 2:8-9 (KJV)",
      scriptureText: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.",
      lessonContent: `OUTLINE POINT 1: The Nature of Grace

Grace is the unmerited favor of God. It is not something we earn, deserve, or can purchase with any amount of good works. The Apostle Paul makes this abundantly clear in his letter to the Ephesians: salvation comes "by grace." This means that the initiative for our salvation began entirely with God. Before we ever thought of Him, He was already thinking of us. Before we ever called on His name, He was already reaching toward us with arms of love and mercy.

Understanding grace requires a fundamental shift in how we see ourselves before God. Many people approach faith with a transactional mindset, believing that if they do enough good deeds, attend enough services, or follow enough rules, they will somehow earn God's approval. But Paul demolishes this thinking by declaring that salvation is "not of yourselves." It is a gift, freely given, not a wage to be earned.

The psychological impact of truly grasping grace is profound. When a person realizes they are loved not because of what they do but because of who God is, it releases them from the burden of performance-based religion. It sets the soul free from anxiety, guilt, and the constant fear of falling short. Grace liberates us to live joyfully, serve willingly, and love generously.

OUTLINE POINT 2: The Role of Faith

Faith is the hand that receives the gift of grace. Paul writes that we are saved "through faith." Faith is not the cause of salvation; it is the channel through which salvation flows. It is our response to God's initiative. When God extends grace, faith says "yes" and receives what has been offered.

Faith, in its simplest form, is trust. It is believing that God is who He says He is and that He will do what He has promised. The writer of Hebrews defines it as "the substance of things hoped for, the evidence of things not seen" (Hebrews 11:1). Faith is confidence in God's character and reliance upon His word, even when circumstances seem to contradict it.

The beauty of faith is that it removes all grounds for human boasting. Paul emphasizes this: "Not of works, lest any man should boast." If salvation could be earned, then humanity would have grounds for pride. But since it is received through simple trust in God's provision, every believer stands on level ground at the foot of the cross. No one can claim superiority over another, for all have been saved by the same grace through the same faith.

TEACHER EMPHASIS: Help your class understand the difference between "dead faith" and "living faith." Living faith produces transformation. It is not merely intellectual agreement but a heart-level trust that changes how we live, think, and relate to others.

APPLICATION: This week, reflect on areas where you may be trying to earn God's love through performance. Release those efforts to God in prayer. Rest in the truth that His grace is sufficient, and His love for you is not based on your performance but on His nature.`,
      discussionQuestions: [
        "How would you explain the difference between grace and mercy to someone who has never heard these concepts?",
        "In what ways do we sometimes try to earn God's favor instead of resting in His grace?",
        "How does understanding grace change the way we relate to other believers and to those outside the faith?",
        "Can you share a personal moment when God's grace became real to you in a new way?"
      ],
      prayerFocus: "Lord, we thank You for the gift of grace that we could never earn or deserve. Help us to truly rest in Your unmerited favor. Remove from our hearts any tendency toward performance-based religion. Let Your grace transform us from the inside out, making us more like Christ each day. We receive Your gift of salvation with humble and grateful hearts. In Jesus' name, Amen.",
      weeklyAssignment: "Read Ephesians 2:1-10 daily this week. Each day, write down one new insight about grace that you discover. Share your favorite insight with a family member or friend before next Sunday.",
    },
    {
      title: "The Assurance of Salvation",
      date: formatDate(sunday2),
      scriptureReferences: "1 John 5:11-13 (KJV)",
      scriptureText: "And this is the record, that God hath given to us eternal life, and this life is in his Son. He that hath the Son hath life; and he that hath not the Son of God hath not life. These things have I written unto you that believe on the name of the Son of God; that ye may know that ye have eternal life, and that ye may believe on the name of the Son of God.",
      lessonContent: `OUTLINE POINT 1: The Record of God's Gift

The Apostle John opens this passage with a powerful declaration: "This is the record." The word "record" here carries the weight of legal testimony. John is not offering speculation or wishful thinking; he is presenting God's own testimony about eternal life. And the testimony is this: God has given us eternal life, and this life is found in His Son, Jesus Christ.

This truth is foundational for every believer. Eternal life is not something we achieve or attain through our own efforts. It is a gift that God has already given. The verb tense is past: "God hath given." It is a completed action. For those who have placed their faith in Jesus Christ, eternal life is not a future hope alone; it is a present possession. You do not have to wait until heaven to experience eternal life. It begins the moment you receive Christ.

The psychological power of assurance cannot be overstated. Many believers live in a state of spiritual anxiety, constantly wondering whether they are truly saved. This anxiety robs them of joy, hinders their witness, and keeps them in bondage to fear. But John writes specifically to address this: "These things have I written unto you... that ye may know that ye have eternal life." God wants His children to live with confidence, not uncertainty.

OUTLINE POINT 2: The Simplicity of Possession

John reduces the matter to its simplest terms: "He that hath the Son hath life; and he that hath not the Son of God hath not life." There is no middle ground. There is no gray area. Either you have the Son, or you do not. Either you have life, or you do not. The clarity of this statement is intentional. God does not want His children confused about their standing before Him.

To "have the Son" means to have a living, personal relationship with Jesus Christ. It means you have received Him as your Lord and Savior, trusted in His atoning work on the cross, and surrendered your life to His lordship. It does not mean merely knowing about Him, attending church, or performing religious rituals. It means He dwells in you by His Spirit, and you are united with Him.

This simplicity is both comforting and challenging. It is comforting because it means salvation is accessible to everyone, regardless of education, social status, or past mistakes. It is challenging because it demands an honest self-examination: Do I truly have the Son? Have I truly received Him, or am I merely going through religious motions?

TEACHER EMPHASIS: Encourage your class that assurance is not arrogance. Knowing you are saved is not presumption; it is taking God at His word. If God says those who believe in His Son have eternal life, then doubting that promise is actually doubting God's faithfulness. True humility accepts what God declares.

APPLICATION: If you struggle with assurance, revisit the moment you first trusted Christ. If you have never made that decision, today is the day of salvation. Write down 1 John 5:11-13 on a card and read it daily as a declaration of faith until assurance takes root in your heart.`,
      discussionQuestions: [
        "Why do you think so many believers struggle with assurance of salvation?",
        "What is the difference between knowing about Jesus and truly 'having the Son'?",
        "How does the assurance of salvation affect our daily walk and our witness to others?",
        "What would you say to someone who claims that believing you are saved is arrogant or presumptuous?"
      ],
      prayerFocus: "Father, we thank You for the gift of eternal life through Your Son, Jesus Christ. Strengthen our assurance today. Remove every doubt and fear that would hinder our confidence in Your promises. Help us to stand firmly on Your Word and to live boldly as those who know they belong to You. We declare that we have the Son, and therefore we have life. In Jesus' name, Amen.",
      weeklyAssignment: "Memorize 1 John 5:13. Write it out and place it somewhere you will see it daily. When doubts arise, speak the verse aloud as a declaration of truth. Share this verse with at least one person this week.",
    },
    {
      title: "Walking in the Spirit",
      date: formatDate(sunday3),
      scriptureReferences: "Galatians 5:16-18 (KJV)",
      scriptureText: "This I say then, Walk in the Spirit, and ye shall not fulfil the lust of the flesh. For the flesh lusteth against the Spirit, and the Spirit against the flesh: and these are contrary the one to the other: so that ye cannot do the things that ye would. But if ye be led of the Spirit, ye are not under the law.",
      lessonContent: `OUTLINE POINT 1: The Command to Walk

Paul begins with a direct command: "Walk in the Spirit." The word "walk" in the original Greek (peripateo) describes a continuous, habitual action. It is not a one-time event but a lifestyle. Walking in the Spirit means living each day in conscious dependence upon the Holy Spirit's guidance, power, and presence. It means making decisions with an awareness of His voice, yielding to His promptings, and relying on His strength rather than our own.

The promise attached to this command is extraordinary: "ye shall not fulfil the lust of the flesh." Notice that Paul does not say the flesh will cease to exist or that temptation will disappear. He says we will not fulfill its desires. The flesh will still make its demands, but when we are walking in the Spirit, we have access to a power greater than any temptation. The Spirit within us is stronger than the pull of the flesh upon us.

This is profoundly liberating from a psychological perspective. Many believers feel trapped in cycles of sin and failure, believing they are powerless to change. Paul declares otherwise. Victory over the flesh is not achieved by willpower, self-discipline, or religious effort alone. It is achieved by walking in the Spirit. When we focus our attention on following the Spirit rather than fighting the flesh, the flesh loses its grip.

OUTLINE POINT 2: The Reality of the Conflict

Paul then describes the internal conflict every believer experiences: "The flesh lusteth against the Spirit, and the Spirit against the flesh: and these are contrary the one to the other." This is not a sign of spiritual failure; it is a sign of spiritual life. The fact that you feel tension between what your flesh wants and what the Spirit desires is evidence that the Spirit is at work within you. An unregenerate person feels no such tension because the Spirit is not actively warring within them.

Understanding this conflict is crucial for spiritual maturity. Many believers become discouraged when they experience temptation, believing it means they are not truly saved or that God has abandoned them. But Paul normalizes this struggle. The conflict is real, ongoing, and will continue until we are fully glorified. The key is not the absence of conflict but our response to it: will we yield to the flesh or surrender to the Spirit?

Paul concludes with a powerful statement: "If ye be led of the Spirit, ye are not under the law." This does not mean believers are free to live lawlessly. It means that those who are Spirit-led fulfill the righteous requirements of the law naturally, from the inside out, rather than through external compulsion. The Spirit produces in us the character of Christ, which exceeds anything the law could demand.

TEACHER EMPHASIS: Stress that walking in the Spirit is not about perfection but about direction. A person walking in the Spirit may stumble, but their overall direction is toward God. The key question is not "Have you ever fallen?" but "Which direction are you walking?"

APPLICATION: This week, practice a daily "Spirit check." At three points during the day (morning, midday, evening), pause and ask the Holy Spirit: "Am I walking with You right now? Is there anything You want me to do differently?" Journal what you hear.`,
      discussionQuestions: [
        "What does it practically look like to 'walk in the Spirit' in your everyday life?",
        "How do you distinguish between the voice of the Spirit and the desires of the flesh?",
        "Why is the internal conflict between flesh and Spirit actually a sign of spiritual health?",
        "How does being 'led of the Spirit' differ from trying to keep the law through your own strength?"
      ],
      prayerFocus: "Holy Spirit, we invite You to lead us in every area of our lives. Teach us to walk in step with You, to hear Your voice clearly, and to yield to Your guidance moment by moment. Strengthen us against the desires of the flesh. Let Your fruit be evident in our lives: love, joy, peace, patience, kindness, goodness, faithfulness, gentleness, and self-control. In Jesus' name, Amen.",
      weeklyAssignment: "Read Galatians 5:16-26 daily this week. Create two columns in your journal: 'Works of the Flesh' and 'Fruit of the Spirit.' Honestly assess which column dominates your daily life. Ask the Holy Spirit to increase His fruit in one specific area where you feel weakest.",
    },
    {
      title: "Growing in Spiritual Maturity",
      date: formatDate(sunday4),
      scriptureReferences: "Hebrews 5:12-14 (KJV)",
      scriptureText: "For when for the time ye ought to be teachers, ye have need that one teach you again which be the first principles of the oracles of God; and are become such as have need of milk, and not of strong meat. For every one that useth milk is unskilful in the word of righteousness: for he is a babe. But strong meat belongeth to them that are of full age, even those who by reason of use have their senses exercised to discern both good and evil.",
      lessonContent: `OUTLINE POINT 1: The Problem of Arrested Development

The writer of Hebrews delivers a sobering rebuke: believers who should have matured enough to teach others still need to be taught the basics themselves. They are spiritual infants who remain on milk when they should be consuming solid food. This is a picture of arrested spiritual development, and it is a condition that afflicts many in the body of Christ today.

Spiritual growth is not automatic. Simply attending church services, reading devotionals, or participating in programs does not guarantee maturity. Growth requires intentionality, discipline, and engagement. Just as a child who only drinks milk will never develop the strength to handle solid food, a believer who only consumes basic spiritual truths will never develop the depth needed to navigate life's complex challenges.

The psychological dimensions of spiritual immaturity are significant. Immature believers are easily offended, quickly shaken by trials, prone to division, and susceptible to false teaching. They lack the discernment to distinguish truth from error and the resilience to withstand persecution. Their faith is shallow, their understanding limited, and their impact minimal. The writer of Hebrews is not merely making a theological observation; he is issuing a call to action.

OUTLINE POINT 2: The Path to Maturity

The writer identifies the key to maturity: "those who by reason of use have their senses exercised to discern both good and evil." The word "exercised" comes from the Greek word "gymnazo," from which we get our English word "gymnasium." It implies rigorous, disciplined training. Spiritual maturity does not happen by accident; it happens through consistent, deliberate practice.

What does this training look like? It involves regular engagement with Scripture, not just reading but studying, meditating, memorizing, and applying. It involves prayer, not just casual requests but deep communion with God. It involves service, putting faith into action. It involves fellowship, learning and growing in community with other believers. And it involves suffering, because trials produce perseverance, character, and hope (Romans 5:3-4).

The result of this training is discernment. Mature believers can distinguish good from evil, truth from error, God's voice from the enemy's deception. They are not tossed about by every wind of doctrine (Ephesians 4:14). They have a settled faith, a deep knowledge of God's Word, and the wisdom to apply it in any situation. This is the goal of spiritual growth: not merely knowing more but being transformed more into the image of Christ.

OUTLINE POINT 3: Moving from Milk to Meat

The transition from milk to meat is a process, not an event. It requires humility to admit where we are, courage to pursue growth, and patience with ourselves as we develop. The fact that the writer of Hebrews rebukes his readers does not mean they are hopeless; it means they have untapped potential. Every believer has the capacity for deep spiritual maturity, but it must be cultivated.

Practically speaking, moving from milk to meat means going beyond surface-level faith. It means asking hard questions, wrestling with difficult passages of Scripture, engaging in theological discussion, and seeking to understand God's purposes not just for personal comfort but for His global mission. It means being willing to be challenged, corrected, and stretched. Growth is uncomfortable, but it is necessary.

TEACHER EMPHASIS: Challenge your class to identify one area of spiritual immaturity in their lives. Encourage them not to feel condemned but to feel motivated. God is not angry with His children for being where they are; He is inviting them to come further. Maturity is a journey, and every step forward counts.

APPLICATION: Commit to one specific spiritual discipline this week that pushes you beyond your comfort zone. If you normally read one chapter of Scripture, read three. If you normally pray for five minutes, pray for fifteen. If you have never fasted, try a one-meal fast. Growth requires stretching.`,
      discussionQuestions: [
        "What are the signs of spiritual maturity versus spiritual immaturity?",
        "Why do some believers remain on 'milk' for years instead of progressing to 'solid food'?",
        "How does the concept of 'exercising our senses' apply to developing spiritual discernment?",
        "What specific steps can you take this week to move further along in your spiritual growth?"
      ],
      prayerFocus: "Father, we confess that we have sometimes been content with spiritual immaturity. Forgive us for settling for milk when You have prepared a feast of solid food for us. Give us a hunger for deeper truth, a thirst for greater knowledge of You, and the discipline to pursue growth daily. Train our senses to discern good from evil. Make us mature, complete, lacking nothing. In Jesus' name, Amen.",
      weeklyAssignment: "Choose one book of the Bible you have never studied in depth. Begin reading it this week with a study guide or commentary. Take notes on what you learn and come prepared to share one insight with the class next Sunday.",
    },
  ];
}

export async function seedSundaySchoolLessons() {
  const existing = await storage.getSundaySchoolLessons();
  if (existing.length > 0) {
    console.log(`[Sunday School] ${existing.length} lessons already exist, skipping seed.`);
    return;
  }

  const lessons = getSeedLessons();
  let created = 0;
  for (const lesson of lessons) {
    try {
      await storage.createSundaySchoolLesson(lesson);
      created++;
      console.log(`[Sunday School] Seeded: "${lesson.title}" for ${lesson.date}`);
    } catch (err: any) {
      console.error(`[Sunday School] Failed to seed "${lesson.title}":`, err.message);
    }
  }
  console.log(`[Sunday School] Seed complete: ${created} lessons created.`);
}
