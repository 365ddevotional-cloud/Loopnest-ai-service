import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import GameEngine from "./GameEngine";
import type { ContentItem } from "./GameTypes";

const DRAFT_KEY = "gameBuilderDraft";

interface DraftData {
  title: string;
  verseText: string;
  reference: string;
  themeMode: "auto" | "light" | "dark";
  musicEnabled: boolean;
}

export default function CreateGamePage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [title, setTitle] = useState("");
  const [verseText, setVerseText] = useState("");
  const [reference, setReference] = useState("");
  const [themePref, setThemePref] = useState<"auto" | "light" | "dark">("auto");
  const [useMusic, setUseMusic] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [shareLink, setShareLink] = useState("");
  const [draftSaved, setDraftSaved] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const params = new URLSearchParams(searchString);
    const encoded = params.get("data");
    if (encoded) {
      try {
        const decoded = JSON.parse(atob(encoded));
        if (decoded.title) setTitle(decoded.title);
        if (decoded.verseText) setVerseText(decoded.verseText);
        if (decoded.reference) setReference(decoded.reference);
        if (decoded.themeMode) setThemePref(decoded.themeMode);
        setInitialized(true);
        setTimeout(() => {
          setPreviewing(true);
          setPreviewKey((k) => k + 1);
        }, 100);
        return;
      } catch {
        // ignore bad data
      }
    }

    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const draft: DraftData = JSON.parse(saved);
        if (draft.title) setTitle(draft.title);
        if (draft.verseText) setVerseText(draft.verseText);
        if (draft.reference) setReference(draft.reference);
        if (draft.themeMode) setThemePref(draft.themeMode);
        if (typeof draft.musicEnabled === "boolean") setUseMusic(draft.musicEnabled);
      }
    } catch {
      // ignore bad data
    }
    setInitialized(true);
  }, [initialized, searchString]);

  const canPreview = title.trim() && verseText.trim() && reference.trim();

  const handlePreview = useCallback(() => {
    if (!canPreview) return;
    setPreviewKey((k) => k + 1);
    setPreviewing(true);
  }, [canPreview]);

  const handleSaveDraft = useCallback(() => {
    const draft: DraftData = {
      title,
      verseText,
      reference,
      themeMode: themePref,
      musicEnabled: useMusic,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }, [title, verseText, reference, themePref, useMusic]);

  const handleShareLink = useCallback(() => {
    const obj = { title, verseText, reference, themeMode: themePref };
    const encoded = btoa(JSON.stringify(obj));
    const link = window.location.origin + "/interactive/create?data=" + encoded;
    setShareLink(link);
  }, [title, verseText, reference, themePref]);

  const resolvedThemeMode: "light" | "dark" =
    themePref === "auto"
      ? resolvedTheme === "dark" ? "dark" : "light"
      : themePref;

  const contentData: ContentItem[] = verseText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line, ref: reference.trim() }));

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.6rem 0.75rem",
    borderRadius: "8px",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
    background: isDark ? "#2a2a40" : "#fff",
    color: isDark ? "#e0e0e0" : "#333",
    fontSize: "0.9rem",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: "0.35rem",
  };

  const secondaryBtnStyle: React.CSSProperties = {
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`,
    background: "transparent",
    color: isDark ? "#ccc" : "#555",
    fontWeight: 500,
    fontSize: "0.85rem",
    cursor: "pointer",
    flex: 1,
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDark ? "#1a1a2e" : "#f8f6f3",
        color: isDark ? "#e0e0e0" : "#333",
        padding: "2rem 1rem",
      }}
      data-testid="create-game-page"
    >
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        <h1
          style={{ textAlign: "center", fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}
          data-testid="create-game-title"
        >
          Game Builder
        </h1>
        <p style={{ textAlign: "center", opacity: 0.6, fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Create a temporary playable game
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle} htmlFor="game-title">Game Title</label>
            <input
              id="game-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Faith Game"
              style={inputStyle}
              data-testid="input-game-title"
            />
          </div>

          <div>
            <label style={labelStyle} htmlFor="verse-text">Verse Text</label>
            <textarea
              id="verse-text"
              value={verseText}
              onChange={(e) => setVerseText(e.target.value)}
              placeholder={"Trust in the Lord with all your heart\nThe Lord is my shepherd"}
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
              data-testid="input-verse-text"
            />
            <p style={{ fontSize: "0.75rem", opacity: 0.5, marginTop: "0.25rem" }}>
              One verse per line. Each line becomes a card.
            </p>
          </div>

          <div>
            <label style={labelStyle} htmlFor="verse-ref">Reference</label>
            <input
              id="verse-ref"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Proverbs 3:5"
              style={inputStyle}
              data-testid="input-verse-reference"
            />
          </div>

          <div>
            <label style={labelStyle}>Theme</label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["auto", "light", "dark"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setThemePref(opt)}
                  style={{
                    flex: 1,
                    padding: "0.45rem",
                    borderRadius: "6px",
                    border: `1px solid ${themePref === opt ? (isDark ? "#7b6fe0" : "#4a3c8a") : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                    background: themePref === opt ? (isDark ? "#3a3560" : "#eae6f5") : "transparent",
                    color: isDark ? "#e0e0e0" : "#333",
                    fontSize: "0.8rem",
                    fontWeight: themePref === opt ? 600 : 400,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                  data-testid={`button-theme-${opt}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              id="music-toggle"
              checked={useMusic}
              onChange={(e) => setUseMusic(e.target.checked)}
              data-testid="input-music-toggle"
            />
            <label htmlFor="music-toggle" style={{ fontSize: "0.85rem" }}>
              Enable background music
            </label>
          </div>

          <button
            onClick={handlePreview}
            disabled={!canPreview}
            style={{
              padding: "0.65rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: canPreview ? (isDark ? "#5a4fcf" : "#4a3c8a") : (isDark ? "#333" : "#ccc"),
              color: canPreview ? "#fff" : (isDark ? "#666" : "#999"),
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: canPreview ? "pointer" : "not-allowed",
              width: "100%",
            }}
            data-testid="button-preview-game"
          >
            Preview Game
          </button>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={handleSaveDraft}
              style={secondaryBtnStyle}
              data-testid="button-save-draft"
            >
              {draftSaved ? "Draft Saved!" : "Save Draft"}
            </button>
            <button
              onClick={handleShareLink}
              disabled={!canPreview}
              style={{
                ...secondaryBtnStyle,
                cursor: canPreview ? "pointer" : "not-allowed",
                opacity: canPreview ? 1 : 0.5,
              }}
              data-testid="button-share-link"
            >
              Generate Share Link
            </button>
          </div>

          {shareLink && (
            <div data-testid="share-link-container">
              <label style={{ ...labelStyle, fontSize: "0.8rem" }}>Share Link</label>
              <input
                type="text"
                readOnly
                value={shareLink}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                style={inputStyle}
                data-testid="input-share-link"
              />
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: "1rem" }}>
          <button
            onClick={() => navigate("/interactive")}
            style={{
              background: "none",
              border: "none",
              color: isDark ? "#aaa" : "#666",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
            data-testid="button-create-back"
          >
            Back to Games
          </button>
        </div>
      </div>

      {previewing && contentData.length > 0 && (
        <div style={{ marginTop: "2rem" }} data-testid="game-preview-container">
          <GameEngine
            key={previewKey}
            gameId="preview"
            gameTitle={title.trim()}
            contentData={contentData}
            themeMode={resolvedThemeMode}
            audioTrack={useMusic ? "/audio/tap-theme.mp3" : undefined}
            sessionSize={Math.min(contentData.length, 7)}
            onBack={() => setPreviewing(false)}
          />
        </div>
      )}
    </div>
  );
}
