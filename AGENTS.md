# Bobox

File-sharing platform: React 18 + Vite + Tailwind/shadcn client (the full MUI v5 → shadcn/Tailwind UI overhaul merged into `main` and live in production as of 2026-11-02), Firebase Cloud Functions backend, Cloudflare R2 object storage. Two independent packages, no workspace root: `Client/` and `Server/functions/`.

## Layout
- `Client/` — Vite + React + TS app. shadcn/ui components live in `Client/src/components/ui`, theme tokens in `Client/src/index.css`.
- `Server/functions/` — Firebase v1 (ESM, Node 18 engine) https callables + one auth trigger. Rules in `Server/firestore.rules`; project `bobox-fe3c8` (`Server/.firebaserc`).
- `Client/src/utils/` and `Server/functions/src/utils/` (`types.ts`, `constants.ts`, `helpers.ts`) are **manual duplicates** — a wire-format change must be edited in both.
- The Netlify site (id `cfd4c299-f0d1-4e04-a2ee-35668f31ebd3`) **builds from GitHub** (`github.com/ofek150/Bobox`, `main`) via repo-root `netlify.toml` (base `Client`, `pnpm build`, Node 22, SPA redirect) — pushes to `main` auto-deploy. All 7 `VITE_*` env vars live site-level in Netlify (survive repo switches; verify keys with `netlify api getEnvVars`). The old GitLab mirror (`gitlab.com/ofek150/bobox`) is no longer the deploy source.
- Gotcha that bit once: the root `.gitignore` had a bare `lib` pattern (for the Firebase Functions tsc output) which silently excluded `Client/src/lib/utils.ts` from git — CI builds failed on `Cannot find module '@/lib/utils'` while local builds passed. The pattern is now scoped to `/Server/functions/lib/`; when adding source dirs, check `git check-ignore` after the first `git add`.

## Commands
Client uses **pnpm 10.14** (`packageManager` field; corepack is enabled on this PC). `Server/functions/` uses **npm** with `yarn.lock` present — leave it. There is **no test suite** in either package.

Client (`cd Client`):
- `pnpm dev` — Vite dev server on port **3000**, `host: true` already set (`https://3000-pc.ifrah.dev`)
- `pnpm build` — `tsc && vite build`; this is the only typecheck
- `pnpm lint` — eslint `--max-warnings 0`. **Red on the base commit**: 4 pre-existing errors (3 × `react-hooks/rules-of-hooks`, 1 × `ban-types` in `utils/types.ts`) + warnings. Don't chase them, don't add new ones. Redirect output to a file to check — piping to `tail` masks the exit code.
- `npx shadcn@latest add <name>` — works because the CLI detects pnpm and runs `pnpm add`. Under npm it dies: this PC's npm is patched for RFC npm/rfcs#868 and rejects the CLI's `--allow-scripts` flag in any project install (`~/.local/node/lib/node_modules/npm/lib/utils/resolve-allow-scripts.js`). No `~/.npmrc` change fixes that.
- The agent shell exports `NODE_ENV=production`: with npm this silently skips devDependencies, and it makes Vite run oddly. Launch Vite as `env -u NODE_ENV pnpm dev`.

Functions (`cd Server/functions`): `npm run build` (tsc → gitignored `lib/`), `npm run lint` (Google config), `npm run serve` (emulators, functions only), `npm run deploy` (predeploy runs lint + build, so lint failures block deploy).

CI (`.github/workflows/ci.yml`): `client-build` (Node 22 + `corepack enable`, pnpm) and `functions-build` (Node **18** — the package `engines` pin + yarn enforces it) run on every PR and push to `main`; both are required checks on `main` (strict, `enforce_admins` off so direct pushes still work). Actions policy must stay `allowed_actions: all` — it shipped as `local_only`, which made every workflow using `actions/*` fail as `startup_failure` in 0s. Lint is deliberately NOT a CI gate (red baseline). Functions are deployed manually (`npm run deploy`); CI never deploys.

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
- **MUI migration is DONE** (branch `feat/ui-overhaul-shadcn`): every page and component is shadcn/Tailwind; `@mui/*`, `@emotion/*`, `notistack`, `dayjs`, `@preact/signals-react`, `@fontsource/roboto`, `src/theme.tsx` and the Google PNGs are all removed. Google sign-in uses an inline SVG (`components/UI/GoogleIcon.tsx`).
- File browser: row-based list in `FolderComponent`/`FileComponent` with kebab dropdowns, `ShareDialog`/`ConfirmDialog`/`FileTypeIcon` under `components/UI/`, sticky mobile action bar in `MyFiles`.
- Routes are `React.lazy`-split in `App.tsx`; the main chunk is ~190 kB gzip (Firebase SDK dominates). `src/assets/Logo.png` is 160×160 (~10 kB).
- `pnpm lint`: 1 pre-existing error left (`ban-types` in `utils/types.ts`) + 7 warnings; the 3 `rules-of-hooks` errors were fixed with the page rewrites. Don't add new ones.
- The app runs **React 19** (upgraded 2026-11-02): the shadcn components (radix/nova preset) are React-19-style function components (ref as a prop) and Radix Slot needs that ref. On React 18 the ref was silently dropped, so every Radix popup (kebab menus, selects) opened unanchored/off-screen — invisible taps on mobile. Don't downgrade React or hand-write React-18-style components expecting refs; `usehooks-ts`'s `react ^18` peer warning is expected and safe.
- `lucide-react` 1.x renamed icons: no `FolderShared` (use `FolderUsers`); check `Object.keys(require('lucide-react'))` before guessing.
- Roboto Variable is the single font, imported in `src/index.css`.

## Conventions
- **Mobile responsive across the board** (Ofek's requirement): every page and component must work at ~390px and at desktop width — no horizontal page overflow, controls reachable with one hand, nav collapses to icons. Verify in the OpenChamber browser panel with `browser.resize viewport=mobile` (390×844) and desktop, screenshot with `browser.capture`, and read the image before calling a step done.
- Work on a `feat/*` branch and use **conventional commits** (`feat(client):`, `build(client):`, `fix(client):`, `perf(client):`, `docs:`, `chore:`); one commit per logical step — keep dependency changes (`build`) out of code commits, assets (`perf`, `chore`) separate, and split a mixed commit with `git reset --soft` (never rewrite pushed history; the feature branch is local-only until the final merge). `main` is the integration branch; no CI workflows exist.
- ESLint disables `no-unused-vars` and `no-explicit-any` (client) — don't clean up pre-existing `any` noise as a side effect of UI work.
- Netlify + Firebase deploy to live production; never deploy, change build settings, or switch the deploy repo without explicit approval.
