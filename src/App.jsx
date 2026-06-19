import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, Receipt, Wallet, Users, Contact, Building2, LogOut } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ProjectPage from './pages/ProjectPage';
import ExpensePage from './pages/ExpensePage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import PaymentsPage from './pages/Payments';
import ClientsPage from './pages/ClientsPage';
import TeamPage from './pages/TeamPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import { useAuth } from './context/auth';
import './App.css';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/clients', label: 'Clients', icon: Contact },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: Wallet },
];

function App() {
  const { session, loading, needsOnboarding, canManageTeam, profile, user, companyName, signOut } = useAuth();

  if (loading) {
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

  if (needsOnboarding) {
    return <OnboardingPage />;
  }

  const navItems = canManageTeam
    ? [...NAV_ITEMS, { to: '/team', label: 'Team', icon: Users }]
    : NAV_ITEMS;

  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Building2 size={22} strokeWidth={2.25} />
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">{companyName || 'Skyline'}</span>
              <span className="sidebar-brand-tagline">Constructions</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map(({ to, label, icon: Icon, end }) => (
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
            <p className="sidebar-user" title={user?.email}>{user?.email}</p>
            <p className="sidebar-role">{profile?.role?.replace('_', ' ')}</p>
            <button type="button" className="sign-out-button" onClick={signOut}>
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
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/expenses" element={<ExpensePage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/team" element={canManageTeam ? <TeamPage /> : <Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
