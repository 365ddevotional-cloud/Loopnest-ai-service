import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLoopNestAuth } from "./AuthContext";

export default function LoopNestRoot() {
  const [, navigate] = useLocation();
  const { user, loading, emailVerified } = useLoopNestAuth();

  useEffect(() => {
    if (loading) return;
    if (user && emailVerified) {
      navigate("/loopnest/dashboard");
    } else {
      navigate("/loopnest/login");
    }
  }, [user, loading, emailVerified, navigate]);

  return null;
}
