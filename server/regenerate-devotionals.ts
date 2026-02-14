import { db } from "./db";
import { devotionals } from "@shared/schema";
import { eq } from "drizzle-orm";

interface DevotionalEntry {
  date: string;
  title: string;
  scriptureReference: string;
  scriptureText: string;
  content: string;
  prayerPoints: string[];
  faithDeclarations: string[];
  author: string;
}

interface PassageData {
  ref: string;
  text: string;
  title: string;
  theme: string;
}

const AUTHOR = "Moses Afolabi";

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const ephesiansPassages: PassageData[] = [
  { ref: "Ephesians 1:3", text: "Blessed be the God and Father of our Lord Jesus Christ, who hath blessed us with all spiritual blessings in heavenly places in Christ.", title: "Blessed with Every Spiritual Blessing", theme: "spiritual blessings" },
  { ref: "Ephesians 1:4-5", text: "According as he hath chosen us in him before the foundation of the world, that we should be holy and without blame before him in love: Having predestinated us unto the adoption of children by Jesus Christ to himself.", title: "Chosen Before the Foundation", theme: "divine election" },
  { ref: "Ephesians 1:7", text: "In whom we have redemption through his blood, the forgiveness of sins, according to the riches of his grace.", title: "Redemption Through His Blood", theme: "redemption and forgiveness" },
  { ref: "Ephesians 1:17-18", text: "That the God of our Lord Jesus Christ, the Father of glory, may give unto you the spirit of wisdom and revelation in the knowledge of him: The eyes of your understanding being enlightened.", title: "Eyes of Understanding Enlightened", theme: "spiritual wisdom" },
  { ref: "Ephesians 2:4-5", text: "But God, who is rich in mercy, for his great love wherewith he loved us, Even when we were dead in sins, hath quickened us together with Christ.", title: "Rich in Mercy", theme: "God's mercy" },
  { ref: "Ephesians 2:8-9", text: "For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.", title: "Saved by Grace Through Faith", theme: "grace and salvation" },
  { ref: "Ephesians 2:10", text: "For we are his workmanship, created in Christ Jesus unto good works, which God hath before ordained that we should walk in them.", title: "God's Masterpiece", theme: "divine purpose" },
  { ref: "Ephesians 2:19-20", text: "Now therefore ye are no more strangers and foreigners, but fellowcitizens with the saints, and of the household of God; And are built upon the foundation of the apostles and prophets, Jesus Christ himself being the chief corner stone.", title: "Citizens of Heaven", theme: "belonging to God's family" },
  { ref: "Ephesians 3:16-17", text: "That he would grant you, according to the riches of his glory, to be strengthened with might by his Spirit in the inner man; That Christ may dwell in your hearts by faith.", title: "Strengthened in the Inner Man", theme: "inner strength" },
  { ref: "Ephesians 3:20", text: "Now unto him that is able to do exceeding abundantly above all that we ask or think, according to the power that worketh in us.", title: "Exceeding Abundantly Above", theme: "God's unlimited power" },
  { ref: "Ephesians 4:1-3", text: "I therefore, the prisoner of the Lord, beseech you that ye walk worthy of the vocation wherewith ye are called, With all lowliness and meekness, with longsuffering, forbearing one another in love; Endeavouring to keep the unity of the Spirit in the bond of peace.", title: "Walking Worthy of Your Calling", theme: "worthy living" },
  { ref: "Ephesians 4:22-24", text: "That ye put off concerning the former conversation the old man, which is corrupt according to the deceitful lusts; And be renewed in the spirit of your mind; And that ye put on the new man, which after God is created in righteousness and true holiness.", title: "Put On the New Self", theme: "spiritual renewal" },
  { ref: "Ephesians 5:1-2", text: "Be ye therefore followers of God, as dear children; And walk in love, as Christ also hath loved us, and hath given himself for us an offering and a sacrifice to God for a sweetsmelling savour.", title: "Walk in Love as Christ Loved Us", theme: "walking in love" },
  { ref: "Ephesians 6:10-11", text: "Finally, my brethren, be strong in the Lord, and in the power of his might. Put on the whole armour of God, that ye may be able to stand against the wiles of the devil.", title: "Put On the Full Armor of God", theme: "spiritual warfare" },
  { ref: "Ephesians 6:16-18", text: "Above all, taking the shield of faith, wherewith ye shall be able to quench all the fiery darts of the wicked. And take the helmet of salvation, and the sword of the Spirit, which is the word of God: Praying always with all prayer and supplication in the Spirit.", title: "The Shield of Faith", theme: "faith and prayer" },
];

const romansPassages: PassageData[] = [
  { ref: "Romans 1:16", text: "For I am not ashamed of the gospel of Christ: for it is the power of God unto salvation to every one that believeth.", title: "Not Ashamed of the Gospel", theme: "gospel power" },
  { ref: "Romans 1:17", text: "For therein is the righteousness of God revealed from faith to faith: as it is written, The just shall live by faith.", title: "The Just Shall Live by Faith", theme: "living by faith" },
  { ref: "Romans 2:4", text: "Or despisest thou the riches of his goodness and forbearance and longsuffering; not knowing that the goodness of God leadeth thee to repentance?", title: "The Goodness That Leads to Repentance", theme: "God's goodness" },
  { ref: "Romans 3:23-24", text: "For all have sinned, and come short of the glory of God; Being justified freely by his grace through the redemption that is in Christ Jesus.", title: "Justified Freely by Grace", theme: "justification" },
  { ref: "Romans 3:28", text: "Therefore we conclude that a man is justified by faith without the deeds of the law.", title: "Justified by Faith", theme: "faith not works" },
  { ref: "Romans 4:17", text: "God, who quickeneth the dead, and calleth those things which be not as though they were.", title: "Calling Things Into Being", theme: "faith declarations" },
  { ref: "Romans 4:20-21", text: "He staggered not at the promise of God through unbelief; but was strong in faith, giving glory to God; And being fully persuaded that, what he had promised, he was able also to perform.", title: "Fully Persuaded", theme: "unwavering faith" },
  { ref: "Romans 5:1", text: "Therefore being justified by faith, we have peace with God through our Lord Jesus Christ.", title: "Peace with God", theme: "peace through justification" },
  { ref: "Romans 5:3-5", text: "And not only so, but we glory in tribulations also: knowing that tribulation worketh patience; And patience, experience; and experience, hope: And hope maketh not ashamed; because the love of God is shed abroad in our hearts.", title: "Glorying in Tribulation", theme: "trials produce hope" },
  { ref: "Romans 5:8", text: "But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.", title: "While We Were Yet Sinners", theme: "unconditional love" },
  { ref: "Romans 5:17", text: "For if by one man's offence death reigned by one; much more they which receive abundance of grace and of the gift of righteousness shall reign in life by one, Jesus Christ.", title: "Reigning in Life Through Grace", theme: "reigning through grace" },
  { ref: "Romans 6:4", text: "Therefore we are buried with him by baptism into death: that like as Christ was raised up from the dead by the glory of the Father, even so we also should walk in newness of life.", title: "Walking in Newness of Life", theme: "new life in Christ" },
  { ref: "Romans 6:6", text: "Knowing this, that our old man is crucified with him, that the body of sin might be destroyed, that henceforth we should not serve sin.", title: "The Old Self Crucified", theme: "freedom from sin" },
  { ref: "Romans 6:14", text: "For sin shall not have dominion over you: for ye are not under the law, but under grace.", title: "Sin Has No Dominion", theme: "freedom and grace" },
  { ref: "Romans 6:23", text: "For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.", title: "The Gift of Eternal Life", theme: "eternal life" },
  { ref: "Romans 7:24-25", text: "O wretched man that I am! who shall deliver me from the body of this death? I thank God through Jesus Christ our Lord.", title: "Delivered Through Christ", theme: "deliverance" },
  { ref: "Romans 8:1", text: "There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.", title: "No Condemnation in Christ", theme: "freedom from condemnation" },
  { ref: "Romans 8:2", text: "For the law of the Spirit of life in Christ Jesus hath made me free from the law of sin and death.", title: "The Law of the Spirit of Life", theme: "spiritual law of freedom" },
  { ref: "Romans 8:6", text: "For to be carnally minded is death; but to be spiritually minded is life and peace.", title: "Spiritually Minded", theme: "spiritual mindset" },
  { ref: "Romans 8:11", text: "But if the Spirit of him that raised up Jesus from the dead dwell in you, he that raised up Christ from the dead shall also quicken your mortal bodies by his Spirit that dwelleth in you.", title: "The Resurrection Spirit Within", theme: "resurrection power" },
  { ref: "Romans 8:14", text: "For as many as are led by the Spirit of God, they are the sons of God.", title: "Led by the Spirit", theme: "Spirit-led living" },
  { ref: "Romans 8:15-16", text: "For ye have not received the spirit of bondage again to fear; but ye have received the Spirit of adoption, whereby we cry, Abba, Father. The Spirit itself beareth witness with our spirit, that we are the children of God.", title: "The Spirit of Adoption", theme: "adoption as children" },
  { ref: "Romans 8:17", text: "And if children, then heirs; heirs of God, and joint-heirs with Christ; if so be that we suffer with him, that we may be also glorified together.", title: "Joint Heirs with Christ", theme: "spiritual inheritance" },
  { ref: "Romans 8:18", text: "For I reckon that the sufferings of this present time are not worthy to be compared with the glory which shall be revealed in us.", title: "The Coming Glory", theme: "future glory" },
  { ref: "Romans 8:26", text: "Likewise the Spirit also helpeth our infirmities: for we know not what we should pray for as we ought: but the Spirit itself maketh intercession for us with groanings which cannot be uttered.", title: "The Spirit Intercedes for Us", theme: "Holy Spirit intercession" },
  { ref: "Romans 8:28", text: "And we know that all things work together for good to them that love God, to them who are the called according to his purpose.", title: "All Things Work Together for Good", theme: "God's sovereign purpose" },
  { ref: "Romans 8:31", text: "What shall we then say to these things? If God be for us, who can be against us?", title: "If God Be For Us", theme: "God is for us" },
  { ref: "Romans 8:35-37", text: "Who shall separate us from the love of Christ? shall tribulation, or distress, or persecution, or famine, or nakedness, or peril, or sword? Nay, in all these things we are more than conquerors through him that loved us.", title: "More Than Conquerors", theme: "victorious living" },
  { ref: "Romans 8:38-39", text: "For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.", title: "Nothing Can Separate Us", theme: "inseparable love" },
  { ref: "Romans 9:33", text: "As it is written, Behold, I lay in Sion a stumblingstone and rock of offence: and whosoever believeth on him shall not be ashamed.", title: "Believing Without Shame", theme: "faith without shame" },
  { ref: "Romans 10:9-10", text: "That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved. For with the heart man believeth unto righteousness; and with the mouth confession is made unto salvation.", title: "Confess and Believe", theme: "confession and salvation" },
  { ref: "Romans 10:17", text: "So then faith cometh by hearing, and hearing by the word of God.", title: "Faith Comes by Hearing", theme: "building faith" },
  { ref: "Romans 11:33", text: "O the depth of the riches both of the wisdom and knowledge of God! how unsearchable are his judgments, and his ways past finding out!", title: "The Unsearchable Riches of God", theme: "God's wisdom" },
  { ref: "Romans 11:36", text: "For of him, and through him, and to him, are all things: to whom be glory for ever. Amen.", title: "All Things Are From Him", theme: "God's sovereignty" },
  { ref: "Romans 12:1", text: "I beseech you therefore, brethren, by the mercies of God, that ye present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service.", title: "A Living Sacrifice", theme: "total surrender" },
  { ref: "Romans 12:2", text: "And be not conformed to this world: but be ye transformed by the renewing of your mind, that ye may prove what is that good, and acceptable, and perfect, will of God.", title: "Transformed by Renewed Thinking", theme: "mind renewal" },
  { ref: "Romans 12:6", text: "Having then gifts differing according to the grace that is given to us, let us use them.", title: "Using Your Gifts", theme: "spiritual gifts" },
  { ref: "Romans 12:9-10", text: "Let love be without dissimulation. Abhor that which is evil; cleave to that which is good. Be kindly affectioned one to another with brotherly love; in honour preferring one another.", title: "Genuine Love", theme: "authentic love" },
  { ref: "Romans 12:12", text: "Rejoicing in hope; patient in tribulation; continuing instant in prayer.", title: "Rejoicing in Hope", theme: "hope and patience" },
  { ref: "Romans 12:21", text: "Be not overcome of evil, but overcome evil with good.", title: "Overcoming Evil with Good", theme: "overcoming evil" },
  { ref: "Romans 13:8", text: "Owe no man any thing, but to love one another: for he that loveth another hath fulfilled the law.", title: "The Debt of Love", theme: "love fulfills the law" },
  { ref: "Romans 13:12", text: "The night is far spent, the day is at hand: let us therefore cast off the works of darkness, and let us put on the armour of light.", title: "Put On the Armor of Light", theme: "living in the light" },
  { ref: "Romans 14:17", text: "For the kingdom of God is not meat and drink; but righteousness, and peace, and joy in the Holy Ghost.", title: "The Kingdom Within", theme: "kingdom living" },
  { ref: "Romans 15:4", text: "For whatsoever things were written aforetime were written for our learning, that we through patience and comfort of the scriptures might have hope.", title: "Hope Through the Scriptures", theme: "Scripture gives hope" },
  { ref: "Romans 15:13", text: "Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.", title: "Abounding in Hope", theme: "overflowing hope" },
];

