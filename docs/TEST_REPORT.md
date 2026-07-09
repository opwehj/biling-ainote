# 笔灵 BiLing — 测试报告

> **测试执行人**：QA 工程师 严过关（Yan / Edward）
> **测试日期**：2025-07-09
> **项目路径**：`/workspace/ainote-app/`
> **技术栈**：React Native 0.81 + TypeScript + Zustand + expo-sqlite

---

## 一、测试摘要 (Summary)

| 指标 | 数值 |
|------|------|
| 测试套件总数 | 7 |
| 通过套件 | 7 |
| 失败套件 | 0 |
| 测试用例总数 | 162 |
| 通过用例 | 162 |
| 失败用例 | 0 |
| 语句覆盖率 (Statements) | **96.56%** |
| 分支覆盖率 (Branch) | **87.38%** |
| 函数覆盖率 (Functions) | **98.52%** |
| 行覆盖率 (Lines) | **96.46%** |
| TypeScript 编译 | ✅ 零错误 (`tsc --noEmit`) |
| **智能路由判定** | **NoOne（全部通过，无需回传工程师）** |

---

## 二、测试用例分布

| 测试文件 | 对应源文件 | 用例数 | 状态 |
|----------|-----------|--------|------|
| `smoke.test.ts` | 环境冒烟 | 3 | ✅ |
| `date.test.ts` | `src/utils/date.ts` | 20 | ✅ |
| `validation.test.ts` | `src/utils/validation.ts` | 26 | ✅ |
| `BaseLLMProvider.test.ts` | `src/services/ai/BaseLLMProvider.ts` | 27 | ✅ |
| `AINoteService.test.ts` | `src/services/ai/AINoteService.ts` | 22 | ✅ |
| `noteStore.test.ts` | `src/store/noteStore.ts` | 29 | ✅ |
| `NoteRepository.test.ts` | `src/services/db/NoteRepository.ts` | 35 | ✅ |
| **合计** | | **162** | ✅ |

---

## 三、覆盖率明细

```
---------------------|---------|----------|---------|---------|--------------------
File                 | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------------|---------|----------|---------|---------|--------------------
AINoteService.ts     |     100 |    90.32 |     100 |     100 | 63,180-183 (分支)
BaseLLMProvider.ts   |   89.87 |    85.93 |   91.66 |   89.18 | transcribeViaAudioModel 等
NoteRepository.ts    |    95.5 |    82.05 |     100 |    95.4 | resolveSort 边界
noteStore.ts         |   98.57 |    94.44 |     100 |   98.48 | 155
date.ts              |     100 |      100 |     100 |     100 |
validation.ts        |     100 |      100 |     100 |     100 |
---------------------|---------|----------|---------|---------|--------------------
All files            |   96.56 |    87.38 |   98.52 |   96.46 |
```

> 未覆盖部分主要为：`BaseLLMProvider.transcribeViaAudioModel`（音频模型转写，需真实音频 base64）、
> `AsrService` 内部路由（在 AINoteService 中被 mock）、以及部分 `??` 空值合并的防御性分支。均属非关键路径。

---

## 四、测试环境配置

### 4.1 安装的测试依赖
- `jest@29.7.0` — 测试框架
- `ts-jest@29.4.11` — TypeScript 转译
- `@types/jest@29.5.14` — 类型定义
- `@testing-library/react-native@12.9.0` — RN 组件测试（预留）
- `@testing-library/jest-native@5.4.3` — 断言扩展（预留）

> 安装时遇到 `react-test-renderer` peer 依赖冲突（要求 react@^19.2.7，项目为 19.1.0），
> 使用 `--legacy-peer-deps` 解决，不影响核心逻辑测试。

### 4.2 配置文件
- `jest.config.js` — ts-jest preset，`@/*` 路径映射，expo 模块 mock
- `__tests__/setup.ts` — 定义 `__DEV__` 全局，屏蔽日志噪音
- `__tests__/mocks/expo-file-system.js` — 内存式文件系统 mock
- `__tests__/mocks/expo-sqlite.js` — SQLite mock
- `__tests__/mocks/expo-secure-store.js` — Keychain mock
- `package.json` 新增 `test` / `test:coverage` 脚本

---

## 五、测试过程中发现并修复的问题（均为测试代码问题）

### 5.1 Jest hoisting 导致的 TDZ（暂时性死区）错误
- **现象**：`AINoteService.test.ts`、`noteStore.test.ts` 套件加载失败，
  报 `ReferenceError: Cannot access 'mockXxx' before initialization`
- **原因**：`jest.mock()` 工厂被提升到文件顶部执行，但 `const mockVar = jest.fn()` 声明在后面，
  工厂引用未初始化的 `const` 变量触发 TDZ。被测模块在 import 时创建单例（如 `aiNoteService = new AINoteService()`）会立即触发 mock 工厂执行。
- **修复**：将 mock 函数定义移入 `jest.mock` 工厂内部，通过模块导出（`__mockXxx`）在测试中访问。
  路由判定：**测试代码 Bug → 自行修复**
- **状态**：✅ 已修复

