# Bobox

File-sharing platform (React 18 + Vite + MUI v5 client, Firebase Cloud Functions backend, Cloudflare R2 object storage). Two independent packages, no workspace root: `Client/` and `Server/functions/`. Personal project, last touched ~2023; current goal is a full UI overhaul (UI library swap allowed).

## Layout
- `Client/` — Vite + React + TS app. Deployed to Netlify (`bobox.netlify.app`, SPA rewrites in `Client/netlify.toml`).
- `Server/functions/` — Firebase v1 (ESM, Node 18 engine) https callable functions + one auth trigger. Firestore rules in `Server/firestore.rules`; project `bobox-fe3c8` (`Server/.firebaserc`).
- `Client/src/utils/` and `Server/functions/src/utils/` (`types.ts`, `constants.ts`, `helpers.ts`) are **manual duplicates**. There is no shared package: a wire-format change must be edited in both copies.

## Commands
Run from the package directory. Use `yarn` in `Server/functions/` (its lockfile is `yarn.lock`); npm in `Client/` (no lockfile committed). There is **no test suite** in either package.

**On ofek's PC:** the agent shell exports `NODE_ENV=production`, so plain `npm install` silently **omits devDependencies** (`vite`, `tsc`, `eslint` end up missing, and `npm install` then reports "up to date"). Use `npm install --include=dev`, and launch Vite with `env -u NODE_ENV npm run dev -- --host 0.0.0.0` (port 3000 → `https://3000-pc.ifrah.dev`). `Client/.env` exists locally, pulled from Netlify (see Local development).

Client (`cd Client`):
- `npm run dev` — Vite dev server, fixed on port **3000**
- `npm run build` — `tsc && vite build`; this is the only typecheck. Passes on `main` (bundle ~1 MB, all MUI)
- `npm run lint` — eslint with `--max-warnings 0` (build does NOT lint; run both to verify). **Red on `main` already**: 4 pre-existing errors (3 × `react-hooks/rules-of-hooks` in `FolderStructureContext.tsx` / `AcceptInvitation.tsx` / one UI file, 1 × `ban-types` in `utils/types.ts`) + 12 warnings. Don't chase those during UI work; don't add new ones. Pipe output to a file when checking — `| tail` masks the exit code.

Functions (`cd Server/functions`):
- `npm run build` — `tsc` to `lib/` (gitignored; `lib/index.js` is the entrypoint)
- `npm run lint` — Google eslint config
- `npm run serve` — build + `firebase emulators:start --only functions`
- `npm run deploy` — deploys functions to the live Firebase project; firebase.json `predeploy` runs functions lint + build first, so a lint failure blocks deploy

## Local development
- `Client/src/services/firebase.ts` connects to the Firebase emulators **only when `VITE_USE_FIREBASE_EMULATORS=1`** (Firestore `:8080`, Functions `:5001` — not the default 5000, Auth `:9099`; start with `firebase emulators:start --only auth,firestore,functions` from `Server/`). With the flag unset, the dev app talks to the **real** `bobox-fe3c8` project, so you can log in with a real account and see real files. `Client/.env.example` documents every var.
- `Client/.env` must define `VITE_API_KEY`, `VITE_AUTH_DOMAIN`, `VITE_PROJECT_ID`, `VITE_STORAGE_BUCKET`, `VITE_MESSAGING_SENDER_ID`, `VITE_APP_ID`, `VITE_MEASUREMENT_ID` (Firebase web config). Missing values compile fine and break at runtime.
- `Server/functions/.env` must define `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `_FIREBASE_*` (underscore-prefixed), and `SENDER_EMAIL_ADDRESS` / `SENDER_EMAIL_PASSWORD` (SMTP invites via nodemailer). Loaded by `import 'dotenv/config'`.
- `.env` is gitignored repo-wide, and **no credential copies exist in the repo**. Source of truth: the Netlify site's environment variables. Netlify CLI is installed and logged in on this machine; site id `cfd4c299-f0d1-4e04-a2ee-35668f31ebd3`:
  `netlify api getEnvVars --data '{"account_id":"62e18fd0c154f71ceccba807","filter":"all","site_id":"cfd4c299-f0d1-4e04-a2ee-35668f31ebd3"}'`
  (the `site_id` param is rejected by `getSiteEnvVars`; use `account_id` = team id above). Never print the values. Firebase console / R2 dashboard: log in together with the user, ask for tokens via the secret card, or regenerate keys with their approval.

## Architecture notes
- Every client→server call goes through `Client/src/services/firebase.ts` as an `httpsCallable` named exactly like the export in `Server/functions/src/index.ts`; function names are the API contract between the packages.
- Uploads: client gets presigned S3 URLs from the functions and talks to R2 directly (small-file vs. multipart thresholds in `Client/src/utils/constants.ts`). Downloads likewise.
- Firestore shape: `users/{uid}/files` and `users/{uid}/folders`. A synthetic folder with id `"shared"` is built client-side in `getAllFilesOfUserFromDB` from `shared: true` entries; uploads/creates into it are rejected server-side.
- Global file/folder tree state lives in `FolderStructureContext` (`Client/src/contexts/` + `Client/src/hooks/useFolderStructure.ts`); pages read it via `useFolderStructureContext()`.

## UI overhaul notes
**Decided direction: migrate to shadcn/ui + Tailwind and drop MUI.** Verified starting state:
- 23 files under `Client/src` import `@mui/*`; 8 use notistack toasts (`useSnackbar`). `@mui/x-date-pickers` is only referenced by the `LocalizationProvider` in `main.tsx` — no page uses a date picker, so it drops out for free. No file imports `@emotion/*` directly.
- All MUI theming is centralized in `Client/src/theme.tsx` (createTheme + heavy `styleOverrides`).
- `tsconfig.json` / `vite.config.ts` have **no `paths` alias and no `@/` imports**; shadcn setup needs an `@/*` alias added to both (`tsconfig.json` + `resolve.alias` in `vite.config.ts`) before `components/ui/*` can be installed.
- Tailwind v4 on Vite 4 uses the `@tailwindcss/vite` plugin (CSS-first config, no `tailwind.config.js` required).
- Provider stack to replace in `main.tsx`: `ThemeProvider` → `LocalizationProvider` → notistack `SnackbarProvider` → `FolderStructureProvider` → `App`. Only `FolderStructureProvider` is app state; the rest is UI.
- Dead weight to remove during the migration: `@preact/signals-react` (unused), the `@fontsource/roboto` package + the Google Fonts `@import` in `index.css` (Roboto is loaded twice — pick one), the 4 Google sign-in PNGs in `Client/src/assets/google/` (use an icon).
- Bundle is ~1.07 MB / 302 kB gzipped, essentially all MUI — the migration is the fix.
- Bind dev servers to `0.0.0.0` (Vite sets port 3000, host defaults to localhost) if the preview must be reachable.

## Conventions
- ESLint disables `no-unused-vars` and `no-explicit-any` repo-wide (client) — don't "fix" pre-existing `any` noise as a side effect of UI work.
- Commits go directly to `main`; no CI workflows exist.
- Netlify + Firebase deploys are live production; never run `npm run deploy` / `netlify deploy` without explicit confirmation.
