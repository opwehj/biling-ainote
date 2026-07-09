# 笔灵 BiLing — AI 智能笔记 App

> 一款基于国内大模型的多模态 AI 笔记应用，通过文本、图片、音频输入素材，AI 自动提取内容并生成结构化笔记。

## 项目简介

笔灵 BiLing 是一个 React Native 跨平台应用，核心功能是让用户通过**文本、图片、音频**三种方式输入素材，结合**国内大模型**（通义千问/智谱GLM/文心一言）的多模态能力，自动进行 OCR 识别、语音转写、内容整理，生成结构化的智能笔记。

### 核心特性

| 特性 | 说明 |
|------|------|
| **多模态输入** | 文本输入、拍照/相册选图、录音/音频文件选择，支持混合输入 |
| **AI 智能整理** | 图片 OCR 识别 + 音频语音转写 + LLM 摘要结构化，一键生成笔记 |
| **多模型支持** | 通义千问、智谱 GLM、文心一言，用户自配 API Key，可切换 |
| **混合 ASR 策略** | 通义千问用户复用 qwen2-audio（零额外配置）；其他提供商回退 DashScope paraformer |
| **本地持久化** | SQLite 本地存储，笔记离线可查；API Key 加密存储（Keychain/EncryptedPrefs） |
| **笔记管理** | 列表/详情/编辑/分类/搜索/分享，Markdown 渲染，深色模式 |

## 技术栈

| 层面 | 技术选型 |
|------|----------|
| 框架 | React Native 0.81 + TypeScript 5.6 |
| 状态管理 | Zustand 5 |
| 本地数据库 | expo-sqlite 15 |
| 加密存储 | expo-secure-store 14 |
| 图片处理 | expo-image-picker + expo-image-manipulator |
| 音频处理 | expo-audio + expo-document-picker |
| 文件系统 | expo-file-system |
| 导航 | @react-navigation v7（bottom-tabs + native-stack） |
| 网络请求 | axios |
| Markdown 渲染 | react-native-markdown-display |
| 测试 | Jest 29 + ts-jest |

## 项目结构

```
ainote-app/
├── docs/                        # 设计文档
│   ├── PRD.md                   # 产品需求文档
│   ├── ARCHITECTURE.md          # 系统架构设计
│   ├── TEST_REPORT.md           # 测试报告
│   ├── class-diagram.mermaid    # 类图
│   └── sequence-diagram.mermaid # 时序图
├── __tests__/                   # 测试套件（7 套件，162 用例）
├── src/
│   ├── types/                   # TypeScript 类型定义（4 文件）
│   ├── constants/               # 常量与配置（3 文件）
│   ├── utils/                   # 工具函数（5 文件）
│   ├── services/                # 服务层
│   │   ├── db/                  #   数据库 + Repository（6 文件）
│   │   ├── storage/             #   加密存储 + 文件服务（2 文件）
│   │   ├── ai/                  #   AI 服务（5 文件 + 3 Provider）
│   │   └── media/               #   图片/音频服务（2 文件）
│   ├── store/                   # Zustand 状态管理（3 文件）
│   ├── hooks/                   # 自定义 Hooks（3 文件）
│   ├── navigation/              # 导航配置（2 文件）
│   ├── screens/                 # 页面组件（8 文件）
│   └── components/              # 复用组件（11 文件）
├── App.tsx                      # 根组件
├── package.json
└── jest.config.js               # 测试配置
```

## 架构设计

### 分层架构

```
UI层 (Screens + Components)
    ↓ useStore / hooks
状态管理层 (Zustand Stores)
    ↓ 调用
服务层 (Services: AI / DB / Media / Storage)
    ↓ SQL / IO
数据层 (SQLite + SecureStore + FileSystem)
```

### AI 适配器模式

三家提供商的 Chat 接口均兼容 OpenAI 格式，通过 `BaseLLMProvider` 抽象基类统一适配：

```
BaseLLMProvider (抽象基类)
    ├── QwenProvider   (通义千问, supportsAudio=true)
    ├── GLMProvider    (智谱GLM, supportsAudio=false)
    └── ErnieProvider  (文心一言, supportsAudio=false)
```

### 笔记生成流程

```
用户输入(文本+图片+音频)
    │
    ├── 音频 → ASR转写（qwen2-audio / paraformer 回退）
    ├── 图片 → base64 编码
    │
    └── 汇总素材 → 视觉LLM多模态调用 → 结构化JSON笔记
         {title, summary, keyPoints, content, tags}
              │
              └── 保存到SQLite → 跳转详情页
```

## 快速开始

### 环境要求

- Node.js >= 18
- React Native 开发环境（[官方指南](https://reactnative.dev/docs/environment-setup)）
- Android Studio（Android 开发）或 Xcode（iOS 开发，需 macOS）

### 安装

```bash
cd ainote-app
npm install

# 安装 Expo 模块（确保版本兼容）
npx expo install expo-sqlite expo-secure-store expo-image-picker \
  expo-image-manipulator expo-audio expo-file-system expo-document-picker
```

### 运行

```bash
# Android
npm run android

# iOS（需 macOS + Xcode）
npm run ios

# Metro 开发服务器
npm start
```

### 测试

```bash
# 运行全部测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage
```

### 使用流程

1. **首次启动** → 引导页提示配置 AI 模型
2. **设置页** → 选择模型提供商（推荐通义千问）→ 输入 API Key → 测试连接
3. **新建笔记** → 选择文本/图片/音频 Tab → 输入素材 → 点击"生成笔记"
4. **AI 处理** → 自动转写音频 + 识别图片 + 整理内容 → 生成结构化笔记
5. **笔记管理** → 查看/编辑/分类/搜索/分享

## 测试结果

| 指标 | 数值 |
|------|------|
| 测试套件 | 7 套件全部通过 |
| 测试用例 | 162 用例全部通过 |
| 语句覆盖率 | 96.56% |
| 分支覆盖率 | 87.38% |
| 函数覆盖率 | 98.52% |
| TypeScript 编译 | 零错误 |

## API Key 获取

| 提供商 | 获取地址 | 说明 |
|--------|----------|------|
| 通义千问 | [阿里云百炼](https://bailian.console.aliyun.com/) | 推荐，支持视觉+音频模型，复用 Key |
| 智谱 GLM | [智谱开放平台](https://open.bigmodel.cn/) | 支持视觉模型，音频需额外配置 DashScope Key |
| 文心一言 | [百度千帆](https://qianfan.baidubce.com/) | 支持视觉模型，音频需额外配置 DashScope Key |

## 交付物

| 文件 | 说明 |
|------|------|
| `docs/PRD.md` | 产品需求文档（701 行） |
| `docs/ARCHITECTURE.md` | 系统架构设计（920 行） |
| `docs/TEST_REPORT.md` | 测试报告 |
| `src/` | 完整源代码（57 文件，7,731 行） |
| `__tests__/` | 测试套件（11 文件，1,803 行） |

## 团队

| 角色 | 姓名 | 职责 |
|------|------|------|
| 交付总监 | 齐活林（Qi） | 协调整个 SOP 工作流 |
| 产品经理 | 许清楚（Xu） | PRD 需求文档 |
| 架构师 | 高见远（Gao） | 系统设计 + 任务分解 |
| 工程师 | 寇豆码（Kou） | 代码实现 |
| QA 工程师 | 严过关（Yan） | 测试验证 |

## License

Private — 仅限项目内部使用。
