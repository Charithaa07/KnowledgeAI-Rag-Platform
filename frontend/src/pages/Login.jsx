import { Brain, ShieldCheck, Sparkles, FileSearch } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function Login() {
  const handleLogin = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const features = [
    { icon: FileSearch, title: "Retrieval-Augmented Answers", desc: "Every response is grounded in your documents with inline citations." },
    { icon: Sparkles, title: "Multi-Model Intelligence", desc: "Switch between GPT-4.1, Claude & Gemini on the fly." },
    { icon: ShieldCheck, title: "Enterprise Security", desc: "Role-based access, prompt-injection guards, encrypted sessions." },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#09090B]">
      {/* Left: brand / imagery */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden border-r border-zinc-800">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1526289034009-0240ddb68ce3?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-amber-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-zinc-950" />
          </div>
          <span className="font-heading font-bold text-xl tracking-tight text-zinc-50">KnowledgeAI</span>
        </div>
        <div className="relative z-10 space-y-8 max-w-md">
          <h1 className="font-heading text-4xl font-black tracking-tighter text-zinc-50 leading-tight">
            Your company's knowledge, <span className="text-amber-500">instantly answerable.</span>
          </h1>
          <div className="space-y-5">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="w-9 h-9 shrink-0 rounded-md border border-zinc-700 bg-zinc-900/60 flex items-center justify-center">
                  <f.icon className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-100">{f.title}</div>
                  <div className="text-xs text-zinc-400 leading-relaxed">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-[11px] uppercase tracking-[0.2em] text-zinc-600 font-semibold">
          Enterprise AI Knowledge Assistant
        </div>
      </div>

      {/* Right: auth */}
      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm animate-fadeup">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-md bg-amber-500 flex items-center justify-center">
              <Brain className="w-5 h-5 text-zinc-950" />
            </div>
            <span className="font-heading font-bold text-xl text-zinc-50">KnowledgeAI</span>
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-3">Welcome back</div>
          <h2 className="font-heading text-3xl font-bold tracking-tight text-zinc-50 mb-2">Sign in to continue</h2>
          <p className="text-sm text-zinc-400 mb-8">Access your workspace, documents and AI conversations.</p>

          <button
            data-testid="google-login-button"
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-md bg-white text-zinc-900 font-medium text-sm hover:bg-zinc-100 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51z" />
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-zinc-500 mt-6 leading-relaxed">
            By continuing you agree to our Terms of Service and Privacy Policy. Sessions are secured for 7 days.
          </p>
        </div>
      </div>
    </div>
  );
}
