import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Brain, LayoutDashboard, MessagesSquare, Database, Search,
  Settings, Shield, LogOut, User,
} from "lucide-react";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/chat", label: "Chat", icon: MessagesSquare, testid: "nav-chat" },
  { to: "/knowledge", label: "Knowledge Base", icon: Database, testid: "nav-knowledge" },
  { to: "/search", label: "Semantic Search", icon: Search, testid: "nav-search" },
  { to: "/settings", label: "Settings", icon: Settings, testid: "nav-settings" },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const itemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
      isActive
        ? "text-amber-400 bg-amber-500/10 border border-amber-500/20"
        : "text-zinc-400 hover:text-zinc-50 hover:bg-zinc-900 border border-transparent"
    }`;

  return (
    <div className="flex h-screen bg-[#09090B] overflow-hidden">
      <aside className="w-64 shrink-0 bg-[#09090B] border-r border-zinc-800 flex flex-col">
        <div className="h-16 flex items-center gap-3 px-5 border-b border-zinc-800">
          <div className="w-8 h-8 rounded-md bg-amber-500 flex items-center justify-center">
            <Brain className="w-5 h-5 text-zinc-950" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight text-zinc-50">KnowledgeAI</span>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-600 px-3 py-2">Workspace</div>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} className={itemClass} data-testid={n.testid}>
              <n.icon className="w-4 h-4" />
              {n.label}
            </NavLink>
          ))}
          {user?.role === "admin" && (
            <>
              <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-600 px-3 py-2 mt-4">Administration</div>
              <NavLink to="/admin" className={itemClass} data-testid="nav-admin">
                <Shield className="w-4 h-4" />
                Admin Dashboard
              </NavLink>
            </>
          )}
        </nav>

        <div className="p-3 border-t border-zinc-800">
          <button
            data-testid="profile-button"
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-zinc-900 transition-colors"
          >
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-8 h-8 rounded-md object-cover border border-zinc-700" />
            ) : (
              <div className="w-8 h-8 rounded-md bg-zinc-800 flex items-center justify-center">
                <User className="w-4 h-4 text-zinc-400" />
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium text-zinc-100 truncate">{user?.name || "User"}</div>
              <div className="text-xs text-zinc-500 truncate">{user?.email}</div>
            </div>
          </button>
          <button
            data-testid="logout-button"
            onClick={logout}
            className="w-full mt-1 flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
