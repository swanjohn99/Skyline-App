import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, Receipt, Wallet, Users, Contact, Building2, LogOut, Shield,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ProjectPage from './pages/ProjectPage';
import ExpensePage from './pages/ExpensePage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import PaymentsPage from './pages/Payments';
import ClientsPage from './pages/ClientsPage';
import TeamPage from './pages/TeamPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import SetupPage from './pages/SetupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import { useAuth } from './context/auth';
import { getViewCompanyId, setViewCompanyId } from './apiClient';
import { listAdminCompanies } from './api/admin';
import './App.css';

// Derived from Vite's base ('/' in dev, '/app/' in prod) without trailing slash.
const ROUTER_BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/clients', label: 'Clients', icon: Contact },
  { to: '/expenses', label: 'Expenses', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: Wallet },
];

const SIDEBAR_COLLAPSED_KEY = 'skyline-sidebar-collapsed';

function AppShell() {
  const {
    canManageTeam, isSuperAdmin, profile, user, companyName, signOut,
  } = useAuth();
  const [adminCompanies, setAdminCompanies] = useState([]);
  const [viewCompanyId, setViewCompanyIdState] = useState(() => getViewCompanyId());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isSuperAdmin) return;
    listAdminCompanies().then(setAdminCompanies).catch(() => setAdminCompanies([]));
  }, [isSuperAdmin]);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  function handleViewCompanyChange(event) {
    const value = event.target.value;
    setViewCompanyId(value);
    setViewCompanyIdState(value);
    window.location.reload();
  }

  const navItems = [
    ...NAV_ITEMS,
    ...(canManageTeam ? [{ to: '/team', label: 'Team', icon: Users }] : []),
    ...(isSuperAdmin ? [{ to: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const viewingCompany = adminCompanies.find((c) => c.id === viewCompanyId);

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Building2 size={22} strokeWidth={2.25} />
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">
                {isSuperAdmin && viewingCompany ? viewingCompany.name : (companyName || 'Skyline')}
              </span>
              <span className="sidebar-brand-tagline">Constructions</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {isSuperAdmin && (
          <div className="sidebar-company-select">
            <label htmlFor="view-company">View company data</label>
            <select id="view-company" value={viewCompanyId} onChange={handleViewCompanyChange}>
              <option value="">All companies</option>
              {adminCompanies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} strokeWidth={2} />
              <span className="nav-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p className="sidebar-user" title={user?.email}>{user?.email}</p>
          <p className="sidebar-role">{profile?.role?.replace('_', ' ')}</p>
          <button type="button" className="sign-out-button" onClick={signOut} title="Sign out">
            <LogOut size={16} />
            <span className="sign-out-label">Sign out</span>
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
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/team" element={canManageTeam ? <TeamPage /> : <Navigate to="/" replace />} />
          <Route path="/admin" element={isSuperAdmin ? <AdminPage /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const { session, loading, needsOnboarding, isPendingApproval } = useAuth();

  // Password reset is reachable while logged out, before the auth gate.
  if (window.location.pathname.replace(/\/$/, '').endsWith('/reset')) {
    return <ResetPasswordPage />;
  }

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

  if (isPendingApproval) {
    return <PendingApprovalPage />;
  }

  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
