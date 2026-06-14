# UI Design System

Visual and structural guide for replicating the Skyline-App interface.

---

## Design direction

- **Professional construction dashboard** — clean, trustworthy, data-focused
- **Dark sidebar + light content** — clear navigation hierarchy
- **Warm amber accent** — construction/industry feel against cool slate backgrounds
- **No CSS framework** — plain CSS with custom properties

---

## Typography

Loaded from Google Fonts in `index.html`:

| Role | Font | Usage |
|------|------|-------|
| UI text | **DM Sans** | Body, headings, forms, tables |
| Brand wordmark | **Instrument Serif** | "Skyline" in sidebar logo |

```html
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:...&family=Instrument+Serif:...&display=swap" rel="stylesheet" />
```

**Scale:**

| Element | Size | Weight |
|---------|------|--------|
| Page title (`.page-title`) | 1.75rem | 700 |
| Section heading | 1.05rem | 600 |
| Body | 15px (0.9375rem) | 400 |
| Table headers | 0.75rem | 600, uppercase |
| Form labels | 0.8rem | 600 |
| Metric value | 1.5rem | 700 |

---

## Color tokens

Defined in `src/index.css` as CSS custom properties:

### Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg` | `#eef1f6` | Page background |
| `--color-surface` | `#ffffff` | Cards, forms, tables |
| `--color-sidebar` | `#0c1222` | Sidebar background |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `--color-heading` | `#0f172a` | Headings, strong text |
| `--color-text-strong` | `#334155` | Labels |
| `--color-text` | `#64748b` | Body, subtitles |
| `--color-sidebar-text` | `#94a3b8` | Inactive nav links |
| `--color-sidebar-text-active` | `#f8fafc` | Nav hover text |

### Brand and actions

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | `#f59e0b` | Active nav, brand icon gradient |
| `--color-primary` | `#2563eb` | Links, primary buttons |
| `--color-success` | `#10b981` | Positive amounts, income charts |
| `--color-warning` | `#d97706` | Pending balances |
| `--color-danger` | `#ef4444` | Errors, expense charts |

### Soft backgrounds (icons, badges)

| Token | Usage |
|-------|-------|
| `--color-accent-soft` | Amber icon backgrounds |
| `--color-primary-soft` | Blue focus rings, edit buttons |
| `--color-success-soft` | Green metric icons |
| `--color-warning-soft` | — |
| `--color-danger-soft` | Close button hover |

### Borders and shadows

| Token | Value |
|-------|-------|
| `--color-border` | `#e2e8f0` |
| `--color-border-subtle` | `#f1f5f9` |
| `--shadow-xs` | `0 1px 2px rgba(15, 23, 42, 0.04)` |
| `--shadow-sm` | `0 2px 8px rgba(15, 23, 42, 0.06)` |
| `--shadow-md` | `0 8px 24px rgba(15, 23, 42, 0.08)` |
| `--shadow-lg` | `0 16px 48px rgba(15, 23, 42, 0.12)` |

### Radii

| Token | Value |
|-------|-------|
| `--radius-sm` | 8px |
| `--radius` | 12px |
| `--radius-lg` | 16px |
| `--radius-full` | 9999px (badges) |

---

## Layout

### App shell

```
┌──────────────────────────────────────────────────┐
│ Sidebar (260px)  │  Main content (flex 1)        │
│                  │                               │
│ [Logo]           │  Page header                  │
│                  │  ─────────────────────        │
│ Dashboard        │  Page content                 │
│ Projects         │                               │
│ Expenses         │                               │
│ Payments         │                               │
│                  │                               │
│ [footer text]    │                               │
└──────────────────────────────────────────────────┘
```

**Classes:** `.app-shell`, `.sidebar`, `.main-content`

**Sidebar width:** `--sidebar-width: 260px`

### Page structure

```html
<div class="page">
  <header class="page-header">
    <h1 class="page-title">...</h1>
    <p class="page-subtitle">...</p>
  </header>
  <!-- content -->
</div>
```

**Max content width:** 1200px (`.page`)

### Responsive breakpoints

| Breakpoint | Behavior |
|------------|----------|
| ≤ 1100px | Metrics grid 2 cols; charts stack; page-split single column |
| ≤ 768px | Sidebar becomes horizontal top nav; footer hidden; single-column forms |

---

## Component classes

### Navigation

| Class | Purpose |
|-------|---------|
| `.sidebar-brand` | Logo row |
| `.sidebar-brand-icon` | Amber gradient icon box |
| `.sidebar-brand-name` | Instrument Serif "Skyline" |
| `.nav-link` | Sidebar nav item |
| `.nav-link.active` | Active route (amber text + soft background) |

### Cards and metrics

