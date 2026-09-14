import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import AuthCallback from "@/pages/AuthCallback";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import KnowledgeBase from "@/pages/KnowledgeBase";
import ChatPage from "@/pages/ChatPage";
import SearchPage from "@/pages/SearchPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import ProfilePage from "@/pages/ProfilePage";
import { Loader2 } from "lucide-react";
import "@/App.css";

function Protected({ children, adminOnly }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090B]">
        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
      <Route path="/chat" element={<Protected><ChatPage /></Protected>} />
      <Route path="/knowledge" element={<Protected><KnowledgeBase /></Protected>} />
      <Route path="/search" element={<Protected><SearchPage /></Protected>} />
      <Route path="/settings" element={<Protected><SettingsPage /></Protected>} />
      <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
      <Route path="/admin" element={<Protected adminOnly><AdminPage /></Protected>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster theme="dark" position="top-right" richColors />
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  );
}
