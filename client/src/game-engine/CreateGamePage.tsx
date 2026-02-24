import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

export default function CreateGamePage() {
  const [, navigate] = useLocation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: isDark ? "#1a1a2e" : "#f8f6f3",
        color: isDark ? "#e0e0e0" : "#333",
        padding: "2rem 1rem",
      }}
      data-testid="create-game-page"
    >
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <h1
          style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}
          data-testid="create-game-title"
        >
          Game Builder
        </h1>
        <p
          style={{ fontSize: "1rem", opacity: 0.6, marginBottom: "2rem" }}
          data-testid="create-game-status"
        >
          Coming Soon
        </p>
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
  );
}
