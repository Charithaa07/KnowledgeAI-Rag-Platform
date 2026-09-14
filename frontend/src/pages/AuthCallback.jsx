import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Brain, Loader2 } from "lucide-react";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash = window.location.hash;
    const sessionId = new URLSearchParams(hash.replace("#", "")).get("session_id");
    if (!sessionId) {
      navigate("/login");
      return;
    }
    (async () => {
      try {
        const res = await api.post("/auth/session", {}, { headers: { "X-Session-ID": sessionId } });
        setUser(res.data.user);
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/dashboard", { state: { user: res.data.user } });
      } catch {
        navigate("/login");
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#09090B] gap-4">
      <div className="w-12 h-12 rounded-md bg-amber-500 flex items-center justify-center">
        <Brain className="text-zinc-950" />
      </div>
      <div className="flex items-center gap-2 text-zinc-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Establishing secure session…
      </div>
    </div>
  );
}
