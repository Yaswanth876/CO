import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import SubjectWorkspace from "./pages/SubjectWorkspace";
import { logout } from "./lib/api";

/** Wraps the nested Outlet with AnimatePresence keyed on location */
function AnimatedOutlet() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {/* Outlet is re-mounted when the key (pathname) changes */}
      <Outlet key={location.pathname} />
    </AnimatePresence>
  );
}

function DashboardLayout({ user, onLogout }) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        user={user}
        onMenuClick={() => setSidebarOpen(true)}
        onOpenProfile={() => navigate("/profile")}
        onOpenSettings={() => navigate("/settings")}
        onLogout={onLogout}
      />

      <div className="pt-24 md:pt-20">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        />

        <main
          className={
            `h-[calc(100vh-6rem)] md:h-[calc(100vh-5rem)] min-w-0 overflow-y-auto transition-[margin] duration-300 ${
              sidebarCollapsed ? "md:ml-[70px]" : "md:ml-[240px]"
            }`
          }
        >
          {/* AnimatedOutlet handles page transitions within the dashboard shell */}
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const cachedUser = localStorage.getItem("coas-user");
    if (!cachedUser) {
      return;
    }

    try {
      setCurrentUser(JSON.parse(cachedUser));
    } catch {
      localStorage.removeItem("coas-user");
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null);
      localStorage.removeItem("coas-user");
    };

    window.addEventListener("coas-auth-expired", handleAuthExpired);
    return () => window.removeEventListener("coas-auth-expired", handleAuthExpired);
  }, []);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem("coas-user", JSON.stringify(user));
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    localStorage.removeItem("coas-user");
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to={currentUser ? "/dashboard" : "/login"} replace />} />
      <Route path="/login" element={<Login onLogin={handleLogin} />} />
      <Route
        element={
          <DashboardLayout
            user={currentUser}
            onLogout={handleLogout}
          />
        }
      >
        <Route path="/dashboard" element={<Dashboard user={currentUser} />} />
        <Route path="/subjects" element={<SubjectWorkspace user={currentUser} />} />
        <Route path="/subjects/:subjectCode/workspace" element={<SubjectWorkspace user={currentUser} />} />
        <Route path="/profile" element={<Profile user={currentUser} />} />
        <Route path="/reports" element={<Reports user={currentUser} />} />
        <Route path="/settings" element={<Settings user={currentUser} />} />
      </Route>
    </Routes>
  );
}

export default App;