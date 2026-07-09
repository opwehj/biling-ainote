# 🍎 GitHub Actions 构建 IPA 保姆级教程

> 面向第一次用 GitHub 构建 iOS 应用的新手，每一步都有详细说明。
> 预计总耗时：2-3 小时（大部分时间在 Apple 账号审核和证书创建上）

---

## 📋 总流程概览

```
第1步  注册 Apple Developer 账号（$99/年，需 1-2 天审核）
  ↓
第2步  获取 Team ID
  ↓
第3步  创建签名证书（需借用一次 Mac，或用 EAS 替代）
  ↓
第4步  创建 GitHub 仓库并推送代码
  ↓
第5步  配置 GitHub Secrets（5 个密钥）
  ↓
第6步  触发构建
  ↓
第7步  下载 .ipa 文件
  ↓
第8步  安装到 iPhone
```

---

## 第 1 步：注册 Apple Developer 账号

> ⚠️ 这是必须的，Apple 不允许没有开发者账号构建 iOS 应用。

1. 用电脑浏览器打开：https://developer.apple.com/programs/enroll/
2. 点击 **Start your enrollment**
3. 用你的 Apple ID 登录（没有就注册一个）
4. 选择实体类型：选 **Individual**（个人，最简单）
5. 填写个人信息（姓名、地址、手机号）
6. 支付 **$99/年**（支持信用卡/借记卡）
7. 等待审核（通常 **1-2 天**，有时几分钟就通过）

✅ 完成标志：收到 Apple 的确认邮件，能登录 https://developer.apple.com/account/

---

## 第 2 步：获取 Team ID

1. 登录 https://developer.apple.com/account/
2. 点击 **Membership**（会员资格）
3. 找到 **Team ID**，是一串 10 位字母数字，如 `A1B2C3D4E5`
4. **记下来**，后面要用

```
Team ID 示例：A1B2C3D4E5
```

---

## 第 3 步：创建签名证书

> 这是最复杂的一步。证书证明"你有权开发 iOS 应用"。
> 如果你没有 Mac，可以用 **方案 B（EAS 自动创建）** 跳过手动操作。

---

### 方案 A：手动创建（需要借用一次 Mac）

#### 3A-1. 生成证书签名请求（CSR）

在 Mac 上操作：

1. 打开 **钥匙串访问**（Spotlight 搜索 "Keychain Access"）
2. 菜单栏 → **钥匙串访问** → **证书助手** → **从证书颁发机构请求证书**
3. 填写你的邮箱地址
4. 选 **存储到磁盘**
5. 点 **继续**，保存文件 `CertificateSigningRequest.certSigningRequest`

#### 3A-2. 创建分发证书

1. 浏览器打开 https://developer.apple.com/account/resources/certificates/list
2. 点右上角 **+** 号
3. 选择 **Software** → **Apple Distribution** → 点 Continue
4. 上传刚才保存的 `.certSigningRequest` 文件
5. 点 Continue → 证书创建成功
6. 点 **Download** 下载 `distribution.cer` 文件

#### 3A-3. 导出 .p12 证书文件

1. 回到 Mac 的 **钥匙串访问**
2. 双击下载的 `distribution.cer` 文件（自动导入钥匙串）
3. 在钥匙串中找到该证书（名字类似 "Apple Distribution: Your Name"）
4. **右键** → **导出..."**
5. 保存格式选 **Personal Information Exchange (.p12)**
6. 设置一个密码（**记住这个密码**，后面要用）
7. 保存为 `certificate.p12`

#### 3A-4. 创建 App ID

1. 打开 https://developer.apple.com/account/resources/identifiers/list
2. 点 **+** 号
3. 选 **App IDs** → **App** → Continue
4. Description 填：`BiLing`
5. Bundle ID 选 **Explicit**，填入：`com.biling.ainote`
6. 其他保持默认 → Continue → Register

#### 3A-5. 注册测试设备（Ad Hoc 安装用）

> 如果只是想安装到自己手机测试，需要这步。如果要上 TestFlight/App Store 则跳过。

1. 用 USB 线连接 iPhone 到 Mac
2. 打开 **Finder**（macOS Catalina+）或 **iTunes**
3. 选择你的设备 → 找到 **UDID**（一串 40 位字符）
4. 打开 https://developer.apple.com/account/resources/devices/list
5. 点 **+** → 填入设备名和 UDID → Continue → Register

#### 3A-6. 创建 Provisioning Profile

1. 打开 https://developer.apple.com/account/resources/profiles/list
2. 点 **+** 号
3. 选择 **Ad Hoc**（测试安装）→ Continue
4. App ID 选择 `com.biling.ainote` → Continue
5. 选择你刚创建的分发证书 → Continue
6. （Ad Hoc）选择你注册的测试设备 → Continue
7. Profile Name 填：`BiLingDistribution` → Generate
8. 点 **Download** 下载 `BiLingDistribution.mobileprovision`

#### 3A-7. 将证书转为 base64 编码

