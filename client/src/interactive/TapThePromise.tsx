import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

const ALL_PROMISES = [
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

const AFFIRMATIONS = [
  "Received by Faith 🙏",
  "This Promise is Yours ✨",
  "Claimed in Jesus' Name 🔥",
  "Grace Activated 💛",
  "Word Received 📖",
  "Faith Applied 💫",
];

const DIRECTIONS = ["right", "left", "top", "bottom"] as const;
type Direction = typeof DIRECTIONS[number];

const SESSION_SIZE = 7;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type Phase = "enter" | "visible" | "tapped" | "exit" | "done";

export default function TapThePromise() {
  const [, navigate] = useLocation();
  const [sessionPromises, setSessionPromises] = useState(() =>
    shuffle(ALL_PROMISES).slice(0, SESSION_SIZE)
  );
  const [index, setIndex] = useState(0);
  const [claimed, setClaimed] = useState<typeof ALL_PROMISES>([]);
  const [phase, setPhase] = useState<Phase>("enter");
  const [direction, setDirection] = useState<Direction>("right");
  const [affirmation, setAffirmation] = useState("");
  const [gameOver, setGameOver] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tappedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const advanceToNext = useCallback(() => {
    clearTimer();
    if (index + 1 >= SESSION_SIZE) {
      setGameOver(true);
    } else {
      const nextDir = pickRandom(DIRECTIONS);
      setDirection(nextDir);
      setIndex((prev) => prev + 1);
      setPhase("enter");
      tappedRef.current = false;
    }
  }, [index, clearTimer]);

  useEffect(() => {
    if (gameOver) return;

    clearTimer();
    tappedRef.current = false;
    const dir = pickRandom(DIRECTIONS);
    setDirection(dir);
    setPhase("enter");

    timerRef.current = setTimeout(() => {
      setPhase("visible");
      timerRef.current = setTimeout(() => {
        setPhase("exit");
        timerRef.current = setTimeout(() => {
          advanceToNext();
        }, 800);
      }, 1500);
    }, 700);

    return clearTimer;
  }, [index, gameOver]);

  const handleTap = useCallback(() => {
    if (tappedRef.current || phase === "exit" || phase === "done" || gameOver) return;
    tappedRef.current = true;
    clearTimer();

    const current = sessionPromises[index];
    setClaimed((prev) => [...prev, current]);
    setAffirmation(pickRandom(AFFIRMATIONS));
    setPhase("tapped");

    timerRef.current = setTimeout(() => {
      setPhase("exit");
      timerRef.current = setTimeout(() => {
        advanceToNext();
      }, 600);
    }, 800);
  }, [phase, gameOver, index, sessionPromises, clearTimer, advanceToNext]);

  const playAgain = useCallback(() => {
    setSessionPromises(shuffle(ALL_PROMISES).slice(0, SESSION_SIZE));
    setIndex(0);
    setClaimed([]);
    setPhase("enter");
    setGameOver(false);
    tappedRef.current = false;
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  if (gameOver) {
    return (
      <div className="ttp-bg" data-testid="tap-promise-complete">
        <div className="ttp-rays" />
        <div className="ttp-result-card">
          <h2 className="ttp-result-title">
            You Claimed {claimed.length} / {SESSION_SIZE} Promises
          </h2>
          {claimed.length > 0 && (
            <ul className="ttp-claimed-list">
              {claimed.map((p, i) => (
                <li key={i} className="ttp-claimed-item">
                  <span className="ttp-claimed-text">"{p.text}"</span>
                  <span className="ttp-claimed-ref">— {p.ref}</span>
                </li>
              ))}
            </ul>
          )}
          {claimed.length === 0 && (
            <p className="ttp-no-claims">Tap faster next time! Every promise is within reach.</p>
          )}
          <div className="ttp-result-buttons">
            <button
              className="ttp-btn ttp-btn-primary"
              onClick={playAgain}
              data-testid="button-play-again"
            >
              PLAY AGAIN
            </button>
            <button
              className="ttp-btn ttp-btn-secondary"
              onClick={() => navigate("/")}
              data-testid="button-back"
            >
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const current = sessionPromises[index];
  const cardClass = [
    "ttp-card",
    phase === "enter" ? `ttp-enter-${direction}` : "",
    phase === "visible" ? "ttp-center" : "",
    phase === "tapped" ? "ttp-frozen" : "",
    phase === "exit" ? `ttp-exit-${direction}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="ttp-bg" data-testid="tap-promise-container">
      <div className="ttp-rays" />
      <div className="ttp-counter" data-testid="tap-promise-counter">
        Promises: {index + 1} / {SESSION_SIZE} &nbsp;|&nbsp; Claimed: {claimed.length}
      </div>

      <div
        className={cardClass}
        onClick={handleTap}
        data-testid="tap-promise-card"
      >
        {phase === "tapped" ? (
          <div className="ttp-affirmation" data-testid="tap-promise-affirmation">
            {affirmation}
          </div>
        ) : (
          <>
            <h1 className="ttp-promise-text">{current.text}</h1>
            <p className="ttp-promise-ref">({current.ref})</p>
            <p className="ttp-tap-hint">TAP TO CLAIM</p>
          </>
        )}
      </div>
    </div>
  );
}
