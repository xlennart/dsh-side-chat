# DSH Side Chat

<p align="center">
  <strong>简体中文</strong> · <a href="README_EN.md">English</a>
</p>

<p align="center">
  <img src="docs/assets/dsh-side-chat-hero.png" alt="DSH Side Chat" width="100%">
</p>

<p align="center">
  <a href="release/dsh-side-chat-1.2.1.tgz"><img alt="Version 1.2.1" src="https://img.shields.io/badge/version-1.2.1-2563eb?style=flat-square"></a>
  <a href="LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-111827?style=flat-square"></a>
  <img alt="Tests 28 passing" src="https://img.shields.io/badge/tests-28%20passing-16a34a?style=flat-square">
  <img alt="DeepSeek Harness plugin" src="https://img.shields.io/badge/DeepSeek%20Harness-plugin-0ea5e9?style=flat-square">
</p>

<p align="center">
  <strong>在 DeepSeek Harness 主对话旁边，打开一个真正独立、原生、理解上下文的并行对话。</strong>
</p>

<p align="center">
  <a href="#界面预览">界面预览</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#使用方式">使用方式</a> ·
  <a href="#会话与数据">会话与数据</a> ·
  <a href="#核心能力">核心能力</a> ·
  <a href="#架构边界">架构边界</a>
</p>

> [!NOTE]
> 侧聊不是浮在主对话上方的临时面板，也不是手写的聊天界面。它是一个真实 DSH Session，直接复用 DSH 原生会话组件，并通过有界工具按需理解主对话。

## 先看这里

- **想直接使用：** 下载 [`release/dsh-side-chat-1.2.1.tgz`](release/dsh-side-chat-1.2.1.tgz)，按下方命令安装。
- **想参与开发：** 克隆仓库后运行 `npm test`，它会构建插件并执行全部回归测试。
- **它解决什么：** 在不离开主会话的情况下，打开一个可以独立提问、调用工具和修改工作区的原生 DSH 会话。
- **最重要的边界：** 主会话与侧聊共享工作区，但 transcript 相互独立；侧聊不会自动复制整段主对话。

## 界面预览

![DSH 原生并行侧聊](docs/assets/side-chat-parallel.png)

主对话与侧聊使用同一套 DSH 原生会话界面。中间分隔线可以拖动，两个输入框保持对齐，侧聊不会出现在左侧会话列表。

| 主对话选文入口 | 原生设置页 |
| --- | --- |
| ![选中文字后在侧聊中对话](docs/assets/side-chat-selection.png) | ![侧聊设置页](docs/assets/side-chat-settings.png) |

## 快速开始

### 直接安装正式包

要求：Node.js 22 或更高版本，以及能够加载 Web 插件的 DeepSeek Harness。

