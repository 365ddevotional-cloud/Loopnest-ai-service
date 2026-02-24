import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  emailVerified: false,
  logout: async () => {},
  refreshUser: async () => {},
});

export function LoopNestAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setVerified(firebaseUser?.emailVerified ?? false);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const refreshUser = useCallback(async () => {
    const current = auth.currentUser;
    if (current) {
      await current.reload();
      setUser(Object.create(Object.getPrototypeOf(current), Object.getOwnPropertyDescriptors(current)));
      setVerified(current.emailVerified);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        emailVerified: verified,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useLoopNestAuth() {
  return useContext(AuthContext);
}