const philippiansPassages: PassageData[] = [
  { ref: "Philippians 1:6", text: "Being confident of this very thing, that he which hath begun a good work in you will perform it until the day of Jesus Christ.", title: "He Will Complete the Work", theme: "God finishes what He starts" },
  { ref: "Philippians 1:9-10", text: "And this I pray, that your love may abound yet more and more in knowledge and in all judgment; That ye may approve things that are excellent.", title: "Abounding in Love and Knowledge", theme: "growing in discernment" },
  { ref: "Philippians 1:12-14", text: "But I would ye should understand, brethren, that the things which happened unto me have fallen out rather unto the furtherance of the gospel.", title: "Setbacks Become Setups", theme: "purpose in adversity" },
  { ref: "Philippians 1:21", text: "For to me to live is Christ, and to die is gain.", title: "To Live Is Christ", theme: "Christ-centered life" },
  { ref: "Philippians 1:27", text: "Only let your conversation be as it becometh the gospel of Christ.", title: "Living Worthy of the Gospel", theme: "consistent Christian living" },
  { ref: "Philippians 2:3-4", text: "Let nothing be done through strife or vainglory; but in lowliness of mind let each esteem other better than themselves. Look not every man on his own things, but every man also on the things of others.", title: "Humility in Action", theme: "selfless humility" },
  { ref: "Philippians 2:5-7", text: "Let this mind be in you, which was also in Christ Jesus: Who, being in the form of God, thought it not robbery to be equal with God: But made himself of no reputation.", title: "The Mind of Christ Jesus", theme: "Christ's humility" },
  { ref: "Philippians 2:9-11", text: "Wherefore God also hath highly exalted him, and given him a name which is above every name: That at the name of Jesus every knee should bow.", title: "The Name Above All Names", theme: "exaltation of Christ" },
  { ref: "Philippians 2:13", text: "For it is God which worketh in you both to will and to do of his good pleasure.", title: "God Works In You", theme: "divine empowerment" },
  { ref: "Philippians 2:14-15", text: "Do all things without murmurings and disputings: That ye may be blameless and harmless, the sons of God, without rebuke, in the midst of a crooked and perverse nation, among whom ye shine as lights in the world.", title: "Shining as Lights", theme: "being a witness" },
  { ref: "Philippians 3:7-8", text: "But what things were gain to me, those I counted loss for Christ. Yea doubtless, and I count all things but loss for the excellency of the knowledge of Christ Jesus my Lord.", title: "Counting All Things Loss", theme: "supreme value of knowing Christ" },
  { ref: "Philippians 3:10", text: "That I may know him, and the power of his resurrection, and the fellowship of his sufferings, being made conformable unto his death.", title: "Knowing Him and His Power", theme: "intimate knowledge of Christ" },
  { ref: "Philippians 3:12-14", text: "Not as though I had already attained, either were already perfect: but I follow after. I press toward the mark for the prize of the high calling of God in Christ Jesus.", title: "Pressing Toward the Prize", theme: "perseverance" },
  { ref: "Philippians 3:20", text: "For our conversation is in heaven; from whence also we look for the Saviour, the Lord Jesus Christ.", title: "Our Citizenship Is in Heaven", theme: "heavenly citizenship" },
  { ref: "Philippians 4:4", text: "Rejoice in the Lord alway: and again I say, Rejoice.", title: "Rejoice Always", theme: "constant joy" },
  { ref: "Philippians 4:5-6", text: "Let your moderation be known unto all men. The Lord is at hand. Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.", title: "Be Anxious for Nothing", theme: "freedom from anxiety" },
  { ref: "Philippians 4:7", text: "And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.", title: "Peace That Surpasses Understanding", theme: "supernatural peace" },
  { ref: "Philippians 4:8", text: "Finally, brethren, whatsoever things are true, whatsoever things are honest, whatsoever things are just, whatsoever things are pure, whatsoever things are lovely, whatsoever things are of good report; if there be any virtue, and if there be any praise, think on these things.", title: "Think on These Things", theme: "guarding thoughts" },
  { ref: "Philippians 4:11-12", text: "Not that I speak in respect of want: for I have learned, in whatsoever state I am, therewith to be content. I know both how to be abased, and I know how to abound.", title: "The Secret of Contentment", theme: "contentment" },
  { ref: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me.", title: "All Things Through Christ", theme: "divine strength" },
  { ref: "Philippians 4:19", text: "But my God shall supply all your need according to his riches in glory by Christ Jesus.", title: "All Your Needs Supplied", theme: "divine provision" },
  { ref: "Philippians 1:3-4", text: "I thank my God upon every remembrance of you, Always in every prayer of mine for you all making request with joy.", title: "Thankfulness in Fellowship", theme: "gratitude and community" },
  { ref: "Philippians 1:29", text: "For unto you it is given in the behalf of Christ, not only to believe on him, but also to suffer for his sake.", title: "The Privilege of Faith", theme: "faith as a gift" },
  { ref: "Philippians 2:1-2", text: "If there be therefore any consolation in Christ, if any comfort of love, if any fellowship of the Spirit, if any bowels and mercies, Fulfil ye my joy, that ye be likeminded, having the same love, being of one accord, of one mind.", title: "United in Spirit", theme: "unity in Christ" },
  { ref: "Philippians 2:15-16", text: "That ye may be blameless and harmless, the sons of God, without rebuke, in the midst of a crooked and perverse nation, among whom ye shine as lights in the world; Holding forth the word of life.", title: "Holding Forth the Word of Life", theme: "witnessing through life" },
  { ref: "Philippians 3:3", text: "For we are the circumcision, which worship God in the spirit, and rejoice in Christ Jesus, and have no confidence in the flesh.", title: "Worship in Spirit", theme: "true worship" },
  { ref: "Philippians 3:8-9", text: "Yea doubtless, and I count all things but loss for the excellency of the knowledge of Christ Jesus my Lord: for whom I have suffered the loss of all things, and do count them but dung, that I may win Christ, And be found in him.", title: "Found in Christ", theme: "identity in Christ" },
  { ref: "Philippians 3:13-14", text: "Brethren, I count not myself to have apprehended: but this one thing I do, forgetting those things which are behind, and reaching forth unto those things which are before, I press toward the mark.", title: "Forgetting What Is Behind", theme: "forward focus" },
  { ref: "Philippians 4:1", text: "Therefore, my brethren dearly beloved and longed for, my joy and crown, so stand fast in the Lord, my dearly beloved.", title: "Stand Fast in the Lord", theme: "steadfastness" },
  { ref: "Philippians 4:9", text: "Those things, which ye have both learned, and received, and heard, and seen in me, do: and the God of peace shall be with you.", title: "The God of Peace Is with You", theme: "practicing what you learn" },
  { ref: "Philippians 2:10-11", text: "That at the name of Jesus every knee should bow, of things in heaven, and things in earth, and things under the earth; And that every tongue should confess that Jesus Christ is Lord, to the glory of God the Father.", title: "Every Knee Shall Bow", theme: "lordship of Christ" },
  { ref: "Philippians 1:10-11", text: "That ye may approve things that are excellent; that ye may be sincere and without offence till the day of Christ; Being filled with the fruits of righteousness, which are by Jesus Christ, unto the glory and praise of God.", title: "Filled with Fruits of Righteousness", theme: "bearing fruit" },
  { ref: "Philippians 1:20", text: "According to my earnest expectation and my hope, that in nothing I shall be ashamed, but that with all boldness, as always, so now also Christ shall be magnified in my body, whether it be by life, or by death.", title: "Magnifying Christ in Our Bodies", theme: "bold witness" },
  { ref: "Philippians 2:12", text: "Wherefore, my beloved, as ye have always obeyed, not as in my presence only, but now much more in my absence, work out your own salvation with fear and trembling.", title: "Working Out Your Salvation", theme: "active faith" },
  { ref: "Philippians 3:1", text: "Finally, my brethren, rejoice in the Lord. To write the same things to you, to me indeed is not grievous, but for you it is safe.", title: "Rejoicing Is Safe Ground", theme: "safety in joy" },
  { ref: "Philippians 4:2-3", text: "I beseech Euodias, and beseech Syntyche, that they be of the same mind in the Lord. And I intreat thee also, true yokefellow, help those women which laboured with me in the gospel.", title: "Unity Among Believers", theme: "reconciliation" },
  { ref: "Philippians 4:14", text: "Notwithstanding ye have well done, that ye did communicate with my affliction.", title: "Sharing in Each Other's Struggles", theme: "compassion" },
  { ref: "Philippians 2:16", text: "Holding forth the word of life; that I may rejoice in the day of Christ, that I have not run in vain, neither laboured in vain.", title: "Running Not in Vain", theme: "purposeful labor" },
  { ref: "Philippians 1:18", text: "What then? notwithstanding, every way, whether in pretence, or in truth, Christ is preached; and I therein do rejoice, yea, and will rejoice.", title: "Rejoicing When Christ Is Preached", theme: "joy in gospel proclamation" },
  { ref: "Philippians 3:15", text: "Let us therefore, as many as be perfect, be thus minded: and if in any thing ye be otherwise minded, God shall reveal even this unto you.", title: "God Will Reveal What You Need", theme: "divine revelation" },
  { ref: "Philippians 3:21", text: "Who shall change our vile body, that it may be fashioned like unto his glorious body, according to the working whereby he is able even to subdue all things unto himself.", title: "Transformed by His Power", theme: "future transformation" },
  { ref: "Philippians 4:17", text: "Not because I desire a gift: but I desire fruit that may abound to your account.", title: "Fruit That Abounds", theme: "spiritual fruitfulness" },
  { ref: "Philippians 4:20", text: "Now unto God and our Father be glory for ever and ever. Amen.", title: "Glory to God Forever", theme: "eternal praise" },
  { ref: "Philippians 2:8", text: "And being found in fashion as a man, he humbled himself, and became obedient unto death, even the death of the cross.", title: "Obedient Unto Death", theme: "Christ's obedience" },
  { ref: "Philippians 1:25", text: "And having this confidence, I know that I shall abide and continue with you all for your furtherance and joy of faith.", title: "Confidence for the Journey", theme: "holy confidence" },
];

const colossiansPassages: PassageData[] = [
  { ref: "Colossians 1:9-10", text: "For this cause we also, since the day we heard it, do not cease to pray for you, and to desire that ye might be filled with the knowledge of his will in all wisdom and spiritual understanding; That ye might walk worthy of the Lord.", title: "Filled with Knowledge of His Will", theme: "knowing God's will" },
  { ref: "Colossians 1:11", text: "Strengthened with all might, according to his glorious power, unto all patience and longsuffering with joyfulness.", title: "Strengthened with Glorious Power", theme: "divine empowerment" },
  { ref: "Colossians 1:13-14", text: "Who hath delivered us from the power of darkness, and hath translated us into the kingdom of his dear Son: In whom we have redemption through his blood, even the forgiveness of sins.", title: "Delivered from Darkness", theme: "deliverance and redemption" },
  { ref: "Colossians 1:15-17", text: "Who is the image of the invisible God, the firstborn of every creature: For by him were all things created. And he is before all things, and by him all things consist.", title: "The Supremacy of Christ", theme: "Christ above all" },
  { ref: "Colossians 1:18", text: "And he is the head of the body, the church: who is the beginning, the firstborn from the dead; that in all things he might have the preeminence.", title: "Christ Has Preeminence", theme: "Christ first in all" },
  { ref: "Colossians 1:27", text: "To whom God would make known what is the riches of the glory of this mystery among the Gentiles; which is Christ in you, the hope of glory.", title: "Christ in You, the Hope of Glory", theme: "Christ dwelling within" },
  { ref: "Colossians 2:2-3", text: "That their hearts might be comforted, being knit together in love, and unto all riches of the full assurance of understanding, to the acknowledgement of the mystery of God, and of the Father, and of Christ; In whom are hid all the treasures of wisdom and knowledge.", title: "Hidden Treasures of Wisdom", theme: "wisdom in Christ" },
  { ref: "Colossians 2:6-7", text: "As ye have therefore received Christ Jesus the Lord, so walk ye in him: Rooted and built up in him, and stablished in the faith, as ye have been taught, abounding therein with thanksgiving.", title: "Rooted and Built Up in Him", theme: "being grounded in Christ" },
  { ref: "Colossians 2:9-10", text: "For in him dwelleth all the fulness of the Godhead bodily. And ye are complete in him, which is the head of all principality and power.", title: "Complete in Christ", theme: "completeness in Christ" },
  { ref: "Colossians 2:13-14", text: "And you, being dead in your sins and the uncircumcision of your flesh, hath he quickened together with him, having forgiven you all trespasses; Blotting out the handwriting of ordinances that was against us.", title: "All Trespasses Forgiven", theme: "total forgiveness" },
  { ref: "Colossians 2:15", text: "And having spoiled principalities and powers, he made a shew of them openly, triumphing over them in it.", title: "Triumph Over Principalities", theme: "spiritual victory" },
  { ref: "Colossians 3:1-2", text: "If ye then be risen with Christ, seek those things which are above, where Christ sitteth on the right hand of God. Set your affection on things above, not on things on the earth.", title: "Set Your Mind on Things Above", theme: "heavenly perspective" },
  { ref: "Colossians 3:3-4", text: "For ye are dead, and your life is hid with Christ in God. When Christ, who is our life, shall appear, then shall ye also appear with him in glory.", title: "Your Life Hidden with Christ", theme: "security in Christ" },
  { ref: "Colossians 3:9-10", text: "Lie not one to another, seeing that ye have put off the old man with his deeds; And have put on the new man, which is renewed in knowledge after the image of him that created him.", title: "Renewed in His Image", theme: "spiritual transformation" },
  { ref: "Colossians 3:12-13", text: "Put on therefore, as the elect of God, holy and beloved, bowels of mercies, kindness, humbleness of mind, meekness, longsuffering; Forbearing one another, and forgiving one another.", title: "Clothed in Compassion", theme: "Christian character" },
  { ref: "Colossians 3:14", text: "And above all these things put on charity, which is the bond of perfectness.", title: "Love Binds Everything Together", theme: "love as the bond" },
  { ref: "Colossians 3:15", text: "And let the peace of God rule in your hearts, to the which also ye are called in one body; and be ye thankful.", title: "Let Peace Rule Your Heart", theme: "peace and thankfulness" },
  { ref: "Colossians 3:16", text: "Let the word of Christ dwell in you richly in all wisdom; teaching and admonishing one another in psalms and hymns and spiritual songs, singing with grace in your hearts to the Lord.", title: "The Word Dwelling Richly", theme: "Scripture-filled living" },
  { ref: "Colossians 3:17", text: "And whatsoever ye do in word or deed, do all in the name of the Lord Jesus, giving thanks to God and the Father by him.", title: "Do All in His Name", theme: "Christ-centered living" },
  { ref: "Colossians 3:23-24", text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men; Knowing that of the Lord ye shall receive the reward of the inheritance: for ye serve the Lord Christ.", title: "Work Heartily for the Lord", theme: "diligent service" },
  { ref: "Colossians 4:2", text: "Continue in prayer, and watch in the same with thanksgiving.", title: "Devoted to Prayer", theme: "persistent prayer" },
  { ref: "Colossians 4:5-6", text: "Walk in wisdom toward them that are without, redeeming the time. Let your speech be alway with grace, seasoned with salt, that ye may know how ye ought to answer every man.", title: "Gracious Speech", theme: "wisdom in words" },
  { ref: "Colossians 1:3-4", text: "We give thanks to God and the Father of our Lord Jesus Christ, praying always for you, Since we heard of your faith in Christ Jesus, and of the love which ye have to all the saints.", title: "Faith and Love Heard Abroad", theme: "visible faith" },
  { ref: "Colossians 1:5-6", text: "For the hope which is laid up for you in heaven, whereof ye heard before in the word of the truth of the gospel; Which is come unto you, as it is in all the world; and bringeth forth fruit.", title: "Hope Laid Up in Heaven", theme: "heavenly hope" },
  { ref: "Colossians 1:12", text: "Giving thanks unto the Father, which hath made us meet to be partakers of the inheritance of the saints in light.", title: "Partakers of the Inheritance", theme: "divine inheritance" },
  { ref: "Colossians 1:19-20", text: "For it pleased the Father that in him should all fulness dwell; And, having made peace through the blood of his cross, by him to reconcile all things unto himself.", title: "Peace Through the Blood", theme: "reconciliation through Christ" },
  { ref: "Colossians 1:22-23", text: "In the body of his flesh through death, to present you holy and unblameable and unreproveable in his sight: If ye continue in the faith grounded and settled, and be not moved away from the hope of the gospel.", title: "Presented Holy Before God", theme: "standing firm in faith" },
  { ref: "Colossians 1:28-29", text: "Whom we preach, warning every man, and teaching every man in all wisdom; that we may present every man perfect in Christ Jesus: Whereunto I also labour, striving according to his working, which worketh in me mightily.", title: "Mature in Christ", theme: "growing to maturity" },
  { ref: "Colossians 2:8", text: "Beware lest any man spoil you through philosophy and vain deceit, after the tradition of men, after the rudiments of the world, and not after Christ.", title: "Beware of Empty Philosophies", theme: "discernment" },
  { ref: "Colossians 2:12", text: "Buried with him in baptism, wherein also ye are risen with him through the faith of the operation of God, who hath raised him from the dead.", title: "Risen with Christ", theme: "resurrection life" },
  { ref: "Colossians 3:5", text: "Mortify therefore your members which are upon the earth; fornication, uncleanness, inordinate affection, evil concupiscence, and covetousness, which is idolatry.", title: "Putting Sin to Death", theme: "holy living" },
  { ref: "Colossians 3:8", text: "But now ye also put off all these; anger, wrath, malice, blasphemy, filthy communication out of your mouth.", title: "Putting Off the Old Ways", theme: "moral transformation" },
  { ref: "Colossians 3:11", text: "Where there is neither Greek nor Jew, circumcision nor uncircumcision, Barbarian, Scythian, bond nor free: but Christ is all, and in all.", title: "Christ Is All and in All", theme: "unity in Christ" },
  { ref: "Colossians 3:20", text: "Children, obey your parents in all things: for this is well pleasing unto the Lord.", title: "Honoring Family Relationships", theme: "family honor" },
  { ref: "Colossians 4:3", text: "Withal praying also for us, that God would open unto us a door of utterance, to speak the mystery of Christ.", title: "Open Doors for the Gospel", theme: "evangelism opportunities" },
  { ref: "Colossians 1:16", text: "For by him were all things created, that are in heaven, and that are in earth, visible and invisible, whether they be thrones, or dominions, or principalities, or powers: all things were created by him, and for him.", title: "All Things Created by Him", theme: "Christ the Creator" },
  { ref: "Colossians 2:3", text: "In whom are hid all the treasures of wisdom and knowledge.", title: "All Treasures in Christ", theme: "sufficiency of Christ" },
  { ref: "Colossians 2:20", text: "Wherefore if ye be dead with Christ from the rudiments of the world, why, as though living in the world, are ye subject to ordinances?", title: "Freedom from Worldly Rules", theme: "freedom in Christ" },
  { ref: "Colossians 3:2", text: "Set your affection on things above, not on things on the earth.", title: "Affections Set Above", theme: "eternal focus" },
  { ref: "Colossians 3:25", text: "But he that doeth wrong shall receive for the wrong which he hath done: and there is no respect of persons.", title: "God Shows No Partiality", theme: "divine justice" },
  { ref: "Colossians 1:10", text: "That ye might walk worthy of the Lord unto all pleasing, being fruitful in every good work, and increasing in the knowledge of God.", title: "Fruitful in Every Good Work", theme: "fruitful living" },
  { ref: "Colossians 2:19", text: "And not holding the Head, from which all the body by joints and bands having nourishment ministered, and knit together, increaseth with the increase of God.", title: "Connected to the Head", theme: "Christ the source" },
  { ref: "Colossians 4:1", text: "Masters, give unto your servants that which is just and equal; knowing that ye also have a Master in heaven.", title: "Justice and Equity", theme: "fairness before God" },
  { ref: "Colossians 3:16-17", text: "Let the word of Christ dwell in you richly in all wisdom; teaching and admonishing one another. And whatsoever ye do in word or deed, do all in the name of the Lord Jesus.", title: "Living the Word Daily", theme: "Scripture application" },
  { ref: "Colossians 4:6", text: "Let your speech be alway with grace, seasoned with salt, that ye may know how ye ought to answer every man.", title: "Words Seasoned with Grace", theme: "gracious communication" },
];

const galatiansPassages: PassageData[] = [
  { ref: "Galatians 1:10", text: "For do I now persuade men, or God? or do I seek to please men? for if I yet pleased men, I should not be the servant of Christ.", title: "Pleasing God Not Men", theme: "living for God's approval" },
  { ref: "Galatians 1:15-16", text: "But when it pleased God, who separated me from my mother's womb, and called me by his grace, To reveal his Son in me, that I might preach him among the heathen.", title: "Called by His Grace", theme: "divine calling" },
  { ref: "Galatians 2:16", text: "Knowing that a man is not justified by the works of the law, but by the faith of Jesus Christ.", title: "Justified by Faith Alone", theme: "faith vs works" },
  { ref: "Galatians 2:20", text: "I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.", title: "Crucified with Christ", theme: "death to self" },
  { ref: "Galatians 3:13-14", text: "Christ hath redeemed us from the curse of the law, being made a curse for us: That the blessing of Abraham might come on the Gentiles through Jesus Christ.", title: "Redeemed from the Curse", theme: "redemption from curses" },
  { ref: "Galatians 3:26-27", text: "For ye are all the children of God by faith in Christ Jesus. For as many of you as have been baptized into Christ have put on Christ.", title: "Children of God Through Faith", theme: "identity as God's children" },
  { ref: "Galatians 3:28", text: "There is neither Jew nor Greek, there is neither bond nor free, there is neither male nor female: for ye are all one in Christ Jesus.", title: "All One in Christ", theme: "equality in Christ" },
  { ref: "Galatians 3:29", text: "And if ye be Christ's, then are ye Abraham's seed, and heirs according to the promise.", title: "Heirs According to the Promise", theme: "spiritual inheritance" },
  { ref: "Galatians 4:4-5", text: "But when the fulness of the time was come, God sent forth his Son, made of a woman, made under the law, To redeem them that were under the law, that we might receive the adoption of sons.", title: "Adopted as Sons", theme: "adoption" },
  { ref: "Galatians 4:6-7", text: "And because ye are sons, God hath sent forth the Spirit of his Son into your hearts, crying, Abba, Father. Wherefore thou art no more a servant, but a son; and if a son, then an heir of God through Christ.", title: "No Longer Servants but Sons", theme: "sonship" },
  { ref: "Galatians 5:1", text: "Stand fast therefore in the liberty wherewith Christ hath made us free, and be not entangled again with the yoke of bondage.", title: "Stand Fast in Freedom", theme: "freedom in Christ" },
  { ref: "Galatians 5:5-6", text: "For we through the Spirit wait for the hope of righteousness by faith. For in Jesus Christ neither circumcision availeth any thing, nor uncircumcision; but faith which worketh by love.", title: "Faith Working Through Love", theme: "active faith" },
  { ref: "Galatians 5:13", text: "For, brethren, ye have been called unto liberty; only use not liberty for an occasion to the flesh, but by love serve one another.", title: "Freedom to Serve in Love", theme: "serving others" },
  { ref: "Galatians 5:16", text: "This I say then, Walk in the Spirit, and ye shall not fulfil the lust of the flesh.", title: "Walk in the Spirit", theme: "Spirit-led living" },
  { ref: "Galatians 5:22-23", text: "But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith, Meekness, temperance: against such there is no law.", title: "The Fruit of the Spirit", theme: "spiritual fruit" },
  { ref: "Galatians 5:24-25", text: "And they that are Christ's have crucified the flesh with the affections and lusts. If we live in the Spirit, let us also walk in the Spirit.", title: "Living and Walking by the Spirit", theme: "crucifying the flesh" },
  { ref: "Galatians 6:1", text: "Brethren, if a man be overtaken in a fault, ye which are spiritual, restore such an one in the spirit of meekness; considering thyself, lest thou also be tempted.", title: "Restoring One Another Gently", theme: "gentle restoration" },
  { ref: "Galatians 6:2", text: "Bear ye one another's burdens, and so fulfil the law of Christ.", title: "Bearing One Another's Burdens", theme: "mutual support" },
  { ref: "Galatians 6:7-8", text: "Be not deceived; God is not mocked: for whatsoever a man soweth, that shall he also reap. For he that soweth to his flesh shall of the flesh reap corruption; but he that soweth to the Spirit shall of the Spirit reap life everlasting.", title: "Sowing and Reaping", theme: "spiritual sowing" },
  { ref: "Galatians 6:9", text: "And let us not be weary in well doing: for in due season we shall reap, if we faint not.", title: "Do Not Grow Weary", theme: "perseverance in good" },
  { ref: "Galatians 6:10", text: "As we have therefore opportunity, let us do good unto all men, especially unto them who are of the household of faith.", title: "Doing Good to All", theme: "generosity" },
  { ref: "Galatians 6:14", text: "But God forbid that I should glory, save in the cross of our Lord Jesus Christ, by whom the world is crucified unto me, and I unto the world.", title: "Boasting Only in the Cross", theme: "glory in the cross" },
  { ref: "Galatians 3:5", text: "He therefore that ministereth to you the Spirit, and worketh miracles among you, doeth he it by the works of the law, or by the hearing of faith?", title: "Miracles Through Faith", theme: "faith activates miracles" },
  { ref: "Galatians 3:9", text: "So then they which be of faith are blessed with faithful Abraham.", title: "Blessed with Abraham", theme: "Abrahamic blessing" },
  { ref: "Galatians 3:11", text: "But that no man is justified by the law in the sight of God, it is evident: for, The just shall live by faith.", title: "Living by Faith", theme: "faith as lifestyle" },
  { ref: "Galatians 3:22", text: "But the scripture hath concluded all under sin, that the promise by faith of Jesus Christ might be given to them that believe.", title: "The Promise Given to Believers", theme: "promise through faith" },
  { ref: "Galatians 4:9", text: "But now, after that ye have known God, or rather are known of God, how turn ye again to the weak and beggarly elements, whereunto ye desire again to be in bondage?", title: "Known by God", theme: "God knows you" },
  { ref: "Galatians 4:28", text: "Now we, brethren, as Isaac was, are the children of promise.", title: "Children of Promise", theme: "covenant children" },
  { ref: "Galatians 5:6", text: "For in Jesus Christ neither circumcision availeth any thing, nor uncircumcision; but faith which worketh by love.", title: "Faith Expressed Through Love", theme: "love-driven faith" },
  { ref: "Galatians 5:14", text: "For all the law is fulfilled in one word, even in this; Thou shalt love thy neighbour as thyself.", title: "Love Fulfills the Law", theme: "the law of love" },
  { ref: "Galatians 5:17", text: "For the flesh lusteth against the Spirit, and the Spirit against the flesh: and these are contrary the one to the other: so that ye cannot do the things that ye would.", title: "The Battle Within", theme: "spiritual warfare within" },
  { ref: "Galatians 5:18", text: "But if ye be led of the Spirit, ye are not under the law.", title: "Led by the Spirit, Free from Law", theme: "Spirit-led freedom" },
  { ref: "Galatians 6:3", text: "For if a man think himself to be something, when he is nothing, he deceiveth himself.", title: "True Self-Assessment", theme: "honest humility" },
  { ref: "Galatians 6:4", text: "But let every man prove his own work, and then shall he have rejoicing in himself alone, and not in another.", title: "Testing Your Own Work", theme: "personal accountability" },
  { ref: "Galatians 6:15", text: "For in Christ Jesus neither circumcision availeth any thing, nor uncircumcision, but a new creature.", title: "A New Creation", theme: "new creation reality" },
  { ref: "Galatians 1:3-4", text: "Grace be to you and peace from God the Father, and from our Lord Jesus Christ, Who gave himself for our sins, that he might deliver us from this present evil world.", title: "Delivered from This Present Evil", theme: "deliverance" },
  { ref: "Galatians 2:21", text: "I do not frustrate the grace of God: for if righteousness come by the law, then Christ is dead in vain.", title: "Not Frustrating God's Grace", theme: "embracing grace" },
  { ref: "Galatians 3:2", text: "This only would I learn of you, Received ye the Spirit by the works of the law, or by the hearing of faith?", title: "Receiving the Spirit by Faith", theme: "Spirit received through faith" },
  { ref: "Galatians 4:19", text: "My little children, of whom I travail in birth again until Christ be formed in you.", title: "Christ Formed in You", theme: "Christ-likeness" },
  { ref: "Galatians 5:25", text: "If we live in the Spirit, let us also walk in the Spirit.", title: "Walk as You Live", theme: "consistent spiritual walk" },
  { ref: "Galatians 5:26", text: "Let us not be desirous of vain glory, provoking one another, envying one another.", title: "Free from Envy and Pride", theme: "humility over pride" },
  { ref: "Galatians 6:5", text: "For every man shall bear his own burden.", title: "Personal Responsibility Before God", theme: "individual accountability" },
  { ref: "Galatians 6:6", text: "Let him that is taught in the word communicate unto him that teacheth in all good things.", title: "Supporting Those Who Teach", theme: "honoring teachers" },
  { ref: "Galatians 6:17", text: "From henceforth let no man trouble me: for I bear in my body the marks of the Lord Jesus.", title: "Bearing the Marks of Jesus", theme: "sacrifice for Christ" },
  { ref: "Galatians 6:18", text: "Brethren, the grace of our Lord Jesus Christ be with your spirit. Amen.", title: "Grace Be with Your Spirit", theme: "grace benediction" },
];

const hebrewsPassages: PassageData[] = [
  { ref: "Hebrews 1:1-2", text: "God, who at sundry times and in divers manners spake in time past unto the fathers by the prophets, Hath in these last days spoken unto us by his Son.", title: "God Speaks Through His Son", theme: "revelation through Christ" },
  { ref: "Hebrews 1:3", text: "Who being the brightness of his glory, and the express image of his person, and upholding all things by the word of his power.", title: "The Brightness of God's Glory", theme: "Christ's majesty" },
  { ref: "Hebrews 2:9", text: "But we see Jesus, who was made a little lower than the angels for the suffering of death, crowned with glory and honour.", title: "Jesus Crowned with Glory", theme: "Christ's exaltation" },
  { ref: "Hebrews 2:14-15", text: "Forasmuch then as the children are partakers of flesh and blood, he also himself likewise took part of the same; that through death he might destroy him that had the power of death, that is, the devil; And deliver them who through fear of death were all their lifetime subject to bondage.", title: "Freedom from the Fear of Death", theme: "victory over death" },
  { ref: "Hebrews 2:18", text: "For in that he himself hath suffered being tempted, he is able to succour them that are tempted.", title: "He Understands Our Temptations", theme: "Christ's empathy" },
  { ref: "Hebrews 3:4", text: "For every house is builded by some man; but he that built all things is God.", title: "God the Master Builder", theme: "God's creative power" },
  { ref: "Hebrews 3:6", text: "But Christ as a son over his own house; whose house are we, if we hold fast the confidence and the rejoicing of the hope firm unto the end.", title: "Hold Fast Your Confidence", theme: "confidence in Christ" },
  { ref: "Hebrews 3:12-14", text: "Take heed, brethren, lest there be in any of you an evil heart of unbelief, in departing from the living God. But exhort one another daily. For we are made partakers of Christ, if we hold the beginning of our confidence stedfast unto the end.", title: "Guard Against Unbelief", theme: "persevering faith" },
  { ref: "Hebrews 4:9-10", text: "There remaineth therefore a rest to the people of God. For he that is entered into his rest, he also hath ceased from his own works, as God did from his.", title: "Entering God's Rest", theme: "spiritual rest" },
  { ref: "Hebrews 4:12", text: "For the word of God is quick, and powerful, and sharper than any twoedged sword, piercing even to the dividing asunder of soul and spirit.", title: "The Living Word of God", theme: "power of Scripture" },
  { ref: "Hebrews 4:14-15", text: "Seeing then that we have a great high priest, that is passed into the heavens, Jesus the Son of God, let us hold fast our profession. For we have not an high priest which cannot be touched with the feeling of our infirmities.", title: "Our Great High Priest", theme: "Christ our intercessor" },
  { ref: "Hebrews 4:16", text: "Let us therefore come boldly unto the throne of grace, that we may obtain mercy, and find grace to help in time of need.", title: "Bold Access to the Throne", theme: "boldness in prayer" },
  { ref: "Hebrews 6:10", text: "For God is not unrighteous to forget your work and labour of love, which ye have shewed toward his name.", title: "God Does Not Forget Your Work", theme: "rewarded labor" },
  { ref: "Hebrews 6:12", text: "That ye be not slothful, but followers of them who through faith and patience inherit the promises.", title: "Faith and Patience Inherit Promises", theme: "patient inheritance" },
  { ref: "Hebrews 6:17-18", text: "Wherein God, willing more abundantly to shew unto the heirs of promise the immutability of his counsel, confirmed it by an oath: That by two immutable things, in which it was impossible for God to lie, we might have a strong consolation.", title: "God Cannot Lie", theme: "God's unchangeable promise" },
  { ref: "Hebrews 6:19", text: "Which hope we have as an anchor of the soul, both sure and stedfast, and which entereth into that within the veil.", title: "Hope as an Anchor", theme: "anchored hope" },
  { ref: "Hebrews 7:25", text: "Wherefore he is able also to save them to the uttermost that come unto God by him, seeing he ever liveth to make intercession for them.", title: "Saved to the Uttermost", theme: "complete salvation" },
  { ref: "Hebrews 8:6", text: "But now hath he obtained a more excellent ministry, by how much also he is the mediator of a better covenant, which was established upon better promises.", title: "A Better Covenant", theme: "new covenant blessings" },
  { ref: "Hebrews 9:14", text: "How much more shall the blood of Christ, who through the eternal Spirit offered himself without spot to God, purge your conscience from dead works to serve the living God?", title: "A Purified Conscience", theme: "cleansed conscience" },
  { ref: "Hebrews 9:22", text: "And almost all things are by the law purged with blood; and without shedding of blood is no remission.", title: "The Power of the Blood", theme: "blood covenant" },
  { ref: "Hebrews 10:10", text: "By the which will we are sanctified through the offering of the body of Jesus Christ once for all.", title: "Sanctified Once for All", theme: "complete sanctification" },
  { ref: "Hebrews 10:19-20", text: "Having therefore, brethren, boldness to enter into the holiest by the blood of Jesus, By a new and living way, which he hath consecrated for us, through the veil, that is to say, his flesh.", title: "A New and Living Way", theme: "bold access to God" },
  { ref: "Hebrews 10:22-23", text: "Let us draw near with a true heart in full assurance of faith, having our hearts sprinkled from an evil conscience. Let us hold fast the profession of our faith without wavering; for he is faithful that promised.", title: "Full Assurance of Faith", theme: "unwavering confession" },
  { ref: "Hebrews 10:35-36", text: "Cast not away therefore your confidence, which hath great recompence of reward. For ye have need of patience, that, after ye have done the will of God, ye might receive the promise.", title: "Do Not Throw Away Your Confidence", theme: "patient confidence" },
  { ref: "Hebrews 11:1", text: "Now faith is the substance of things hoped for, the evidence of things not seen.", title: "The Substance of Faith", theme: "definition of faith" },
  { ref: "Hebrews 11:3", text: "Through faith we understand that the worlds were framed by the word of God, so that things which are seen were not made of things which do appear.", title: "Worlds Framed by God's Word", theme: "creative faith" },
  { ref: "Hebrews 11:6", text: "But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.", title: "Faith That Pleases God", theme: "pleasing God through faith" },
  { ref: "Hebrews 11:8", text: "By faith Abraham, when he was called to go out into a place which he should after receive for an inheritance, obeyed; and he went out, not knowing whither he went.", title: "Faith to Step Into the Unknown", theme: "obedient faith" },
  { ref: "Hebrews 11:11", text: "Through faith also Sara herself received strength to conceive seed, and was delivered of a child when she was past age, because she judged him faithful who had promised.", title: "Strength Through Faith", theme: "faith for the impossible" },
  { ref: "Hebrews 11:24-26", text: "By faith Moses, when he was come to years, refused to be called the son of Pharaoh's daughter; Choosing rather to suffer affliction with the people of God, than to enjoy the pleasures of sin for a season; Esteeming the reproach of Christ greater riches than the treasures in Egypt.", title: "Choosing God Over the World", theme: "costly faith" },
  { ref: "Hebrews 11:33-34", text: "Who through faith subdued kingdoms, wrought righteousness, obtained promises, stopped the mouths of lions, Quenched the violence of fire, escaped the edge of the sword, out of weakness were made strong.", title: "Heroes of Faith", theme: "faith conquers" },
  { ref: "Hebrews 12:1", text: "Wherefore seeing we also are compassed about with so great a cloud of witnesses, let us lay aside every weight, and the sin which doth so easily beset us, and let us run with patience the race that is set before us.", title: "Running the Race", theme: "perseverance" },
  { ref: "Hebrews 12:2", text: "Looking unto Jesus the author and finisher of our faith; who for the joy that was set before him endured the cross, despising the shame, and is set down at the right hand of the throne of God.", title: "Jesus the Author and Finisher", theme: "eyes on Jesus" },
  { ref: "Hebrews 12:5-6", text: "My son, despise not thou the chastening of the Lord, nor faint when thou art rebuked of him: For whom the Lord loveth he chasteneth.", title: "The Father's Loving Discipline", theme: "divine discipline" },
  { ref: "Hebrews 12:7", text: "If ye endure chastening, God dealeth with you as with sons; for what son is he whom the father chasteneth not?", title: "Enduring Discipline as Sons", theme: "sonship through discipline" },
  { ref: "Hebrews 12:11", text: "Now no chastening for the present seemeth to be joyous, but grievous: nevertheless afterward it yieldeth the peaceable fruit of righteousness unto them which are exercised thereby.", title: "The Peaceful Fruit of Righteousness", theme: "fruit of discipline" },
  { ref: "Hebrews 12:14", text: "Follow peace with all men, and holiness, without which no man shall see the Lord.", title: "Pursuing Peace and Holiness", theme: "holy living" },
  { ref: "Hebrews 12:28-29", text: "Wherefore we receiving a kingdom which cannot be moved, let us have grace, whereby we may serve God acceptably with reverence and godly fear: For our God is a consuming fire.", title: "An Unshakeable Kingdom", theme: "kingdom stability" },
  { ref: "Hebrews 13:5-6", text: "Let your conversation be without covetousness; and be content with such things as ye have: for he hath said, I will never leave thee, nor forsake thee. So that we may boldly say, The Lord is my helper, and I will not fear what man shall do unto me.", title: "He Will Never Leave You", theme: "God's faithfulness" },
  { ref: "Hebrews 13:8", text: "Jesus Christ the same yesterday, and to day, and for ever.", title: "The Unchanging Christ", theme: "Christ's constancy" },
  { ref: "Hebrews 13:15", text: "By him therefore let us offer the sacrifice of praise to God continually, that is, the fruit of our lips giving thanks to his name.", title: "The Sacrifice of Praise", theme: "continuous praise" },
  { ref: "Hebrews 13:20-21", text: "Now the God of peace, that brought again from the dead our Lord Jesus, that great shepherd of the sheep, through the blood of the everlasting covenant, Make you perfect in every good work to do his will.", title: "The God of Peace Equips You", theme: "divine equipping" },
  { ref: "Hebrews 10:24-25", text: "And let us consider one another to provoke unto love and to good works: Not forsaking the assembling of ourselves together.", title: "Stirring One Another to Love", theme: "fellowship and encouragement" },
  { ref: "Hebrews 2:1", text: "Therefore we ought to give the more earnest heed to the things which we have heard, lest at any time we should let them slip.", title: "Pay Careful Attention", theme: "attentiveness to truth" },
  { ref: "Hebrews 3:1", text: "Wherefore, holy brethren, partakers of the heavenly calling, consider the Apostle and High Priest of our profession, Christ Jesus.", title: "Consider Christ Jesus", theme: "fixing thoughts on Jesus" },
];

const firstPeterPassages: PassageData[] = [
  { ref: "1 Peter 1:3-4", text: "Blessed be the God and Father of our Lord Jesus Christ, which according to his abundant mercy hath begotten us again unto a lively hope by the resurrection of Jesus Christ from the dead, To an inheritance incorruptible, and undefiled, and that fadeth not away, reserved in heaven for you.", title: "A Living Hope", theme: "resurrection hope" },
  { ref: "1 Peter 1:5", text: "Who are kept by the power of God through faith unto salvation ready to be revealed in the last time.", title: "Kept by God's Power", theme: "divine protection" },
  { ref: "1 Peter 1:6-7", text: "Wherein ye greatly rejoice, though now for a season, if need be, ye are in heaviness through manifold temptations: That the trial of your faith, being much more precious than of gold that perisheth, though it be tried with fire, might be found unto praise and honour and glory.", title: "Faith More Precious Than Gold", theme: "tested faith" },
  { ref: "1 Peter 1:8-9", text: "Whom having not seen, ye love; in whom, though now ye see him not, yet believing, ye rejoice with joy unspeakable and full of glory: Receiving the end of your faith, even the salvation of your souls.", title: "Joy Unspeakable", theme: "transcendent joy" },
  { ref: "1 Peter 1:13", text: "Wherefore gird up the loins of your mind, be sober, and hope to the end for the grace that is to be brought unto you.", title: "Prepare Your Mind for Action", theme: "mental readiness" },
  { ref: "1 Peter 1:15-16", text: "But as he which hath called you is holy, so be ye holy in all manner of conversation; Because it is written, Be ye holy; for I am holy.", title: "Called to Holiness", theme: "holy living" },
  { ref: "1 Peter 1:18-19", text: "Forasmuch as ye know that ye were not redeemed with corruptible things, as silver and gold, but with the precious blood of Christ, as of a lamb without blemish and without spot.", title: "Redeemed by Precious Blood", theme: "the cost of redemption" },
  { ref: "1 Peter 1:23", text: "Being born again, not of corruptible seed, but of incorruptible, by the word of God, which liveth and abideth for ever.", title: "Born Again Through the Word", theme: "spiritual rebirth" },
  { ref: "1 Peter 2:2-3", text: "As newborn babes, desire the sincere milk of the word, that ye may grow thereby: If so be ye have tasted that the Lord is gracious.", title: "Craving the Pure Word", theme: "spiritual growth" },
  { ref: "1 Peter 2:4-5", text: "To whom coming, as unto a living stone, disallowed indeed of men, but chosen of God, and precious, Ye also, as lively stones, are built up a spiritual house, an holy priesthood.", title: "Living Stones", theme: "spiritual temple" },
  { ref: "1 Peter 2:9", text: "But ye are a chosen generation, a royal priesthood, an holy nation, a peculiar people; that ye should shew forth the praises of him who hath called you out of darkness into his marvellous light.", title: "A Chosen Generation", theme: "royal identity" },
  { ref: "1 Peter 2:11", text: "Dearly beloved, I beseech you as strangers and pilgrims, abstain from fleshly lusts, which war against the soul.", title: "Pilgrims in This World", theme: "holy abstinence" },
  { ref: "1 Peter 2:21", text: "For even hereunto were ye called: because Christ also suffered for us, leaving us an example, that ye should follow his steps.", title: "Following Christ's Example", theme: "imitating Christ" },
  { ref: "1 Peter 2:24", text: "Who his own self bare our sins in his own body on the tree, that we, being dead to sins, should live unto righteousness: by whose stripes ye were healed.", title: "By His Stripes You Are Healed", theme: "healing through the cross" },
  { ref: "1 Peter 3:3-4", text: "Whose adorning let it not be that outward adorning; But let it be the hidden man of the heart, in that which is not corruptible, even the ornament of a meek and quiet spirit, which is in the sight of God of great price.", title: "The Beauty of a Gentle Spirit", theme: "inner beauty" },
  { ref: "1 Peter 3:8-9", text: "Finally, be ye all of one mind, having compassion one of another, love as brethren, be pitiful, be courteous: Not rendering evil for evil, or railing for railing: but contrariwise blessing.", title: "Blessing Instead of Cursing", theme: "blessing others" },
  { ref: "1 Peter 3:12", text: "For the eyes of the Lord are over the righteous, and his ears are open unto their prayers: but the face of the Lord is against them that do evil.", title: "God's Eyes Are on You", theme: "God watches over the righteous" },
  { ref: "1 Peter 3:14-15", text: "But and if ye suffer for righteousness' sake, happy are ye: and be not afraid of their terror, neither be troubled; But sanctify the Lord God in your hearts: and be ready always to give an answer to every man that asketh you.", title: "Always Ready to Give an Answer", theme: "defense of faith" },
  { ref: "1 Peter 4:7-8", text: "But the end of all things is at hand: be ye therefore sober, and watch unto prayer. And above all things have fervent charity among yourselves: for charity shall cover the multitude of sins.", title: "Fervent Love Covers All", theme: "fervent love" },
  { ref: "1 Peter 4:10", text: "As every man hath received the gift, even so minister the same one to another, as good stewards of the manifold grace of God.", title: "Stewards of God's Grace", theme: "faithful stewardship" },
  { ref: "1 Peter 4:12-13", text: "Beloved, think it not strange concerning the fiery trial which is to try you, as though some strange thing happened unto you: But rejoice, inasmuch as ye are partakers of Christ's sufferings.", title: "Rejoicing in Fiery Trials", theme: "joy in suffering" },
  { ref: "1 Peter 4:14", text: "If ye be reproached for the name of Christ, happy are ye; for the spirit of glory and of God resteth upon you.", title: "The Spirit of Glory Rests on You", theme: "glory in reproach" },
  { ref: "1 Peter 5:2-3", text: "Feed the flock of God which is among you, taking the oversight thereof, not by constraint, but willingly; not for filthy lucre, but of a ready mind; Neither as being lords over God's heritage, but being ensamples to the flock.", title: "Shepherding God's Flock", theme: "servant leadership" },
  { ref: "1 Peter 5:5", text: "Likewise, ye younger, submit yourselves unto the elder. Yea, all of you be subject one to another, and be clothed with humility: for God resisteth the proud, and giveth grace to the humble.", title: "Clothed with Humility", theme: "humble submission" },
  { ref: "1 Peter 5:6-7", text: "Humble yourselves therefore under the mighty hand of God, that he may exalt you in due time: Casting all your care upon him; for he careth for you.", title: "Cast All Your Cares on Him", theme: "casting anxiety on God" },
  { ref: "1 Peter 5:8-9", text: "Be sober, be vigilant; because your adversary the devil, as a roaring lion, walketh about, seeking whom he may devour: Whom resist stedfast in the faith.", title: "Resist the Enemy", theme: "spiritual vigilance" },
  { ref: "1 Peter 5:10", text: "But the God of all grace, who hath called us unto his eternal glory by Christ Jesus, after that ye have suffered a while, make you perfect, stablish, strengthen, settle you.", title: "Restored After Suffering", theme: "God restores and strengthens" },
  { ref: "1 Peter 1:2", text: "Elect according to the foreknowledge of God the Father, through sanctification of the Spirit, unto obedience and sprinkling of the blood of Jesus Christ.", title: "Elect and Sanctified", theme: "chosen and set apart" },
  { ref: "1 Peter 1:25", text: "But the word of the Lord endureth for ever. And this is the word which by the gospel is preached unto you.", title: "The Eternal Word", theme: "Scripture endures forever" },
  { ref: "1 Peter 2:6", text: "Wherefore also it is contained in the scripture, Behold, I lay in Sion a chief corner stone, elect, precious: and he that believeth on him shall not be confounded.", title: "The Precious Cornerstone", theme: "Christ the foundation" },
  { ref: "1 Peter 2:10", text: "Which in time past were not a people, but are now the people of God: which had not obtained mercy, but now have obtained mercy.", title: "Now the People of God", theme: "mercy received" },
  { ref: "1 Peter 2:16", text: "As free, and not using your liberty for a cloke of maliciousness, but as the servants of God.", title: "Free to Serve God", theme: "true freedom" },
  { ref: "1 Peter 2:25", text: "For ye were as sheep going astray; but are now returned unto the Shepherd and Bishop of your souls.", title: "Returned to the Shepherd", theme: "the Good Shepherd" },
  { ref: "1 Peter 3:7", text: "Likewise, ye husbands, dwell with them according to knowledge, giving honour unto the wife, as unto the weaker vessel, and as being heirs together of the grace of life; that your prayers be not hindered.", title: "Heirs Together of Grace", theme: "godly relationships" },
  { ref: "1 Peter 3:10-11", text: "For he that will love life, and see good days, let him refrain his tongue from evil, and his lips that they speak no guile: Let him eschew evil, and do good; let him seek peace, and ensue it.", title: "Loving Life and Good Days", theme: "pursuing peace" },
  { ref: "1 Peter 3:18", text: "For Christ also hath once suffered for sins, the just for the unjust, that he might bring us to God.", title: "The Just for the Unjust", theme: "Christ's substitutionary sacrifice" },
  { ref: "1 Peter 4:1-2", text: "Forasmuch then as Christ hath suffered for us in the flesh, arm yourselves likewise with the same mind: for he that hath suffered in the flesh hath ceased from sin; That he no longer should live the rest of his time in the flesh to the lusts of men, but to the will of God.", title: "Armed with Christ's Mind", theme: "resolute living" },
  { ref: "1 Peter 4:8", text: "And above all things have fervent charity among yourselves: for charity shall cover the multitude of sins.", title: "Love Covers a Multitude", theme: "covering love" },
  { ref: "1 Peter 4:11", text: "If any man speak, let him speak as the oracles of God; if any man minister, let him do it as of the ability which God giveth: that God in all things may be glorified through Jesus Christ.", title: "Speak as God's Oracles", theme: "Spirit-empowered ministry" },
  { ref: "1 Peter 4:19", text: "Wherefore let them that suffer according to the will of God commit the keeping of their souls to him in well doing, as unto a faithful Creator.", title: "Committed to a Faithful Creator", theme: "trusting God in suffering" },
  { ref: "1 Peter 5:4", text: "And when the chief Shepherd shall appear, ye shall receive a crown of glory that fadeth not away.", title: "The Unfading Crown of Glory", theme: "eternal reward" },
  { ref: "1 Peter 5:11", text: "To him be glory and dominion for ever and ever. Amen.", title: "To Him Be Glory Forever", theme: "eternal glory" },
  { ref: "1 Peter 1:10-11", text: "Of which salvation the prophets have enquired and searched diligently, who prophesied of the grace that should come unto you.", title: "The Grace Prophets Longed to See", theme: "salvation's glory" },
  { ref: "1 Peter 1:22", text: "Seeing ye have purified your souls in obeying the truth through the Spirit unto unfeigned love of the brethren, see that ye love one another with a pure heart fervently.", title: "Love One Another Fervently", theme: "pure love" },
  { ref: "1 Peter 2:17", text: "Honour all men. Love the brotherhood. Fear God. Honour the king.", title: "Honor All People", theme: "respect and honor" },
];

const jamesPassages: PassageData[] = [
  { ref: "James 1:2-3", text: "My brethren, count it all joy when ye fall into divers temptations; Knowing this, that the trying of your faith worketh patience.", title: "Count It All Joy", theme: "joy in trials" },
  { ref: "James 1:4", text: "But let patience have her perfect work, that ye may be perfect and entire, wanting nothing.", title: "Patience Makes You Complete", theme: "patience brings maturity" },
  { ref: "James 1:5", text: "If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.", title: "Ask God for Wisdom", theme: "divine wisdom freely given" },
  { ref: "James 1:6", text: "But let him ask in faith, nothing wavering. For he that wavereth is like a wave of the sea driven with the wind and tossed.", title: "Ask Without Doubting", theme: "unwavering faith in prayer" },
  { ref: "James 1:12", text: "Blessed is the man that endureth temptation: for when he is tried, he shall receive the crown of life, which the Lord hath promised to them that love him.", title: "The Crown of Life", theme: "endurance rewarded" },
  { ref: "James 1:17", text: "Every good gift and every perfect gift is from above, and cometh down from the Father of lights, with whom is no variableness, neither shadow of turning.", title: "Every Good Gift from Above", theme: "God's generous nature" },
  { ref: "James 1:19-20", text: "Wherefore, my beloved brethren, let every man be swift to hear, slow to speak, slow to wrath: For the wrath of man worketh not the righteousness of God.", title: "Quick to Listen, Slow to Speak", theme: "wisdom in speech" },
  { ref: "James 1:22", text: "But be ye doers of the word, and not hearers only, deceiving your own selves.", title: "Be Doers of the Word", theme: "active obedience" },
  { ref: "James 1:25", text: "But whoso looketh into the perfect law of liberty, and continueth therein, he being not a forgetful hearer, but a doer of the work, this man shall be blessed in his deed.", title: "The Perfect Law of Liberty", theme: "freedom through obedience" },
  { ref: "James 1:26-27", text: "If any man among you seem to be religious, and bridleth not his tongue, but deceiveth his own heart, this man's religion is vain. Pure religion and undefiled before God and the Father is this, To visit the fatherless and widows in their affliction, and to keep himself unspotted from the world.", title: "Pure and Undefiled Religion", theme: "practical faith" },
  { ref: "James 2:1", text: "My brethren, have not the faith of our Lord Jesus Christ, the Lord of glory, with respect of persons.", title: "Faith Without Favoritism", theme: "impartiality" },
  { ref: "James 2:5", text: "Hearken, my beloved brethren, Hath not God chosen the poor of this world rich in faith, and heirs of the kingdom which he hath promised to them that love him?", title: "Rich in Faith", theme: "spiritual riches" },
  { ref: "James 2:13", text: "For he shall have judgment without mercy, that hath shewed no mercy; and mercy rejoiceth against judgment.", title: "Mercy Triumphs Over Judgment", theme: "mercy" },
  { ref: "James 2:17", text: "Even so faith, if it hath not works, is dead, being alone.", title: "Faith Without Works Is Dead", theme: "living faith" },
  { ref: "James 2:22", text: "Seest thou how faith wrought with his works, and by works was faith made perfect?", title: "Faith Made Complete by Action", theme: "faith and works together" },
  { ref: "James 2:26", text: "For as the body without the spirit is dead, so faith without works is dead also.", title: "Faith Alive Through Works", theme: "active faith" },
  { ref: "James 3:2", text: "For in many things we offend all. If any man offend not in word, the same is a perfect man, and able also to bridle the whole body.", title: "Taming the Tongue", theme: "power of words" },
  { ref: "James 3:13", text: "Who is a wise man and endued with knowledge among you? let him shew out of a good conversation his works with meekness of wisdom.", title: "Wisdom Shown by Good Conduct", theme: "practical wisdom" },
  { ref: "James 3:17", text: "But the wisdom that is from above is first pure, then peaceable, gentle, and easy to be intreated, full of mercy and good fruits, without partiality, and without hypocrisy.", title: "Wisdom from Above", theme: "heavenly wisdom" },
  { ref: "James 3:18", text: "And the fruit of righteousness is sown in peace of them that make peace.", title: "Peacemakers Sow Righteousness", theme: "peace and righteousness" },
  { ref: "James 4:2-3", text: "Ye have not, because ye ask not. Ye ask, and receive not, because ye ask amiss, that ye may consume it upon your lusts.", title: "Ask and You Shall Receive", theme: "effective prayer" },
  { ref: "James 4:6", text: "But he giveth more grace. Wherefore he saith, God resisteth the proud, but giveth grace unto the humble.", title: "Grace to the Humble", theme: "humility attracts grace" },
  { ref: "James 4:7", text: "Submit yourselves therefore to God. Resist the devil, and he will flee from you.", title: "Submit and Resist", theme: "victory through submission" },
  { ref: "James 4:8", text: "Draw nigh to God, and he will draw nigh to you.", title: "Draw Near to God", theme: "intimacy with God" },
  { ref: "James 4:10", text: "Humble yourselves in the sight of the Lord, and he shall lift you up.", title: "Humbled Then Exalted", theme: "God lifts the humble" },
  { ref: "James 4:14-15", text: "Whereas ye know not what shall be on the morrow. For what is your life? It is even a vapour, that appeareth for a little time, and then vanisheth away. For that ye ought to say, If the Lord will, we shall live, and do this, or that.", title: "Life Is But a Vapor", theme: "eternal perspective" },
  { ref: "James 5:7-8", text: "Be patient therefore, brethren, unto the coming of the Lord. Behold, the husbandman waiteth for the precious fruit of the earth, and hath long patience for it, until he receive the early and latter rain. Be ye also patient; stablish your hearts: for the coming of the Lord draweth nigh.", title: "Patient Until His Coming", theme: "patient waiting" },
  { ref: "James 5:10-11", text: "Take, my brethren, the prophets, who have spoken in the name of the Lord, for an example of suffering affliction, and of patience. Behold, we count them happy which endure. Ye have heard of the patience of Job, and have seen the end of the Lord; that the Lord is very pitiful, and of tender mercy.", title: "The Patience of Job", theme: "endurance like Job" },
  { ref: "James 5:13", text: "Is any among you afflicted? let him pray. Is any merry? let him sing psalms.", title: "Pray When Afflicted, Sing When Joyful", theme: "prayer and praise" },
  { ref: "James 5:14-15", text: "Is any sick among you? let him call for the elders of the church; and let them pray over him, anointing him with oil in the name of the Lord: And the prayer of faith shall save the sick, and the Lord shall raise him up.", title: "The Prayer of Faith", theme: "healing prayer" },
  { ref: "James 5:16", text: "Confess your faults one to another, and pray one for another, that ye may be healed. The effectual fervent prayer of a righteous man availeth much.", title: "Fervent Prayer Avails Much", theme: "powerful prayer" },
  { ref: "James 1:3", text: "Knowing this, that the trying of your faith worketh patience.", title: "Testing Produces Perseverance", theme: "faith tested by fire" },
  { ref: "James 1:8", text: "A double minded man is unstable in all his ways.", title: "Single-Minded Devotion", theme: "focused faith" },
  { ref: "James 1:9-10", text: "Let the brother of low degree rejoice in that he is exalted: But the rich, in that he is made low.", title: "God's Economy Reverses Status", theme: "divine reversal" },
  { ref: "James 1:13", text: "Let no man say when he is tempted, I am tempted of God: for God cannot be tempted with evil, neither tempteth he any man.", title: "God Does Not Tempt", theme: "understanding temptation" },
  { ref: "James 1:18", text: "Of his own will begat he us with the word of truth, that we should be a kind of firstfruits of his creatures.", title: "Firstfruits of His Creation", theme: "spiritual identity" },
  { ref: "James 1:21", text: "Wherefore lay apart all filthiness and superfluity of naughtiness, and receive with meekness the engrafted word, which is able to save your souls.", title: "Receive the Implanted Word", theme: "Scripture in the heart" },
  { ref: "James 2:8", text: "If ye fulfil the royal law according to the scripture, Thou shalt love thy neighbour as thyself, ye do well.", title: "The Royal Law of Love", theme: "loving your neighbor" },
  { ref: "James 2:12", text: "So speak ye, and so do, as they that shall be judged by the law of liberty.", title: "Speak and Act by the Law of Liberty", theme: "freedom with accountability" },
  { ref: "James 2:23", text: "And the scripture was fulfilled which saith, Abraham believed God, and it was imputed unto him for righteousness: and he was called the Friend of God.", title: "Friend of God", theme: "friendship with God" },
  { ref: "James 3:5-6", text: "Even so the tongue is a little member, and boasteth great things. Behold, how great a matter a little fire kindleth! And the tongue is a fire, a world of iniquity.", title: "The Power of the Tongue", theme: "controlling speech" },
  { ref: "James 3:10", text: "Out of the same mouth proceedeth blessing and cursing. My brethren, these things ought not so to be.", title: "Blessing Not Cursing", theme: "consistent speech" },
  { ref: "James 4:1", text: "From whence come wars and fightings among you? come they not hence, even of your lusts that war in your members?", title: "The Root of Conflict", theme: "inner peace" },
  { ref: "James 5:19-20", text: "Brethren, if any of you do err from the truth, and one convert him; Let him know, that he which converteth the sinner from the error of his way shall save a soul from death, and shall hide a multitude of sins.", title: "Restoring the Wanderer", theme: "rescuing souls" },
  { ref: "James 4:4", text: "Ye adulterers and adulteresses, know ye not that the friendship of the world is enmity with God?", title: "Choosing God Over the World", theme: "friendship with God vs world" },
];

const firstJohnPassages: PassageData[] = [
  { ref: "1 John 1:5", text: "This then is the message which we have heard of him, and declare unto you, that God is light, and in him is no darkness at all.", title: "God Is Light", theme: "walking in light" },
  { ref: "1 John 1:7", text: "But if we walk in the light, as he is in the light, we have fellowship one with another, and the blood of Jesus Christ his Son cleanseth us from all sin.", title: "Walking in the Light", theme: "fellowship and cleansing" },
  { ref: "1 John 1:9", text: "If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.", title: "Faithful to Forgive", theme: "confession and forgiveness" },
  { ref: "1 John 2:1", text: "My little children, these things write I unto you, that ye sin not. And if any man sin, we have an advocate with the Father, Jesus Christ the righteous.", title: "Our Advocate with the Father", theme: "Christ our advocate" },
  { ref: "1 John 2:5-6", text: "But whoso keepeth his word, in him verily is the love of God perfected: hereby know we that we are in him. He that saith he abideth in him ought himself also so to walk, even as he walked.", title: "Walking as Jesus Walked", theme: "Christ-like walk" },
  { ref: "1 John 2:12", text: "I write unto you, little children, because your sins are forgiven you for his name's sake.", title: "Sins Forgiven for His Name", theme: "assured forgiveness" },
  { ref: "1 John 2:15-16", text: "Love not the world, neither the things that are in the world. If any man love the world, the love of the Father is not in him. For all that is in the world, the lust of the flesh, and the lust of the eyes, and the pride of life, is not of the Father, but is of the world.", title: "Do Not Love the World", theme: "worldly vs godly" },
  { ref: "1 John 2:17", text: "And the world passeth away, and the lust thereof: but he that doeth the will of God abideth for ever.", title: "Doing God's Will Lasts Forever", theme: "eternal perspective" },
  { ref: "1 John 2:27", text: "But the anointing which ye have received of him abideth in you, and ye need not that any man teach you: but as the same anointing teacheth you of all things.", title: "The Anointing Teaches You", theme: "Holy Spirit guidance" },
  { ref: "1 John 3:1", text: "Behold, what manner of love the Father hath bestowed upon us, that we should be called the sons of God.", title: "What Manner of Love", theme: "Father's love" },
  { ref: "1 John 3:2", text: "Beloved, now are we the sons of God, and it doth not yet appear what we shall be: but we know that, when he shall appear, we shall be like him; for we shall see him as he is.", title: "We Shall Be Like Him", theme: "future transformation" },
  { ref: "1 John 3:8", text: "For this purpose the Son of God was manifested, that he might destroy the works of the devil.", title: "Destroying the Works of the Devil", theme: "Christ's mission" },
  { ref: "1 John 3:14", text: "We know that we have passed from death unto life, because we love the brethren.", title: "Passed from Death to Life", theme: "evidence of salvation" },
  { ref: "1 John 3:16", text: "Hereby perceive we the love of God, because he laid down his life for us: and we ought to lay down our lives for the brethren.", title: "Laying Down Our Lives", theme: "sacrificial love" },
  { ref: "1 John 3:18", text: "My little children, let us not love in word, neither in tongue; but in deed and in truth.", title: "Love in Deed and Truth", theme: "practical love" },
  { ref: "1 John 3:21-22", text: "Beloved, if our heart condemn us not, then have we confidence toward God. And whatsoever we ask, we receive of him, because we keep his commandments, and do those things that are pleasing in his sight.", title: "Confidence Before God", theme: "answered prayer" },
  { ref: "1 John 4:1", text: "Beloved, believe not every spirit, but try the spirits whether they are of God: because many false prophets are gone out into the world.", title: "Testing the Spirits", theme: "spiritual discernment" },
  { ref: "1 John 4:4", text: "Ye are of God, little children, and have overcome them: because greater is he that is in you, than he that is in the world.", title: "Greater Is He in You", theme: "overcoming power" },
  { ref: "1 John 4:7-8", text: "Beloved, let us love one another: for love is of God; and every one that loveth is born of God, and knoweth God. He that loveth not knoweth not God; for God is love.", title: "God Is Love", theme: "the nature of God" },
  { ref: "1 John 4:10", text: "Herein is love, not that we loved God, but that he loved us, and sent his Son to be the propitiation for our sins.", title: "He Loved Us First", theme: "God's initiative in love" },
  { ref: "1 John 4:11-12", text: "Beloved, if God so loved us, we ought also to love one another. No man hath seen God at any time. If we love one another, God dwelleth in us, and his love is perfected in us.", title: "Love Perfected in Us", theme: "God's love through us" },
  { ref: "1 John 4:16", text: "And we have known and believed the love that God hath to us. God is love; and he that dwelleth in love dwelleth in God, and God in him.", title: "Dwelling in Love, Dwelling in God", theme: "abiding in love" },
  { ref: "1 John 4:18", text: "There is no fear in love; but perfect love casteth out fear: because fear hath torment. He that feareth is not made perfect in love.", title: "Perfect Love Casts Out Fear", theme: "love conquers fear" },
  { ref: "1 John 4:19", text: "We love him, because he first loved us.", title: "We Love Because He First Loved", theme: "responding to God's love" },
  { ref: "1 John 5:1", text: "Whosoever believeth that Jesus is the Christ is born of God: and every one that loveth him that begat loveth him also that is begotten of him.", title: "Born of God Through Belief", theme: "new birth" },
  { ref: "1 John 5:4", text: "For whatsoever is born of God overcometh the world: and this is the victory that overcometh the world, even our faith.", title: "Our Faith Overcomes the World", theme: "overcoming by faith" },
  { ref: "1 John 5:5", text: "Who is he that overcometh the world, but he that believeth that Jesus is the Son of God?", title: "The Overcomer's Identity", theme: "victorious faith" },
  { ref: "1 John 5:11-12", text: "And this is the record, that God hath given to us eternal life, and this life is in his Son. He that hath the Son hath life; and he that hath not the Son of God hath not life.", title: "Eternal Life in the Son", theme: "life in Christ" },
  { ref: "1 John 5:13", text: "These things have I written unto you that believe on the name of the Son of God; that ye may know that ye have eternal life.", title: "Assurance of Eternal Life", theme: "salvation assurance" },
  { ref: "1 John 5:14-15", text: "And this is the confidence that we have in him, that, if we ask any thing according to his will, he heareth us: And if we know that he hear us, whatsoever we ask, we know that we have the petitions that we desired of him.", title: "Confidence in Prayer", theme: "bold prayer" },
  { ref: "1 John 5:18", text: "We know that whosoever is born of God sinneth not; but he that is begotten of God keepeth himself, and that wicked one toucheth him not.", title: "The Evil One Cannot Touch You", theme: "divine protection" },
  { ref: "1 John 5:20", text: "And we know that the Son of God is come, and hath given us an understanding, that we may know him that is true, and we are in him that is true, even in his Son Jesus Christ. This is the true God, and eternal life.", title: "Knowing the True God", theme: "knowing God" },
  { ref: "1 John 2:2", text: "And he is the propitiation for our sins: and not for ours only, but also for the sins of the whole world.", title: "Propitiation for the Whole World", theme: "universal atonement" },
  { ref: "1 John 2:6", text: "He that saith he abideth in him ought himself also so to walk, even as he walked.", title: "Walk as He Walked", theme: "following Christ's steps" },
  { ref: "1 John 2:10", text: "He that loveth his brother abideth in the light, and there is none occasion of stumbling in him.", title: "Loving Keeps You in the Light", theme: "love prevents stumbling" },
  { ref: "1 John 2:14", text: "I have written unto you, fathers, because ye have known him that is from the beginning. I have written unto you, young men, because ye are strong, and the word of God abideth in you, and ye have overcome the wicked one.", title: "Strong Because the Word Abides", theme: "strength through Scripture" },
  { ref: "1 John 2:25", text: "And this is the promise that he hath promised us, even eternal life.", title: "The Promise of Eternal Life", theme: "eternal promise" },
  { ref: "1 John 3:3", text: "And every man that hath this hope in him purifieth himself, even as he is pure.", title: "Purified by Hope", theme: "hope produces holiness" },
  { ref: "1 John 3:5", text: "And ye know that he was manifested to take away our sins; and in him is no sin.", title: "He Appeared to Take Away Sin", theme: "sinless Savior" },
  { ref: "1 John 3:9", text: "Whosoever is born of God doth not commit sin; for his seed remaineth in him: and he cannot sin, because he is born of God.", title: "Born of God's Seed", theme: "new nature" },
  { ref: "1 John 3:24", text: "And he that keepeth his commandments dwelleth in him, and he in him. And hereby we know that he abideth in us, by the Spirit which he hath given us.", title: "He Abides in Us by His Spirit", theme: "Spirit confirms abiding" },
  { ref: "1 John 4:13", text: "Hereby know we that we dwell in him, and he in us, because he hath given us of his Spirit.", title: "The Spirit Confirms Our Union", theme: "Holy Spirit witness" },
  { ref: "1 John 4:14", text: "And we have seen and do testify that the Father sent the Son to be the Saviour of the world.", title: "The Father Sent the Son", theme: "God's rescue mission" },
  { ref: "1 John 4:15", text: "Whosoever shall confess that Jesus is the Son of God, God dwelleth in him, and he in God.", title: "Confessing Jesus", theme: "confession brings union" },
  { ref: "1 John 5:3", text: "For this is the love of God, that we keep his commandments: and his commandments are not grievous.", title: "His Commands Are Not Burdensome", theme: "joyful obedience" },
];

const allBookPassages = [
  { book: "Ephesians", passages: ephesiansPassages, days: 15 },
  { book: "Romans", passages: romansPassages, days: 45 },
  { book: "Philippians", passages: philippiansPassages, days: 45 },
  { book: "Colossians", passages: colossiansPassages, days: 45 },
  { book: "Galatians", passages: galatiansPassages, days: 45 },
  { book: "Hebrews", passages: hebrewsPassages, days: 45 },
  { book: "1 Peter", passages: firstPeterPassages, days: 45 },
  { book: "James", passages: jamesPassages, days: 45 },
  { book: "1 John", passages: firstJohnPassages, days: 45 },
  { book: "Romans", passages: romansPassages, days: 45 },
  { book: "Philippians", passages: philippiansPassages, days: 21 },
];

const christianQuotePool = [
  "\"Faith is taking the first step even when you don't see the whole staircase.\" — Martin Luther King Jr.",
  "\"God does not give us everything we want, but He does fulfill His promises.\" — Dietrich Bonhoeffer",
  "\"Prayer is not asking. It is a longing of the soul.\" — Mahatma Gandhi",
  "\"The Christian life is not a constant high. I have my moments of deep discouragement.\" — Billy Graham",
  "\"God never said that the journey would be easy, but He did say that the arrival would be worthwhile.\" — Max Lucado",
  "\"Let God's promises shine on your problems.\" — Corrie ten Boom",
  "\"We are not cisterns made for hoarding; we are channels made for sharing.\" — Billy Graham",
  "\"The Bible is alive, it speaks to me; it has feet, it runs after me; it has hands, it lays hold of me.\" — Martin Luther",
  "\"To be a Christian without prayer is no more possible than to be alive without breathing.\" — Martin Luther",
  "\"Grace means that all of your mistakes now serve a purpose instead of serving shame.\" — Brene Brown",
  "\"God's work done in God's way will never lack God's supplies.\" — Hudson Taylor",
  "\"He is no fool who gives what he cannot keep to gain that which he cannot lose.\" — Jim Elliot",
  "\"Worry does not empty tomorrow of its sorrow, it empties today of its strength.\" — Corrie ten Boom",
  "\"I have found that there are three stages in every great work of God: first, it is impossible, then it is difficult, then it is done.\" — Hudson Taylor",
  "\"When we pray, God hears more than we say, answers more than we ask, gives more than we imagine.\" — Unknown",
  "\"A faith that hasn't been tested can't be trusted.\" — Adrian Rogers",
  "\"The will of God will not take us where the grace of God cannot sustain us.\" — Billy Graham",
  "\"If you look at the world, you'll be distressed. If you look within, you'll be depressed. But if you look at Christ, you'll be at rest.\" — Corrie ten Boom",
  "\"Do not have your concert first, and then tune your instrument afterwards. Begin the day with the Word of God and prayer.\" — Hudson Taylor",
  "\"You can never learn that Christ is all you need, until Christ is all you have.\" — Corrie ten Boom",
  "\"Our God is a God who not merely restores, but takes up our mistakes and follies into His plan.\" — C.S. Lewis",
  "\"You never know how much you really believe anything until its truth or falsehood becomes a matter of life and death to you.\" — C.S. Lewis",
  "\"There is not one blade of grass, there is no color in this world that is not intended to make us rejoice.\" — John Calvin",
  "\"The gospel is this: We are more sinful and flawed in ourselves than we ever dared believe, yet at the very same time we are more loved and accepted in Jesus Christ than we ever dared hope.\" — Timothy Keller",
  "\"True faith means holding nothing back. It means putting every hope in God's fidelity to His Promises.\" — Francis Chan",
  "\"We gain strength, and courage, and confidence by each experience in which we really stop to look fear in the face.\" — Eleanor Roosevelt",
  "\"A prayerless Christian is a powerless Christian.\" — Billy Sunday",
  "\"The Christian does not think God will love us because we are good, but that God will make us good because He loves us.\" — C.S. Lewis",
  "\"God is most glorified in us when we are most satisfied in Him.\" — John Piper",
  "\"What we do in the crisis always depends on whether we see the difficulties in the light of God, or God in the shadow of the difficulties.\" — G. Campbell Morgan",
  "\"Joy is the serious business of heaven.\" — C.S. Lewis",
  "\"Expect great things from God; attempt great things for God.\" — William Carey",
  "\"Courage is not simply one of the virtues, but the form of every virtue at the testing point.\" — C.S. Lewis",
  "\"Where God guides, He provides.\" — Frank Buchman",
  "\"It is not the strength of your faith but the object of your faith that actually saves you.\" — Timothy Keller",
  "\"If God is your partner, make your plans BIG.\" — D.L. Moody",
  "\"Faith sees the invisible, believes the unbelievable, and receives the impossible.\" — Corrie ten Boom",
  "\"The measure of a life, after all, is not its duration but its donation.\" — Corrie ten Boom",
  "\"Christ is not valued at all, unless He is valued above all.\" — Augustine",
  "\"There are far, far better things ahead than any we leave behind.\" — C.S. Lewis",
];

function generateContent(passage: PassageData, book: string): string {
  const paragraphs: string[] = [];
  const themes: Record<string, string[]> = {
    default: [
      `The words of ${passage.ref} carry a powerful message for believers today. ${passage.text} This truth is not merely historical; it is a living reality that shapes our daily walk with God.`,
      `When we meditate on this passage, we discover layers of meaning that speak directly to our circumstances. The ${passage.theme} revealed here is foundational to our Christian faith and practice.`,
      `In a world filled with uncertainty and constant change, the eternal truth of God's Word stands firm. The message of ${passage.theme} gives us an anchor that holds steady through every storm of life.`,
      `As believers, we are called to internalize these truths and allow them to transform our thinking. The Holy Spirit illuminates the Scriptures and applies them to our hearts in ways that bring genuine change.`,
      `The early church understood the power of these words. They lived by them, suffered for them, and saw God move mightily through their faithful obedience. We are called to the same standard of faith.`,
      `Today, let this truth settle deep into your spirit. Do not merely read it and move on. Let the words of Scripture become the lens through which you view every situation and circumstance in your life.`,
      `God's faithfulness is demonstrated throughout the ages. From generation to generation, He has proven Himself true to His Word. What He promised, He fulfills. What He declared, He brings to pass.`,
      `As you go about your day, carry this truth with you like a precious treasure. Let it guide your decisions, shape your conversations, and influence your attitude toward others and toward God.`,
    ]
  };

  const pool = themes.default;
  const count = 5 + (passage.ref.length % 3);
  for (let i = 0; i < count; i++) {
    paragraphs.push(pool[i % pool.length]);
  }
  return paragraphs.join("\n\n");
}

function generatePrayerPoints(passage: PassageData, book: string): string[] {
  const base = [
    `Father, help me to truly understand and live out the truth of ${passage.ref}`,
    `Lord, let the reality of ${passage.theme} transform my daily walk with You`,
    `Holy Spirit, open my eyes to see the depth of wisdom in this passage from ${book}`,
    `God, remove every hindrance that prevents me from fully embracing this truth`,
    `Lord, let Your Word concerning ${passage.theme} produce lasting fruit in my life`,
    `Father, strengthen my faith as I meditate on Your promises in ${book}`,
    `Lord Jesus, help me to be a living example of ${passage.theme} to those around me`,
  ];
  const count = 5 + (passage.title.length % 3);
  return base.slice(0, Math.min(count, 7));
}

function generateFaithDeclarations(passage: PassageData): string[] {
  const allDeclarations = [
    `I declare that ${passage.theme} is my reality in Christ Jesus`,
    `I walk in the truth of ${passage.ref} every day of my life`,
    `By faith, I receive every blessing that God has prepared for me`,
    `I am established in the Word of God and nothing shall move me`,
    `The power of God works mightily in me and through me`,
    `I am more than a conqueror through Christ who loves me`,
    `My life reflects the glory of God in every area`,
    `I declare that God's purposes for my life shall be fulfilled`,
    `I walk in divine favor and supernatural grace every day`,
    `The Word of God is alive in my heart and produces good fruit`,
    `I stand firm on the promises of God and I will not be shaken`,
  ];
  return allDeclarations.slice(0, 5);
}

function getChristianQuotes(index: number): string[] {
  const q1 = christianQuotePool[index % christianQuotePool.length];
  const q2 = christianQuotePool[(index + 7) % christianQuotePool.length];
  const q3 = christianQuotePool[(index + 17) % christianQuotePool.length];
  return [q1, q2, q3];
}

function generatePropheticDeclarations(passage: PassageData): string[] {
  const pool = [
    `I prophesy over my life: the word of God concerning ${passage.theme} is established and cannot be reversed`,
    `I decree and declare that every plan of the enemy against my destiny is destroyed by the power of God's Word`,
    `As it is written in ${passage.ref}, so it is established in my life — no weapon formed against me shall prosper`,
  ];
  return pool.slice(0, 1 + (passage.ref.length % 2));
}

function buildAllDeclarations(passage: PassageData, dayIndex: number): string[] {
  const faith = generateFaithDeclarations(passage);
  const quotes = getChristianQuotes(dayIndex);
  const prophetic = generatePropheticDeclarations(passage);
  return [...faith, ...quotes, ...prophetic];
}

async function regenerate() {
  console.log("=== Devotional Regeneration Script ===");
  console.log(`Starting: Feb 14, 2026 → Apr 30, 2027`);

  const startDate = new Date(2026, 1, 14);
  const endDate = new Date(2027, 3, 30);

  let currentDate = new Date(startDate);
  let dayCounter = 0;
  let totalUpdated = 0;
  let totalInserted = 0;
  const bookSummary: Record<string, { start: string; end: string; days: number }> = {};

  for (const bookConfig of allBookPassages) {
    const { book, passages, days } = bookConfig;
    const bookStart = formatDate(currentDate);
    let bookDays = 0;

    for (let d = 0; d < days; d++) {
      if (currentDate > endDate) break;

      const dateStr = formatDate(currentDate);
      const passage = passages[d % passages.length];

      const entry: DevotionalEntry = {
        date: dateStr,
        title: passage.title,
        scriptureReference: passage.ref,
        scriptureText: passage.text,
        content: generateContent(passage, book),
        prayerPoints: generatePrayerPoints(passage, book),
        faithDeclarations: buildAllDeclarations(passage, dayCounter),
        author: AUTHOR,
      };

      const existing = await db.select().from(devotionals).where(eq(devotionals.date, dateStr));

      if (existing.length > 0) {
        await db.update(devotionals).set({
          title: entry.title,
          scriptureReference: entry.scriptureReference,
          scriptureText: entry.scriptureText,
          content: entry.content,
          prayerPoints: entry.prayerPoints,
          faithDeclarations: entry.faithDeclarations,
          author: entry.author,
        }).where(eq(devotionals.date, dateStr));
        totalUpdated++;
      } else {
        await db.insert(devotionals).values({
          date: entry.date,
          title: entry.title,
          scriptureReference: entry.scriptureReference,
          scriptureText: entry.scriptureText,
          content: entry.content,
          prayerPoints: entry.prayerPoints,
          faithDeclarations: entry.faithDeclarations,
          author: entry.author,
        });
        totalInserted++;
      }

      currentDate = addDays(currentDate, 1);
      dayCounter++;
      bookDays++;
    }

    bookSummary[`${book} (cycle ${Object.keys(bookSummary).filter(k => k.startsWith(book)).length + 1})`] = {
      start: bookStart,
      end: formatDate(addDays(currentDate, -1)),
      days: bookDays,
    };

    if (currentDate > endDate) break;
  }

  console.log("\n=== REGENERATION COMPLETE ===");
  console.log(`Total devotionals updated: ${totalUpdated}`);
  console.log(`Total devotionals inserted: ${totalInserted}`);
  console.log(`Total processed: ${totalUpdated + totalInserted}`);
  console.log("\n=== BOOK ASSIGNMENTS ===");
  for (const [key, info] of Object.entries(bookSummary)) {
    console.log(`  ${key}: ${info.start} → ${info.end} (${info.days} days)`);
  }

  const authorCheck = await db.select().from(devotionals).where(eq(devotionals.author, AUTHOR));
  console.log(`\nAuthor verification: ${authorCheck.length} devotionals with "${AUTHOR}"`);

  process.exit(0);
}

regenerate().catch((err) => {
  console.error("Regeneration failed:", err);
  process.exit(1);
});
