# iOS 构建指南 — 从代码到 .ipa

> 本文档详细介绍如何将笔灵 BiLing 项目构建为 iOS `.ipa` 安装包。
> 推荐使用 **GitHub Actions**（免费额度内）自动构建，无需本地 macOS 环境。

---

## 方案对比

| 方案 | 需要 Mac？ | 费用 | 难度 | 推荐场景 |
|------|-----------|------|------|----------|
| **GitHub Actions**（推荐） | ❌ 不需要 | 免费（macOS runner 消耗 10x 分钟数） | ⭐⭐⭐ | 无 Mac、已用 GitHub |
| **EAS Build**（最简单） | ❌ 不需要 | 免费版 30 次/月 iOS 构建 | ⭐⭐ | 快速上手、不想管签名 |
| **本地 Xcode 构建** | ✅ 需要 | Apple 开发者账号 $99/年 | ⭐⭐ | 有 Mac、需要调试 |
| **Codemagic / Bitrise** | ❌ 不需要 | 免费额度有限 | ⭐⭐ | 专业 CI/CD |

> **三者都需要 Apple Developer 账号**（$99/年），这是 Apple 的硬性要求。

---

## 前提条件

### 1. Apple Developer 账号（必须）

- 注册地址：[https://developer.apple.com/programs/](https://developer.apple.com/programs/)
- 费用：$99/年（个人或组织）
- 注册后获取 **Team ID**（10 位字母数字，在 Account → Membership 查看）

### 2. GitHub 仓库

- 将项目代码推送到 GitHub 仓库（公开或私有均可）
- `.github/workflows/build-ios.yml` 已包含在工作流配置中

### 3. 签名证书和描述文件

这是最关键的一步，下面详细说明。

---

## 一、创建签名证书和 Provisioning Profile

### 步骤 1：创建证书签名请求（CSR）

在**任意 Mac 电脑**上（可以借朋友的，只需一次）：

```bash
# 打开"钥匙串访问" → 菜单栏 → 钥匙串访问 → 证书助手 → 从证书颁发机构请求证书
# 填写邮箱 → 选择"存储到磁盘" → 保存 CertificateSigningRequest.certSigningRequest 文件
```

> 没有Mac？可以用在线工具或虚拟机，也可以用下面 EAS Build 方案跳过手动签名。

### 步骤 2：创建分发证书

1. 登录 [Apple Developer - Certificates](https://developer.apple.com/account/resources/certificates/list)
2. 点击 **+** → 选择 **Apple Distribution** → Continue
3. 上传步骤 1 的 CSR 文件 → Continue
4. 下载生成的 `distribution.cer` 文件
5. 双击导入钥匙串 → 右键导出为 `.p12` 文件（设置密码）

### 步骤 3：创建 App ID

1. 登录 [Apple Developer - Identifiers](https://developer.apple.com/account/resources/identifiers/list)
2. 点击 **+** → App IDs → App
3. Bundle ID 选择 **Explicit**，填入：`com.biling.ainote`
4. 勾选所需 Capabilities（默认即可）
5. Continue → Register

### 步骤 4：创建 Provisioning Profile

1. 登录 [Apple Developer - Profiles](https://developer.apple.com/account/resources/profiles/list)
2. 点击 **+** → 选择 **Ad Hoc**（用于测试设备安装）或 **App Store**（用于上架）
3. 选择 App ID：`com.biling.ainote`
4. 选择步骤 2 创建的分发证书
5. （Ad Hoc 模式）选择测试设备的 UDID
6. 下载 `.mobileprovision` 文件

---

## 二、配置 GitHub Secrets

在 GitHub 仓库页面：**Settings → Secrets and variables → Actions → New repository secret**

需要添加以下 5 个 Secrets：

| Secret 名称 | 值 | 如何获取 |
|-------------|-----|---------|
| `APPLE_CERTIFICATE_BASE64` | 分发证书 .p12 的 base64 编码 | `base64 -i distribution.p12 \| pbcopy`（Mac） |
| `APPLE_CERTIFICATE_PASSWORD` | 导出 .p12 时设置的密码 | 你自己设置的 |
| `APPLE_PROVISIONING_PROFILE_BASE64` | .mobileprovision 的 base64 编码 | `base64 -i build.mobileprovision \| pbcopy`（Mac） |
| `APPLE_TEAM_ID` | Apple Team ID（10位） | Developer Account → Membership |
| `KEYCHAIN_PASSWORD` | 任意随机密码 | 自己生成一个，如 `openssl rand -base64 20` |

### 在非 Mac 环境获取 base64

```bash
# Linux / WSL
base64 -w 0 distribution.p12     # 证书
base64 -w 0 build.mobileprovision # 描述文件

# Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("distribution.p12"))
```

---

## 三、触发 GitHub Actions 构建

### 方式 A：打 Tag 自动触发

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 方式 B：手动触发

1. 打开 GitHub 仓库 → **Actions** 标签页
2. 左侧选择 **Build iOS IPA**
3. 右侧点击 **Run workflow** → 选择 build_type → 点击绿色按钮

### 查看构建结果

1. 构建约需 **15-30 分钟**（macOS runner 较慢）
2. 构建成功后，在该 run 页面底部的 **Artifacts** 区域下载 `.ipa` 文件
3. Artifacts 保留 30 天

---

## 四、安装 .ipa 到设备

### 方式 A：通过 TestFlight（推荐）

1. 下载 [Transporter](https://apps.apple.com/app/transporter/id1450874784)（Mac App）
2. 将 `.ipa` 拖入 Transporter → 上传到 App Store Connect
3. 在 App Store Connect 中添加测试人员 → 通过 TestFlight 安装

> 需要 App Store 类型的 Provisioning Profile（非 Ad Hoc）

### 方式 B：通过 Xcode 安装

```bash
# Mac 上连接 iPhone
xcrun devicectl device install app --device <device-id> BiLing.ipa
```

### 方式 C：通过第三方工具

- **AltStore** / **Sideloadly**：无需 Mac，直接在 PC 上安装
- **Diawi**（[https://www.diawi.com/](https://www.diawi.com/)）：上传 .ipa 生成二维码，扫码安装

---

## 五、替代方案：EAS Build（更简单）

如果你的项目使用了 Expo 模块（本项目就是），EAS Build 是最省心的方案——**自动管理签名证书**。

### 配置步骤

```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录 Expo 账号
eas login

# 3. 初始化 EAS 配置
cd ainote-app
eas build:configure

# 4. 构建 iOS（自动管理签名）
eas build --platform ios --profile preview
```

### eas.json 配置示例

在项目根目录创建 `eas.json`：

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "applicationArchivePath": "build/BiLing.ipa"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "YOUR_TEAM_ID"
      }
    }
  }
}
```

### EAS Build 优势

- ✅ **自动管理签名**：首次运行时自动创建证书和描述文件
- ✅ **云端构建**：无需 GitHub Actions 配置
- ✅ **免费额度**：每月 30 次 iOS 构建
- ✅ **直接下载**：构建完成生成下载链接

### EAS Build 劣势

- ❌ 需要 Expo 账号
- ❌ 免费额度有限
- ❌ 构建队列可能排队

---

## 六、GitHub Actions 费用说明

| 项目 | 说明 |
|------|------|
| macOS runner 倍率 | **10x**（1 分钟 macOS = 10 分钟计算量） |
| 免费额度 | 公开仓库无限；私有仓库 2000 分钟/月（≈ 200 分钟 macOS） |
| 单次构建约 | 15-25 分钟 → 消耗 150-250 分钟额度 |
| 建议频率 | 每月可免费构建约 **8-10 次** iOS |

> 超出免费额度后：macOS runner $0.08/分钟

---

## 七、常见问题

### Q: 没有 Mac，怎么创建签名证书？

**方案 1**：使用 EAS Build（自动管理签名，推荐）
**方案 2**：借用朋友的 Mac（只需一次创建证书）
**方案 3**：使用云端 Mac 服务（MacStadium、MacinCloud，约 $1/小时）

### Q: 构建报错 "no such module" 或 pod install 失败？

```bash
# 确保在 prebuild 后执行 pod install
npx expo prebuild --platform ios --clean
cd ios && pod install --repo-update
```

### Q: 构建报错签名相关？

- 检查 Bundle ID 是否与 Provisioning Profile 一致（`com.biling.ainote`）
- 检查证书是否过期
- 检查 GitHub Secrets 的 base64 编码是否完整（不要换行）

### Q: Ad Hoc 和 App Store Profile 的区别？

| 类型 | 用途 | 安装方式 |
|------|------|----------|
| **Ad Hoc** | 测试（最多 100 台设备） | 直接安装 / Diawi / AltStore |
| **App Store** | 上架 App Store | 通过 TestFlight 或 App Store |

### Q: 能否上架 App Store？

可以。需要：
1. App Store 类型的 Provisioning Profile
2. 通过 Transporter 上传 .ipa 到 App Store Connect
3. 在 App Store Connect 中填写应用信息并提交审核
4. 审核通过后上架（审核通常 1-3 天）

---

## 八、快速开始检查清单

- [ ] 注册 Apple Developer 账号（$99/年）
- [ ] 获取 Team ID
- [ ] 创建分发证书（.p12）
- [ ] 创建 App ID（com.biling.ainote）
- [ ] 创建 Provisioning Profile（.mobileprovision）
- [ ] 将证书和描述文件 base64 编码
- [ ] 在 GitHub 仓库配置 5 个 Secrets
- [ ] 推送代码到 GitHub（含 .github/workflows/build-ios.yml）
- [ ] 打 Tag 或手动触发 Actions
- [ ] 等待构建完成（15-30 分钟）
- [ ] 下载 .ipa Artifact
- [ ] 安装到设备测试

---

> 如需进一步帮助，可参考：
> - [Apple Developer Documentation](https://developer.apple.com/documentation/)
> - [GitHub Actions macOS runners](https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners)
> - [EAS Build](https://docs.expo.dev/build/introduction/)
> - [Fastlane](https://docs.fastlane.tools/)（更高级的签名自动化）