下载已经构建好的插件：优先从 [GitHub Releases](https://github.com/KarlOfLaw/dsh-side-chat/releases/latest) 获取最新包，也可以直接使用仓库内 `release/` 目录；安装时不需要再次运行构建脚本：

```powershell
# 从 GitHub Release 下载后：
dsh plugin --profile web add .\dsh-side-chat-1.2.1.tgz

# 或使用仓库内副本：
dsh plugin --profile web add .\release\dsh-side-chat-1.2.1.tgz
```

从希望 Agent 操作的工程目录启动 DSH：

```powershell
cd D:\path\to\your-project
dsh web --port 3080
```

打开 DSH 输出的网址，插件会自动加载到 Web 客户端。

### 从源码构建

```powershell
git clone https://github.com/KarlOfLaw/dsh-side-chat.git
cd dsh-side-chat
npm test

$DshSource = "D:\path\to\deepseek-harness"
$PluginSource = (Get-Location).Path
pnpm --dir $DshSource dsh plugin --profile web add $PluginSource
pnpm --dir $DshSource dsh web
```

已安装时：

```powershell
npm test
pnpm --dir $DshSource dsh plugin --profile web update dsh-side-chat
```

`npm test` 会构建动态产物、正式本地包，并运行 core、host integration、client contract 与 smoke tests。

### 本地链接调试

从源码目录注册插件时，DSH 加载的是 `dist/formal-host.mjs` 和 `dist/formal-client.cjs`，而不是直接读取 `src/`。修改源码后请重新运行 `npm test`（或 `npm run build`），然后重启 `dsh web`；否则浏览器中仍可能是上一次的构建结果。

## 使用方式

1. 打开一个主会话，点击 header 中的消息气泡＋图标。
2. 侧聊会立即显示完整原生 header 和输入框；无需先发送第一条消息，隐藏与关闭按钮已经位于原生 header 右上角。
3. 在侧聊中像普通 DSH 会话一样选择模型、输入消息、使用附件、工具和审批流程。
4. 拖动中间分隔线调整比例；聚焦分隔线后可用方向键微调，按住 `Shift` 可加速调整。
5. 在主消息中选中文字，点击“引用到侧聊”，输入框上方会显示可删除的引用提示；输入框草稿本身保持为空，引用只在发送时加入侧聊请求。
6. 点击侧聊 header 的面板图标可隐藏；主 header 的消息气泡图标会恢复同一个侧聊。
7. 点击关闭按钮后选择“保留对话”或“删除并关闭”。

### 常用细节

- 每个主会话维护自己的侧聊状态，切换主会话不会串用另一条侧聊。
- “保留对话”会释放当前 Agent，但保留磁盘会话；下次以相同模式打开时会恢复最近保留的侧聊。
- “删除并关闭”只允许删除插件创建的侧聊，并支持 DSH 0.2 的 `session.v4.jsonl.zstd`；即使存储后端拒绝删除，也会关闭侧栏、恢复主对话并明确提示数据已保留。
- 打开设置、插件市场或其他 DSH 原生弹窗时，分隔条会让出指针交互，不会覆盖或拦截弹窗。
- 与 Better Sidebar 同时安装时可选择把侧聊渲染为它的注册页面，并使用标签页自带的关闭按钮；无论是否启用融合，Side Chat 自己的 header 入口都会保留。未安装或停用融合时，入口直接打开原生并排侧聊。
- 可在 DSH 设置的“侧边聊天”页面启用或停用插件，并选择新侧聊默认使用的原生 Agent 模式。

## 会话与数据

第一次打开时，插件创建一个带 `parentSession` 的真实 DSH Session，并立即将它归档，因此它不会出现在 workspace 左侧会话列表。保留过的同模式侧聊会在下次打开时恢复，而不是重新创建空会话。

插件不会把主 transcript 复制到侧聊。选中的文字保存在侧聊自己的引用状态中，不写入原生输入框草稿；只有用户发送消息时才会投影进该次侧聊请求。当侧聊确实需要更多背景时，可以通过 `side_chat_context` 按需读取有界、相关且按时间排序的父会话片段。

主会话与侧聊共享同一个 workspace。侧聊中的文件修改、命令执行、审批和其他工具副作用都是真实的；隐藏、保留或关闭面板不会撤销这些操作。

## 核心能力

| 能力 | 实现方式 |
| --- | --- |
| **真实独立会话** | 通过 DSH `agents.create/resume` 创建或恢复带 `parentSession` 的 Session，不占用 subagent routing。 |
| **完整原生 UI** | DSH 0.2 通过官方 `conversation.content` Factory 渲染侧聊，0.1 继续复用 `ConversationRoot`；消息、工具、审批、附件、输入框、模型和权限控件均由 DSH 提供。 |
| **发送前即完整可用** | 空白侧聊也显示原生会话正文、输入框以及隐藏/关闭控制，发送消息前后使用同一套原生界面。 |
| **按需理解主对话** | 不复制主 transcript；需要背景时，通过 `side_chat_context` 检索有界、相关的父会话片段。 |
| **真正并排** | 只增加最小 split shell；主对话在窄窗口也不会被隐藏，分隔条支持拖拽和方向键微调，侧聊占比限制在 25%–70%。 |
| **不污染会话列表** | 新侧聊立即归档，不出现在 workspace 左侧列表中。 |
| **选文即问** | 选中主消息文字后出现“引用到侧聊”；引用可预览、可删除，且不会在原生输入框中残留 `@` 或隐藏文本。 |
| **兼容 Better Sidebar** | 可选注册为 Better Sidebar 页面，同时始终保留 Side Chat 自己的快捷入口；没有安装 Better Sidebar 时保持完整独立功能。 |
| **可隐藏、可恢复、可删除** | 隐藏只收起面板；保留后可以恢复，关闭时也可选择安全删除。 |
| **原生模式与模型** | 新侧聊默认标准模式，可选 PTC、极简或创造模式；模型选择器保持 DSH 原生行为。 |

## 当前限制与兼容性

- 当前选文入口主要针对鼠标选择；移动端长按选文和触摸操作条尚未做专门优化。
- 单次选文引用最多保留 8,000 个字符，超出的部分会被截断。
- DSH 0.2 使用公开的 `SessionProvider` 和 `conversation.content` Factory；兼容 DSH 0.1 时仍保留旧 BindingContext 适配路径。任一路径失效都会显式报错，不会退回自定义聊天界面。
- 安全彻底删除支持 DSH 0.1/0.2 的 JSONL 与 Zstandard JSONL 会话文件，并依赖正式本地插件包提供的删除能力；不支持时会关闭侧栏、恢复主对话、保留数据并显示警告。
- 侧聊按需读取的是有界父会话上下文，不保证每次都包含主会话中的全部历史细节。

## 架构边界

host 只增加侧聊需要的生命周期与上下文能力：

```text
主 Session
  └─ archived side Session (parentSession=主 Session)
       ├─ 原生 DSH Agent / preset / tools / approvals
       ├─ 独立 transcript，共享 workspace
       └─ side_chat_context → 按需读取父会话的相关上下文
```

client 保留 DSH 已注册的主 conversation component，并在 DSH 0.2 中通过官方 Factory 为侧 Session 创建第二个原生 conversation content；0.1 走兼容适配器。插件没有自己的消息 renderer 或 composer。最小 split shell 只负责布局、分隔条和生命周期入口。

## 开发与目录

```text
src/core.mjs          纯函数：side id、上下文筛选与 retained child 选择
src/host.template.js  DSH child 生命周期、上下文工具、关闭/保留/删除
src/client.js         原生 ConversationRoot 双绑定与最小 split shell
dev/                  隔离 DSH profile、构建与本地验收种子
tests/                core、integration、client contract、smoke
release/              可直接安装的预构建插件包
```

仓库同时保留源码与预构建 `.tgz`：开发者可以阅读、构建和测试源码，普通用户可以直接安装 release 包。

## 升级或卸载

替换 `release/` 中的安装包后更新插件，并重启 DSH Web：

```powershell
dsh plugin --profile web update dsh-side-chat
```

卸载插件：

```powershell
dsh plugin --profile web remove dsh-side-chat
```

## License

MIT。参考的 DeepSeek Harness checkout 同为 MIT。
