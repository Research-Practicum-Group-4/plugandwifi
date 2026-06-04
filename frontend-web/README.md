# Frontend Web (React + Vite + TS)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Prerequisites
* Node.js (v18+)
* npm (`.npmrc` is set, automatically using `legacy-peer-deps` solving plugins conflicts)

## Quick Start

```bash
cd frontend-web

npm install

npm run dev
```
Open in browser: [http://localhost:5173](http://localhost:5173)

## Scripts

```bash
# frontend-web/

npm run dev # start local vite for development
npm run build # build and package codes, output dist/
npm run lint # lint code
npm run preview # preview the packaged application
```
