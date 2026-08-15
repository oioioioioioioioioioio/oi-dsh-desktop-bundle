# oi-dsh-desktop-bundle

[中文说明](./README.zh.md)

The standalone DeepSeek Harness profile integration used by
[`oi-dsh-desktop`](https://github.com/oioioioioioioioioio/oi-dsh-desktop).
It provides the process-local connection, client module registry, and adapters
that map Electron-native capabilities into Harness services.

This repository is an independently versioned npm package. It is not an
Electron executable, contains no copy of Harness source, and does not start a
window, HTTP server, or WebSocket listener by itself.

## Install from GitHub

Applications can reference a tagged release directly in `package.json`:

```json
{
  "dependencies": {
    "oi-dsh-desktop-bundle": "github:oioioioioioioioioioio/oi-dsh-desktop-bundle#v0.1.0"
  }
}
```

The package's `prepare` script builds `lib/` automatically when npm installs it
from GitHub.

## Develop

Requires Node.js 22.19.0 or newer with npm.

```powershell
git clone https://github.com/oioioioioioioioioioio/oi-dsh-desktop-bundle.git
cd oi-dsh-desktop-bundle
npm install
npm run check
```

## License

Apache-2.0
