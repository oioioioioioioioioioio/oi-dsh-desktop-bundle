# oi-dsh-desktop-bundle

[English](./README.md)

这是供 [`oi-dsh-desktop`](https://github.com/oioioioioioioioioioio/oi-dsh-desktop)
使用的独立 DeepSeek Harness Profile 集成包。它提供进程内 Connection、客户端模块
注册器，以及把 Electron 原生能力映射到 Harness 服务的适配层。

这是一个独立维护版本的 npm 包，不是 Electron 可执行程序。它不包含 Harness 源码，
单独安装时也不会启动窗口、HTTP 服务或 WebSocket 监听端口。

## 从 GitHub 安装

其他应用可以在 `package.json` 中直接引用固定版本的 GitHub HTTPS 归档：

```json
{
  "dependencies": {
    "oi-dsh-desktop-bundle": "https://codeload.github.com/oioioioioioioioioioio/oi-dsh-desktop-bundle/tar.gz/refs/tags/v0.1.1"
  }
}
```

发布标签包含已经验证的 `lib/` 构建产物，因此通过归档安装不需要 GitHub 账号、SSH
密钥或现场构建。直接克隆源码执行 `npm install` 时，`prepare` 脚本仍会重新构建
`lib/`。

## 开发

要求 Node.js 22.19.0 或更高版本，并包含 npm。

```powershell
git clone https://github.com/oioioioioioioioioioio/oi-dsh-desktop-bundle.git
cd oi-dsh-desktop-bundle
npm install
npm run check
```

## 许可证

Apache-2.0
