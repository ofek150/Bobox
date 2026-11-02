# Bobox

File-sharing platform: React 18 + Vite + Tailwind/shadcn client (migrating off MUI v5), Firebase Cloud Functions backend, Cloudflare R2 object storage. Two independent packages, no workspace root: `Client/` and `Server/functions/`. Personal project, dormant since 2024; the active work is a full UI overhaul on branch `feat/ui-overhaul-shadcn`.

## Layout
- `Client/` — Vite + React + TS app. shadcn/ui components live in `Client/src/components/ui`, theme tokens in `Client/src/index.css`.
- `Server/functions/` — Firebase v1 (ESM, Node 18 engine) https callables + one auth trigger. Rules in `Server/firestore.rules`; project `bobox-fe3c8` (`Server/.firebaserc`).
- `Client/src/utils/` and `Server/functions/src/utils/` (`types.ts`, `constants.ts`, `helpers.ts`) are **manual duplicates** — a wire-format change must be edited in both.
- The Netlify site builds from a **private GitLab repo** (`gitlab.com/ofek150/bobox`, base dir `Client`, cmd `yarn build`), not from the GitHub origin. Pushing GitHub alone does not deploy. Switching the site to GitHub + `pnpm build` is a planned step at the end of the overhaul.

## Commands
Client uses **pnpm 10.14** (`packageManager` field; corepack is enabled on this PC). `Server/functions/` uses **npm** with `yarn.lock` present — leave it. There is **no test suite** in either package.

Client (`cd Client`):
- `pnpm dev` — Vite dev server on port **3000**, `host: true` already set (`https://3000-pc.ifrah.dev`)
- `pnpm build` — `tsc && vite build`; this is the only typecheck
- `pnpm lint` — eslint `--max-warnings 0`. **Red on the base commit**: 4 pre-existing errors (3 × `react-hooks/rules-of-hooks`, 1 × `ban-types` in `utils/types.ts`) + warnings. Don't chase them, don't add new ones. Redirect output to a file to check — piping to `tail` masks the exit code.
- `npx shadcn@latest add <name>` — works because the CLI detects pnpm and runs `pnpm add`. Under npm it dies: this PC's npm is patched for RFC npm/rfcs#868 and rejects the CLI's `--allow-scripts` flag in any project install (`~/.local/node/lib/node_modules/npm/lib/utils/resolve-allow-scripts.js`). No `~/.npmrc` change fixes that.
- The agent shell exports `NODE_ENV=production`: with npm this silently skips devDependencies, and it makes Vite run oddly. Launch Vite as `env -u NODE_ENV pnpm dev`.

Functions (`cd Server/functions`): `npm run build` (tsc → gitignored `lib/`), `npm run lint` (Google config), `npm run serve` (emulators, functions only), `npm run deploy` (predeploy runs lint + build, so lint failures block deploy).

## Local development
- `Client/src/services/firebase.ts` connects to Firebase emulators **only when `VITE_USE_FIREBASE_EMULATORS=1`** (Firestore `:8080`, Functions `:5001` — not the default 5000, Auth `:9099`; `firebase emulators:start --only auth,firestore,functions` from `Server/`). Unset = the dev app uses the **real** `bobox-fe3c8` project, so real logins and real files work in dev. `Client/.env.example` lists every var.
- `Client/.env` needs the 7 `VITE_*` Firebase web-config keys; missing ones compile fine and break at runtime.
- `Server/functions/.env` needs `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `_FIREBASE_*` (underscore-prefixed), `SENDER_EMAIL_ADDRESS` / `SENDER_EMAIL_PASSWORD` (SMTP invites). Loaded by `import 'dotenv/config'`.
- `.env` is gitignored repo-wide and no credential copies live in the repo. Source of truth is the Netlify site. Netlify CLI is installed and logged in; site `cfd4c299-f0d1-4e04-a2ee-35668f31ebd3`:
  `netlify api getEnvVars --data '{"account_id":"62e18fd0c154f71ceccba807","filter":"all","site_id":"cfd4c299-f0d1-4e04-a2ee-35668f31ebd3"}'`
  (`getSiteEnvVars` rejects `site_id`; use `account_id` = team id). Never print values. Firebase console / R2: log in with the user, ask for tokens via the secret card, or regenerate with approval.
- Google sign-in cannot be tested in the OpenChamber browser panel (Google blocks it as insecure). There is a **dev test account** in the real project — `bobox.dev@mailinator.com`, password in `~/.config/bobox/dev-account.txt` (outside the repo; create a new one through `/signup` if that file is gone).

## Architecture notes
- Every client→server call goes through `Client/src/services/firebase.ts` as an `httpsCallable` named exactly like the export in `Server/functions/src/index.ts`; those names are the API contract.
- Uploads/downloads: the client gets presigned S3 URLs from the functions and talks to R2 directly; size tiers in `Client/src/utils/constants.ts`.
- Firestore: `users/{uid}/files`, `users/{uid}/folders`. A synthetic folder with id `"shared"` is built client-side in `getAllFilesOfUserFromDB` from `shared: true` entries; server-side rejects writes into it.
- Global file/folder tree state: `FolderStructureContext` + `useFolderStructure`; pages read it via `useFolderStructureContext()`.

## UI overhaul state
Direction: **shadcn/ui + Tailwind, soft & friendly, light + dark, comfortable density**, MUI fully out.
- Done: Vite 4→7 + plugin-react 4.7 (Tailwind v4's plugin needs Vite ≥5.2), pnpm, `@/*` alias in `tsconfig.json` + `vite.config.ts`, shadcn (radix/nova preset, 27 components), Bobox palette + 0.875rem radius in `src/index.css`, next-themes toggle, shadcn Navbar/Layout.
- MUI is now **dev-fragile**: importing `createTheme` from `@mui/material` crashes the dev server under Vite 7 pre-bundling (`createTheme_default is not a function`); `Client/src/theme.tsx` is unreferenced and must go with MUI. Un-migrated pages render with plain MUI defaults, so migrate pages rather than re-adding MUI theming.
- Removing MUI from `optimizeDeps` is a dead end — `@emotion`/`hoist-non-react-statics`/`prop-types` CJS default-import interop breaks unoptimized. Keep default pre-bundling.
- MUI usage to finish: 23 files import `@mui/*` (shell files done, pages pending), 8 files use notistack `useSnackbar` → move to `sonner` `toast` (`<Toaster>` is already mounted in `main.tsx`).
- `lucide-react` 1.x renamed icons: no `FolderShared` (use `FolderUsers`); check `Object.keys(require('lucide-react'))` before guessing.
- Also delete when done: `@preact/signals-react` (unused), `dayjs` (unused), `@fontsource/roboto`, the Google sign-in PNGs in `Client/src/assets/google/`.
- Roboto Variable is the single font, imported in `src/index.css`.

## Conventions
- **Mobile responsive across the board** (Ofek's requirement): every page and component must work at ~390px and at desktop width — no horizontal page overflow, controls reachable with one hand, nav collapses to icons. Verify in the OpenChamber browser panel with `browser.resize viewport=mobile` (390×844) and desktop, screenshot with `browser.capture`, and read the image before calling a step done.
- Work on a `feat/*` branch and use **conventional commits** (`feat(client):`, `build(client):`, `docs:`, `chore:`); one commit per logical step. `main` is the integration branch; no CI workflows exist.
- ESLint disables `no-unused-vars` and `no-explicit-any` (client) — don't clean up pre-existing `any` noise as a side effect of UI work.
- Netlify + Firebase deploy to live production; never deploy, change build settings, or switch the deploy repo without explicit approval.
