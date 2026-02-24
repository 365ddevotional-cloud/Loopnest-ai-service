import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLoopNestAuth } from "./AuthContext";
import CreateGamePage from "@/game-engine/CreateGamePage";

export default function BuilderPage() {
  const [, navigate] = useLocation();
  const { user, loading, emailVerified } = useLoopNestAuth();

  useEffect(() => {
    if (loading) return;
    if (!user || !emailVerified) {
      navigate("/loopnest/login");
    }
  }, [user, loading, emailVerified, navigate]);

  if (loading || !user || !emailVerified) return null;

  return (
    <div data-testid="loopnest-builder">
      <div
        style={{
          background: "#f5f3ff",
          padding: "0.75rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #e0e0e0",
        }}
      >
        <button
          onClick={() => navigate("/loopnest/dashboard")}
          style={{
            background: "none",
            border: "none",
            color: "#667eea",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
          data-testid="button-builder-back-dashboard"
        >
          Back to Dashboard
        </button>
        <span style={{ fontSize: "0.8rem", color: "#999" }}>LoopNest Builder</span>
      </div>
      <CreateGamePage />
    </div>
  );
}
