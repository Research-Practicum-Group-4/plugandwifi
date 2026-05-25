# Plug & Wifi - Contribution & Collaboration Guidelines

Welcome to the team! To maintain a stable, clean, and production-ready codebase, all team members are required to adhere to these branching and Pull Request (PR) workflows. This ensures our project meets technical standards, avoids integration bottlenecks, and successfully passes automated checks.

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

## 🔄 2. Development Workflow Step-by-Step

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
Work on your feature. Make frequent, atomic commits with clear messages.
```bash
git add .
git commit -m "feat: implement short description of what you added"
```
(Recommended prefixes: feat: for new features, fix: for bug fixes, docs: for documentation updates, chore: for setup/maintenance)

### Step 4: Keep Your Branch Updated
If your teammate merged code into develop while you were working, pull those changes into your feature branch locally to resolve any conflicts before pushing.
```bash
git pull origin develop
```

### Step 5: Push and Open a Pull Request
Push your branch to GitHub and prepare to merge it into develop (NOT main).
```bash
git push origin feature/PWM-XXXX-your-feature-name
```

## 🧪 3. Pull Request (PR) & Code Review Requirements

To maintain a healthy codebase, a feature branch cannot be merged into `develop` unless it passes the following guardrails:

1. **Automated GitHub Checks:** Our repository is equipped with continuous integration workflows. Your PR **MUST pass all automated build, linting, and testing checks** on GitHub. If a check fails, you must fix it in your branch before proceeding.

2. **Peer Code Review:** Every PR requires at least **one approving review** from another team member. 
   *(Note: Tag your teammates on GitHub or drop a message in our communication channel to ask for a review.)*

3. **No Loose Ends:** Ensure your local experimental files, logs, or unneeded dependencies are caught by the global `.gitignore` and not included in the PR.

Once the automated checks pass and your peer approves, the PR can be merged into `develop`. Thank you for keeping our repository clean and our development agile!