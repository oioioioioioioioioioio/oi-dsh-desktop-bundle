# oi-dsh-desktop-bundle

[English](./README.md)

这是供 [`oi-dsh-desktop`](https://github.com/oioioioioioioioioioio/oi-dsh-desktop)
使用的独立 DeepSeek Harness Profile 集成包。它提供进程内 Connection、客户端模块
注册器，以及把 Electron 原生能力映射到 Harness 服务的适配层。

这是一个独立维护版本的 npm 包，不是 Electron 可执行程序。它不包含 Harness 源码，
单独安装时也不会启动窗口、HTTP 服务或 WebSocket 监听端口。

## 从 GitHub 安装

其他应用可以在 `package.json` 中直接引用带版本标签的源码：

```json
{
  "dependencies": {
    "oi-dsh-desktop-bundle": "github:oioioioioioioioioioio/oi-dsh-desktop-bundle#v0.1.0"
  }
}
```

npm 从 GitHub 安装时会自动执行本包的 `prepare` 脚本并生成 `lib/`，因此不需要提交
编译产物。

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
