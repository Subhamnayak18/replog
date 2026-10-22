# Delivery verification

Verified in the delivery environment with Node.js 24.21.0 and npm 11.19.0.

- `npm test`: **9 tests passed** across 2 files. Covers workout/note create/edit/delete, filtering/search, history, reload persistence, validation, transactional backup roundtrip, idempotent import, newest-edit conflict resolution, invalid-file rejection, file import confirmation and exported JSON contents.
- `npm run build`: **passed**, with a reproducible package lockfile.
- `npm run test:pwa`: **2 tests passed** against the root-path production build.
- Rebuilt with `VITE_BASE_PATH=/replog/`: **passed**; the same **2 PWA tests passed** against that subfolder build.
- Delivered `dist/` was rebuilt for the root path. The Pages workflow rebuilds for your actual repository path.

The production worker checks execute the generated worker in an isolated JavaScript environment. They verify precached assets, offline navigation responses, cached manifest/application assets, app-specific cache cleanup, update messaging, base-path consistency, and actual PNG icon dimensions.

Real-browser visual, installation and airplane-mode verification could not be completed because the browser preview tool blocked the local preview URL under its URL security policy. No workaround was used. The simulated DOM/IndexedDB/worker checks passed, but they do not certify device-specific installation behavior. Follow the manual offline/install checklist in README.md on your phone or browser after serving the production build.

Source repository: https://github.com/Subhamnayak18/replog (private). No live site has been deployed. GitHub Pages setup and the deployment workflow are included; free Pages hosting requires a public repository.
