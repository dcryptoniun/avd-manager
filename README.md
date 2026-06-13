# AVD Manager

<p align="center">
  <strong>A lightweight, cross-platform Android Virtual Device Manager</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#license">License</a>
</p>

---

Manage Android Virtual Devices without needing Android Studio. AVD Manager provides a modern, fast desktop GUI for creating, managing, and launching Android emulators — and managing SDK packages.

## Features

### 🎮 Virtual Device Management
- **Create AVDs** with a visual wizard — select device, system image, and configure options
- **Launch emulators** with customizable options (GPU, cold boot, wipe data)
- **Track running emulators** with real-time status indicators
- **Rename, delete, and wipe data** for existing AVDs
- **View detailed configuration** for each virtual device

### 📦 SDK Package Management
- **SDK Platforms** — Browse, install, and remove Android platform packages
- **SDK Tools** — Manage build tools, platform tools, command-line tools
- **System Images** — Install system images required for creating AVDs
- **Bulk update** — Update all outdated packages in one click
- **Accept licenses** — Accept all SDK licenses from within the app

### 🔍 Auto-Detection
- Automatically detects `ANDROID_HOME` / `ANDROID_SDK_ROOT`
- Detects Java/JDK installation
- Validates all SDK tools (`avdmanager`, `sdkmanager`, `emulator`, `adb`)
- Manual SDK path configuration with guided setup wizard

### 🎨 Modern UI
- **Light & Dark mode** with system preference as default
- Clean, modern design with glassmorphism sidebar
- Smooth micro-animations and transitions
- Toast notifications for operation feedback
- Responsive layout with resizable window

## Installation

Download the latest release for your platform:

| Platform | Format |
|----------|--------|
| Windows  | `.msi` installer |
| macOS (Apple Silicon) | `.dmg` |
| macOS (Intel) | `.dmg` |
| Linux    | `.deb`, `.AppImage` |

### Prerequisites
- **Java/JDK 17+** (Oracle JDK or OpenJDK)
- **Android SDK Command-line Tools** ([Download](https://developer.android.com/studio#command-line-tools-only))

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Framework | [Tauri v2](https://v2.tauri.app/) |
| Frontend  | React 19 + TypeScript |
| Backend   | Rust |
| Bundler   | Vite |
| Icons     | Lucide React |
| Styling   | Vanilla CSS (custom design system) |
| CI/CD     | GitHub Actions |

### Why Tauri?
- **~2-10 MB** binary size (vs Electron's 100+ MB)
- **~30-80 MB** memory usage (vs Electron's 150-400+ MB)
- Native WebView — no bundled Chromium
- Rust backend for security and performance
- Official GitHub Actions support

## Development

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install)
- Platform-specific dependencies:
  - **Windows**: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) + Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf`

### Setup

```bash
# Clone the repository
git clone https://github.com/user/avd-manager.git
cd avd-manager

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Project Structure

```
avd-manager/
├── src/                    # React frontend
│   ├── App.tsx             # Main application component
│   ├── App.css             # Component styles
│   ├── index.css           # Design system & tokens
│   ├── hooks/              # React hooks
│   │   ├── useTheme.ts     # Theme management
│   │   └── useToast.ts     # Toast notifications
│   └── lib/                # Utilities
│       ├── commands.ts     # Tauri command wrappers
│       └── types.ts        # TypeScript types
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Plugin & command registration
│   │   ├── main.rs         # Entry point
│   │   └── commands/       # Command modules
│   │       ├── avd.rs      # AVD management
│   │       ├── sdk.rs      # SDK package management
│   │       ├── emulator.rs # Emulator control
│   │       └── setup.rs    # Environment detection
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri configuration
├── .github/workflows/      # CI/CD
│   └── release.yml         # Build for all platforms
├── LICENSE                 # MIT
└── package.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by [vscode-avdmanager](https://github.com/toroxx/vscode-avdmanager)
- Built with [Tauri](https://tauri.app/)
- Icons by [Lucide](https://lucide.dev/)
