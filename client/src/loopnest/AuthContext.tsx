import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

interface LoopNestUser {
  email: string;
}

interface AuthContextType {
  user: LoopNestUser | null;
  login: (email: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

const STORAGE_KEY = "loopnest_user";

export function LoopNestAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoopNestUser | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const login = useCallback((email: string) => {
    const u = { email };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useLoopNestAuth() {
  return useContext(AuthContext);
}
