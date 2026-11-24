# Continuous integration

One workflow, [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), checks every pull request into `main` and every push to `main`. It needs no paid services and no repository secrets; the only credential is the automatic `GITHUB_TOKEN`. A newer push to the same branch cancels the run still in progress.

| Job | What it checks | Run it locally |
|---|---|---|
| Frontend (lint, test, build, audit) | ESLint, the Node test suite, the production build, and `npm audit` failing on high or critical advisories | `cd frontend; npm ci; npm run lint; npm test; npm run build; npm audit --audit-level=high` |
| Backend (Spring Boot tests) | `mvnw verify`: unit tests plus integration tests against real PostgreSQL 15 and Redis containers (Testcontainers). Test reports are uploaded only when the job fails. | `cd finance-tracker; ./mvnw -B verify` (Docker must be running) |
| ML service (unit tests) | The FastAPI forecast service's tests, with Python 3.11 as in its Dockerfile | `cd ml-service; pip install -r requirements.txt; python -m unittest discover -p "test_*.py"` |
| Secret scan (Gitleaks) | The whole git history for committed secrets. `.gitleaksignore` lists the two reviewed historical findings by exact fingerprint; anything new fails. | `docker run --rm -v "${PWD}:/repo:ro" ghcr.io/gitleaks/gitleaks:v8.24.2 git /repo --config /repo/.gitleaks.toml --gitleaks-ignore-path /repo/.gitleaksignore --redact` |
| Dependency vulnerabilities (OSV-Scanner) | The npm lockfile and both Python requirement files against the free OSV database | `docker run --rm -v "${PWD}:/src:ro" ghcr.io/google/osv-scanner:v2.2.4 scan source -L /src/frontend/package-lock.json -L /src/ml-service/requirements.txt -L /src/pipeline/requirements.txt` |
| Java dependency graph (pushes to `main` and manual runs) | Sends the full Maven dependency tree, including transitive libraries, to GitHub so **Dependabot alerts** cover the Java side | Nothing to run; see the repository's Security tab |

## Why it is set up this way

- **Java vulnerabilities come from Dependabot alerts, not a CI scan.** The old OWASP Dependency-Check job needed an `NVD_API_KEY` secret. OSV-Scanner can't reliably resolve Maven's transitive dependencies, so it scans only the npm and Python files. GitHub's dependency graph receives the exact Maven tree instead, at no cost.
- **Requirement files must be UTF-8.** `ml-service/requirements.txt` used to be UTF-16, which scanners and Dependabot silently read as empty. Converting it revealed eight advisories in `anyio`, `idna` and `starlette`, which were then fixed.
- **No image publishing yet.** The old Docker Hub push needed account secrets and nothing used the images. Publishing is decided together with deployment.

## Required checks on `main`

[`.github/rulesets/main-manual-merge.json`](../.github/rulesets/main-manual-merge.json) lists the five pull-request jobs as required checks, so a red pull request can't be merged. Import it under **Settings → Rules → Rulesets → New ruleset → Import a ruleset**, or update the existing ruleset to match. The dependency-graph job isn't required because it runs only after merging.

## Keeping it working

- Dependabot opens update pull requests weekly for Maven, npm, both pip folders, all three Dockerfiles and the GitHub Actions themselves. Routine update pull requests are paused (`open-pull-requests-limit: 0`); security updates stay on.
- When a dependency is flagged, update to the smallest version that fixes it, run the job's local command, then push.
