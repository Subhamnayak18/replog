# RepLog

A free, local-first workout journal and colorful notebook. React + Vite, small custom CSS, IndexedDB, and a generated offline service worker. No backend, account, analytics, remote fonts, or paid service. Your journal starts empty.

## Setup and run

Install Node.js 22.12 or newer (Node 24 also works). Extract this entire project and open a terminal in the folder containing `package.json`.

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. Development mode supports editing and local data; offline/install support is enabled in production builds only.

```sh
npm test
npm run build
npm run test:pwa
npm run preview
```

Open the preview address printed by Vite, normally `http://127.0.0.1:4173/`. Do not open `dist/index.html` directly as a file. Build output is `dist/`. `npm ci` requires the internet initially; using the built app after its first successful online load does not.

## Workouts

### Personal PIN screen

RepLog now opens with a personal PIN screen. Enter the PIN configured for this build to unlock, then it displays **Welcome Subham Nayak**. Tap **Lock** or reload the page to lock it again. The unlocked state stays only in memory; no “remember me” flag is saved. Locking does not delete records. The screen works offline once the app has been cached after unlocking.

This is a **convenience screen lock**, not secure authentication. A salted PBKDF2 verifier is bundled in the public app rather than a plaintext PIN. A determined person can still bypass client-side code or guess a four-digit PIN. IndexedDB and JSON backups are not encrypted. The public website remains accessible to other visitors, who have their own local journal. True restricted access requires a server-side authentication service or access-controlled hosting. Do not treat the PIN screen as protection for sensitive information.

Choose **Log a workout**, a body part, exercise name, max weight in kg, reps **at that weight**, and date. Use 0 kg for bodyweight exercises. Dates default to the device's local date. Records support editing and confirmed deletion. Log each session as a new record to retain history.

Filter by body part and search exercise names. Click an exercise name or its history icon to see dated entries and the highest recorded weight. Names match without case or surrounding whitespace, within the same body part. Renaming an exercise or changing its body part moves that record to its new history group. Best weight is not an estimated one-rep max; compare reps as well. Overview counts distinct workout dates, total records, and distinct exercises per body part.

## Notes

Open **Notes**. Add a title and optional plain-text body, choose one of five colors, edit or delete. Search checks both titles and body text. Notes sort by most recent edit. Line breaks are preserved. Rich text/HTML and custom fonts are intentionally excluded.

## Install and offline use

1. Serve a production build on HTTPS or localhost. GitHub Pages supplies HTTPS.
2. Open it online once and wait for **Ready offline** in the header. The service worker caches all compiled application assets, icons and the manifest.
3. On Chromium desktop/Android, use the browser's **Install app** menu or the install button in RepLog's help dialog when offered. On Safari iPhone/iPad, use **Share → Add to Home Screen**. Browser installation options vary.
4. Turn on airplane mode, close/reopen or reload the app, add a workout or note, and reload again to verify local persistence.

The help dialog opens from the top-right download icon or “About your local data”. It also offers a persistent-storage request; browsers may decline it. Updates download in the background. RepLog offers **Update app** when an update is waiting; applying it reloads the page, so finish any open edits first. No update is activated over an open form without pressing the button. Offline caching is build-scoped and repository-path-scoped.

## Backup and restore

Use **Export backup** at the bottom of either screen. This downloads `replog-backup-YYYY-MM-DD.json` containing both sections, record IDs and timestamps. Save it outside the browser, ideally in another safe location. Use **Import backup**, select a RepLog JSON file, review the counts and confirm.

Import validates the entire file before writing and merges both sections in one IndexedDB transaction. Existing unrelated records stay. A matching ID is replaced only if the imported `updatedAt` is newer; equal timestamps keep the existing record. Re-importing is idempotent. Duplicate IDs within a section, malformed fields, unsupported versions and files above 20 MB are rejected. Exports contain personal notes in readable JSON; share deliberately.

