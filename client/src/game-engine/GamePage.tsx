import { useRoute, useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import GameEngine from "./GameEngine";
import { getGameByRoute } from "./GameRegistry";

export default function GamePage() {
  const [, navigate] = useLocation();
  const { resolvedTheme } = useTheme();
  const [, params] = useRoute("/interactive/:gameSlug");
  const route = `/interactive/${params?.gameSlug ?? ""}`;
  const config = getGameByRoute(route);

  if (!config) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--foreground, #333)" }}>
        <h2>Game Not Found</h2>
        <p>The game you're looking for isn't available.</p>
        <button
          onClick={() => navigate("/")}
          style={{ marginTop: "1rem", padding: "0.5rem 1.5rem", cursor: "pointer" }}
          data-testid="button-game-not-found-home"
        >
          Back to Home
        </button>
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