### 5.2 `fail()` 未定义错误
- **现象**：`AINoteService.test.ts` 取消逻辑测试报 `ReferenceError: fail is not defined`
- **原因**：`fail()` 是 Jasmine 全局函数，Jest 默认不提供。`expectAppError` 辅助函数使用了它。
- **修复**：将 `fail(msg)` 替换为 `throw new Error(msg)`（在 Promise resolve 分支抛错使测试失败）。
  路由判定：**测试代码 Bug → 自行修复**
- **状态**：✅ 已修复

### 5.3 noteStore 错误信息断言错误
- **现象**：`加载失败（非 AppError）应使用默认错误信息` 测试失败
- **原因**：测试用 `new Error('boom')` 触发降级，但 `Error` 对象本身含 `.message` 属性（值为 'boom'），
  源码 `(err as AppError)?.message || '加载失败'` 会返回 'boom' 而非 '加载失败'。源码行为合理（优先展示可用错误信息，仅在无 message 时降级），测试断言有误。
- **修复**：拆分为两个用例——`Error 带 message` 用例断言返回 'boom'；`无 message 的对象` 用例断言返回 '加载失败'。
  路由判定：**测试代码 Bug → 自行修复**
- **状态**：✅ 已修复

### 5.4 AINoteService 取消逻辑测试预期错误
- **现象**：`cancel 后调用 generateNote 应抛 CANCELLED` 测试失败
- **原因**：源码 `generateNote` 在开头执行 `this.cancelled = false` 重置取消标志，设计意图是每次新生成任务从非取消状态开始；`cancel()` 仅对**进行中**的异步流程生效（通过 `throwIfCancelled` 检查点）。测试错误地预期"先 cancel 再 generateNote 会抛错"。
- **修复**：改为测试真实取消场景——发起生成 → 在 ASR 转写 await 期间调用 `cancel()` → 完成转写后下一检查点抛 CANCELLED；并保留"新生成重置取消状态"的正向用例。
  路由判定：**测试代码 Bug → 自行修复**（源码取消逻辑设计正确）
- **状态**：✅ 已修复

---

## 六、代码审查结论

对 6 个核心模块进行了静态审查，重点关注逻辑正确性、错误处理与边界条件：

### 6.1 AI 服务层
- **BaseLLMProvider**：`parseNoteContent` 三级容错（直接 parse → 正则提取 → 降级 fallback）设计健壮；
  `normalizeNoteContent` 对字段类型、标签数量、空值均有规范化处理；`buildUserContent` 图片数量截断与读取失败跳过处理完善。✅ 无 Bug
- **AINoteService**：编排流程清晰（ASR → 多模态生成）；ASR 失败降级不阻断整体流程符合架构约定；
  取消逻辑通过检查点实现，`onProgress` 回调异常被安全捕获。✅ 无 Bug
- **AsrService**：混合路由（LLM 音频模型 / paraformer 回退）逻辑正确，paraformer 异步提交+轮询超时控制完善。✅ 无 Bug

### 6.2 数据层
- **NoteRepository**：`mapNoteRow`/`mapMaterialRow` 的 snake_case↔camelCase 与 JSON↔数组映射正确；
  `parseJsonArray` 对 null/损坏 JSON/非数组均安全降级；事务写入（create/update/delete）保证一致性；
  排序字段由 `resolveSort` 返回硬编码白名单，无 SQL 注入风险。✅ 无 Bug

### 6.3 状态管理
- **noteStore**：单向数据流清晰；`saveNote` 按 id 存在性自动区分 create/update；
  `deleteNote` 级联清理关联文件；错误处理对 AppError/通用 Error 均有兜底。✅ 无 Bug

### 6.4 工具层
- **validation**：各校验函数边界处理正确（长度上限含等号、空串/纯空格、扩展名提取含查询参数剥离）。✅ 无 Bug
- **date**：相对时间分级（刚刚/分钟/小时/昨天/天/绝对日期）正确；`formatDuration` 负数取 0、小数取整；`formatFileSize` 单位换算正确。✅ 无 Bug

### 6.5 轻微观察（非 Bug，无需修复）
1. `parseNoteContent` 正则 `\{[\s\S]*\}` 为贪婪匹配（首 `{` 到尾 `}`），极端情况下可能过度匹配，但有 fallback 兜底。
2. `NoteRepository.findAll` 与 `count` 的 WHERE 条件构建逻辑重复（DRY 可优化，非功能缺陷）。

---

## 七、智能路由判定结论

```
┌─────────────────────────────────────────────────────────┐
│  路由判定：Send To → NoOne                                │
│  原因：162 个测试用例全部通过，未发现源码 Bug。           │
│        测试过程中出现的 4 类失败均为测试代码自身问题，     │
│        已全部自行修复。源码逻辑正确，无需回传工程师。     │
└─────────────────────────────────────────────────────────┘
```

---

## 八、附录：运行方式

```bash
cd /workspace/ainote-app

# 运行全部测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行单个测试文件
npx jest __tests__/AINoteService.test.ts
```

测试覆盖率 HTML 报告位于 `coverage/` 目录。
