import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { formatBytes, CHART_TOOLTIP_STYLE } from "@/lib/format";
import {
  FileText, MessagesSquare, Sparkles, HardDrive, ArrowUpRight, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

function StatCard({ label, value, icon: Icon, sub, testid }) {
  return (
    <div
      data-testid={testid}
      className="bg-[#121214] border border-zinc-800 rounded-lg p-5 flex flex-col gap-3 transition-all duration-200 hover:border-zinc-600 hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-zinc-500">{label}</span>
        <div className="w-8 h-8 rounded-md border border-zinc-800 bg-zinc-900 flex items-center justify-center">
          <Icon className="w-4 h-4 text-amber-500" />
        </div>
      </div>
      <div className="font-heading text-3xl font-bold text-zinc-50">{value}</div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-2">Overview</div>
        <h1 className="font-heading text-4xl font-black tracking-tighter text-zinc-50">Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-2">Your knowledge workspace at a glance.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-lg bg-zinc-900/60 border border-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard testid="stat-documents" label="Total Documents" value={data.total_documents} icon={FileText} sub="Indexed & searchable" />
            <StatCard testid="stat-conversations" label="Conversations" value={data.total_conversations} icon={MessagesSquare} sub="Across all sessions" />
            <StatCard testid="stat-usage" label="AI Responses" value={data.ai_usage} icon={Sparkles} sub={`~${(data.tokens_used || 0).toLocaleString()} tokens`} />
            <StatCard testid="stat-storage" label="Storage Used" value={formatBytes(data.storage_used)} icon={HardDrive} sub="Document files" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
            <div className="lg:col-span-2 bg-[#121214] border border-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-semibold text-zinc-100">Activity (last 7 days)</h3>
                <span className="text-xs text-zinc-500">AI responses / day</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.activity}>
                  <defs>
                    <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F5A623" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#F5A623" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="messages" stroke="#F5A623" strokeWidth={2} fill="url(#amber)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6">
              <h3 className="font-heading font-semibold text-zinc-100 mb-4">Recent Chats</h3>
              {data.recent_chats.length === 0 ? (
                <div className="text-sm text-zinc-500 py-8 text-center">No conversations yet.</div>
              ) : (
                <div className="space-y-2">
                  {data.recent_chats.map((c) => (
                    <button
                      key={c.id}
                      data-testid="recent-chat-item"
                      onClick={() => navigate(`/chat?c=${c.id}`)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-md border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-colors group"
                    >
                      <MessagesSquare className="w-4 h-4 text-zinc-500 group-hover:text-amber-500 shrink-0" />
                      <span className="text-sm text-zinc-300 truncate flex-1">{c.title}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-amber-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
