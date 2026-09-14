import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatBytes, CHART_TOOLTIP_STYLE, docStatusColor } from "@/lib/format";
import { Users, FileText, Sparkles, HardDrive, Clock, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const BAR_RADIUS = [4, 4, 0, 0];

function Stat({ label, value, icon: Icon }) {
  return (
    <div className="bg-[#121214] border border-zinc-800 rounded-lg p-5 flex flex-col gap-3 hover:border-zinc-600 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] tracking-[0.15em] uppercase font-semibold text-zinc-500">{label}</span>
        <Icon className="w-4 h-4 text-amber-500" />
      </div>
      <div className="font-heading text-3xl font-bold text-zinc-50">{value}</div>
    </div>
  );
}

export default function AdminPage() {
  const { data: overview } = useQuery({ queryKey: ["admin-overview"], queryFn: async () => (await api.get("/admin/overview")).data });
  const { data: users = [] } = useQuery({ queryKey: ["admin-users"], queryFn: async () => (await api.get("/admin/users")).data });
  const { data: documents = [] } = useQuery({ queryKey: ["admin-documents"], queryFn: async () => (await api.get("/admin/documents")).data });

  if (!overview) return <div className="p-10 text-zinc-500">Loading…</div>;

  return (
    <div className="max-w-7xl mx-auto px-8 py-10">
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-2">Administration</div>
        <h1 className="font-heading text-4xl font-black tracking-tighter text-zinc-50">Admin Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-2">System-wide users, documents and AI metrics.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Users" value={overview.total_users} icon={Users} />
        <Stat label="Documents" value={overview.total_documents} icon={FileText} />
        <Stat label="AI Responses" value={overview.ai_usage} icon={Sparkles} />
        <Stat label="Storage" value={formatBytes(overview.storage_used)} icon={HardDrive} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-amber-500" /><span className="text-sm font-medium text-zinc-200">Avg Response Latency</span></div>
          <div className="font-heading text-4xl font-bold text-zinc-50">{overview.avg_latency_ms}<span className="text-lg text-zinc-500 ml-1">ms</span></div>
          <div className="text-xs text-zinc-500 mt-1">~{(overview.tokens_used || 0).toLocaleString()} total tokens processed</div>
        </div>
        <div className="bg-[#121214] border border-zinc-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-amber-500" /><span className="text-sm font-medium text-zinc-200">Model Usage</span></div>
          {overview.model_usage.length === 0 ? (
            <div className="text-xs text-zinc-500 py-8 text-center">No usage yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={overview.model_usage}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="model" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#F5A623" radius={BAR_RADIUS} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="bg-[#121214] border border-zinc-800 rounded-lg overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-zinc-800"><h3 className="font-heading font-semibold text-zinc-100">Users ({users.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>{["User", "Email", "Role", "Docs", "Chats"].map((h) => <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">{h}</th>)}</tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} data-testid="admin-user-row" className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                  <td className="px-5 py-3 text-sm text-zinc-200 flex items-center gap-2">
                    {u.picture ? <img src={u.picture} className="w-6 h-6 rounded object-cover" alt="" /> : <div className="w-6 h-6 rounded bg-zinc-800" />}
                    {u.name || "—"}
                  </td>
                  <td className="px-5 py-3 text-sm text-zinc-400">{u.email}</td>
                  <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded ${u.role === "admin" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-zinc-800 text-zinc-400"}`}>{u.role}</span></td>
                  <td className="px-5 py-3 text-sm text-zinc-300">{u.documents}</td>
                  <td className="px-5 py-3 text-sm text-zinc-300">{u.conversations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[#121214] border border-zinc-800 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800"><h3 className="font-heading font-semibold text-zinc-100">All Documents ({documents.length})</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-zinc-900/50 border-b border-zinc-800">
              <tr>{["File", "Type", "Size", "Chunks", "Status"].map((h) => <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold text-zinc-500 tracking-wider uppercase">{h}</th>)}</tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                  <td className="px-5 py-3 text-sm text-zinc-200">{d.filename}</td>
                  <td className="px-5 py-3 text-sm text-zinc-400 uppercase">{d.file_type}</td>
                  <td className="px-5 py-3 text-sm text-zinc-400">{formatBytes(d.size)}</td>
                  <td className="px-5 py-3 text-sm text-zinc-300">{d.chunk_count}</td>
                  <td className="px-5 py-3 text-sm"><span className={docStatusColor(d.status)}>{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
