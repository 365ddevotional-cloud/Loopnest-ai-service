import { useState } from "react";
import { useLocation } from "wouter";
import { useLoopNestAuth } from "./AuthContext";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { login } = useLoopNestAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSubmit = email.trim() && password.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    login(email.trim());
    navigate("/loopnest/dashboard");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: "1rem",
      }}
      data-testid="loopnest-login-page"
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: "380px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
        }}
      >
        <h1
          style={{
            textAlign: "center",
            fontSize: "1.75rem",
            fontWeight: 800,
            color: "#333",
            marginBottom: "0.25rem",
          }}
          data-testid="loopnest-login-title"
        >
          LoopNest
        </h1>
        <p
          style={{
            textAlign: "center",
            color: "#888",
            fontSize: "0.9rem",
            marginBottom: "2rem",
          }}
        >
          Create Interactive Games
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label
              htmlFor="ln-email"
              style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#555", marginBottom: "0.3rem" }}
            >
              Email
            </label>
            <input
              id="ln-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={{
                width: "100%",
                padding: "0.65rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "0.9rem",
                boxSizing: "border-box",
                outline: "none",
              }}
              data-testid="input-loopnest-email"
            />
          </div>

          <div>
            <label
              htmlFor="ln-password"
              style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#555", marginBottom: "0.3rem" }}
            >
              Password
            </label>
            <input
              id="ln-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{
                width: "100%",
                padding: "0.65rem 0.75rem",
                borderRadius: "8px",
                border: "1px solid #ddd",
                fontSize: "0.9rem",
                boxSizing: "border-box",
                outline: "none",
              }}
              data-testid="input-loopnest-password"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "0.7rem",
              borderRadius: "8px",
              border: "none",
              background: canSubmit ? "linear-gradient(135deg, #667eea, #764ba2)" : "#ccc",
              color: "#fff",
              fontWeight: 700,
              fontSize: "0.95rem",
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
            data-testid="button-loopnest-signin"
          >
            Sign In
          </button>

          <button
            type="button"
            style={{
              padding: "0.6rem",
              borderRadius: "8px",
              border: "1px solid #ddd",
              background: "#fff",
              color: "#555",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
            data-testid="button-loopnest-create-account"
          >
            Create Account
          </button>
        </form>
      </div>
    </div>
  );
}
