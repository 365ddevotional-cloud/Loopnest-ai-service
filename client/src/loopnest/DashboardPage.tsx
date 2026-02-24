import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLoopNestAuth } from "./AuthContext";

type PlanTier = "FREE" | "PRO" | "STUDIO";

const plans: {
  tier: PlanTier;
  label: string;
  color: string;
  bg: string;
  border: string;
  features: string[];
}[] = [
  {
    tier: "FREE",
    label: "Free",
    color: "#6b7280",
    bg: "#f9fafb",
    border: "#e5e7eb",
    features: ["3 Saved Games", "Watermark on games", "No export"],
  },
  {
    tier: "PRO",
    label: "Pro",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#bfdbfe",
    features: ["Unlimited Saves", "No Watermark", "Export JSON"],
  },
  {
    tier: "STUDIO",
    label: "Studio",
    color: "#b45309",
    bg: "#fffbeb",
    border: "#fde68a",
    features: [
      "Everything in Pro",
      "Standalone Export",
      "Public Publish",
      "Analytics (Coming Soon)",
    ],
  },
];

function PlanBadge({ tier }: { tier: PlanTier }) {
  const plan = plans.find((p) => p.tier === tier)!;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.75rem",
        borderRadius: "999px",
        fontSize: "0.75rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
        color: "#fff",
        background: plan.color,
      }}
      data-testid="badge-current-plan"
    >
      {plan.label.toUpperCase()}
    </span>
  );
}

export default function DashboardPage() {
  const [, navigate] = useLocation();
  const { user, logout, loading, emailVerified, refreshUser } = useLoopNestAuth();
  const [currentPlan, setCurrentPlan] = useState<PlanTier>(() => {
    return (localStorage.getItem("loopnest_plan") as PlanTier) || "FREE";
  });

  useEffect(() => {
    if (loading) return;
    if (!user || !emailVerified) {
      if (!user) navigate("/loopnest/login");
    }
  }, [user, loading, emailVerified, navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f3ff" }}>
        <p style={{ color: "#888" }}>Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  if (!emailVerified) {
    return (
      <div
        style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f5f3ff", padding: "1rem" }}
        data-testid="loopnest-verify-email"
      >
        <div style={{ background: "#fff", borderRadius: "16px", padding: "2.5rem 2rem", maxWidth: "400px", textAlign: "center", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#333", marginBottom: "0.75rem" }}>Verify Your Email</h2>
          <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            Please verify your email to continue. Check your inbox for a verification link.
          </p>
          <button
            onClick={async () => {
              await refreshUser();
            }}
            style={{ padding: "0.6rem 1.5rem", borderRadius: "8px", border: "1px solid #ddd", background: "#fff", color: "#555", fontWeight: 600, cursor: "pointer", marginRight: "0.5rem" }}
            data-testid="button-refresh-verification"
          >
            I've Verified
          </button>
          <button
            onClick={async () => { await logout(); navigate("/loopnest/login"); }}
            style={{ padding: "0.6rem 1.5rem", borderRadius: "8px", border: "none", background: "#667eea", color: "#fff", fontWeight: 600, cursor: "pointer" }}
            data-testid="button-back-login"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  const switchPlan = (tier: PlanTier) => {
    localStorage.setItem("loopnest_plan", tier);
    window.location.reload();
  };

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
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>
        <h1
          style={{ fontSize: "1.5rem", fontWeight: 800, color: "#333", marginBottom: "0.25rem" }}
          data-testid="loopnest-dashboard-title"
        >
          LoopNest Dashboard
        </h1>
        <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: "2rem" }}>
          Welcome, {user.email || "User"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2.5rem" }}>
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
            onClick={() => {
              const el = document.getElementById("plan-section");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
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
            onClick={async () => {
              await logout();
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

        <div id="plan-section">
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#333", margin: 0 }}>
              Your Plan
            </h2>
            <PlanBadge tier={currentPlan} />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "1rem",
            }}
            data-testid="plan-cards-grid"
          >
            {plans.map((plan) => {
              const isCurrent = currentPlan === plan.tier;
              return (
                <div
                  key={plan.tier}
                  style={{
                    background: "#fff",
                    border: isCurrent ? `2px solid ${plan.color}` : `1px solid ${plan.border}`,
                    borderRadius: "14px",
                    padding: "1.25rem 1rem",
                    boxShadow: isCurrent
                      ? `0 0 0 3px ${plan.color}22`
                      : "0 1px 4px rgba(0,0,0,0.06)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    transition: "box-shadow 0.2s, border-color 0.2s",
                  }}
                  data-testid={`plan-card-${plan.tier.toLowerCase()}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: "1rem",
                        color: plan.color,
                      }}
                    >
                      {plan.label}
                    </span>
                    {isCurrent && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          padding: "0.1rem 0.4rem",
                          borderRadius: "999px",
                          background: plan.bg,
                          color: plan.color,
                          fontWeight: 600,
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>

                  <ul
                    style={{
                      margin: 0,
                      padding: "0 0 0 1.1rem",
                      fontSize: "0.8rem",
                      color: "#555",
                      lineHeight: "1.6",
                      flex: 1,
                    }}
                  >
                    {plan.features.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>

                  <button
                    disabled={isCurrent}
                    onClick={() => switchPlan(plan.tier)}
                    style={{
                      width: "100%",
                      padding: "0.55rem",
                      borderRadius: "8px",
                      border: isCurrent ? "1px solid #d1d5db" : "none",
                      background: isCurrent ? "#f3f4f6" : plan.color,
                      color: isCurrent ? "#9ca3af" : "#fff",
                      fontWeight: 600,
                      fontSize: "0.8rem",
                      cursor: isCurrent ? "default" : "pointer",
                      opacity: isCurrent ? 0.7 : 1,
                      transition: "opacity 0.2s",
                    }}
                    data-testid={`button-plan-${plan.tier.toLowerCase()}`}
                  >
                    {isCurrent
                      ? "Current Plan"
                      : plans.indexOf(plan) < plans.findIndex((p) => p.tier === currentPlan)
                        ? "Downgrade"
                        : plan.tier === "PRO"
                          ? "Upgrade to Pro"
                          : "Upgrade to Studio"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
