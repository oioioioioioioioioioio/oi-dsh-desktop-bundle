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

Applications can reference an immutable tagged HTTPS archive directly in
`package.json`:

```json
{
  "dependencies": {
    "oi-dsh-desktop-bundle": "https://codeload.github.com/oioioioioioioioioioio/oi-dsh-desktop-bundle/tar.gz/refs/tags/v0.1.1"
  }
}
```

Release tags include the verified `lib/` output so archive installation does
not require a GitHub account, SSH key, or package build step. A source checkout
still rebuilds `lib/` through its `prepare` script during `npm install`.

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
