import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLoopNestAuth } from "./AuthContext";

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user, logout } = useLoopNestAuth();

  useEffect(() => {
    if (!user) {
      navigate("/loopnest/login");
    }
  }, [user, navigate]);

  if (!user) return null;

  const btnStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem 1rem",
    borderRadius: "10px",
    border: "none",
    fontWeight: 600,
    fontSize: "0.95rem",
    cursor: "pointer",
    textAlign: "left",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5f3ff",
        padding: "2rem 1rem",
      }}
      data-testid="loopnest-dashboard"
    >
      <div style={{ maxWidth: "500px", margin: "0 auto" }}>
        <h1
          style={{ fontSize: "1.5rem", fontWeight: 800, color: "#333", marginBottom: "0.25rem" }}
          data-testid="loopnest-dashboard-title"
        >
          LoopNest Dashboard
        </h1>
        <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "2rem" }}>
          Welcome, {user.email}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <button
            onClick={() => navigate("/loopnest/builder")}
            style={{
              ...btnStyle,
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "#fff",
            }}
            data-testid="button-loopnest-create-game"
          >
            Create New Game
          </button>

          <button
            style={{
              ...btnStyle,
              background: "#fff",
              color: "#555",
              border: "1px solid #e0e0e0",
            }}
            data-testid="button-loopnest-my-games"
          >
            My Games
          </button>

          <button
            style={{
              ...btnStyle,
              background: "#fff",
              color: "#555",
              border: "1px solid #e0e0e0",
            }}
            data-testid="button-loopnest-upgrade"
          >
            Upgrade Plan
          </button>

          <button
            onClick={() => {
              logout();
              navigate("/loopnest/login");
            }}
            style={{
              ...btnStyle,
              background: "transparent",
              color: "#999",
              border: "1px solid #e0e0e0",
              textAlign: "center",
              marginTop: "1rem",
            }}
            data-testid="button-loopnest-logout"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