**Important:** local-first does not mean cloud backup. Records belong to this browser profile and origin; another device, domain or browser has a separate journal. Different repository paths on the same origin share the IndexedDB database. Clearing browser/site data, uninstalling in some browsers, private browsing, or storage eviction can erase records. Export regularly. If storage fails, RepLog shows an error and does not claim the save succeeded. Moving to another origin requires export/import. There is no automatic multi-device sync or conflict-free simultaneous editing; use one tab for editing.

## GitHub Pages deployment

Source: https://github.com/Subhamnayak18/replog (public). GitHub Pages is configured to deploy through GitHub Actions, with automatic deployment enabled. Your app’s records remain on each visitor’s device, outside the repository.

1. Create a public GitHub repository. Put the **contents of this project folder** (including `.github`, `public`, `src`, `package-lock.json`, and the config files) at its root. Do not upload `node_modules` or `dist`.
2. Commit and push to the `main` branch. In repository **Settings → Pages → Build and deployment**, choose **GitHub Actions**.
3. Open **Actions → Check RepLog and optionally deploy → Run workflow**, select **Deploy to GitHub Pages**, and run it. It installs with the lockfile, runs tests, builds, and publishes `dist`. Leave the checkbox off to run checks only.
4. For automatic deployment after each push, add a repository Actions variable named `ENABLE_PAGES` with value `true` in **Settings → Secrets and variables → Actions → Variables**, after Pages is configured. Without this variable, pushes still run all tests and build checks but skip deployment.
5. Use the actual URL GitHub reports in the deployment/environment. No URL is assumed here. The repository is public and GitHub Pages is enabled; the normal checks still run independently of hosting.

The workflow derives `VITE_BASE_PATH` as `/REPOSITORY/` for a project site and `/` for a `*.github.io` repository. Both routes use hashes (`#/workouts`, `#/notes`), so direct links and reloads never ask Pages for a missing SPA route. Vite assets, manifest scope, start URL and the worker scope use the same base. No `404.html` redirect is needed.

For a custom domain served at the root, edit the workflow's base-path step to write `VITE_BASE_PATH=/` instead, and configure the domain in GitHub Pages. For manual project-path builds:

```powershell
$env:VITE_BASE_PATH='/YOUR-REPOSITORY/'
npm run build
npm run preview
```

On macOS/Linux: `VITE_BASE_PATH=/YOUR-REPOSITORY/ npm run build`. Use the exact path including leading/trailing slashes, and visit that path on the preview server. Reset the environment variable to `/` when building for root. Never place personal JSON backups in a public repository.

## Structure and checks

- `src/main.jsx`: responsive screens, accessible dialogs, CRUD, search and history.
- `src/styles.css`: mobile-first behavior and self-contained visual design, system fonts.
- `src/data.js`: validation, IndexedDB transactions and versioned backup merge.
- `src/*.test.*`: storage, validation, backup roundtrip/merge/rejection and interface tests.
- `vite.config.js`: configurable base, web manifest and complete static-asset precache.
- `public/`: original app icons (SVG and PNG).
- `.github/workflows/deploy.yml`: reproducible tests/build and Pages deployment.

Automated tests use a simulated IndexedDB and DOM. They exercise real application persistence code, including all-or-nothing validation, file import review and JSON export. `npm run test:pwa` additionally checks the generated production worker, offline cache behavior, manifest and icons; run it after building, using the same `VITE_BASE_PATH` as the build. These tests simulate the worker environment rather than running a browser. Real-browser install UI varies and should be checked on your target phone using the offline steps above. No external runtime requests or third-party APIs are needed. Future schema changes should increment the IndexedDB version and add explicit upgrade logic; version 1 backups should remain supported or receive a migration.

References: [Vite's GitHub Pages and base-path instructions](https://vite.dev/guide/static-deploy.html#github-pages); [MDN service worker lifecycle and secure contexts](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API).
