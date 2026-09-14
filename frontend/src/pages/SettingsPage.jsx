import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { Sparkles, Save, Loader2 } from "lucide-react";

const PROVIDERS = [
  { id: "openai", label: "OpenAI GPT-4.1", desc: "Balanced reasoning & speed" },
  { id: "anthropic", label: "Anthropic Claude", desc: "Deep reasoning, long context" },
  { id: "gemini", label: "Google Gemini", desc: "Fast, multimodal" },
];

const SLIDERS = [
  { key: "temperature", label: "Temperature", min: 0, max: 2, step: 0.1 },
  { key: "top_p", label: "Top P", min: 0, max: 1, step: 0.05 },
  { key: "max_tokens", label: "Max Tokens", min: 256, max: 4096, step: 128 },
];

export default function SettingsPage() {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: models } = useQuery({ queryKey: ["models"], queryFn: async () => (await api.get("/models")).data });
  const { data: settings } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });

  useEffect(() => { if (settings) setForm(settings); }, [settings, setForm]);

  if (!form) return <div className="p-10"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>;

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", form);
      toast.success("Settings saved");
    } catch { toast.error("Failed to save"); }
    finally { setSaving(false); }
  };

  const modelList = models?.[form.provider] || [];

  return (
    <div className="max-w-3xl mx-auto px-8 py-10">
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-2">Configuration</div>
        <h1 className="font-heading text-4xl font-black tracking-tighter text-zinc-50">Settings</h1>
        <p className="text-sm text-zinc-400 mt-2">Tune the model and generation parameters.</p>
      </div>

      <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6 mb-6">
        <h3 className="font-heading font-semibold text-zinc-100 mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Model Provider</h3>
        <div className="grid sm:grid-cols-3 gap-3 mb-5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              data-testid={`settings-provider-${p.id}`}
              onClick={() => setForm({ ...form, provider: p.id, model: (models?.[p.id] || [])[0] })}
              className={`text-left p-4 rounded-md border transition-colors ${
                form.provider === p.id ? "border-amber-500 bg-amber-500/10" : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/40"
              }`}
            >
              <div className="text-sm font-semibold text-zinc-100">{p.label}</div>
              <div className="text-xs text-zinc-500 mt-1">{p.desc}</div>
            </button>
          ))}
        </div>
        <label className="text-xs uppercase tracking-wider font-semibold text-zinc-500">Model</label>
        <select
          data-testid="settings-model-select"
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          className="w-full mt-2 bg-zinc-900 border border-zinc-800 rounded-md px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-amber-500/50"
        >
          {modelList.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6 mb-6 space-y-8">
        <h3 className="font-heading font-semibold text-zinc-100">Generation Parameters</h3>
        {SLIDERS.map((p) => (
          <div key={p.key} data-testid={`slider-${p.key}`}>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm text-zinc-300">{p.label}</label>
              <span className="text-sm font-mono text-amber-400">{form[p.key]}</span>
            </div>
            <Slider
              value={[form[p.key]]}
              min={p.min}
              max={p.max}
              step={p.step}
              onValueChange={(v) => setForm({ ...form, [p.key]: v[0] })}
            />
          </div>
        ))}
      </div>

      <button
        data-testid="save-settings-button"
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-md bg-amber-500 text-zinc-950 font-medium text-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
      </button>
    </div>
  );
}
