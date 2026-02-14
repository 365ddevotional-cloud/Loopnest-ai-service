import { db } from "./db";
import { devotionals } from "@shared/schema";
import { eq } from "drizzle-orm";

const AUTHOR = "Moses Afolabi";

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

interface RomansDay {
  ref: string;
  text: string;
  title: string;
  theme: string;
  doctrinalFocus: string;
}

const transitionDevotional = {
  date: "2026-03-16",
  title: "From Identity to Righteousness — A New Journey Begins",
  scriptureReference: "Romans 1:16–17",
  scriptureText: "For I am not ashamed of the gospel of Christ: for it is the power of God unto salvation to every one that believeth; to the Jew first, and also to the Greek. For therein is the righteousness of God revealed from faith to faith: as it is written, The just shall live by faith.",
  content: `Over the past weeks, we have walked through the book of Ephesians together — a letter of breathtaking depth that revealed our identity in Christ. We learned that before the foundation of the world, God chose us, adopted us, and blessed us with every spiritual blessing in heavenly places. We discovered that salvation is not earned by works but received by grace through faith. We grew in the understanding that the Church is one body, united under one Lord, one faith, and one baptism.

Ephesians taught us about spiritual maturity — putting off the old self and putting on the new self created in true righteousness and holiness. We learned to walk in love, walk in light, and walk in wisdom. Paul concluded that powerful epistle by equipping us with the full armor of God, reminding us that our battle is not against flesh and blood, but against principalities and powers in the spiritual realm.

Now, beloved, we stand at a sacred threshold. Having established who we are in Christ, it is time to understand the foundation upon which that identity rests. We turn our hearts and minds to the book of Romans — the most systematic, theologically rich letter in all of Scripture. If Ephesians showed us our position, Romans shows us our foundation.

Romans answers the deepest questions of human existence: How is a sinful person made right with a holy God? What is the role of faith? What becomes of the law? How does the Spirit change a life from the inside out? What is God's plan for Israel and the nations? And how should a justified believer live in practical holiness? These are not abstract questions. They are the bedrock of our daily walk with Christ.

The Apostle Paul wrote Romans to a church he had never visited, yet his words carry the weight of divine revelation that has shaped the entire course of Christian theology. Martin Luther, reading Romans, ignited the Reformation. John Wesley, hearing Luther's preface to Romans, felt his heart "strangely warmed." Countless believers across centuries have been transformed by the truths contained in this letter.

As we begin this 45-day journey through Romans, I invite you to come with an open heart and a teachable spirit. We will move chapter by chapter through this magnificent epistle. Some days will challenge your thinking. Other days will flood your soul with comfort. Every day will draw you closer to the God who justifies the ungodly by grace alone, through faith alone, in Christ alone.

Prepare your heart, beloved. Set aside time each day not merely to read, but to meditate. Let the Spirit of God work these truths deep into your understanding. The journey from identity to righteousness is not a departure — it is a deepening. Everything we learned in Ephesians finds its doctrinal roots in Romans. Let us begin.`,
  prayerPoints: [
    "Lord, I thank You for the journey through Ephesians and the truths You planted in my heart about my identity in Christ.",
    "Father, prepare my heart and mind for this deep study of Romans. Give me the spirit of wisdom and revelation as I engage with Your Word.",
    "Holy Spirit, open my understanding to the doctrines of justification, grace, and righteousness. Let these truths transform how I live.",
    "Lord, remove every distraction and spiritual dullness that would prevent me from receiving the fullness of what You want to teach me in this season.",
    "Father, I commit to this journey through Romans. Strengthen my discipline and deepen my hunger for Your Word each day.",
    "God of all grace, let the gospel of Jesus Christ burn afresh in my heart. Let me never be ashamed of its power."
  ],
  faithDeclarations: [
    "I am not ashamed of the gospel — it is the power of God for my salvation and for everyone who believes.",
    "I am justified freely by God's grace through the redemption that is in Christ Jesus.",
    "The righteousness of God is revealed to me from faith to faith. I choose to live by faith every single day.",
    "I am prepared for a deeper walk with God. My heart is open, my mind is teachable, and my spirit is willing.",
    "I declare that the truths of Romans will transform my thinking, strengthen my faith, and deepen my love for God.",
    "QUOTE: \"The gospel is not merely a message to be believed, but a power to be experienced — changing lives from the inside out.\"",
    "QUOTE: \"When God justifies a sinner, He does not make sin acceptable — He makes the sinner righteous through the blood of Christ.\"",
    "QUOTE: \"Faith is not a leap into the dark; it is a confident step toward the light of God's revealed truth.\"",
    "PROPHETIC: I prophesy over my life that this season of studying Romans will mark a turning point in my spiritual depth and maturity. I will never be the same.",
    "PROPHETIC: I declare that as I journey through the doctrines of grace, justification, and the Spirit-filled life, I shall be rooted and grounded in truth that no storm can shake."
  ],
  author: AUTHOR,
};

