import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import {
  LayoutDashboard, FolderKanban, Receipt, Wallet, Users, Contact, Shield,
  Landmark, Flag, UserPlus, ShoppingCart, CalendarDays, Settings, ScrollText,
  Briefcase, SlidersHorizontal, Building,
} from 'lucide-react';

const NAV_GROUPS_STORAGE_KEY = 'skyline-nav-groups';

function loadGroupState() {
  try {
    return localStorage.getItem(NAV_GROUPS_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function saveGroupState(groupId) {
  try {
    if (groupId) localStorage.setItem(NAV_GROUPS_STORAGE_KEY, groupId);
    else localStorage.removeItem(NAV_GROUPS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function isPathActive(pathname, to, end) {
  if (end) return pathname === to || (to !== '/' && pathname === `${to}/`);
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupHasActiveChild(pathname, items) {
  return items.some((item) => isPathActive(pathname, item.to, item.end));
}

export function buildNavConfig({ isOwner, canManageTeam, isSuperAdmin }) {
  const config = [
    { type: 'link', to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { type: 'link', to: '/leads', label: 'Leads', icon: UserPlus },
    {
      type: 'group',
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      items: [
        { to: '/projects', label: 'Projects', icon: FolderKanban },
        { to: '/milestones', label: 'Milestones', icon: Flag },
        { to: '/expenses', label: 'Expenses', icon: Receipt },
        { to: '/payments', label: 'Payments', icon: Wallet },
      ],
    },
    {
      type: 'group',
      id: 'crm',
      label: 'CRM',
      icon: Briefcase,
      items: [
        { to: '/clients', label: 'Clients', icon: Contact },
        { to: '/loan-lenders', label: 'Loan Lenders', icon: Landmark, end: true },
        { to: '/procurement/vendors', label: 'Procurement Vendors', icon: Building, end: true },
      ],
    },
    { type: 'link', to: '/loans', label: 'Loans', icon: Landmark },
    { type: 'link', to: '/calendar', label: 'Calendar', icon: CalendarDays },
  ];

  const configItems = [
    { to: '/procurement', label: 'Procurement', icon: ShoppingCart, end: true },
    ...(isOwner ? [{ to: '/catalog', label: 'Catalog', icon: Settings }] : []),
  ];
  if (configItems.length > 0) {
    config.push({
      type: 'group',
      id: 'config',
      label: 'Config',
      icon: SlidersHorizontal,
      items: configItems,
    });
  }

  const settingsItems = [
    ...(isOwner ? [{ to: '/audit-log', label: 'Audit Log', icon: ScrollText }] : []),
    ...(canManageTeam ? [{ to: '/team', label: 'Team', icon: Users }] : []),
  ];
  if (settingsItems.length > 0) {
    config.push({
      type: 'group',
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      items: settingsItems,
    });
  }

  if (isSuperAdmin) {
    config.push({ type: 'link', to: '/admin', label: 'Admin', icon: Shield });
  }

  return config;
}

function NavLinkItem({ to, label, icon: Icon, end, nested }) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      className={({ isActive }) => `nav-link${nested ? ' nav-link--nested' : ''}${isActive ? ' active' : ''}`}
    >
      <Icon size={18} strokeWidth={2} />
      <span className="nav-link-label">{label}</span>
    </NavLink>
  );
}

export default function SidebarNav({ collapsed, isOwner, canManageTeam, isSuperAdmin }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navConfig = useMemo(
    () => buildNavConfig({ isOwner, canManageTeam, isSuperAdmin }),
    [isOwner, canManageTeam, isSuperAdmin],
  );

  const [openGroupId, setOpenGroupId] = useState(() => {
    const activeGroup = navConfig.find(
      (item) => item.type === 'group' && groupHasActiveChild(location.pathname, item.items),
    );
    if (activeGroup) return activeGroup.id;
    return loadGroupState();
  });

  useEffect(() => {
    const activeGroup = navConfig.find(
      (item) => item.type === 'group' && groupHasActiveChild(location.pathname, item.items),
    );
    if (activeGroup) setOpenGroupId(activeGroup.id);
  }, [location.pathname, navConfig]);

  const openGroup = useCallback((group) => {
    setOpenGroupId(group.id);
    saveGroupState(group.id);
    const firstItem = group.items[0];
    if (firstItem?.to) navigate(firstItem.to);
  }, [navigate]);

  const flatLinks = useMemo(() => {
    const links = [];
    navConfig.forEach((item) => {
      if (item.type === 'link') links.push(item);
      else if (item.type === 'group') links.push(...item.items);
    });
    return links;
  }, [navConfig]);

  if (collapsed) {
    return (
      <>
        {flatLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLinkItem key={to} to={to} label={label} icon={Icon} end={end} />
        ))}
      </>
    );
  }

  return (
    <>
      {navConfig.map((item) => {
        if (item.type === 'link') {
          const { to, label, icon: Icon, end } = item;
          return <NavLinkItem key={to} to={to} label={label} icon={Icon} end={end} />;
        }

        const isOpen = openGroupId === item.id;
        const GroupIcon = item.icon;
        return (
          <div key={item.id} className={`nav-group${isOpen ? ' nav-group--open' : ''}`}>
            <button
              type="button"
              className="nav-group-header"
              onClick={() => openGroup(item)}
              aria-expanded={isOpen}
            >
              <GroupIcon size={18} strokeWidth={2} />
              <span className="nav-link-label">{item.label}</span>
              <ChevronDown size={16} className="nav-group-chevron" />
            </button>
            {isOpen && (
              <div className="nav-group-items">
                {item.items.map(({ to, label, icon: Icon, end }) => (
                  <NavLinkItem key={to} to={to} label={label} icon={Icon} end={end} nested />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
