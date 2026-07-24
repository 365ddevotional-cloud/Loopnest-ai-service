import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useUser } from "@/contexts/UserContext";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SignIn() {
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get("return") || "/";
  const pendingAction = params.get("action") || "";
  const pendingSongId = params.get("songId") ? Number(params.get("songId")) : null;

  const { user, loading, emailVerified, signIn, signUp, resetPassword, getIdToken, signUserOut, resendVerification, checkEmailVerified } = useUser();
  const { toast } = useToast();

  const tabParam = params.get("tab");
  const [tab, setTab] = useState<"signin" | "signup" | "reset">(
    tabParam === "signup" ? "signup" : tabParam === "reset" ? "reset" : "signin"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [signedUpAwaitingVerification, setSignedUpAwaitingVerification] = useState(false);

  // Verification screen state
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifyingCheck, setVerifyingCheck] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [initialSendFailed, setInitialSendFailed] = useState(false);
  const [initialSendErrorCode, setInitialSendErrorCode] = useState<string | undefined>();

  useEffect(() => {
    if (loading) return;
    if (user && emailVerified) {
      handlePostSignIn();
    }
  }, [user, emailVerified, loading]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handlePostSignIn = async () => {
    if (pendingAction === "save" && pendingSongId && user) {
      try {
        const token = await getIdToken();
        if (token) {
          await fetch("/api/user/library/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ songId: pendingSongId }),
          });
          queryClient.invalidateQueries({ queryKey: ["/api/user/library/saved"] });
          toast({ title: "Song saved to your library!" });
        }
      } catch {}
    }
    setLocation(returnUrl);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error ?? "Sign-in failed.");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    const result = await signUp(email, password);
    setSubmitting(false);
    if (result.success) {
      // Track whether the verification email actually sent so the screen can report accurately
      setInitialSendFailed(!result.emailSent);
      setInitialSendErrorCode(result.emailErrorCode);
      setSignedUpAwaitingVerification(true);
    } else {
      setError(result.error ?? "Could not create account.");
    }
  };

  const handleResend = async () => {
    if (resending || resendCooldown > 0) return;
    setResending(true);
    setVerifyMsg(null);
    const result = await resendVerification();
    setResending(false);
    if (result.sent) {
      setInitialSendFailed(false);
      setInitialSendErrorCode(undefined);
      setVerifyMsg({ type: "success", text: "Verification email sent! Check your inbox and spam folder." });
      setResendCooldown(60);
    } else {
      const code = result.errorCode ?? "";
      const text =
        code === "auth/too-many-requests"
          ? "Too many attempts. Please wait a few minutes and try again."
          : code === "no-session"
          ? "Session expired. Please sign in again."
          : code === "auth/user-disabled"
          ? "This account has been disabled. Please contact support."
          : code === "auth/network-request-failed"
          ? "Network error. Check your connection and try again."
          : code === "auth/unauthorized-continue-uri" || code === "auth/unauthorized-domain"
          ? `Email delivery unavailable on this domain (${code}). Try on the production site.`
          : `Could not send email${code ? ` (${code})` : ""}. Please try again.`;
      setVerifyMsg({ type: "error", text });
    }
  };

  const handleVerifiedContinue = async () => {
    setVerifyingCheck(true);
    setVerifyMsg(null);
    try {
      const verified = await checkEmailVerified();
      if (verified) {
        // Force a full reload so onAuthStateChanged picks up the refreshed token
        window.location.reload();
      } else {
        setVerifyMsg({ type: "error", text: "Your email is not verified yet. Check your inbox and spam folder, then try again." });
      }
    } catch {
      setVerifyMsg({ type: "error", text: "Could not check verification status. Please try again." });
    } finally {
      setVerifyingCheck(false);
    }
  };

  const handleUseDifferentEmail = async () => {
    await signUserOut();
    // After sign-out, user becomes null — the form renders automatically
    setTab("signup");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError("");
    setInitialSendFailed(false);
    setInitialSendErrorCode(undefined);
    setVerifyMsg(null);
  };

  const handleCancelVerification = async () => {
    await signUserOut();
    setLocation(returnUrl !== "/signin" ? returnUrl : "/");
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const result = await resetPassword(email);
    setSubmitting(false);
    if (result.success) {
      setResetSent(true);
    } else {
      setError(result.error ?? "Could not send reset email.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !emailVerified) {
    return (
      <div className="max-w-md mx-auto pt-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-primary text-center">Verify Your Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center text-center gap-2">
              <Mail className="w-12 h-12 text-primary/60" />
              {initialSendFailed ? (
                <Alert variant="destructive" className="text-left">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>
                    We could not send the verification email
                    {initialSendErrorCode ? ` (${initialSendErrorCode})` : ""}.
                    Please tap <strong>Resend</strong> to try again, or use a different email address.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-sm text-foreground">
                  A verification link was sent to{" "}
                  <span className="font-semibold">{user.email}</span>.
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Check your inbox and spam folder. Once you verify, tap the button below.
              </p>
            </div>

            {verifyMsg && (
              <Alert variant={verifyMsg.type === "error" ? "destructive" : "default"}>
                {verifyMsg.type === "error"
                  ? <AlertCircle className="w-4 h-4" />
                  : <CheckCircle className="w-4 h-4 text-green-600" />}
                <AlertDescription>{verifyMsg.text}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={handleVerifiedContinue}
                disabled={verifyingCheck}
                size="sm"
                data-testid="button-verified-continue"
              >
                {verifyingCheck && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                I've Verified — Continue
              </Button>

              <Button
                onClick={handleResend}
                variant="outline"
                size="sm"
                disabled={resending || resendCooldown > 0}
                data-testid="button-resend-verification"
              >
                {resending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {resendCooldown > 0
                  ? `Resend Verification Email (${resendCooldown}s)`
                  : "Resend Verification Email"}
              </Button>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-muted-foreground"
                  onClick={handleUseDifferentEmail}
                  data-testid="button-use-different-email"
                >
                  Use a Different Email
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 text-muted-foreground"
                  onClick={handleCancelVerification}
                  data-testid="button-cancel-verification"
                >
                  Cancel
                </Button>
              </div>

              <Button
                variant="link"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleCancelVerification}
                data-testid="button-back-to-signin"
              >
                <ArrowLeft className="w-3 h-3 mr-1" /> Back to Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // signedUpAwaitingVerification is superseded by the user && !emailVerified block above
  // (Firebase fires onAuthStateChanged synchronously for the new user).
  // Kept as a fallback for environments where auth state lags.
  if (signedUpAwaitingVerification) {
    return (
      <div className="max-w-md mx-auto pt-10 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-primary text-center">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            {initialSendFailed ? (
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            ) : (
              <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
            )}
            {initialSendFailed ? (
              <p className="text-sm text-destructive font-medium">
                Account created but we could not send the verification email
                {initialSendErrorCode ? ` (${initialSendErrorCode})` : ""}. Sign in below and resend from the verification screen.
              </p>
            ) : (
              <p className="text-sm text-foreground">
                We sent a verification link to <span className="font-semibold">{email}</span>.
                Click it, then sign in below.
              </p>
            )}
            <Button onClick={() => setSignedUpAwaitingVerification(false)} variant="outline" size="sm">
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto pt-6 pb-12">
      <div className="text-center mb-6">
        <h1 className="font-serif text-3xl text-primary mb-1">Your Account</h1>
        <p className="text-sm text-muted-foreground">
          Save songs, favorites, and access them on any device — free.
        </p>
        {pendingAction === "save" && pendingSongId && (
          <div className="mt-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 px-4 py-2 text-xs text-amber-800 dark:text-amber-300">
            Sign in to save this song to your library automatically.
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={(v) => { setTab(v as any); setError(""); setResetSent(false); }}>
        <TabsList className="w-full">
          <TabsTrigger value="signin" className="flex-1" data-testid="tab-signin">Sign In</TabsTrigger>
          <TabsTrigger value="signup" className="flex-1" data-testid="tab-signup">Create Account</TabsTrigger>
          <TabsTrigger value="reset" className="flex-1" data-testid="tab-reset">Forgot Password</TabsTrigger>
        </TabsList>

        {/* ── Sign In ── */}
        <TabsContent value="signin">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="si-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="si-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="pl-9"
                      data-testid="input-signin-email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="si-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="si-password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="pl-9 pr-10"
                      data-testid="input-signin-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={submitting} data-testid="button-signin-submit">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Create Account ── */}
        <TabsContent value="signup">
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="su-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="pl-9"
                      data-testid="input-signup-email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="su-password"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                      autoComplete="new-password"
                      className="pl-9 pr-10"
                      data-testid="input-signup-password"
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-confirm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="su-confirm"
                      type={showPw ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      autoComplete="new-password"
                      className="pl-9"
                      data-testid="input-signup-confirm"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  A verification email will be sent. Your account is free and does not require a subscription.
                </p>
                <Button type="submit" className="w-full" disabled={submitting} data-testid="button-signup-submit">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Create Free Account
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Forgot Password ── */}
        <TabsContent value="reset">
          <Card>
            <CardContent className="pt-6">
              {resetSent ? (
                <div className="text-center space-y-3 py-4">
                  <CheckCircle className="w-10 h-10 mx-auto text-green-600" />
                  <p className="text-sm font-medium">Password reset email sent</p>
                  <p className="text-xs text-muted-foreground">Check your inbox for instructions from Firebase / Google.</p>
                  <Button variant="outline" size="sm" onClick={() => setTab("signin")}>Back to Sign In</Button>
                </div>
              ) : (
                <form onSubmit={handleReset} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="w-4 h-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Enter your email address and we'll send a password reset link.
                  </p>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        autoComplete="email"
                        className="pl-9"
                        data-testid="input-reset-email"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting} data-testid="button-reset-submit">
                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Send Reset Link
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
