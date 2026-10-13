# GitHub contribution settings and hosting

## What this repository provides

- CONTRIBUTING.md: fork → branch → PR instructions and local checks.
- Issue forms: bug reports and feature suggestions.
- PR template: problem, verification and data/configuration impact.
- CODEOWNERS: requests review from @NDT2000 for changes.
- SECURITY.md: guidance for private vulnerability reports.
- `.github/rulesets/main-manual-merge.json`: importable main-branch protection configuration.

These files become the default contributor experience after they are merged into main. GitHub settings are separate from the files; committing a ruleset JSON does not activate it. Changes in someone's fork cannot change this repository. A contributor explicitly opens a PR; every fork edit does not automatically create one.

## Maintainer checklist

The GitHub API was inaccessible from the development environment, so repository settings and current ruleset enforcement could not be inspected or changed. Complete or verify these in GitHub after reviewing the PR:

1. **Settings → General → Features:** enable Issues for the bug/suggestion forms. Discussions is optional; issue forms already support suggestions.
2. **Settings → General → Pull Requests:** disable **Allow auto-merge** if you want every merge initiated manually. Check any existing bots/apps with write access as well.
3. **Settings → Collaborators / Manage access:** do not give outside contributors write or admin access. They can fork and submit PRs. Keep write/merge access with the owner if only the owner should merge.
4. **Settings → Rules → Rulesets:** inspect existing main protection first. Update the existing ruleset or use **New ruleset → Import a ruleset** with `.github/rulesets/main-manual-merge.json`. Do not create duplicate rules without checking existing requirements. GitHub plan and repository visibility determine which protection features are available.
5. **Security → Settings:** enable **Private vulnerability reporting** if available. This makes the private-report link in SECURITY.md functional.
6. **Settings → Actions → General:** retain read-only default workflow permissions and require approval for outside-contributor workflow runs as appropriate. Do not allow untrusted fork code access to secrets.

If downloading JSON is inconvenient, configure the same rules manually:

- Name: `Main: pull requests and manual merge`.
- Enforcement: Active.
- Target: branch `main` only.
- Bypass list: empty.
- Restrict deletions and block force pushes.
- Require a pull request before merging.
- Require review conversations to be resolved.
- Dismiss stale approvals when new commits are pushed.
- Required approvals: 0; require code-owner review: off; require approval of the latest push: off.

Zero required approvals supports a sole maintainer who authors changes and then manually merges the PR. GitHub does not allow authors to approve their own PR. This setting does not grant outsiders merge permission: repository access controls still apply. CODEOWNERS requests owner review of external contributions, but review is advisory with this baseline. If you add a second trusted maintainer and want mandatory independent review, set required approvals to 1 and require code-owner review after checking that eligible reviewers are available.

The supplied baseline does not require CI status checks. Existing CI has known secret-dependent scanning limitations for fork PRs; requiring an unavailable check would strand contributions. Do not treat this as verified passing security. Review failures and fix the underlying prerequisites. Once checks reliably run on external PRs, add the exact check names as required checks in the ruleset.

## Verify enforcement

Use a small documentation PR from a fork, targeting main:

- Confirm GitHub shows the PR template and requests the owner's review.
- Confirm the outside contributor cannot push to this repository or merge the PR.
- Confirm CI starts or requests maintainer approval, and inspect the actual results.
- Confirm auto-merge is unavailable and the owner must initiate the merge.
- Check the ruleset evaluation/settings to confirm direct main pushes, force pushes and deletion are blocked. Do not test destructive operations against the real main branch.

No live enforcement verification was possible from this environment because GitHub API access was denied.

## Can GitHub Pages host Finance Tracker?

**A static project showcase is feasible; the complete application cannot run solely on GitHub Pages.** Pages serves HTML, CSS, JavaScript and static assets. It cannot run Spring Boot, FastAPI, PostgreSQL, Redis, background import processing or Docker Compose. Do not place `.env`, database backups, credentials or user financial data in a Pages artifact.

Good options:

| Option | Feasibility | Requirements |
| --- | --- | --- |
| Project landing page with screenshots, README video and architecture | Straightforward | Static content only; no application backend |
| Synthetic interactive demo | Feasible as a separate demo | Explicitly labeled mock data and isolated demo behavior; not implemented here |
| Current React app with real login and data | Frontend only can be hosted | Separate HTTPS backend/services, API URL configuration, CORS/cookie policy and SPA routing work |
| Entire current Docker Compose application | Not supported on Pages | A host that runs the application services |

The current frontend uses Vite's root asset path, BrowserRouter and same-origin `/api` requests. Publishing its build unchanged at `https://ndt2000.github.io/Finance-Tracker/` would not provide a working application: assets/routes need the repository base path, direct SPA route visits need a deliberate fallback or hash routing, and `/api` would reach GitHub Pages rather than Spring Boot. Cross-origin refresh cookies also require careful browser-policy, CORS and HTTPS configuration.

For this portfolio, start with the README video or a static showcase. A full public deployment is a separate task and is not required to demonstrate the project. No Pages deployment or application hosting changes were made as part of this contribution workflow.
