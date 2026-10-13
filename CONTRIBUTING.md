# Contributing to Finance Tracker

Thanks for helping improve this learning project. You can suggest an improvement without writing code, or submit a change through a pull request. The repository owner decides which changes are merged.

## Suggest a change or report a bug

Use [New issue](https://github.com/NDT2000/Finance-Tracker/issues/new/choose) and select **Feature suggestion** or **Bug report**. Explain the problem, expected behavior and a small example. Screenshots or sample CSVs must contain synthetic data only.

For a larger change, open a suggestion before implementation so we can agree on scope. Please keep proposals focused on the existing finance application. Never post passwords, tokens, personal financial data or database dumps. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Submit code through a pull request

Outside contributors do not need write access to this repository. Fork it using GitHub's **Fork** button, then clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/Finance-Tracker.git
cd Finance-Tracker
git remote add upstream https://github.com/NDT2000/Finance-Tracker.git
git fetch upstream
git switch -c fix/describe-your-change upstream/main
```

Make a focused change, run the relevant checks, and commit only intended files:

```bash
git add path/to/changed-file
git commit -m "Describe the problem fixed or behavior added"
git push -u origin fix/describe-your-change
```

On GitHub, open **Compare & pull request** from your fork. Set the base repository to `NDT2000/Finance-Tracker` and base branch to `main`. Complete the PR template; use a draft PR if you want early feedback. Reference the issue with `Closes #NUMBER` when appropriate.

Pushing a fork branch does not automatically create a PR. GitHub offers a link to create one; you must submit it. Maintainers can comment, request changes or merge after review. Suggestions can also be made directly in PR reviews.

If main moves while you work, merge its latest changes into your contribution branch and rerun affected checks:

```bash
git fetch upstream
git merge upstream/main
git push origin fix/describe-your-change
```

## Local setup and checks

See the [README](README.md), [learning guide](docs/learning-guide.md) and [pipeline guide](docs/pipeline/README.md). Use your own ignored `.env`; `.env.example` documents required variable names. Never commit real credentials. Preserve your PostgreSQL volume and take a verified backup before applying database migrations to an existing database.

Run checks appropriate to your change:

```bash
# Backend: Java 17; Docker is needed by PostgreSQL Testcontainers
cd finance-tracker
bash mvnw --batch-mode verify

# Frontend: from the repository root, using Node 24 as CI does
cd frontend
npm ci
npm test
npm run build

# Forecasting: from the repository root, in a Python 3.11 virtual environment
cd ml-service
pip install -r requirements.txt
python -m unittest discover -p 'test_*.py' -v
```

Run each block from the stated directory; do not execute the blocks as one continuous script. For documentation-only changes, verify links and commands instead of rerunning unrelated application tests. Report the checks you actually ran and any failures in the PR.

Preserve exact decimal money handling, currency rules, user ownership checks, repeat-import safety and source provenance. Add a new Flyway migration for schema changes; do not rewrite migrations already applied. Planning assumptions must remain separate from actual transactions. Include a meaningful regression test when fixing behavior.

## Review and CI

PRs targeting main run the existing CI workflows. Fork PRs do not receive repository secrets. The current OWASP scan requires `NVD_API_KEY` and can therefore fail on fork PRs; existing historical-secret findings may also block CI. The maintainer must resolve these separately rather than asking contributors for secrets or skipping security checks. GitHub may require maintainer approval before running a first-time contributor's workflow.

Do not switch untrusted contributions to `pull_request_target` or run their code with repository secrets. Approval to run CI is separate from approval to merge. The owner should review workflow changes especially carefully.

Repository files describe the process, but enforcement requires GitHub settings. See [maintainer setup](docs/github-contributions.md) for the main-branch ruleset and manual merge policy.
