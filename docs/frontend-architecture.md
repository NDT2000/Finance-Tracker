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
     /overview  /transactions  /budgets  /accounts  /planning  /imports  /profile
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

**Sign in and Create account** (`pages/Login.jsx`, `pages/Register.jsx`) share `pages/auth/AuthLayout.jsx` and `Auth.css`, and use the same `field` and `btn` classes as the rest of the app. Every label is tied to its input (`htmlFor`/`id`), inputs carry `autocomplete` values for password managers, and errors are announced (`role="alert"`).

**Page-to-layout communication:** the layout passes `{ setLogoutBlocked }` as outlet context. The profile page uses it (`useOutletContext()`) to keep Logout unavailable while a password change is saving.

## Interface copy

Cards, charts and tables show a precise label and the value, never an explanation of how the figure is calculated (no "income minus expenses" hints, model descriptions or rule footnotes). Short context is fine: the period ("November 2026"), a breakdown of actual values ("$2,009.39 spent, $0.00 refunded"), required qualifiers such as "Estimated" and "What-if scenario", chart legends, empty and error states, and consequences in confirmation dialogs. Questions about how figures are derived belong to the planned Ask AI assistant. Screen-reader chart summaries describe what a chart shows and stay.

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

Data tables use the `ledger` / `ledger__table` classes in `ui.css` (Transactions and Imports). Give each cell a `data-label`: under 760px every row becomes a labelled card, keeping the table semantics for screen readers.

