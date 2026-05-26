# SecureVision AI Browser 🛡️

![SecureVision Browser Banner](../assets/banner.png)

> **The Next-Generation Security-First Browser.** Built on Electron and Chromium, SecureVision AI Browser is designed from the ground up for researchers, threat analysts, and security-conscious individuals.

## 🌟 Overview

SecureVision AI Browser replaces the traditional browsing experience with a highly hardened, workspace-driven environment. It natively integrates with the SecureVision Python Backend for real-time AI deepfake scanning, heuristic phishing classification, and live network anomaly detection directly inside your New Tab Dashboard.

## 🚀 Key Features

### 🏢 Workspace Session Isolation
- **100% Isolated Partitions:** Workspaces (e.g., *Personal*, *Work*, *Secure*) operate in entirely distinct storage partitions (`persist:<workspaceId>`).
- **Complete Separation:** Cookies, Local Storage, IndexedDB, and Cache never bleed across workspaces. Logging into an account in one workspace keeps it fully isolated from the others.
- **Persistent Tab States:** Tabs are securely persisted to disk and restored instantly when switching between your isolated workspaces.

### 🛡️ Built-in Security Dashboard (New Tab)
Every time you open a new tab, you are presented with the SecureVision AI Command Center instead of a blank page. Features include:
- **Deepfake Forensic Scanner:** Paste any media URL to verify its authenticity using our backend AI forensic neural nets (identifies facial lattices and synthetic voice signatures).
- **Phishing Heuristics Scanner:** Test suspicious emails, domains, or messages using real-time social engineering indicators.
- **Honeypot Decoy Injection:** Instantly deploy honeytoken credentials into the browser's database. Any infostealer malware attempting to harvest these credentials will trigger a silent security alert on the network layer!

### 👻 Ghost Mode & Hardening
- **Ghost Mode:** One-click toggle for stealth sessions with sandboxed routing.
- **Zero-Trust IPC:** A strict Zod-validated Inter-Process Communication (IPC) layer between the React frontend and the Electron Node.js backend prevents privilege escalation attacks.
- **Memory Orchestration:** Intelligent background tab throttling and memory purging to prevent runaway scripts or crypto-miners from consuming system resources.

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Core Framework** | Electron, Node.js, Chromium |
| **Frontend UI** | React 19, Vite, TypeScript |
| **Styling** | TailwindCSS v4, Framer Motion, Lucide Icons |
| **State & Validation** | Zustand (Global State), Zod (IPC Validation) |
| **Build & Packager** | Electron-builder, pnpm workspaces |

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- [pnpm](https://pnpm.io/installation) installed globally (`npm install -g pnpm`)
- SecureVision AI Python Backend (running on port `8000`) for the full AI experience.

### Installation

1. Navigate to the `browser` directory from the root project:
   ```bash
   cd browser
   ```

2. Install dependencies (if you haven't run install from the monorepo root):
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm run dev
   ```
   *Note: This command concurrently compiles the Electron backend, starts the Vite React dev server, and launches the desktop application.*

### Building for Production

To create distributable native binaries for your operating system:

```bash
# Build for Windows
pnpm run dist:win

# Build for macOS
pnpm run dist:mac

# Build for Linux
pnpm run dist:linux
```

*The compiled installers will be located in the `browser/dist` directory.*

## 🏗️ Architecture Design

The browser follows a strict multi-process architecture emphasizing security:

- **Main Process (`src/main/`):** Handles OS-level interactions, window management, isolated session partitioning, and file I/O for workspace states.
- **Renderer Process (`src/renderer/`):** A hardened, context-isolated React environment driving the Sidebar, Workspaces, and the intelligent Dashboard.
- **BrowserViews (`BrowserViewManager`):** The actual web pages load inside dynamically partitioned `BrowserView` overlays, meaning the web content never touches the React UI layer.

## 📄 License
This project is part of the SecureVision AI ecosystem and is licensed under the MIT License.

---
Developed with ❤️ by **SecureVision AI Systems**.
