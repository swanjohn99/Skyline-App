import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import {
  LogOut, PanelLeftClose, PanelLeftOpen, Building2,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import PendingPaymentsPage from './pages/PendingPaymentsPage';
import ProjectPage from './pages/ProjectPage';
import ExpensePage from './pages/ExpensePage';
import ProjectDetailsPage from './pages/ProjectDetailsPage';
import PaymentsPage from './pages/Payments';
import ClientsPage from './pages/ClientsPage';
import ClientDetailsPage from './pages/ClientDetailsPage';
import LoansPage from './pages/LoansPage';
import LoanLendersPage from './pages/LoanLendersPage';
import MilestonesPage from './pages/MilestonesPage';
import TeamPage from './pages/TeamPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import LeadsPage from './pages/LeadsPage';
import LeadDetailsPage from './pages/LeadDetailsPage';
import ProcurementPage from './pages/ProcurementPage';
import ProcurementVendorsPage from './pages/ProcurementVendorsPage';
import CatalogSettingsPage from './pages/CatalogSettingsPage';
import CalendarPage from './pages/CalendarPage';
import AuditLogPage from './pages/AuditLogPage';
import SetupPage from './pages/SetupPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SidebarNav from './components/SidebarNav';
import SessionIdleWarning from './components/SessionIdleWarning';
import { useAuth } from './context/auth';
import { usePageTitle } from './hooks/usePageTitle';
import { useCompanyFavicon } from './hooks/useCompanyFavicon';
import { getViewCompanyId, setViewCompanyId } from './apiClient';
import { listAdminCompanies } from './api/admin';
import { companyLogoUrl } from './utils/companyLogo';
import './components/Tables.css';
import './App.css';

const ROUTER_BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const SIDEBAR_COLLAPSED_KEY = 'skyline-sidebar-collapsed';

function AppShell() {
  const {
    canManageTeam, isOwner, isSuperAdmin, profile, user, companyName, companyLogoPath,
    companyFaviconPath, signOut,
  } = useAuth();
  useCompanyFavicon(companyFaviconPath);
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

  const viewingCompany = adminCompanies.find((c) => c.id === viewCompanyId);
  const displayName = isSuperAdmin && viewingCompany
    ? viewingCompany.name
    : companyName;
  const displayLogoPath = isSuperAdmin && viewingCompany
    ? viewingCompany.logo_path
    : companyLogoPath;
  const displayLogoUrl = companyLogoUrl(displayLogoPath);

  return (
    <div className={`app-shell${sidebarCollapsed ? ' app-shell--sidebar-collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              {displayLogoUrl ? (
                <img src={displayLogoUrl} alt="" className="sidebar-brand-logo" />
              ) : (
                <Building2 size={22} strokeWidth={2.25} />
              )}
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-brand-name">{displayName || 'Workspace'}</span>
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
          <SidebarNav
            collapsed={sidebarCollapsed}
            isOwner={isOwner}
            canManageTeam={canManageTeam}
            isSuperAdmin={isSuperAdmin}
          />
          <div className="sidebar-footer">
            <p className="sidebar-user" title={user?.email}>{user?.email}</p>
            <p className="sidebar-role">{profile?.role?.replace('_', ' ')}</p>
            <button type="button" className="sign-out-button" onClick={signOut} title="Sign out">
              <LogOut size={16} />
              <span className="sign-out-label">Sign out</span>
            </button>
          </div>
        </nav>
      </aside>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pending-payments" element={<PendingPaymentsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:id" element={<LeadDetailsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/procurement/vendors" element={<ProcurementVendorsPage />} />
          <Route path="/procurement" element={<ProcurementPage />} />
          <Route path="/loan-lenders" element={<LoanLendersPage />} />
          <Route path="/catalog" element={isOwner ? <CatalogSettingsPage /> : <Navigate to="/" replace />} />
          <Route path="/audit-log" element={isOwner ? <AuditLogPage /> : <Navigate to="/" replace />} />
          <Route path="/projects" element={<ProjectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailsPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/milestones" element={<MilestonesPage />} />
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

function AuthLoading() {
  usePageTitle('Loading');
  return (
    <div className="auth-loading">
      <div className="loading-spinner" />
      Loading…
    </div>
  );
}

function App() {
  const { session, loading, needsOnboarding, isPendingApproval } = useAuth();

  if (window.location.pathname.replace(/\/$/, '').endsWith('/reset')) {
    return <ResetPasswordPage />;
  }

  if (loading) {
    return <AuthLoading />;
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
      <SessionIdleWarning />
    </BrowserRouter>
  );
}

export default App;
