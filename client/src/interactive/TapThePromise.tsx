import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { GameEngine, getGameConfig } from "@/game-engine";

const config = getGameConfig("tap-the-promise");

export default function TapThePromise() {
  const [, navigate] = useLocation();
  const { resolvedTheme } = useTheme();

  if (!config) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Game not found in registry.</p>
        <button onClick={() => navigate("/")}>Back to Home</button>
      </div>
    );
  }

  const themeMode = config.themeMode === "auto"
    ? (resolvedTheme === "dark" ? "dark" : "light")
    : config.themeMode;

  return (
    <GameEngine
      gameId={config.id}
      gameTitle={config.title}
      contentData={config.contentData}
      themeMode={themeMode}
      audioTrack={config.audioTrack}
      onBack={() => navigate("/")}
      onDonate={() => navigate("/donate")}
    />
  );
}
