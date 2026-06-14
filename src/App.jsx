import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Receipt, Wallet, Building2, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ProjectPage from './pages/ProjectPage';
import ExpensePage from './pages/ExpensePage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import PaymentsPage from './pages/Payments';
import LoginPage from './pages/LoginPage';
import { supabase } from './supabaseClient';
import './App.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: Wallet },
];

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" />
        Loading Skyline…
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Building2 size={22} strokeWidth={2.25} />
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">Skyline</span>
              <span className="sidebar-brand-tagline">Constructions</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={18} strokeWidth={2} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <p className="sidebar-user" title={session.user.email}>{session.user.email}</p>
            <button type="button" className="sign-out-button" onClick={() => supabase.auth.signOut()}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </aside>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectPage />} />
            <Route path="/projects/:id" element={<ProjectDetailsPage />} />
            <Route path="/expenses" element={<ExpensePage />} />
            <Route path="/payments" element={<PaymentsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
