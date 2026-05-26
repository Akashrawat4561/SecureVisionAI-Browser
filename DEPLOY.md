# Deploy SecureVision Browser (Desktop / Electron)

This is the **Electron desktop browser** — not the React SOC dashboard (`frontend/`) and not the FastAPI backend.

## Option 1 — Desktop app deployment

### 1. Prepare production build

From the **repo root**:

```bash
pnpm install
pnpm build:browser
```

Or from `apps/browser`:

```bash
pnpm install
pnpm run build
```

This produces:

- `dist-electron/renderer/` — UI assets
- `dist-electron/main.mjs` — main process
- `dist-electron/preload.js` — preload bridge

### 2. Package the app

`electron-builder` is already configured in `electron-builder.yml`.

| Your guide | This project |
|------------|----------------|
| `npm run dist` | `pnpm run dist` (from `apps/browser`) |
| Output `dist/` | Output **`release/`** |
| `dist/win-unpacked/browser.exe` | `release/win-unpacked/SecureVision Browser.exe` |

**Windows installer:**

```bash
pnpm dist:browser:win
# or: cd apps/browser && pnpm run dist:win
```

**All platforms (on each OS or via CI):**

```bash
pnpm dist:browser          # current OS
pnpm run dist:mac        # macOS DMG
pnpm run dist:linux      # Linux AppImage
```

**Artifacts:**

```
apps/browser/release/
├── SecureVision Browser-Setup-1.0.0-x64.exe   # Windows installer
├── SecureVision Browser-Setup-1.0.0-x64.exe.blockmap
└── win-unpacked/
    └── SecureVision Browser.exe               # portable test build
```

Bump `version` in `apps/browser/package.json` before each release.

### 3. Test locally

**Unpacked (no installer):**

```bash
pnpm --filter @securevision/browser pack
# Run:
# apps/browser/release/win-unpacked/SecureVision Browser.exe
```

**After installing** the `.exe`, verify:

- [ ] Downloads work
- [ ] Tabs persist / switch correctly
- [ ] Settings save after restart
- [ ] Window resize / maximize
- [ ] Security blocking (test a suspicious URL pattern)
- [ ] Auto-update (only works for **packaged** builds with `publish` configured)

Dev mode (`pnpm dev:browser`) skips auto-update by design.

### 4. Host the installer

| Channel | Use for |
|---------|---------|
| **GitHub Releases** | Best first release; works with `electron-updater` |
| **Cloudflare R2 / S3** | Large teams; host `.exe` + `latest.yml` |
| **Netlify / Vercel** | Landing page + download link only (not the binary host) |

**GitHub Releases (recommended):**

1. Tag: `git tag browser-v1.0.0 && git push origin browser-v1.0.0`
2. CI workflow `.github/workflows/browser-release.yml` uploads installers to the release.
3. Or upload `release/*.exe` manually in the GitHub UI.

### 5. Auto-update (`electron-updater`)

Already wired in `src/main/update-manager.ts`:

- On startup (packaged builds only), after 10s: `autoUpdater.checkForUpdatesAndNotify()`
- Settings → “Check for updates” uses IPC `updates-check`
- Renderer can listen for `app-update` events (`update-available`, `update-downloaded`, progress)

**To enable updates from GitHub:**

1. Uncomment `publish` in `electron-builder.yml` (set `owner` / `repo`).
2. Set `GH_TOKEN` with `repo` scope.
3. Build and publish:

```bash
cd apps/browser
pnpm run dist:win
npx electron-builder --win --publish always
```

4. **Code-sign** Windows/macOS builds for smooth updates (no SmartScreen / Gatekeeper blocks).

Until `publish` is configured, the app still runs; update checks no-op or return “latest” when no `latest.yml` is hosted.

---

## Quick command reference

| Goal | Command |
|------|---------|
| Dev | `pnpm dev:browser` |
| Production build | `pnpm build:browser` |
| Windows installer | `pnpm dist:browser:win` |
| Unpacked test | `pnpm --filter @securevision/browser pack` |

## What is not deployed here

- `backend/` — FastAPI / ML APIs
- `frontend/` — SOC web dashboard
- `apps/sync-server/` — sync API

Ship those separately if your product needs them.