const romansDays: RomansDay[] = [
  { ref: "Romans 1:1-7", text: "Paul, a servant of Jesus Christ, called to be an apostle, separated unto the gospel of God, (Which he had promised afore by his prophets in the holy scriptures,) Concerning his Son Jesus Christ our Lord, which was made of the seed of David according to the flesh; And declared to be the Son of God with power, according to the spirit of holiness, by the resurrection from the dead.", title: "Called and Set Apart for the Gospel", theme: "apostolic calling", doctrinalFocus: "The gospel was promised through the prophets and fulfilled in Christ" },
  { ref: "Romans 1:16", text: "For I am not ashamed of the gospel of Christ: for it is the power of God unto salvation to every one that believeth; to the Jew first, and also to the Greek.", title: "The Power of God Unto Salvation", theme: "gospel power", doctrinalFocus: "The gospel carries divine power that saves everyone who believes" },
  { ref: "Romans 1:17", text: "For therein is the righteousness of God revealed from faith to faith: as it is written, The just shall live by faith.", title: "From Faith to Faith", theme: "living by faith", doctrinalFocus: "God's righteousness is progressively revealed as we grow in faith" },
  { ref: "Romans 1:20", text: "For the invisible things of him from the creation of the world are clearly seen, being understood by the things that are made, even his eternal power and Godhead; so that they are without excuse.", title: "God Revealed in Creation", theme: "general revelation", doctrinalFocus: "Creation itself testifies to God's eternal power and divine nature" },
  { ref: "Romans 2:4", text: "Or despisest thou the riches of his goodness and forbearance and longsuffering; not knowing that the goodness of God leadeth thee to repentance?", title: "The Goodness That Leads to Repentance", theme: "God's kindness", doctrinalFocus: "God's patience and kindness are designed to lead us to genuine repentance" },
  { ref: "Romans 2:11", text: "For there is no respect of persons with God.", title: "No Partiality with God", theme: "divine impartiality", doctrinalFocus: "God judges righteously without favoritism based on ethnicity or status" },
  { ref: "Romans 3:10-12", text: "As it is written, There is none righteous, no, not one: There is none that understandeth, there is none that seeketh after God. They are all gone out of the way, they are together become unprofitable; there is none that doeth good, no, not one.", title: "The Universal Need for Grace", theme: "universal sinfulness", doctrinalFocus: "Every human being stands in need of God's saving grace" },
  { ref: "Romans 3:23-24", text: "For all have sinned, and come short of the glory of God; Being justified freely by his grace through the redemption that is in Christ Jesus.", title: "Justified Freely by His Grace", theme: "free justification", doctrinalFocus: "Justification is a free gift of grace made possible through Christ's redemptive work" },
  { ref: "Romans 3:28", text: "Therefore we conclude that a man is justified by faith without the deeds of the law.", title: "Faith Apart from Works", theme: "justification by faith", doctrinalFocus: "Salvation rests on faith alone, not on human effort or religious performance" },
  { ref: "Romans 4:3", text: "For what saith the scripture? Abraham believed God, and it was counted unto him for righteousness.", title: "Abraham's Example of Faith", theme: "credited righteousness", doctrinalFocus: "Faith is the means by which God credits righteousness to the believer" },
  { ref: "Romans 4:17", text: "God, who quickeneth the dead, and calleth those things which be not as though they were.", title: "Calling Things Into Being", theme: "faith declarations", doctrinalFocus: "The God we serve speaks life where there is death and creates something from nothing" },
  { ref: "Romans 4:20-21", text: "He staggered not at the promise of God through unbelief; but was strong in faith, giving glory to God; And being fully persuaded that, what he had promised, he was able also to perform.", title: "Fully Persuaded by God's Promise", theme: "unwavering faith", doctrinalFocus: "Mature faith does not waver at God's promises but stands fully persuaded" },
  { ref: "Romans 5:1-2", text: "Therefore being justified by faith, we have peace with God through our Lord Jesus Christ: By whom also we have access by faith into this grace wherein we stand, and rejoice in hope of the glory of God.", title: "Peace with God Through Faith", theme: "peace and access", doctrinalFocus: "Justification brings lasting peace with God and confident access to His grace" },
  { ref: "Romans 5:3-5", text: "And not only so, but we glory in tribulations also: knowing that tribulation worketh patience; And patience, experience; and experience, hope: And hope maketh not ashamed; because the love of God is shed abroad in our hearts by the Holy Ghost which is given unto us.", title: "The Glory Found in Trials", theme: "purpose in suffering", doctrinalFocus: "God uses trials to build character and deepen our hope through His Spirit" },
  { ref: "Romans 5:8", text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.", title: "Love Demonstrated While We Were Sinners", theme: "unconditional love", doctrinalFocus: "God's love is not based on our worthiness but on His own unchanging character" },
  { ref: "Romans 5:17", text: "For if by one man's offence death reigned by one; much more they which receive abundance of grace and of the gift of righteousness shall reign in life by one, Jesus Christ.", title: "Reigning in Life Through Grace", theme: "grace over sin", doctrinalFocus: "The abundance of grace in Christ far surpasses the consequences of Adam's fall" },
  { ref: "Romans 5:20-21", text: "Moreover the law entered, that the offence might abound. But where sin abounded, grace did much more abound: That as sin hath reigned unto death, even so might grace reign through righteousness unto eternal life by Jesus Christ our Lord.", title: "Where Sin Abounded, Grace Overflowed", theme: "superabounding grace", doctrinalFocus: "Grace does not merely match sin — it overwhelms and overcomes it completely" },
  { ref: "Romans 6:4", text: "Therefore we are buried with him by baptism into death: that like as Christ was raised up from the dead by the glory of the Father, even so we also should walk in newness of life.", title: "Walking in Newness of Life", theme: "new creation", doctrinalFocus: "Union with Christ in His death and resurrection produces genuine newness of life" },
  { ref: "Romans 6:6-7", text: "Knowing this, that our old man is crucified with him, that the body of sin might be destroyed, that henceforth we should not serve sin. For he that is dead is freed from sin.", title: "The Old Self Crucified", theme: "freedom from sin nature", doctrinalFocus: "The believer's old nature has been put to death, breaking the power of sin" },
  { ref: "Romans 6:14", text: "For sin shall not have dominion over you: for ye are not under the law, but under grace.", title: "Sin Has No Dominion Over You", theme: "grace and freedom", doctrinalFocus: "Grace does not encourage sin — it empowers the believer to live above it" },
  { ref: "Romans 6:23", text: "For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.", title: "The Gift of Eternal Life", theme: "wages vs gift", doctrinalFocus: "Sin earns death; God freely gives eternal life through Christ" },
  { ref: "Romans 7:24-25", text: "O wretched man that I am! who shall deliver me from the body of this death? I thank God through Jesus Christ our Lord.", title: "Delivered from the Inner Struggle", theme: "deliverance", doctrinalFocus: "The honest cry for deliverance finds its answer in Jesus Christ alone" },
  { ref: "Romans 8:1", text: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.", title: "No Condemnation — None at All", theme: "freedom from condemnation", doctrinalFocus: "Those who are in Christ are completely free from the verdict of condemnation" },
  { ref: "Romans 8:2", text: "For the law of the Spirit of life in Christ Jesus hath made me free from the law of sin and death.", title: "The Higher Law of the Spirit", theme: "spiritual freedom", doctrinalFocus: "A higher spiritual law operates in believers, overriding the power of sin and death" },
  { ref: "Romans 8:6", text: "For to be carnally minded is death; but to be spiritually minded is life and peace.", title: "The Mindset That Produces Life", theme: "spiritual mindset", doctrinalFocus: "What we set our minds on determines whether we experience death or life and peace" },
  { ref: "Romans 8:11", text: "But if the Spirit of him that raised up Jesus from the dead dwell in you, he that raised up Christ from the dead shall also quicken your mortal bodies by his Spirit that dwelleth in you.", title: "Resurrection Power Living Inside You", theme: "resurrection power", doctrinalFocus: "The same power that raised Christ from the dead now dwells within every believer" },
  { ref: "Romans 8:14-16", text: "For as many as are led by the Spirit of God, they are the sons of God. For ye have not received the spirit of bondage again to fear; but ye have received the Spirit of adoption, whereby we cry, Abba, Father. The Spirit itself beareth witness with our spirit, that we are the children of God.", title: "Led by the Spirit, Adopted as Sons", theme: "Spirit-led sonship", doctrinalFocus: "The Holy Spirit leads believers as children of God and confirms our adoption" },
  { ref: "Romans 8:17-18", text: "And if children, then heirs; heirs of God, and joint-heirs with Christ; if so be that we suffer with him, that we may be also glorified together. For I reckon that the sufferings of this present time are not worthy to be compared with the glory which shall be revealed in us.", title: "Heirs of God, Joint-Heirs with Christ", theme: "inheritance and glory", doctrinalFocus: "Present sufferings are temporary; the coming glory of our inheritance is eternal" },
  { ref: "Romans 8:26-27", text: "Likewise the Spirit also helpeth our infirmities: for we know not what we should pray for as we ought: but the Spirit itself maketh intercession for us with groanings which cannot be uttered. And he that searcheth the hearts knoweth what is the mind of the Spirit, because he maketh intercession for the saints according to the will of God.", title: "The Spirit Prays When We Cannot", theme: "intercessory Spirit", doctrinalFocus: "The Holy Spirit bridges the gap between our weakness and God's perfect will" },
  { ref: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", title: "All Things Working for Your Good", theme: "sovereign purpose", doctrinalFocus: "God orchestrates every circumstance — even painful ones — for the good of His children" },
  { ref: "Romans 8:31-32", text: "What shall we then say to these things? If God be for us, who can be against us? He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?", title: "If God Is for Us", theme: "divine advocacy", doctrinalFocus: "The God who gave His own Son will withhold nothing good from His people" },
  { ref: "Romans 8:35-37", text: "Who shall separate us from the love of Christ? shall tribulation, or distress, or persecution, or famine, or nakedness, or peril, or sword? Nay, in all these things we are more than conquerors through him that loved us.", title: "More Than Conquerors in Every Trial", theme: "victorious living", doctrinalFocus: "No trial, hardship, or adversity can separate us from Christ's conquering love" },
  { ref: "Romans 8:38-39", text: "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.", title: "Nothing Shall Separate Us from His Love", theme: "inseparable love", doctrinalFocus: "Paul's climactic declaration assures us that absolutely nothing in all creation can break the bond of God's love" },
  { ref: "Romans 9:15-16", text: "For he saith to Moses, I will have mercy on whom I will have mercy, and I will have compassion on whom I will have compassion. So then it is not of him that willeth, nor of him that runneth, but of God that sheweth mercy.", title: "The Mercy of a Sovereign God", theme: "God's sovereignty", doctrinalFocus: "Salvation ultimately rests on God's sovereign mercy, not human effort" },
  { ref: "Romans 10:9-10", text: "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved. For with the heart man believeth unto righteousness; and with the mouth confession is made unto salvation.", title: "Confess and Believe — The Way of Salvation", theme: "confession and faith", doctrinalFocus: "Salvation requires both heart-faith and mouth-confession working together" },
  { ref: "Romans 10:13-15", text: "For whosoever shall call upon the name of the Lord shall be saved. How then shall they call on him in whom they have not believed? and how shall they believe in him of whom they have not heard? and how shall they hear without a preacher? And how shall they preach, except they be sent?", title: "Beautiful Feet That Carry the Gospel", theme: "evangelistic mission", doctrinalFocus: "The chain of salvation requires messengers who are willing to be sent" },
  { ref: "Romans 10:17", text: "So then faith cometh by hearing, and hearing by the word of God.", title: "Faith Built Through the Word", theme: "faith building", doctrinalFocus: "Consistent exposure to God's Word is the divine method for building genuine faith" },
  { ref: "Romans 11:33-36", text: "O the depth of the riches both of the wisdom and knowledge of God! how unsearchable are his judgments, and his ways past finding out! For who hath known the mind of the Lord? or who hath been his counsellor? Or who hath first given to him, and it shall be recompensed unto him again? For of him, and through him, and to him, are all things: to whom be glory for ever. Amen.", title: "The Unfathomable Wisdom of God", theme: "doxology", doctrinalFocus: "God's wisdom, knowledge, and plans are infinitely beyond human comprehension" },
  { ref: "Romans 12:1", text: "I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service.", title: "A Living Sacrifice — Your Reasonable Worship", theme: "total surrender", doctrinalFocus: "True worship involves the full surrender of our bodies and lives to God" },
  { ref: "Romans 12:2", text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.", title: "Transformed by a Renewed Mind", theme: "mind transformation", doctrinalFocus: "Spiritual transformation begins with the intentional renewal of how we think" },
  { ref: "Romans 12:9-13", text: "Let love be without dissimulation. Abhor that which is evil; cleave to that which is good. Be kindly affectioned one to another with brotherly love; in honour preferring one another; Not slothful in business; fervent in spirit; serving the Lord; Rejoicing in hope; patient in tribulation; continuing instant in prayer; Distributing to the necessity of saints; given to hospitality.", title: "The Marks of Genuine Christian Love", theme: "authentic love", doctrinalFocus: "Paul outlines the practical characteristics that define sincere Christian love" },
  { ref: "Romans 12:19-21", text: "Dearly beloved, avenge not yourselves, but rather give place unto wrath: for it is written, Vengeance is mine; I will repay, saith the Lord. Therefore if thine enemy hunger, feed him; if he thirst, give him drink. Be not overcome of evil, but overcome evil with good.", title: "Overcoming Evil with the Power of Good", theme: "defeating evil", doctrinalFocus: "The Christian response to injustice is radical good — trusting God to settle accounts" },
  { ref: "Romans 13:8-10", text: "Owe no man any thing, but to love one another: for he that loveth another hath fulfilled the law. Love worketh no ill to his neighbour: therefore love is the fulfilling of the law.", title: "The Debt of Love We Gladly Owe", theme: "love as fulfillment", doctrinalFocus: "Love is the one debt we can never fully repay — and it fulfills every commandment" },
  { ref: "Romans 13:11-14", text: "And that, knowing the time, that now it is high time to awake out of sleep: for now is our salvation nearer than when we believed. The night is far spent, the day is at hand: let us therefore cast off the works of darkness, and let us put on the armour of light.", title: "Awake — The Day Is at Hand", theme: "urgency of the hour", doctrinalFocus: "Believers must live with spiritual alertness, knowing the day of the Lord draws near" },
  { ref: "Romans 14:17-19", text: "For the kingdom of God is not meat and drink; but righteousness, and peace, and joy in the Holy Ghost. For he that in these things serveth Christ is acceptable to God, and approved of men. Let us therefore follow after the things which make for peace, and things wherewith one may edify another.", title: "The Kingdom — Righteousness, Peace, and Joy", theme: "kingdom priorities", doctrinalFocus: "The kingdom of God is defined not by external rules but by inner spiritual realities" },
  { ref: "Romans 15:4-6", text: "For whatsoever things were written aforetime were written for our learning, that we through patience and comfort of the scriptures might have hope. Now the God of patience and consolation grant you to be likeminded one toward another according to Christ Jesus: That ye may with one mind and one mouth glorify the God and Father of our Lord Jesus Christ.", title: "Hope Through the Scriptures", theme: "Scripture and hope", doctrinalFocus: "The Scriptures were given to produce endurance, encouragement, and living hope" },
];

function generateDevotionalContent(day: RomansDay, dayIndex: number): string {
  const paragraphs: string[] = [];

  const openingPool = [
    `The words of ${day.ref} invite us into one of the most transformative truths in all of Scripture. As we continue our journey through Romans, today's passage addresses the theme of ${day.theme} with a depth that demands our attention and our response.`,
    `Today we arrive at ${day.ref}, and the Spirit of God meets us with a truth that has sustained believers across centuries: ${day.doctrinalFocus}. This is not mere theology — it is the living breath of God's Word speaking directly into our circumstances.`,
    `As we open our hearts to ${day.ref}, we encounter a passage that has ignited revivals, comforted the afflicted, and strengthened the weary. The Apostle Paul writes with clarity and conviction about ${day.theme}, and his words carry the weight of divine authority.`,
    `In ${day.ref}, Paul continues building the theological foundation of the Christian faith. Today's focus on ${day.theme} is not an abstract concept — it is a reality that shapes how we live, pray, worship, and relate to one another.`,
    `The passage before us today, ${day.ref}, addresses a truth that every believer must grasp firmly: ${day.doctrinalFocus}. As we meditate on these words, let the Holy Spirit illuminate their meaning for your life today.`,
  ];

  paragraphs.push(openingPool[dayIndex % openingPool.length]);

  const bodyPool = [
    `Paul understood that the gospel is not merely information to be believed but a power to be experienced. When he writes about ${day.theme}, he is describing something that transforms the very core of who we are. This is not surface-level change — it is a renovation of the soul that only God's Spirit can accomplish.`,
    `Consider what it means for your daily walk that ${day.doctrinalFocus}. This truth is not reserved for theologians or pastors. It is the inheritance of every man, woman, and child who has placed their trust in Jesus Christ. Whether you are in a season of abundance or a season of trial, this truth remains an unshakable foundation.`,
    `Throughout the history of the Church, believers have returned to this passage again and again. The early Church fathers meditated on it. The reformers built their convictions upon it. Missionaries carried its truth across oceans and into hostile territories. And today, in your own life, this same truth stands ready to anchor your soul against every storm.`,
    `The word of God does not merely inform — it transforms. As you read today's scripture about ${day.theme}, allow it to move beyond intellectual understanding into the realm of personal conviction. Let it shape your prayers, influence your decisions, and govern your responses to the challenges you face.`,
    `In a world filled with uncertainty, voices of confusion, and shifting moral standards, the truths Paul declares in this passage stand as immovable pillars. ${day.doctrinalFocus}. This is the bedrock upon which the Christian life is built, and no earthquake of circumstance can shake what God has established.`,
    `Notice the confidence with which Paul writes. He does not offer suggestions or possibilities — he declares certainties. The truth about ${day.theme} is settled in heaven and confirmed by the Spirit. Our task is not to make it true, but to believe it, receive it, and walk in the fullness of what God has already accomplished.`,
    `There is a practical dimension to this truth that we must not overlook. Understanding ${day.theme} is not merely about growing in knowledge — it is about growing in Christ-likeness. Every doctrine in Romans has a direct impact on how we treat our neighbors, how we endure hardship, and how we represent Christ to a watching world.`,
    `What does this mean for you personally? It means that regardless of your past failures, your present struggles, or your future uncertainties, the truth declared in ${day.ref} speaks a word of hope, power, and direction over your life. God's Word never returns void — it accomplishes the purpose for which it was sent.`,
  ];

  const shuffled = [...bodyPool].sort(() => 0.5 - Math.random());
  const bodyCount = 4 + (dayIndex % 3);
  for (let i = 0; i < bodyCount && i < shuffled.length; i++) {
    paragraphs.push(shuffled[i]);
  }

  const closingPool = [
    `As you close this devotional, carry this truth with you: ${day.doctrinalFocus}. Let it be the lens through which you see every challenge, every opportunity, and every relationship today. The God who inspired these words is the same God who walks with you through every moment.`,
    `Beloved, let the truth of ${day.ref} settle deep into your spirit. Do not rush past it. Meditate on it. Speak it over your life. Pray it back to God. The Word of God is alive and powerful, and it will accomplish its work in you as you give it room to grow.`,
    `Today's journey through ${day.ref} is more than a devotional exercise — it is an encounter with the living God. As the psalmist wrote, "Thy word is a lamp unto my feet, and a light unto my path." Walk in this light today, and let the truth of ${day.theme} guide every step.`,
  ];

  paragraphs.push(closingPool[dayIndex % closingPool.length]);

  return paragraphs.join("\n\n");
}

function generatePrayerPoints(day: RomansDay, dayIndex: number): string[] {
  const allPoints = [
    `Father, I thank You for the truth of ${day.ref}. Let this word take root in my heart and bear fruit in every area of my life.`,
    `Lord, deepen my understanding of ${day.theme}. Remove every veil of confusion and reveal the fullness of Your truth to my spirit.`,
    `Holy Spirit, help me to walk in the reality of what I have read today. Let it not be mere head knowledge, but heart transformation.`,
    `Father, I pray for every believer reading this devotional today. Unite us in the truth of Your Word and strengthen our faith collectively.`,
    `Lord, I surrender every area of my life that does not align with the truth of ${day.ref}. Transform me from the inside out.`,
    `God of all grace, give me boldness to share the truths I am learning in Romans with those around me. Make me an ambassador of Your gospel.`,
    `Father, I pray against spiritual dullness and distraction. Sharpen my spiritual senses and increase my hunger for Your Word.`,
    `Lord, let the doctrine of ${day.theme} shape my worship, my prayer life, and my daily interactions with others.`,
  ];

  const count = 5 + (dayIndex % 3);
  const selected: string[] = [];
  const indices = Array.from({ length: allPoints.length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = (dayIndex * 7 + i * 3) % (i + 1);
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  for (let i = 0; i < count && i < indices.length; i++) {
    selected.push(allPoints[indices[i]]);
  }
  return selected;
}

function generateFaithDeclarations(day: RomansDay, dayIndex: number): string[] {
  const faithStatements = [
    `I declare that the truth of ${day.ref} is the foundation of my life. I stand on this word with unwavering confidence.`,
    `I am a child of God, justified by faith and empowered by grace. ${day.doctrinalFocus} — and I walk in this reality today.`,
    `I declare that no weapon formed against my faith shall prosper. The Word of God in ${day.ref} is my shield and my strength.`,
    `I am who God says I am. I can do what God says I can do. The truth about ${day.theme} defines my identity and my destiny.`,
    `I choose faith over fear, truth over deception, and the gospel over the wisdom of this world. I live by every word that proceeds from the mouth of God.`,
  ];

  const quotes = [
    `QUOTE: "The gospel does not whisper — it thunders with the authority of heaven, declaring freedom to every captive soul."`,
    `QUOTE: "Grace is not permission to stay the same; it is the power of God to become everything He created you to be."`,
    `QUOTE: "Faith is seeing the invisible, believing the impossible, and receiving the inconceivable — all because God has spoken."`,
    `QUOTE: "Righteousness is not the absence of struggle; it is the presence of God in the midst of every struggle."`,
    `QUOTE: "The cross did not make God love us more — it revealed how much He already loved us from eternity past."`,
    `QUOTE: "When the Word of God becomes the final authority in your life, confusion loses its voice and peace takes the throne."`,
  ];

  const prophetic = [
    `PROPHETIC: I prophesy that as I meditate on ${day.ref}, the Spirit of God will open doors of understanding that have been closed. Fresh revelation is coming to my spirit.`,
    `PROPHETIC: I declare that this season of studying Romans will produce a harvest of righteousness, peace, and spiritual maturity in my life that will be visible to all.`,
    `PROPHETIC: I speak over my household, my community, and my generation — the truths of Romans will reshape our understanding of the gospel and ignite a fresh fire of faith.`,
  ];

  const result: string[] = [];
  for (let i = 0; i < 5; i++) {
    result.push(faithStatements[i]);
  }
  const qStart = (dayIndex * 2) % quotes.length;
  for (let i = 0; i < 3; i++) {
    result.push(quotes[(qStart + i) % quotes.length]);
  }
  const pStart = dayIndex % prophetic.length;
  result.push(prophetic[pStart]);
  result.push(prophetic[(pStart + 1) % prophetic.length]);

  return result;
}

async function main() {
  console.log("=== Romans Study Update Script ===");
  console.log("March 16, 2026 (transition) + March 17 - April 30, 2026 (45-day Romans)");
  console.log("");

  let updatedCount = 0;

  // STEP 1: Update transition devotional (March 16)
  console.log("--- Step 1: Transition Devotional (March 16, 2026) ---");
  const existing = await db.select().from(devotionals).where(eq(devotionals.date, "2026-03-16"));
  if (existing.length > 0) {
    await db.update(devotionals).set({
      title: transitionDevotional.title,
      scriptureReference: transitionDevotional.scriptureReference,
      scriptureText: transitionDevotional.scriptureText,
      content: transitionDevotional.content,
      prayerPoints: transitionDevotional.prayerPoints,
      faithDeclarations: transitionDevotional.faithDeclarations,
      author: AUTHOR,
    }).where(eq(devotionals.date, "2026-03-16"));
    console.log(`  Updated: March 16 → "${transitionDevotional.title}"`);
    updatedCount++;
  } else {
    console.log("  WARNING: No devotional found for March 16, 2026!");
  }

  // STEP 2: Generate 45-day Romans study (March 17 - April 30)
  console.log("");
  console.log("--- Step 2: 45-Day Romans Study (March 17 - April 30, 2026) ---");
  const startDate = new Date(2026, 2, 17); // March 17, 2026

  if (romansDays.length < 45) {
    console.log(`  WARNING: Only ${romansDays.length} passages defined. Need 45.`);
  }

  for (let i = 0; i < 45 && i < romansDays.length; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);
    const dateStr = formatDate(currentDate);
    const day = romansDays[i];

    const content = generateDevotionalContent(day, i);
    const prayerPoints = generatePrayerPoints(day, i);
    const faithDeclarations = generateFaithDeclarations(day, i);

    const existingRecord = await db.select().from(devotionals).where(eq(devotionals.date, dateStr));
    if (existingRecord.length > 0) {
      await db.update(devotionals).set({
        title: day.title,
        scriptureReference: day.ref,
        scriptureText: day.text,
        content,
        prayerPoints,
        faithDeclarations,
        author: AUTHOR,
      }).where(eq(devotionals.date, dateStr));
      updatedCount++;
    } else {
      await db.insert(devotionals).values({
        date: dateStr,
        title: day.title,
        scriptureReference: day.ref,
        scriptureText: day.text,
        content,
        prayerPoints,
        faithDeclarations,
        author: AUTHOR,
      });
      updatedCount++;
    }
    console.log(`  ${dateStr} → "${day.title}" (${day.ref})`);
  }

  console.log("");
  console.log("=== UPDATE COMPLETE ===");
  console.log(`Total records updated/created: ${updatedCount}`);

  // Validation
  const total = await db.select().from(devotionals);
  const marchSixteen = await db.select().from(devotionals).where(eq(devotionals.date, "2026-03-16"));
  const marchSeventeen = await db.select().from(devotionals).where(eq(devotionals.date, "2026-03-17"));
  const aprilThirty = await db.select().from(devotionals).where(eq(devotionals.date, "2026-04-30"));

  console.log("");
  console.log("=== VALIDATION ===");
  console.log(`Total devotionals in DB: ${total.length}`);
  console.log(`March 16 title: "${marchSixteen[0]?.title}"`);
  console.log(`March 17 title: "${marchSeventeen[0]?.title}" (should be Romans)`);
  console.log(`April 30 title: "${aprilThirty[0]?.title}" (should be Romans)`);
  console.log(`All authors "Moses Afolabi": ${total.filter(d => d.author === "Moses Afolabi").length}/${total.length}`);

  const duplicates = total.reduce((acc, d) => {
    acc[d.date] = (acc[d.date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const dups = Object.entries(duplicates).filter(([, count]) => count > 1);
  console.log(`Duplicate dates: ${dups.length}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
