# 架构

## 1. 会话模型

侧聊是 DSH 原生 child session：

- id 使用 `sidechat-` 前缀；
- `origin: subagent`；
- `parentSession` 指向主会话；
- 继承主会话 cwd、agent preset、模型与原生运行能力；
- transcript 与主会话完全独立；
- workspace root sessionIds 不包含 child，所以左侧列表不会出现侧聊。

同一主会话重新打开时，host 只恢复属于该 parent 的最新 retained child。它不会把 sibling 或其他主会话的 child 接入当前 UI。

## 2. 父上下文

创建 child 时不发送父 transcript，也不伪造一条“以下是主会话全部内容”的用户消息。

host 只安装：

1. 一段带 section id 的关系提示，说明这是侧聊、父会话 id 与应按需获取上下文；
2. `side_chat_context` 工具，根据 query 从 `sessionQuery` 读取父会话，做相关性排序、按轮次裁剪与字符上限控制。

这使 child 实质上理解父会话，同时避免每次创建时复制全部内容。创造模式下仍由 DSH 原生 `cordis` preset 决定 system prompt、skills、tools 与知识；插件不覆盖它。

## 3. Host 生命周期

```text
sideChat.open(parentSessionId)
  ├─ 验证 parent，读取冷/热 session header
  ├─ 查找 retained child，否则 agents.create(...)
  ├─ session.options.origin = subagent
  ├─ session.options.parentSession = parent
  ├─ compose parent preset
  └─ 返回 child session id（不产生 user message）

sideChat.close(child, keep)
  └─ flush + dispose，保留 durable session

sideChat.close(child, delete)
  ├─ dispose
  ├─ 只解析并验证 child 的精确持久化路径
  ├─ 支持 session.jsonl(.zstd) 与 session.v4.jsonl(.zstd)
  └─ 删除失败时仍结束 UI 生命周期，并以 warning 告知数据已保留
```

RPC 失败遵循 DSH 判别联合：`{ ok:false, error:{ code:'internal', message, details:{} } }`。

## 4. 原生 UI 复用

DSH 0.2 的 `main.conversation` entry 负责主会话骨架，并通过公开的 `conversation.content` Component Factory 渲染会话正文。client 在加载时保留该 component，并把 entry face 换成 `ParallelConversation`：

```text
ParallelConversation
  ├─ main binding ── 原生 ConversationRoot
  ├─ separator
  └─ side SessionProvider ── conversation.content（embedded）
```

侧栏通过 `sessions.retain()` 保留 child reference，再由官方 `SessionProvider` 和 `conversation.content` factory 渲染；factory 使用固定 chat view，但消息、Markdown、工具卡和输入栏仍全部来自 DSH。插件没有自建消息 renderer、Markdown renderer 或输入栏实现。

客户端 loader 会并行执行插件，`dsh.client.inject` 只保证依赖服务可注入，不保证目标插件已经完成 `apply()`。因此 Side Chat 同时订阅 `main.conversation` 与 `conversation.content` factory 的注册生命周期，二者就绪后再接管主 entry；等待是事件驱动的，并带有可取消的 15 秒诊断截止时间，不使用固定间隔轮询。原生 entry 或 factory 卸载、热重载时会先恢复旧 component，再等待并接管新 entry；Side Chat 卸载会同步取消订阅和截止时间。header actions/utilities 等子 slot 则使用 `slots.inject` 跟随各自的声明生命周期。

为兼容 DSH 0.1.7，适配层仍保留旧 `conversation` entry + BindingContext 路径；运行时优先选择 0.2 的 Component Factory，只有 factory 不存在时才回退到旧路径。

新 child 的原生状态是 blank。为了让侧聊输入框和已有主会话底部对齐，side binding 将 blank composer phase 稳定投影为 active，并用 WeakMap 保持快照引用；composer seat 使用 auto margin 吸收无消息时的剩余空间。输入框尺寸、ResizeObserver、sticky、草稿增长与接管面板仍由原生 `ConversationRoot` 控制。

## 5. 分栏与动作

- 默认比例 50%；side 可调范围 25%–70%。
- pointer drag 调宽；方向键每次 2%，按 Shift 每次 5%。
- 隐藏只设置 client `hidden`，不 close child。
- 恢复重用相同 `sideId`。
- 打开/恢复用 DSH 原生消息气泡＋图标；隐藏用面板图标；关闭用 DSH 详情面板同风格 X。
- 关闭才显示删除/保留 modal。
- split shell 在任意容器宽度都保留主对话；不会用侧聊替换主会话页面。
- Better Sidebar 融合只改变侧聊的渲染位置，Side Chat 自己的 header 入口始终注册；融合页面不重复渲染悬浮关闭按钮，由 Better Sidebar 标签页本身负责关闭与重新打开。

## 6. 选区

主列监听消息区 `mouseup`，排除 input、textarea 与 contenteditable。有效选区显示简约浮窗。点击后调用侧聊原生 `inputActions.setDraft`，不会提交消息，也不会向主 transcript 写入事件。

## 7. 已知 seam

DSH 0.2 已公开 `conversation.content` Component Factory，可在任意 `SessionProvider` 下复用完整 conversation content。插件仍使用 slot registry `_core` 的 `entries/subscribe/register` 生命周期 seam 来替换主 `main.conversation` entry；目标 entry 或 factory 尚未注册属于可等待的 loader 状态，只有 seam 本身缺失才会在加载时 fail loud。上游若改变 entry 生命周期，应更新适配层；禁止退回手搓聊天 UI。