Formatting lives in `src/format.js`: `formatMoney` (exact decimal strings, optional sign), `formatAxisMoney` (short chart-axis labels), `amountStep` (input step for a currency's decimals), `currentMonth`, `formatMonth`, `shiftMonth`. All are unit-tested in `tests/format.test.js`.

Exact money arithmetic for small display calculations (such as a budget's remaining amount) lives in `src/money.js`: `subtractMoney` and `percentOf` work in whole minor units (BigInt), so `350 - 335.95` is exactly `14.05`. The backend remains authoritative for every stored or reported total. Tests: `tests/money.test.js`.

## Pages

**Overview** (`src/pages/Overview.jsx`, sections in `src/pages/overview/`): `useOverviewData` loads the month's summary, transactions, budgets and bank accounts together, then forecasts separately so a slow or failing ML service never blocks the page. It ignores responses for a month or currency the user has already left, and the page only shows figures whose month and currency match the selection. Forecasts are requested for the current month **in UTC**, because that is the month the backend forecasts.

Adding a budget opens `pages/budgets/BudgetForm.jsx` in a `Modal`; "Add a transaction" and "View all" open the Transactions page on the same month and currency (passed as router state).

**Transactions** (`src/pages/Transactions.jsx`, parts in `src/pages/transactions/`): the ledger for one month and currency, with search and filters applied in the browser to that month (the API filters only by month and currency). Add, edit, bank assignment and CSV export happen in `Modal` dialogs; exclusion asks first and offers Undo through `POST /api/transactions/{id}/restore`.

The rules live in `transactionRules.js`, unit-tested in `tests/transactionRules.test.js`:

- `allowedActions` mirrors the backend: only manual entries can be edited (imported ones are corrected by importing a higher source revision), and refunds never change bank account on their own.
- `updatePayload` builds the `PUT` body from the stored entry, because the server replaces every field. Fields the form does not edit (refund link, inherited bank account, account reference, currency) are always sent back unchanged.
- Editing an entry whose bank account was deleted clears its historical account label, a limitation of `PUT`; the form warns before saving.

**Budgets** (`src/pages/Budgets.jsx`, parts in `src/pages/budgets/`): the month's budgets with actual spending, exact remaining amounts and the ML month-end estimate. Each card draws actual spending as a solid bar, the estimate as a striped, dashed-outline segment and the limit as a marker, with a legend. Colours follow the spec: red only when spending already exceeds the limit, amber at 80% or when projected over. "Spending without a budget" lists categories with spending but no limit. It reuses `useOverviewData` for its data.

`budgetRules.js` (tested in `tests/budgetRules.test.js`) holds the shared calculations (status, tone, totals, bar segments, unbudgeted categories), used by both the Budgets page and the overview's budget card so they never disagree. Editing a limit sends the stored category, month, year and currency back because `PUT /api/budgets/{id}` validates a complete budget.

**Financial planning** (`src/pages/Planning.jsx`, parts in `src/pages/planning/`): a scenario list beside the selected scenario's workspace (stacked below 1280px). The selected scenario is in the URL (`/planning?plan=<id>`), so reloads and bookmarks reopen it. Assumptions and events are edited in `Modal` dialogs; scenario and event deletion ask first. `usePlanningData` loads the list, the scenario, its events and the backend projection, ignoring responses for a scenario or comparison month the user has left.

Every projected figure (monthly balances, combined value, lowest cash, funding flags) is displayed from `GET /api/plans/{id}/projection`; the browser never recalculates them. `planningRules.js` (tested in `tests/planningRules.test.js`) only labels and packages: event types and their effects, plan-month to calendar-month mapping, request bodies, and the funding checks list. The page reproduces the hand-worked example in [financial planning](financial-planning.md). "Lowest cash" includes the opening cash, matching the backend's `minimumCash`.

**Import Transactions** (`src/pages/Imports.jsx`, parts in `src/pages/imports/`): CSV upload, import freshness, history, and the selected import with its rows. The selected import is in the URL (`/imports?batch=<id>`); "View import" on Transactions links straight to it. `useImports` loads history, the import's detail and one page of rows, plus freshness counts from the monthly summary's `imports` block (those counts cover all imports, whatever the month). It polls every 2 seconds only while an import is queued or processing.

- The status badge comes from the backend status, so an import never reads as imported before processing has committed it. "Imported with rejections" and "Needs review" state partial success; outcome counts are shown only as the backend returns them.
- Rows show their original values as uploaded. Rows that need review offer "Same as #id" for each exact match the backend found, "Keep as new" or "Ignore row".
- "Rejected rows (CSV)" collects every rejected row and builds the report in the browser: reason, code and the original columns. Cells that start with `= + - @` get the same apostrophe guard as the backend's transaction export.
- Stage, attempts, timings, error code, import ID and file hash sit in a collapsed "Processing details" section.

`importRules.js` (tested in `tests/importRules.test.js`) holds the upload checks (mirroring [the CSV contract](pipeline/contract.md)), status and outcome labels, the result summary, error messages, the rejection report and the polling rule.

**Bank Accounts** (`src/pages/BankAccounts.jsx`, parts in `src/pages/accounts/`): named account labels with type and currency, added in a `Modal` and deleted after a `ConfirmDialog`. Deleting keeps the transactions and their history. The page shows no balances and never presents an entry as a live bank connection. `accountRules.js` (tested in `tests/accountRules.test.js`) mirrors the backend `CreateAccountRequest` checks.

**My Profile** (`src/pages/Profile.jsx`): read-only personal details and the password change. A successful change revokes every session, so the page returns to sign-in. The password checks in `src/passwordRules.js` (tested in `tests/passwordRules.test.js`) mirror the backend `PasswordPolicy`: at least 15 characters, counted as characters so an emoji is one, and at most 72 UTF-8 bytes. Create account uses the same rules. The backend also rejects common passwords and has the final say.

**Component gallery:** run the dev server (`npm run dev` in `frontend/`) and open `http://localhost:5173/dev/components` to see every component and state. It exists only in development builds.

## Checks

From `frontend/`: `npm test` (Node's built-in test runner) and `npm run build`. `npm run lint` currently fails because the project has no `eslint.config.js` for ESLint 9+; that is scheduled for the quality pass (step 1.10).
