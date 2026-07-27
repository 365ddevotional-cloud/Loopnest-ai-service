import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";


const LOCAL_SONG_FAV_KEY = "spirittone-song-favorites";
export const LOCAL_DEV_SAVE_KEY = "devotional-saves"; // array of devotional IDs

interface UserContextType {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  getIdToken: () => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; emailSent?: boolean; emailErrorCode?: string }>;
  signUserOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: () => Promise<{ sent: boolean; errorCode?: string }>;
  checkEmailVerified: () => Promise<boolean>;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  emailVerified: false,
  getIdToken: async () => null,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signUserOut: async () => {},
  resetPassword: async () => ({ success: false }),
  resendVerification: async () => ({ sent: false }),
  checkEmailVerified: async () => false,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const mergeLocalFavorites = useCallback(async (firebaseUser: User) => {
    try {
      const raw = localStorage.getItem(LOCAL_SONG_FAV_KEY);
      if (!raw) return;
      const localIds: number[] = JSON.parse(raw);
      if (!Array.isArray(localIds) || localIds.length === 0) return;

      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/user/library/favorites/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ songIds: localIds }),
      });
      if (res.ok) {
        localStorage.removeItem(LOCAL_SONG_FAV_KEY);
        queryClient.invalidateQueries({ queryKey: ["/api/user/library/favorites"] });
      }
    } catch {
      // silently ignore — local favorites preserved
    }
  }, []);

  const mergeLocalDevotionalSaves = useCallback(async (firebaseUser: User) => {
    try {
      const raw = localStorage.getItem(LOCAL_DEV_SAVE_KEY);
      if (!raw) return;
      const localIds: number[] = JSON.parse(raw);
      if (!Array.isArray(localIds) || localIds.length === 0) return;

      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/user/devotional/saved/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ devotionalIds: localIds }),
      });
      if (res.ok) {
        localStorage.removeItem(LOCAL_DEV_SAVE_KEY);
        queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/saved"] });
      }
    } catch {
      // silently ignore — local saves preserved
    }
  }, []);

  const syncUserProfile = useCallback(async (firebaseUser: User) => {
    try {
      const token = await firebaseUser.getIdToken();
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email: firebaseUser.email ?? "",
          displayName: firebaseUser.displayName ?? null,
        }),
      });
    } catch { /* silently ignore — auth still works without profile row */ }
  }, []);

  const recordDailyActivity = useCallback(async (firebaseUser: User) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const key = `activity-pinged-${today}`;
      if (localStorage.getItem(key)) return;
      const token = await firebaseUser.getIdToken();
      const res = await fetch("/api/user/activity", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) localStorage.setItem(key, "1");
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        await mergeLocalFavorites(firebaseUser);
        await mergeLocalDevotionalSaves(firebaseUser);
        syncUserProfile(firebaseUser);
        recordDailyActivity(firebaseUser);
        queryClient.invalidateQueries({ queryKey: ["/api/user/library/saved"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/library/favorites"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/saved"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/history"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/streak"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      }
    });
    return unsubscribe;
  }, [mergeLocalFavorites, mergeLocalDevotionalSaves, syncUserProfile, recordDailyActivity]);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      return await user.getIdToken();
    } catch {
      return null;
    }
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Reload to get the most current emailVerified state before the caller checks it
      try { await cred.user.reload(); } catch { /* non-fatal */ }
      return { success: true };
    } catch (err: any) {
      const code = err?.code ?? "";
      const error =
        code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password"
          ? "Incorrect email or password."
          : code === "auth/too-many-requests"
          ? "Too many attempts. Please try again later."
          : code === "auth/user-disabled"
          ? "This account has been disabled."
          : "Sign-in failed. Please try again.";
      return { success: false, error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    let cred: Awaited<ReturnType<typeof createUserWithEmailAndPassword>> | null = null;

    // Step 1: Create the Firebase account
    try {
      cred = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      const code = err?.code ?? "";
      if (import.meta.env.DEV) {
        console.error("[signUp] Firebase createUser error:", code, err?.message);
      }
      const error =
        code === "auth/email-already-in-use"
          ? "An account already exists with this email. Please sign in or use Forgot Password."
          : code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : code === "auth/weak-password"
          ? "Please choose a stronger password."
          : code === "auth/operation-not-allowed"
          ? "Email and password account creation is not yet enabled. Please contact support."
          : code === "auth/network-request-failed"
          ? "We could not connect. Please check your internet connection and try again."
          : code === "auth/unauthorized-domain"
          ? "This preview address is not yet authorized for account creation. Please contact support."
          : code === "auth/too-many-requests"
          ? "Too many attempts. Please wait a moment and try again."
          : "We could not create your account. Please try again or contact support.";
      return { success: false, error };
    }

    // Step 2: Send verification email — failure here does NOT mean account creation failed
    // No ActionCodeSettings / continueUrl to avoid auth/unauthorized-continue-uri
    let emailSent = false;
    let emailErrorCode: string | undefined;
    try {
      await sendEmailVerification(cred.user);
      emailSent = true;
    } catch (err: any) {
      emailErrorCode = err?.code ?? "unknown";
      console.error("[signUp] sendEmailVerification error:", emailErrorCode, err?.message);
      // Account was created; verification email failed — caller can surface this
    }

    return { success: true, emailSent, emailErrorCode };
  }, []);

  const signUserOut = useCallback(async () => {
    await signOut(auth);
    queryClient.clear();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      // No actionCodeSettings/continueUrl — avoids auth/unauthorized-continue-uri
      // on domains not listed in Firebase authorized domains
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err: any) {
      const code = err?.code ?? "unknown";
      console.error("[resetPassword] Firebase error:", code, err?.message);
      // auth/user-not-found: treat as success to prevent account enumeration
      if (code === "auth/user-not-found") {
        return { success: true };
      }
      // auth/invalid-email or auth/invalid-credential: surface as input error
      if (code === "auth/invalid-email" || code === "auth/invalid-credential") {
        return { success: false, error: "Please enter a valid email address." };
      }
      // Anything else is a technical failure
      return { success: false, error: `Could not send reset email (${code}). Please try again.` };
    }
  }, []);

  const resendVerification = useCallback(async (): Promise<{ sent: boolean; errorCode?: string }> => {
    // Always use auth.currentUser for reliability — the context user state may lag
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return { sent: false, errorCode: "no-session" };
    }
    if (currentUser.emailVerified) return { sent: true };
    try {
      // No ActionCodeSettings / continueUrl to avoid auth/unauthorized-continue-uri
      await sendEmailVerification(currentUser);
      return { sent: true };
    } catch (err: any) {
      const code = err?.code ?? "unknown";
      console.error("[resendVerification] Firebase error:", code, err?.message);
      return { sent: false, errorCode: code };
    }
  }, []);

  const checkEmailVerified = useCallback(async (): Promise<boolean> => {
    const currentUser = auth.currentUser;
    if (!currentUser) return false;
    try {
      await currentUser.reload();
      return auth.currentUser?.emailVerified ?? false;
    } catch {
      return false;
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        emailVerified: user?.emailVerified ?? false,
        getIdToken,
        signIn,
        signUp,
        signUserOut,
        resetPassword,
        resendVerification,
        checkEmailVerified,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