| Class | Purpose |
|-------|---------|
| `.card` / `.card-padded` | Generic card container |
| `.form-card` | Form wrapper with padding and border |
| `.metric-card` | Dashboard stat card with icon |
| `.metric-card-icon--blue/amber/green/slate` | Icon color variants |
| `.chart-card` | Chart container |
| `.detail-card` | Project detail info card |

### Forms

| Class | Purpose |
|-------|---------|
| `.form-grid` | 2-column form layout |
| `.form-field` | Label + input group |
| `.form-field--full` | Span both columns |
| `.form-actions` | Submit button row |
| `.btn` / `.btn-primary` / `.btn-secondary` / `.btn-sm` | Buttons |
| `.form-message--error` / `--success` | Feedback text |

### Tables

| Class | Purpose |
|-------|---------|
| `.data-table-wrapper` / `.project-table-wrapper` | Bordered scroll container |
| `.data-table` / `.project-table` | Table element |
| `.data-table-empty` | Empty state row |
| `.data-table-amount` | Bold numeric amount column |
| `.btn-edit` | Edit button in project table |

### Status badges

| Class | Colors |
|-------|--------|
| `.status-badge--site-visit` | Blue bg `#dbeafe`, text `#1e40af` |
| `.status-badge--quotation` | Amber bg `#fef3c7`, text `#92400e` |
| `.status-badge--work-started` | Green bg `#dcfce7`, text `#166534` |
| `.status-badge--work-ended` | Gray bg `#f1f5f9`, text `#475569` |
| `.status-badge--rejected` | Red bg `#fee2e2`, text `#b91c1c` |
| `.status-badge--default` | Purple bg `#ede9fe`, text `#5b21b6` |

### Modal (update project)

| Class | Purpose |
|-------|---------|
| `.skyline-modal-overlay` | Full-screen backdrop with blur |
| `.skyline-modal-content` | White modal box |
| `.modal-header` | Title + project name + close button |
| `.close-x` | Dismiss button |
| `.save-btn` / `.cancel-btn` | Modal actions |

### Loading

| Class | Purpose |
|-------|---------|
| `.loading-state` | Centered loading message |
| `.loading-spinner` | CSS animated spinner |

---

## Icons (Lucide React)

| Location | Icon | Import |
|----------|------|--------|
| Sidebar brand | `Building2` | lucide-react |
| Nav: Dashboard | `LayoutDashboard` | |
| Nav: Projects | `FolderKanban` | |
| Nav: Expenses | `Receipt` | |
| Nav: Payments | `Wallet` | |
| Metric: Active | `FolderOpen` | |
| Metric: Total | `Layers` | |
| Metric: Profit Month | `TrendingUp` | |
| Metric: Profit Year | `CalendarDays` | |
| Back link | `ArrowLeft` | |

Default props: `size={18}`, `strokeWidth={2}` for nav; `size={22}` for metrics.

---

## Charts (Recharts)

**Library:** Recharts v3

**Chart type:** Grouped bar chart (`BarChart` + `Bar`)

**Colors:**

```js
const CHART_COLORS = {
  income: '#10b981',
  expenses: '#f87171',
};
```

**Styling:**

- Bar radius: `[6, 6, 0, 0]` (rounded tops)
- Grid: horizontal dashed lines only, `#f1f5f9`
- Tooltip: white background, rounded border, dollar formatting
- Y-axis: abbreviated as `$Xk`

---

## CSS file organization

| File | Responsibility |
|------|----------------|
| `src/index.css` | Design tokens, global reset, typography |
| `src/App.css` | Shell, pages, metrics, charts, forms, buttons, responsive |
| `src/components/AddProjectForm.css` | Add-project grid fields |
| `src/components/ProjectTable.css` | Tables, badges, edit button (shared) |
| `src/components/UpdateProjectForm.css` | Modal and update form |

**No CSS Modules** — all classes are global. Avoid naming collisions when extending.

---

## Animation

| Effect | Implementation |
|--------|----------------|
| Page enter | `.page` — `fadeIn 0.35s ease` (opacity + translateY) |
| Modal overlay | `fadeIn 0.2s ease` |
| Card hover | Metric cards: slight lift + shadow increase |
| Button press | `transform: scale(0.98)` on active |

Transition default: `--transition: 0.2s ease`

---

## Replication checklist (UI)

1. Add Google Fonts links to `index.html`
2. Copy `:root` tokens to `index.css`
3. Build app shell (sidebar + main) in `App.jsx` / `App.css`
4. Implement shared classes before page-specific styling
5. Apply status badge classes consistently across table and detail views
6. Test responsive breakpoints at 1100px and 768px
7. Verify chart colors match token palette

See companion: [08-replication-checklist.md](./08-replication-checklist.md)
