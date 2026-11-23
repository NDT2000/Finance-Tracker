# Frontend architecture

How the React app is organised, for the UI rebuild that follows [the design system](design-system.md).

## Styling

All colours, type sizes, spacing, radii and layout sizes are CSS variables in `frontend/src/theme.css`:

1. **Raw palette** (`--navy-900`, `--emerald-600`, ...): the exact hex values from the spec.
2. **Semantic tokens** (`--color-action`, `--color-danger-fg`, `--color-text-muted`, ...): named after their job. Components use only these.
3. **Dark theme**: the same semantic names with dark values, applied by `<html data-theme="dark">` (not switched on yet).

Legacy token names at the bottom of the file keep not-yet-rebuilt pages working; each is removed as its page is rebuilt. Chart colours live in `src/chartColors.js` because Recharts needs real values.

## Routing and the app shell

```
<AuthProvider>
  /login, /register                      public pages
  <PrivateRoute><AppLayout>              layout route: every signed-in page renders inside it
     /overview  /planning  /imports  /profile
  /dashboard -> /overview                redirects for old addresses (src/navigation.js)
  anything else -> /overview             PrivateRoute sends signed-out visitors to /login
```

`AppLayout` (`src/components/AppLayout.jsx`) draws the shell and renders the current page through React Router's `<Outlet>`:

| Part | File | Behaviour |
|---|---|---|
| Sidebar | `Sidebar.jsx` | Navy, grouped links with Lucide icons, active page marked (also announced via `aria-current`). Desktop can collapse it to icons only; the choice is kept in `localStorage` (ignored if storage is blocked). |
| Mobile drawer | `AppLayout.jsx` | Under 900px the sidebar is replaced by a drawer opened from the header. It is a modal dialog: focus moves into it, Tab stays inside, Escape or the backdrop closes it and focus returns to the menu button. Choosing a page closes it. |
| Header | `AppHeader.jsx` | 64px. Shows the current group and page, the account menu, and on phones the drawer button and compact logo. |
| Account menu | `UserMenu.jsx` | Initials button opening My profile and Logout. |

**Adding a page:** add its route inside the layout route in `App.jsx`, and an entry in `src/navigation.js` (the sidebar and header read it). `tests/navigation.test.js` checks the navigation stays consistent. Only pages that exist are listed; unfinished features are never shown as available.

**Page-to-layout communication:** the layout passes `{ setLogoutBlocked }` as outlet context. The profile page uses it (`useOutletContext()`) to keep Logout unavailable while a password change is saving.

## Shared components and formatting

Reusable pieces live in `src/components/ui/`, styled by `ui.css` (tokens only):

| Component | Use it for |
|---|---|
| `StatCard` | One summary figure. `tone`: positive, negative (real losses only), warning, neutral. `featured` = the navy card for a page's key figure, e.g. monthly net cash flow. |
| `ChartCard` | A card around one Recharts chart. Always pass `summary`, a sentence screen readers hear instead of the drawing. |
| `Badge` | Status labels in the semantic colour pairs (success, danger, warning, info, ai, pending). The text must state the status. |
| `EmptyState`, `ErrorState`, `LoadingSkeleton` | Nothing to show / failed with optional retry / loading placeholders announced once to screen readers. |
| `ConfirmDialog` | Destructive or important confirmations. Native `<dialog>`: traps focus, Escape cancels, focus starts on Cancel. |
| `MonthSelector`, `CurrencySelector` | Month (with previous/next) and currency pickers with linked labels. |

Buttons and fields are CSS classes, not components: `btn btn--primary|secondary|ghost|danger|icon`, and `field` around a label + input with optional `field__hint` / `field__error`.

Formatting lives in `src/format.js`: `formatMoney` (exact decimal strings, optional sign), `formatAxisMoney` (short chart-axis labels), `amountStep` (input step for a currency's decimals), `currentMonth`, `formatMonth`, `shiftMonth`. All are unit-tested in `tests/format.test.js`.

**Component gallery:** run the dev server (`npm run dev` in `frontend/`) and open `http://localhost:5173/dev/components` to see every component and state. It exists only in development builds.

## Checks

From `frontend/`: `npm test` (Node's built-in test runner) and `npm run build`. `npm run lint` currently fails because the project has no `eslint.config.js` for ESLint 9+; that is scheduled for the quality pass (step 1.10).
