# oi-dsh-desktop-bundle

[中文说明](./README.zh.md)

DeepSeek Harness source extension consumed by [`oi-dsh-desktop`](https://github.com/oioioioioioioioioioio/oi-dsh-desktop).

The package ships:

- `harness.patch`, the complete Electron IPC, three-column workbench, project explorer, code editor, Markdown preview, native title bar, and Windows directory picker extension based on official Harness revision `47f943859bef60e4160492346772ded9b24f765a`.
- Workspace `@file` and `@folder` references for both Harness Web and Electron. Typing `@` searches the current Workspace with fuzzy matching and inserts a path chip such as `@file:src/main.ts`; only the relative path is sent, never the referenced file content.
- `legacy/`, complete historical patches used by the installer for in-place extension upgrades without recloning Harness.
- `cordis.patch.yml` and the process-local IPC modules retained for the Harness profile composition boundary.

End users do not run this package directly. Clone `oi-dsh-desktop` inside a Harness source root and run its `install.cmd`; the installer retrieves this bundle, verifies that the patch applies cleanly to the current source, builds the runtime, and packages the EXE. The baseline commit is development metadata, not an installation requirement.

## Development

```powershell
npm install
npm run check
```

## License

Apache-2.0. The patched DeepSeek Harness source remains under its MIT license.
