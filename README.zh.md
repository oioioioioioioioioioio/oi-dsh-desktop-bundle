# oi-dsh-desktop-bundle

[`oi-dsh-desktop`](https://github.com/oioioioioioioioioioio/oi-dsh-desktop) 使用的 DeepSeek Harness 源码扩展包。

本包包含两部分：

- `harness.patch`：以官方 Harness 提交 `47f943859bef60e4160492346772ded9b24f765a` 为基线的完整桌面扩展，加入 Electron IPC、三栏布局、项目目录、代码编辑器、Markdown 预览、自定义标题栏和 Windows 原生目录选择。
- Harness Web 与 Electron 均可使用 Workspace `@file` 和 `@folder` 引用。输入 `@` 后可模糊搜索当前 Workspace，并插入 `@file:src/main.ts` 这样的路径 chip；发送给模型的只有相对路径，不会附带文件内容。
- `legacy/`：安装器用于原地升级旧桌面扩展的历史完整补丁；不会要求用户重新克隆 Harness。
- `cordis.patch.yml` 与运行模块：保留用于 Harness Cordis profile 组合和 IPC 边界的独立模块。

普通用户不需要单独克隆或执行本仓库。将 `oi-dsh-desktop` 克隆到 `deepseek-harness` 根目录后运行 `install.cmd`，安装器会自动获取本包、检查补丁能否干净应用到当前源码、构建并生成 EXE。基线提交仅用于开发记录，不是安装要求。

## 开发验证

```powershell
npm install
npm run check
```

## 许可证

Apache-2.0。补丁所扩展的 DeepSeek Harness 源码继续遵循其 MIT 许可证。
