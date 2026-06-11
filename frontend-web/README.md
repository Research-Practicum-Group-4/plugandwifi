# Plug & Wifi - Frontend Web Application

This directory contains the responsive web frontend for **Plug & Wifi (Flexible Space Finder)**, built with React 19, TypeScript, Vite, and Tailwind CSS v4.

---

## 🛠️ Prerequisites

Before you start, make sure you have the following installed locally:
* **Node.js** (v18.0.0 or higher recommended)
* **npm** (v9.0.0 or higher)

> [!NOTE]
> The project includes a `.npmrc` file configured with `legacy-peer-deps=true`. This automatically handles peer dependency conflicts between React 19 and older third-party component packages (such as `react-day-picker` v8).

---

## 🏃 Quick Start

To launch the local development environment:

```bash
# 1. Navigate to the frontend directory
cd frontend-web

# 2. Replicate the local environment variables template
cp .env.example .env.development.local

# 3. Install dependencies
npm install

# 4. Start the Vite development server
npm run dev
```

Once started, open your browser and navigate to: **[http://localhost:5173](http://localhost:5173)**

---

## 📂 Project Structure

```
frontend-web/
├── tsconfig.json          # TypeScript configurations (with @/* paths mapping)
├── vite.config.ts         # Vite build configuration (Tailwind v4 & asset resolver)
├── .npmrc                 # NPM configurations for legacy-peer-deps
├── .env.example           # Shared environment variable template for the team
└── src/
    ├── main.tsx           # Application entry point
    ├── vite-env.d.ts      # TypeScript environment variables and asset typings
    ├── app/
    │   ├── App.tsx        # App root component (with routing & toast providers)
    │   ├── routes.tsx     # Router configuration (React Router v7 routes mapping)
    │   ├── components/    # Reusable UI components & layouts (Radix & Tailwind v4)
    │   └── pages/         # Page components (HomePage, SearchPage, DetailPage, etc.)
    ├── services/          # Data layer services (api.ts with toggleable mock/real behavior)
    ├── types/             # Shared TypeScript API contracts & interfaces
    └── styles/            # Global styling stylesheets & variables
```

---

## ⚙️ Available Scripts

Run these scripts from the `frontend-web/` directory:

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the local Vite development server with Hot Module Replacement (HMR). |
| `npm run build` | Transpiles TS/TSX and bundles assets into static files under the `dist/` directory. |
| `npm run lint` | Runs ESLint to check code consistency and style guidelines. |
| `npm run preview` | Spins up a local static server to preview the production build output (`dist/`). |

---

## 🌐 Environment Configurations & Team Replication

Environment configurations are managed through Vite custom modes and `.env` files. We support 4 distinct development and testing scenarios:

### 1. Environment Profiles

| Scenario | Command | Mode | Target Env File | `VITE_USE_MOCK` | `VITE_API_BASE_URL` | Description |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pure Mock Debugging** | `npm run dev:mock` (or `npm run dev`) | `development.mock` | `.env.development.mock` | `true` | `/api` | Frontend-only styling without any backend dependencies. |
| **Local Joint Debugging** | `npm run dev:local` | `development.local` | `.env.development.local` | `false` | `http://localhost:8000/api` | Connects local frontend to a running local backend server. |
| **Remote Dev Debugging** | `npm run dev:real` | `development.real` | `.env.development.real` | `false` | `https://api.plugandwifi.xyz/api` | Connects local frontend directly to the deployed staging backend. |
| **Production Build** | `npm run build` | `production` | `.env.production` | `false` | `https://api.plugandwifi.xyz/api` | Compiles static frontend files bound to the production backend API. |

### 2. How to Replicate Locally (For Team Members)

* **Baseline Profiles**: Shared baseline configurations (`.env.development.mock`, `.env.development.real`, and `.env.production`) are committed in Git to ensure consistent default configurations for all team members.
* **Local Customization**: If you need to override the API port or endpoint URL locally, create a local override file (e.g., `.env.development.local.local` or `.env.development.real.local`). These `.local` files are ignored by Git, ensuring your local adjustments do not cause conflicts or pollute the repository.

---

## 🔄 Project Lifecycle

Understanding the lifecycle helps coordinate frontend and backend integration:

1. **Development Stage**:
   * Running `npm run dev` loads `.env.development` or `.env.development.local`.
   * The client-side code interacts with our mock service layer in `src/services/api.ts` with simulated latency, enabling zero-block frontend coding.
2. **Compilation Stage**:
   * Running `npm run build` statically compiles the codebase.
   * **Important**: Vite replaces all occurrences of `import.meta.env.VITE_...` with their literal string values *at build time* based on `.env.production`.
3. **Execution Stage**:
   * The output files under `dist/` are uploaded to static web hosting.
   * The application executes **entirely in the user's browser**. The browser downloads the Javascript bundle and initiates real REST calls to the backend `VITE_API_BASE_URL`.

---

## 🚢 Deployment Guide (Vercel)

We deploy the frontend as a static site on **Vercel**:

1. **Import Repository**: Link your GitHub repository in your Vercel Dashboard.
2. **Configure Monorepo Settings**:
   * **Framework Preset**: Select **Vite**.
   * **Root Directory**: Set to **`frontend-web`** (crucial for monorepos).
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
3. **Set Production Environment Variables**:
   In Vercel's *Settings -> Environment Variables* panel, add the following variables for the deployment:
   * `VITE_USE_MOCK` = `false`
   * `VITE_API_BASE_URL` = `https://your-backend-api.render.com/api` (the hosted backend URL)
4. **Deploy**: Vercel will automatically build and deploy new commits pushed to the `main` or `develop` branch.
