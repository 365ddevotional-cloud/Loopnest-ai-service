import { useLocation } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { GAME_REGISTRY } from "./GameRegistry";

export default function GamesHub() {
  const [, navigate] = useLocation();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2rem 1rem",
        background: isDark ? "#1a1a2e" : "#f8f6f3",
        color: isDark ? "#e0e0e0" : "#333",
      }}
      data-testid="games-hub"
    >
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1
          style={{
            textAlign: "center",
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
          data-testid="games-hub-title"
        >
          Interactive Games
        </h1>
        <p
          style={{
            textAlign: "center",
            marginBottom: "2rem",
            opacity: 0.7,
            fontSize: "0.95rem",
          }}
        >
          Strengthen your faith through play
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {GAME_REGISTRY.map((game) => (
            <div
              key={game.id}
              style={{
                background: isDark ? "#2a2a40" : "#fff",
                borderRadius: "12px",
                padding: "1.25rem 1.5rem",
                border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              }}
              data-testid={`game-card-${game.id}`}
            >
              <h2
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 600,
                  marginBottom: "0.35rem",
                }}
                data-testid={`game-title-${game.id}`}
              >
                {game.title}
              </h2>
              <p
                style={{
                  fontSize: "0.85rem",
                  opacity: 0.65,
                  marginBottom: "1rem",
                }}
              >
                {game.id}
              </p>
              <button
                onClick={() => navigate(game.route)}
                style={{
                  padding: "0.5rem 1.5rem",
                  borderRadius: "8px",
                  border: "none",
                  background: isDark ? "#5a4fcf" : "#4a3c8a",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
                data-testid={`button-play-${game.id}`}
              >
                Play
              </button>
            </div>
          ))}
          <div
            style={{
              background: isDark ? "rgba(42,42,64,0.6)" : "rgba(0,0,0,0.03)",
              borderRadius: "12px",
              padding: "1.25rem 1.5rem",
              border: `1px dashed ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
            }}
            data-testid="game-card-create"
          >
            <h2
              style={{
                fontSize: "1.15rem",
                fontWeight: 600,
                marginBottom: "0.35rem",
              }}
              data-testid="game-title-create"
            >
              Create Your Own Game
            </h2>
            <p
              style={{
                fontSize: "0.85rem",
                opacity: 0.65,
                marginBottom: "1rem",
              }}
            >
              Build your own interactive experience. (Coming Soon)
            </p>
            <button
              onClick={() => navigate("/interactive/create")}
              style={{
                padding: "0.5rem 1.5rem",
                borderRadius: "8px",
                border: "none",
                background: isDark ? "rgba(90,79,207,0.5)" : "rgba(74,60,138,0.6)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
              data-testid="button-create-game"
            >
              Create
            </button>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              background: "none",
              border: "none",
              color: isDark ? "#aaa" : "#666",
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
            data-testid="button-hub-back-home"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
