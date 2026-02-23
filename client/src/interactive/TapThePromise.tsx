import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

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
  "Hold on to this Word.",
  "Stand on this Truth.",
  "This Promise is Alive in You.",
  "Let this Word strengthen you.",
  "Faith Activated.",
  "Carry this Promise with you.",
  "This Word is working for you.",
];

const COLOR_THEMES: readonly { text: string; glow: string }[] = [
  { text: "#FFD700", glow: "rgba(255,215,0,0.3)" },
  { text: "#E8D0AA", glow: "rgba(232,208,170,0.25)" },
  { text: "#FF6B6B", glow: "rgba(255,107,107,0.25)" },
  { text: "#7B9CFF", glow: "rgba(123,156,255,0.25)" },
  { text: "#5DCEA0", glow: "rgba(93,206,160,0.25)" },
];

const DIRECTIONS = ["right", "left", "top", "bottom"] as const;
type Direction = (typeof DIRECTIONS)[number];

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
type Screen = "landing" | "playing" | "results";

interface ClaimedPromise {
  text: string;
  ref: string;
  affirmation: string;
}

function MusicToggle({ audioRef }: { audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const [musicOn, setMusicOn] = useState(false);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;

    if (musicOn) {
      el.pause();
      setMusicOn(false);
    } else {
      el.volume = 0.3;
      el.play()
        .then(() => {
          console.log("Audio started successfully");
          setMusicOn(true);
        })
        .catch((err) => console.log("Audio blocked", err));
    }
  }, [musicOn, audioRef]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPause = () => setMusicOn(false);
    const onPlay = () => setMusicOn(true);
    el.addEventListener("pause", onPause);
    el.addEventListener("play", onPlay);
    return () => {
      el.removeEventListener("pause", onPause);
      el.removeEventListener("play", onPlay);
    };
  }, [audioRef]);

  return (
    <button
      onClick={toggle}
      className="ttp-music-toggle"
      data-testid="button-music-toggle"
      aria-label={musicOn ? "Mute music" : "Play music"}
    >
      {musicOn ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )}
    </button>
  );
}

