import { useAuth } from "@/context/AuthContext";
import { Mail, Shield, User, LogOut } from "lucide-react";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-8 py-10">
      <div className="mb-8">
        <div className="text-[10px] uppercase tracking-[0.2em] font-semibold text-zinc-500 mb-2">Account</div>
        <h1 className="font-heading text-4xl font-black tracking-tighter text-zinc-50">Profile</h1>
      </div>

      <div className="bg-[#121214] border border-zinc-800 rounded-lg p-8">
        <div className="flex items-center gap-5 mb-8">
          {user.picture ? (
            <img src={user.picture} alt="" className="w-20 h-20 rounded-lg object-cover border border-zinc-700" />
          ) : (
            <div className="w-20 h-20 rounded-lg bg-zinc-800 flex items-center justify-center"><User className="w-8 h-8 text-zinc-500" /></div>
          )}
          <div>
            <div className="font-heading text-2xl font-bold text-zinc-50">{user.name}</div>
            <div className="text-sm text-zinc-400">{user.email}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-md border border-zinc-800 bg-zinc-900/40">
            <Mail className="w-4 h-4 text-amber-500" />
            <div><div className="text-xs text-zinc-500 uppercase tracking-wider">Email</div><div className="text-sm text-zinc-200">{user.email}</div></div>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-md border border-zinc-800 bg-zinc-900/40">
            <Shield className="w-4 h-4 text-amber-500" />
            <div><div className="text-xs text-zinc-500 uppercase tracking-wider">Role</div><div className="text-sm text-zinc-200 capitalize">{user.role}</div></div>
          </div>
        </div>

        <button
          data-testid="profile-logout-button"
          onClick={logout}
          className="mt-8 flex items-center gap-2 px-5 py-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-red-400 hover:border-red-500/30 text-sm font-medium transition-colors"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
      </div>
    </div>
  );
}