在 Mac 的终端中执行：

```bash
# 证书 .p12 转 base64（复制输出的整段文字）
base64 -i certificate.p12 | pbcopy
```

```bash
# 描述文件 .mobileprovision 转 base64（复制输出的整段文字）
base64 -i BiLingDistribution.mobileprovision | pbcopy
```

> 分别粘贴到记事本保存好，下一步要用。
> 如果终端没有 pbcopy 命令，用：`base64 -i certificate.p12 > cert_base64.txt`

✅ 方案 A 完成后你应有 4 样东西：
- [ ] Team ID（10 位字符串）
- [ ] .p12 证书密码（你自己设的那个）
- [ ] .p12 证书的 base64 文本
- [ ] .mobileprovision 的 base64 文本

---

### 方案 B：用 EAS 自动创建（无需 Mac，推荐新手）

如果搞不定手动证书，用这个方法自动生成：

```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 注册 Expo 账号（免费）
eas login
# 选 Sign up → 填邮箱密码

# 3. 进入项目目录
cd ainote-app

# 4. 初始化 EAS
eas build:configure

# 5. 首次构建（会自动创建证书）
eas build --platform ios --profile preview
# 它会问你：
#   - Apple ID → 填你的开发者账号邮箱
#   - Apple App Specific Password → 去 appleid.apple.com 生成
#   然后自动创建所有证书和描述文件

# 6. 构建完成后下载 .ipa
# 构建页面会显示下载链接
```

> ✅ 用 EAS 跑通一次后，证书已自动创建在 Apple 服务器上。
> 之后可以继续用 EAS，也可以回到 GitHub Actions 方案。

---

## 第 4 步：创建 GitHub 仓库并推送代码

#### 4-1. 在 GitHub 创建仓库

1. 打开 https://github.com/new
2. Repository name 填：`biling-ainote`
3. 选 **Private**（私有，推荐）
4. **不要**勾选 "Add a README"（项目已有 README）
5. 点 **Create repository**

#### 4-2. 在你的电脑上推送代码

```bash
# 把项目代码下载到你的电脑
# （如果项目在当前沙箱，可以打包下载；如果是你本地已有的代码，直接用）

# 进入项目目录
cd ainote-app

# 初始化 Git（如果还没有的话）
git init
git branch -M main

# 添加所有文件
git add -A
git commit -m "feat: 笔灵 BiLing AI笔记App"

# 关联 GitHub 仓库（把 YOUR_USERNAME 换成你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_USERNAME/biling-ainote.git

# 推送
git push -u origin main
```

> 第一次推时会让你登录 GitHub，按提示输入用户名和 Personal Access Token
> （Token 在 https://github.com/settings/tokens → Generate new token → 勾选 repo 权限）

✅ 完成标志：在 GitHub 网页上能看到项目所有文件

---

## 第 5 步：配置 GitHub Secrets

> Secrets 是加密的环境变量，GitHub Actions 构建时需要这些信息来签名。

1. 打开你的 GitHub 仓库页面
2. 点顶部标签 **Settings**（设置）
3. 左侧菜单 → **Secrets and variables** → **Actions**
4. 点 **New repository secret** 按钮
5. 逐个添加以下 5 个密钥：

### Secret 1: APPLE_TEAM_ID

| 字段 | 填写 |
|------|------|
| Name | `APPLE_TEAM_ID` |
| Secret | 你的 Team ID（如 `A1B2C3D4E5`） |

→ 点 **Add secret**

### Secret 2: APPLE_CERTIFICATE_PASSWORD

| 字段 | 填写 |
|------|------|
| Name | `APPLE_CERTIFICATE_PASSWORD` |
| Secret | 导出 .p12 时设的密码 |

→ 点 **Add secret**

### Secret 3: APPLE_CERTIFICATE_BASE64

| 字段 | 填写 |
|------|------|
| Name | `APPLE_CERTIFICATE_BASE64` |
| Secret | .p12 证书的 base64 文本（一大段字母数字） |

> ⚠️ base64 文本很长（可能几千字符），确保完整粘贴，不要截断

→ 点 **Add secret**

### Secret 4: APPLE_PROVISIONING_PROFILE_BASE64

| 字段 | 填写 |
|------|------|
| Name | `APPLE_PROVISIONING_PROFILE_BASE64` |
| Secret | .mobileprovision 的 base64 文本 |

→ 点 **Add secret**

### Secret 5: KEYCHAIN_PASSWORD

| 字段 | 填写 |
|------|------|
| Name | `KEYCHAIN_PASSWORD` |
| Secret | 随便填一个密码，如 `MyBuild2024!` |

→ 点 **Add secret**

✅ 完成标志：Secrets 页面显示 5 个密钥（值被隐藏显示为 ***）

---

## 第 6 步：触发构建

### 方式 A：打 Tag 触发（推荐）

在终端执行：

```bash
cd ainote-app

# 创建版本标签
git tag v1.0.0

# 推送标签到 GitHub
git push origin v1.0.0
```

