import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  GameEngineProps,
  ContentItem,
  ClaimedItem,
  Phase,
  Screen,
  Direction,
  ColorTheme,
  DIRECTIONS,
  TIMING,
  DEFAULT_SESSION_SIZE,
  DEFAULT_AFFIRMATIONS,
  DEFAULT_COLOR_THEMES,
  shuffle,
  pickRandom,
} from "./GameTypes";
import { GameAudioManager } from "./GameAudioManager";
import { GameThemeManager } from "./GameThemeManager";

function MusicToggleButton({ audioManager }: { audioManager: GameAudioManager }) {
  const [musicOn, setMusicOn] = useState(false);

  useEffect(() => {
    const unsub = audioManager.subscribe((playing) => setMusicOn(playing));
    return unsub;
  }, [audioManager]);

  return (
    <button
      type="button"
      onClick={() => audioManager.toggle()}
      className="ttp-music-toggle"
      data-testid="button-music-toggle"
      aria-label={musicOn ? "Mute music" : "Play music"}
    >
      {musicOn ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )}
    </button>
  );
}

export default function GameEngine({
  gameTitle,
  contentData,
  themeMode,
  audioTrack,
  sessionSize = DEFAULT_SESSION_SIZE,
  affirmations = DEFAULT_AFFIRMATIONS,
  colorThemes = DEFAULT_COLOR_THEMES,
  onBack,
  onDonate,
  brandText = "365 DAILY DEVOTIONAL",
}: GameEngineProps) {
  const isDark = themeMode === "dark";

  const [screen, setScreen] = useState<Screen>("landing");
  const [sessionItems, setSessionItems] = useState<ContentItem[]>([]);
  const [index, setIndex] = useState(0);
  const [claimed, setClaimed] = useState<ClaimedItem[]>([]);
  const [phase, setPhase] = useState<Phase>("enter");
  const [direction, setDirection] = useState<Direction>("right");
  const [affirmation, setAffirmation] = useState("");
  const [colorTheme, setColorTheme] = useState<ColorTheme>(colorThemes[0]);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tappedRef = useRef(false);

  const audioManager = useMemo(() => new GameAudioManager(audioTrack), [audioTrack]);
  const themeManager = useMemo(() => new GameThemeManager(colorThemes), [colorThemes]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startGame = useCallback(() => {
    const shuffled = shuffle(contentData).slice(0, sessionSize);
    setSessionItems(shuffled);
    setIndex(0);
    setClaimed([]);
    setPhase("enter");
    setColorTheme(themeManager.rotate());
    tappedRef.current = false;
    setScreen("playing");
  }, [contentData, sessionSize, themeManager]);

  const advanceToNext = useCallback(() => {
    clearTimer();
    if (index + 1 >= sessionSize) {
      setScreen("results");
    } else {
      setDirection(pickRandom(DIRECTIONS));
      setColorTheme(themeManager.rotate());
      setIndex((prev) => prev + 1);
      setPhase("enter");
      tappedRef.current = false;
    }
  }, [index, sessionSize, clearTimer, themeManager]);

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
        }, TIMING.EXIT);
      }, TIMING.VISIBLE);
    }, TIMING.ENTER);

    return clearTimer;
  }, [index, screen]);

  const handleTap = useCallback(() => {
    if (tappedRef.current || phase === "exit" || phase === "done" || screen !== "playing") return;
    tappedRef.current = true;
    clearTimer();

    const current = sessionItems[index];
    const aff = pickRandom(affirmations);
    setClaimed((prev) => [...prev, { text: current.text, ref: current.ref, affirmation: aff }]);
    setAffirmation(aff);
    setPhase("tapped");

    timerRef.current = setTimeout(() => {
      setPhase("exit");
      timerRef.current = setTimeout(() => {
        advanceToNext();
      }, TIMING.AFFIRMATION_EXIT);
    }, TIMING.AFFIRMATION);
  }, [phase, screen, index, sessionItems, affirmations, clearTimer, advanceToNext]);

  useEffect(() => {
    return () => {
      clearTimer();
      audioManager.cleanup();
    };
  }, [clearTimer, audioManager]);

  const bgClass = themeManager.getBgClass(isDark);

  if (screen === "landing") {
    return (
      <div className={bgClass} data-testid="tap-promise-landing">
        <div className="ttp-rays" />
        <div className="ttp-shimmer" />
        <div className="ttp-landing-card">
          <div className="ttp-landing-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
          <h1 className="ttp-landing-title">{gameTitle}</h1>
          <p className="ttp-landing-sub">Claim God's promises before they pass by</p>
          <div className="ttp-landing-rules">
            <p>{sessionSize} promises will appear</p>
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
          {onBack && (
            <button
              className="ttp-btn ttp-btn-ghost"
              onClick={onBack}
              data-testid="button-back-landing"
            >
              Back to Home
            </button>
          )}
        </div>
      </div>
    );
  }

  if (screen === "results") {
    return (
      <>
        <MusicToggleButton audioManager={audioManager} />
        <div className={bgClass} data-testid="tap-promise-complete">
          <div className="ttp-rays" />
          <div className="ttp-shimmer" />
          <div className="ttp-results-layout">
            <div className="ttp-results-header">
              <h2 className="ttp-result-headline">Today's Promises Activated</h2>
              <p className="ttp-result-subheading">
                You claimed {claimed.length} / {sessionSize} promises
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
                <div className="ttp-result-brand">{brandText}</div>
              </div>
            </div>

            {onDonate && (
              <div className="ttp-mission-bar">
                <span className="ttp-mission-label">Support Our Mission</span>
                <button
                  className="ttp-btn-mission-donate"
                  onClick={onDonate}
                  data-testid="button-donate"
                >
                  DONATE
                </button>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  const current = sessionItems[index];
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
    <>
      <MusicToggleButton audioManager={audioManager} />
      <div className={bgClass} data-testid="tap-promise-container">
        <div className="ttp-rays" />
        <div className="ttp-shimmer" />
        <div className="ttp-counter" data-testid="tap-promise-counter">
          {index + 1} / {sessionSize} &nbsp;&bull;&nbsp; Claimed: {claimed.length}
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
    </>
  );
}
