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
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUserOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  resendVerification: () => Promise<void>;
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
  resendVerification: async () => {},
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        await mergeLocalFavorites(firebaseUser);
        await mergeLocalDevotionalSaves(firebaseUser);
        queryClient.invalidateQueries({ queryKey: ["/api/user/library/saved"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/library/favorites"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/saved"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/history"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/streak"] });
      }
    });
    return unsubscribe;
  }, [mergeLocalFavorites, mergeLocalDevotionalSaves]);

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
      await signInWithEmailAndPassword(auth, email, password);
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
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(cred.user);
      return { success: true };
    } catch (err: any) {
      const code = err?.code ?? "";
      const error =
        code === "auth/email-already-in-use"
          ? "An account with this email already exists."
          : code === "auth/weak-password"
          ? "Password must be at least 6 characters."
          : code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : "Could not create account. Please try again.";
      return { success: false, error };
    }
  }, []);

  const signUserOut = useCallback(async () => {
    await signOut(auth);
    queryClient.invalidateQueries({ queryKey: ["/api/user/library/saved"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/library/favorites"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/library/downloads"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/saved"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/history"] });
    queryClient.invalidateQueries({ queryKey: ["/api/user/devotional/streak"] });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err: any) {
      const code = err?.code ?? "";
      const error =
        code === "auth/user-not-found" || code === "auth/invalid-email"
          ? "No account found with that email address."
          : "Could not send reset email. Please try again.";
      return { success: false, error };
    }
  }, []);

  const resendVerification = useCallback(async () => {
    if (user && !user.emailVerified) {
      try {
        await sendEmailVerification(user);
        toast({ title: "Verification email sent", description: "Check your inbox." });
      } catch {
        toast({ title: "Could not resend email", variant: "destructive" });
      }
    }
  }, [user, toast]);

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
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
