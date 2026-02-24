import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLoopNestAuth } from "./AuthContext";

export default function LoopNestRoot() {
  const [, navigate] = useLocation();
  const { user } = useLoopNestAuth();

  useEffect(() => {
    if (user) {
      navigate("/loopnest/dashboard");
    } else {
      navigate("/loopnest/login");
    }
  }, [user, navigate]);

  return null;
}