### 方式 B：手动触发

1. 打开 GitHub 仓库 → 点 **Actions** 标签
2. 左侧列表点 **Build iOS IPA**
3. 右侧点 **Run workflow** 绿色按钮
4. Build type 选 `release`
5. 点绿色的 **Run workflow** 按钮

### 观察构建过程

1. 在 Actions 页面会看到一个新的构建任务（黄色圆圈转）
2. 点进去可以看到实时日志
3. 构建约 **15-30 分钟**（macOS runner 比较慢）
4. 绿色 ✓ = 成功，红色 ✗ = 失败

> ⚠️ 如果失败，点进日志查看错误信息。常见问题见文末 FAQ。

✅ 完成标志：Actions 页面显示绿色 ✓

---

## 第 7 步：下载 .ipa 文件

1. 点开成功的构建记录
2. 页面最下方有一个 **Artifacts** 区域
3. 找到 `BiLing-v1.0.0.ipa`（或类似名称）
4. 点击下载 → 得到一个 .zip → 解压得到 `.ipa` 文件

✅ 这就是你的 iOS 安装包！

---

## 第 8 步：安装到 iPhone

### 方式 A：Diawi（最简单，无需 Mac）

1. 浏览器打开 https://www.diawi.com/
2. 上传你的 `.ipa` 文件
3. 网站生成一个二维码
4. 用 iPhone **Safari** 扫码/访问链接
5. 点击安装 → 设置 → 通用 → VPN与设备管理 → 信任开发者

> ⚠️ 需要 Ad Hoc 类型的 Provisioning Profile，且你的设备 UDID 已注册

### 方式 B：TestFlight（最正规）

1. 在 Mac 上下载 [Transporter](https://apps.apple.com/app/transporter/id1450874784)
2. 将 .ipa 拖入 Transporter → 上传
3. 登录 App Store Connect → 添加测试者邮箱
4. iPhone 安装 TestFlight → 接受邀请 → 安装应用

### 方式 C：AltStore（免 Mac）

1. 电脑安装 [AltServer](https://altstore.io/)
2. iPhone 连接电脑
3. 用 AltServer 安装 AltStore 到 iPhone
4. 在 AltStore 中安装 .ipa

---

## 🔧 常见问题 FAQ

### Q1: 构建失败，报 "no signing certificate" 

**原因**：证书 Secrets 配置有误或证书过期

**解决**：
1. 检查 GitHub Secrets 中的 base64 是否完整粘贴
2. 确认 .p12 密码正确
3. 确认 Bundle ID = `com.biling.ainote` 与 App ID 一致

### Q2: 构建失败，报 "pod install" 错误

**原因**：CocoaPods 依赖安装失败

**解决**：在 workflow 的 pod install 步骤前后查看日志。通常是版本不兼容，检查 package.json 中的 expo 版本。

### Q3: 构建失败，报 "expo prebuild" 错误

**原因**：原生工程生成失败

**解决**：确保 app.config.js 配置正确，检查 icon 和 splash 图片路径是否存在。

### Q4: 构建成功但 .ipa 安装失败，报 "Untrusted Developer"

**原因**：开发者证书未受信任

**解决**：iPhone → 设置 → 通用 → VPN与设备管理 → 找到你的开发者证书 → 点"信任"

### Q5: GitHub Actions 免费额度用完了怎么办？

**选项**：
1. 仓库设为 Public（公开仓库无限额度）
2. 升级 GitHub Pro（$4/月）
3. 改用 EAS Build（免费 30 次/月）

### Q6: 没有 Mac，怎么创建 .p12 证书？

**最佳方案**：用 EAS Build 自动创建
```bash
eas build --platform ios --profile preview
# EAS 会自动创建证书，你不需要 Mac
```

**其他方案**：
- 借朋友的 Mac（只需 10 分钟）
- 使用 MacStadium / MacinCloud 云 Mac（约 $1/小时）

### Q7: 可以上架 App Store 吗？

可以！但需要：
1. 使用 **App Store** 类型的 Provisioning Profile（不是 Ad Hoc）
2. 在 ExportOptions.plist 中把 `method` 改为 `app-store`
3. 通过 Transporter 上传 .ipa
4. 在 App Store Connect 提交审核

---

## 📊 预计时间线

| 步骤 | 耗时 | 等待 |
|------|------|------|
| 注册 Apple Developer | 10 分钟 | 1-2 天审核 |
| 创建证书 | 30 分钟 | — |
| 推送代码到 GitHub | 10 分钟 | — |
| 配置 Secrets | 10 分钟 | — |
| 构建等待 | — | 15-30 分钟 |
| 安装到设备 | 5 分钟 | — |
| **总计** | ~1 小时操作 | 1-2 天等待审核 |

---

## 🆘 卡住了？

如果任何一步遇到问题，告诉我：
1. 你卡在哪一步
2. 具体的错误信息
3. 你当前的环境（有没有 Mac 等）

我会帮你排查解决。