export default function TapThePromise() {
  const [, navigate] = useLocation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [screen, setScreen] = useState<Screen>("landing");
  const [sessionPromises, setSessionPromises] = useState<typeof ALL_PROMISES>([]);
  const [index, setIndex] = useState(0);
  const [claimed, setClaimed] = useState<ClaimedPromise[]>([]);
  const [phase, setPhase] = useState<Phase>("enter");
  const [direction, setDirection] = useState<Direction>("right");
  const [affirmation, setAffirmation] = useState("");
  const [colorTheme, setColorTheme] = useState(COLOR_THEMES[0]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tappedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startGame = useCallback(() => {
    const shuffled = shuffle(ALL_PROMISES).slice(0, SESSION_SIZE);
    setSessionPromises(shuffled);
    setIndex(0);
    setClaimed([]);
    setPhase("enter");
    setColorTheme(pickRandom(COLOR_THEMES));
    tappedRef.current = false;
    setScreen("playing");
  }, []);

  const advanceToNext = useCallback(() => {
    clearTimer();
    if (index + 1 >= SESSION_SIZE) {
      setScreen("results");
    } else {
      setDirection(pickRandom(DIRECTIONS));
      setColorTheme(pickRandom(COLOR_THEMES));
      setIndex((prev) => prev + 1);
      setPhase("enter");
      tappedRef.current = false;
    }
  }, [index, clearTimer]);

  useEffect(() => {
    if (screen !== "playing") return;

    clearTimer();
    tappedRef.current = false;
    setDirection(pickRandom(DIRECTIONS));
    setPhase("enter");

    timerRef.current = setTimeout(() => {
      setPhase("visible");
      timerRef.current = setTimeout(() => {
        setPhase("exit");
        timerRef.current = setTimeout(() => {
          advanceToNext();
        }, 800);
      }, 2500);
    }, 700);

    return clearTimer;
  }, [index, screen]);

  const handleTap = useCallback(() => {
    if (tappedRef.current || phase === "exit" || phase === "done" || screen !== "playing") return;
    tappedRef.current = true;
    clearTimer();

    const current = sessionPromises[index];
    const aff = pickRandom(AFFIRMATIONS);
    setClaimed((prev) => [...prev, { text: current.text, ref: current.ref, affirmation: aff }]);
    setAffirmation(aff);
    setPhase("tapped");

    timerRef.current = setTimeout(() => {
      setPhase("exit");
      timerRef.current = setTimeout(() => {
        advanceToNext();
      }, 600);
    }, 1500);
  }, [phase, screen, index, sessionPromises, clearTimer, advanceToNext]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [clearTimer]);

  const audioElement = (
    <audio
      ref={audioRef}
      src="/audio/tap-theme.mp3"
      loop
      preload="auto"
    />
  );

  if (screen === "landing") {
    return (
      <div className={`ttp-bg ${isDark ? "ttp-dark" : "ttp-light"}`} data-testid="tap-promise-landing">
        {audioElement}
        <div className="ttp-rays" />
        <div className="ttp-shimmer" />
        <div className="ttp-landing-card">
          <div className="ttp-landing-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <h1 className="ttp-landing-title">Tap The Promise</h1>
          <p className="ttp-landing-sub">Claim God's promises before they pass by</p>
          <div className="ttp-landing-rules">
            <p>7 promises will appear</p>
            <p>Tap quickly to claim each one</p>
            <p>Miss it and it's gone</p>
          </div>
          <button
            className="ttp-btn ttp-btn-primary ttp-btn-lg"
            onClick={startGame}
            data-testid="button-start-game"
          >
            BEGIN
          </button>
          <button
            className="ttp-btn ttp-btn-ghost"
            onClick={() => navigate("/")}
            data-testid="button-back-landing"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (screen === "results") {
    return (
      <div className={`ttp-bg ${isDark ? "ttp-dark" : "ttp-light"}`} data-testid="tap-promise-complete">
        {audioElement}
        <MusicToggle audioRef={audioRef} />
        <div className="ttp-rays" />
        <div className="ttp-shimmer" />
        <div className="ttp-results-layout">
          <div className="ttp-results-header">
            <h2 className="ttp-result-headline">Today's Promises Activated</h2>
            <p className="ttp-result-subheading">
              You claimed {claimed.length} / {SESSION_SIZE} promises
            </p>
          </div>

          <div className="ttp-results-scroll">
            {claimed.length > 0 && (
              <div className="ttp-claimed-list">
                {claimed.map((p, i) => (
                  <div key={i} className="ttp-claimed-card" data-testid={`claimed-promise-${i}`}>
                    <span className="ttp-claimed-text">"{p.text}"</span>
                    <span className="ttp-claimed-ref">{p.ref}</span>
                    <span className="ttp-claimed-affirm">{p.affirmation}</span>
                  </div>
                ))}
              </div>
            )}
            {claimed.length === 0 && (
              <p className="ttp-no-claims">Tap faster next time! Every promise is within reach.</p>
            )}

            <div className="ttp-scroll-actions">
              <button
                className="ttp-btn ttp-btn-primary"
                onClick={startGame}
                data-testid="button-play-again"
              >
                PLAY AGAIN
              </button>
              <p className="ttp-result-motto">Grow your faith through repetition.</p>
              <div className="ttp-result-brand">365 DAILY DEVOTIONAL</div>
            </div>
          </div>

          <div className="ttp-mission-bar">
            <span className="ttp-mission-label">Support Our Mission</span>
            <button
              className="ttp-btn-mission-donate"
              onClick={() => navigate("/donate")}
              data-testid="button-donate"
            >
              DONATE
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
    <div className={`ttp-bg ${isDark ? "ttp-dark" : "ttp-light"}`} data-testid="tap-promise-container">
      {audioElement}
      <MusicToggle audioRef={audioRef} />
      <div className="ttp-rays" />
      <div className="ttp-shimmer" />
      <div className="ttp-counter" data-testid="tap-promise-counter">
        {index + 1} / {SESSION_SIZE} &nbsp;&bull;&nbsp; Claimed: {claimed.length}
      </div>

      <div
        className={cardClass}
        onClick={handleTap}
        data-testid="tap-promise-card"
        style={{ "--ttp-text-color": colorTheme.text, "--ttp-glow-color": colorTheme.glow } as React.CSSProperties}
      >
        {phase === "tapped" ? (
          <div className="ttp-affirmation" data-testid="tap-promise-affirmation">
            {affirmation}
          </div>
        ) : (
          <>
            <h1 className="ttp-promise-text">{current.text}</h1>
            <p className="ttp-promise-ref">{current.ref}</p>
            <p className="ttp-tap-hint">TAP TO CLAIM</p>
          </>
        )}
      </div>
    </div>
  );
}
