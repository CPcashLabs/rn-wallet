# 最值得优先重构的 2 个降重机会

本次只挑“真正值得改”的地方，不为了套设计模式而引入额外复杂度。

## 1. 认证密码流程重复，适合做配置驱动的模板式抽象

### 现状

以下 3 个屏幕共享了非常接近的主流程：

- `src/features/auth/screens/SetPasswordScreen.tsx`
- `src/features/auth/screens/FirstSetPasswordScreen.tsx`
- `src/features/auth/screens/LoggedInSetPasswordScreen.tsx`

重复点主要包括：

- 加载密码规则 `getPasswordRules`
- 保存 `rules / errorMessage / submitting`
- 使用 `validatePasswordAgainstRules` 校验密码
- 使用 `encryptByPublicKey` 做加密
- 处理 “两次密码不一致”
- 相似的输入框结构和按钮结构

其中 `SetPasswordScreen` 和 `FirstSetPasswordScreen` 几乎是同一个页面，只是：

- 提交 API 不同
- 成功后的 `loginType` 不同
- 失败提示文案不同
- 标题和副标题不同
- `SetPasswordScreen` 额外需要 `randomString`

`LoggedInSetPasswordScreen` 虽然多了一个“先验证旧密码”的步骤，但它的第二阶段依然复用了同样的“新密码设置”流程。

### 为什么它是第一优先级

- 重复已经进入“复制整段流程”的程度，而不是简单的几行 JSX 相似。
- 这类页面后续很容易继续新增分支，比如 Passkey、钱包登录、不同重置来源。
- 任一规则变更时，需要同步改多个页面，容易漏掉。
- 这里的抽象不会牺牲可读性，反而会让每个页面只保留“差异配置”。

### 推荐做法

不要上复杂模式，建议用一个轻量的“模板式流程 + 配置对象”：

- 抽一个 `usePasswordRules` hook
- 抽一个 `PasswordSetupForm` 展示组件
- 再抽一个 `runPasswordSetupFlow(config)` 或 `usePasswordSetupFlow(config)`，把差异点放进配置里

配置项只保留真正会变化的部分：

- `titleKey`
- `subtitleKey`
- `submitAction`
- `successAction`
- `errorFallbackKey`
- `requireResetToken`
- `loginType`

这样页面文件会从“整套流程实现”变成“声明当前场景的配置”。

### 预期收益

- 这 3 个页面的重复逻辑会明显下降。
- 后续新增密码场景时，不再复制整套页面。
- 校验、加密、错误处理会集中管理，更不容易出现行为漂移。

## 2. 验证码发送/校验流程重复，适合做共享状态机或控制器

### 现状

以下页面都实现了高度相似的验证码流程：

- `src/features/auth/screens/ForgotPasswordEmailScreen.tsx`
- `src/features/settings/screens/SettingsEmailScreens.tsx` 中的 `EmailUnbindScreen`
- `src/features/settings/screens/SettingsEmailScreens.tsx` 中的 `VerifyEmailScreen`

重复点主要包括：

- `code / sending / submitting` 状态
- `usePersistentCountdown(...)`
- 发送验证码按钮 + 倒计时文案切换
- 验证码长度判断
- `try/catch/finally` 的发送与提交流程
- 成功后跳转或刷新资料

三者的主要差异其实只有：

- 发送验证码的 API
- 提交验证码的 API
- 成功后的动作
- 错误文案 key
- 展示的是邮箱地址还是说明文本

### 为什么它值得排第二

- 这是典型的“业务状态机重复”，维护成本高于普通 UI 重复。
- 倒计时、发送中、提交中、成功跳转这些边界很容易逐渐产生不一致。
- 这个区域后续还可能扩展到手机验证码、邮箱二次验证、订单邮件确认等。

### 推荐做法

建议抽一个轻量控制层，而不是搞成庞大的通用表单框架：

- `useVerificationCodeFlow(config)` 负责：
  - 倒计时
  - `sending / submitting / code`
  - `send() / submit()`
  - disabled 状态
- 页面层只负责：
  - 标题
  - 展示文案
  - 成功跳转
  - 调用哪个 API

如果觉得 hook 还不够，也可以加一个很薄的 `VerificationCodeCard` 组件，用于统一输入框和 resend UI。

### 预期收益

- 3 个页面能收敛成同一套交互行为。
- 倒计时和错误处理统一后，体验更稳定。
- 后续新增验证码场景时，能直接复用，而不是再复制一个页面。

## 这次没有列入前二，但值得顺手关注的点

### API service 包装函数重复

以下文件都在重复定义 `ApiEnvelope`、`unwrapEnvelope` 和大量“一行请求 + 一行返回”的 service 函数：

- `src/features/auth/services/authApi.ts`
- `src/features/settings/services/settingsApi.ts`
- `src/features/invite/services/inviteApi.ts`

仓库里其实已经有共享实现：

- `src/shared/api/envelope.ts`

说明 service 层已经开始往共享方向演进，但还没有统一完成。

这里适合做一个很轻的 helper，例如：

- `getEnvelope`
- `postEnvelope`
- `putEnvelope`
- 或者一个 `createEnvelopeRequester(client)`

但我没有把它排进前二，因为它更偏“基础设施去重”，收益稳定但没有前两者那样直接影响页面复杂度。

## 不建议优先做的抽象

### 导航表配置化

像这些文件虽然有很多 `Stack.Screen`：

- `src/app/navigation/SettingsStackNavigator.tsx`
- `src/domains/wallet/transfer/TransferStackNavigator.tsx`
- `src/domains/wallet/receive/ReceiveStackNavigator.tsx`
- `src/plugins/copouch/CopouchStackNavigator.tsx`

但这类重复目前主要是“声明重复”，不是“业务逻辑重复”。

如果强行抽成数组配置，可能会：

- 降低类型可读性
- 增加泛型复杂度
- 让定位路由定义变慢

所以目前不建议为了减少几十行 JSX，就优先动这里。
