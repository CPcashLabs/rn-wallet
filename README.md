# CPCash React Native Shell

本目录承载 Vue -> React Native 迁移的 `WP-00` 基础设施代码。

当前范围：

- 独立的 RN 子项目清单
- 导航骨架
- Provider 骨架
- 网络层、会话层、存储层骨架
- Zustand 状态骨架
- 原生能力 adapter 骨架
- 主题与 i18n 骨架

当前不包含：

- 真实 Passkey 接入
- 真实钱包连接
- 真实扫码、文件导出、分享能力
- 任何业务页面迁移
- 完整原生 `android/` / `ios/` 工程模板

说明：

- 由于当前仓库中没有现成的 React Native CLI 模板和相关依赖，本次先落 `WP-00` 的 TypeScript/架构骨架。
- 后续在 `rn_code/` 内安装依赖后，可继续补平台原生壳并按 `WP-01` 以后逐包迁移。

