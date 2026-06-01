# Plug & Wifi - Contribution & Collaboration Guidelines

Welcome to the team! To maintain a stable, clean, and production-ready codebase, all team members are required to adhere to these branching, naming, and Pull Request (PR) workflows. This ensures our project meets technical standards, avoids integration bottlenecks, and successfully passes automated checks.

---

## 🌿 1. Branching Strategy

Our repository follows a structured branching model to protect the production code while allowing continuous development.

### Core Branches
* **`main` (Production Branch):**
    * Contains the highly stable, production-ready, and deployable version of our application.
    * **Strict Rule:** NEVER push directly to `main`. Code can only enter `main` via a formal Pull Request from the `develop` branch, typically at the end of a sprint milestone.
* **`develop` (Integration Branch):**
    * The primary sandbox where all completed features are merged and tested together.
    * **Strict Rule:** Do not commit directly to `develop`. All work must be done in a separate feature branch.

### Supporting Branches
* **`feature/` (Feature Branches):**
    * Used for developing new features, fixes, or tasks derived from our Jira backlog.
    * **Naming Convention:** `feature/[jira-ticket-id]-[short-description]`
    * *Examples:* `feature/PWM-12-login-api`, `feature/PWM-34-web-navbar`, `feature/PWM-5-data-cleaning`
    * Always branch out from the latest `develop` branch.

---

## 📝 2. Documentation & File Naming Convention

To ensure seamless integration with modern AI agent tools (e.g., Cursor, GitHub Copilot) inside the repository, we enforce a strict file naming format:

* **Strict Rule:** **NEVER use spaces** in any filename or documentation filename. Spaces break the `@` file-tagging auto-complete function in AI developer interfaces and cause unexpected script parsing errors.
* **Format:** All file names, documentation files under `/docs`, and script assets MUST use **`snake_case`** (lowercase letters connected by underscores).
* *Examples:*
    * ❌ `Sprint 1 Report.md` ➡️ 🎯 `sprint_1_report.md`
    * ❌ `API Contract V1.txt` ➡️ 🎯 `api_contract_v1.txt`
    * ❌ `Database Schema.png` ➡️ 🎯 `database_schema.png`

---

## 🔄 3. Development Workflow Step-by-Step

When you start working on a task assigned to you in Jira, follow this exact sequence:

### Step 1: Sync with Remote
Before creating a branch, ensure your local environment has the absolute latest integration code.
```bash
git checkout develop
git pull origin develop
```

### Step 2: Create Your Feature Branch
Create and switch to your dedicated branch using the naming convention.
```bash
git checkout -b feature/PWM-XXXX-your-feature-name
```

### Step 3: Develop and Commit Locally
Work on your feature or documentation. Make frequent, atomic commits with clear messages.
```bash
git add .
git commit -m "feat: implement short description of what you added"
```
(Recommended prefixes: feat: for new features, fix: for bug fixes, docs: for documentation updates, chore: for setup/maintenance)

### Step 4: Keep Your Branch Updated via Rebase (Strict Rule)
If your teammates have merged new code into the develop branch while you were actively working on your feature, you MUST sync your feature branch using rebase instead of merge. This enforces a clean, linear history and prevents cluttering our Git tree with meaningless automatic merge commits.

To replay your local commits smoothly on top of the latest remote develop branch code, execute the following command within your local feature branch:
```bash
git pull --rebase origin develop
```

#### How to Handle Rebase Conflicts (Step-by-Step)
If Git detects code conflicts during the rebase process, it will pause and allow you to resolve them safely. Do not panic; follow these exact steps:

1. **Locate and Resolve Conflicts:** Open your code editor. Git will highlight the conflicting lines. Discuss with your team members if necessary, choose the correct lines to keep, and remove the Git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).
2. **Stage the Resolved Files:** After fixing the files, stage them to let Git know they are ready. **(Do NOT run `git commit` here!)**

```bash
git add [filename_or_paths]
```
3. **Continue the Rebase Process:** Instruct Git to move on to your next commit:
```bash
git rebase --continue
```
(Note: If there are multiple commits being replayed, Git might pause for conflicts again. Repeat steps 1–3 until the rebase is fully completed.)

4. **Emergency Abort (If things go completely wrong)**: If you make a mistake during conflict resolution and want to safely roll back to exactly how your branch was before you typed the rebase command, you can completely abort the process at any time by running:
```bash
git rebase --abort
```


### Step 5: Push and Open a Pull Request
Push your branch to GitHub and prepare to merge it into `develop` (NOT `main`).
```bash
# If you rebased and previously pushed to remote, you may need to force-with-lease:
git push --force-with-lease origin feature/PWM-XXXX-your-feature-name
```

## 🧪 4. Pull Request (PR) & Code Review Requirements

To maintain a healthy codebase, a feature branch cannot be merged into `develop` unless it passes the following guardrails:

1. **Automated GitHub Checks:** Our repository is equipped with continuous integration workflows. Your PR **MUST pass all automated build, linting (e.g., Ruff/Prettier), and testing checks** on GitHub. If a check fails, it must be fixed before proceeding.
2. **Peer Code Review:** Every PR requires at least **one approving review** from another team member before merging.
   *(Note: Tag your teammates on GitHub or drop a message in our communication channel to request a review.)*
3. **No Loose Ends:** Ensure your local experimental files, logs, or unneeded dependencies are caught by the global `.gitignore` and not included in the PR.

Once the automated checks pass and your peer approves, the PR can be merged into `develop` via a clean squash or linear history strategy. Thank you for keeping our repository structured and our development agile!