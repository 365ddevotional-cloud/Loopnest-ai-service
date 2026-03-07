import { useState } from "react";
import { useLocation } from "wouter";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "./firebase";
import { useLoopNestAuth } from "./AuthContext";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { user, emailVerified } = useLoopNestAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  if (user && emailVerified) {
    navigate("/loopnest/dashboard");
    return null;
  }

  const canSubmit = email.trim() && password.trim() && !busy;

  const friendlyError = (code: string) => {
    switch (code) {
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid email or password.";
      case "auth/email-already-in-use":
        return "An account with this email already exists.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      default:
        return "Something went wrong. Please try again.";
    }
  };

  const handleSignIn = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      if (!result.user.emailVerified) {
        setInfo("Please verify your email before logging in. Check your inbox.");
      } else {
        navigate("/loopnest/dashboard");
      }
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await sendEmailVerification(result.user);
      setInfo("Account created! Check your email to verify before logging in.");
      setMode("signin");
    } catch (err: any) {
      setError(friendlyError(err.code));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (mode === "signin") {
      handleSignIn();
    } else {
      handleSignUp();
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.65rem 0.75rem",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "0.9rem",
    boxSizing: "border-box",
    outline: "none",
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
          {mode === "signin" ? "Sign in to continue" : "Create your account"}
        </p>

        {error && (
          <div
            style={{
              background: "#fef2f2",
              color: "#dc2626",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              marginBottom: "1rem",
              border: "1px solid #fecaca",
            }}
            data-testid="login-error"
          >
            {error}
          </div>
        )}

        {info && (
          <div
            style={{
              background: "#eff6ff",
              color: "#2563eb",
              padding: "0.6rem 0.75rem",
              borderRadius: "8px",
              fontSize: "0.8rem",
              marginBottom: "1rem",
              border: "1px solid #bfdbfe",
            }}
            data-testid="login-info"
          >
            {info}
          </div>
        )}

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
              style={inputStyle}
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
              placeholder={mode === "signup" ? "At least 6 characters" : "Enter password"}
              style={inputStyle}
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
            {busy ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError("");
              setInfo("");
            }}
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
            data-testid="button-loopnest-toggle-mode"
          >
            {mode === "signin" ? "Create Account" : "Back to Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
