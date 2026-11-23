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

## Checks

From `frontend/`: `npm test` (Node's built-in test runner) and `npm run build`. `npm run lint` currently fails because the project has no `eslint.config.js` for ESLint 9+; that is scheduled for the quality pass (step 1.10).
