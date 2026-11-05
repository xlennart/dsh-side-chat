# Side Chat 1.2.2 · DSH 0.2.2-rc.1 适配记录

验证日期：2026-11-05。适配及发布前验证范围仅为本仓库 `dsh-side-chat`，未修改 Goal Mode、Jev 或升级用户的 DSH 宿主。

## 版本与工具

- 目标：官方 npm `@deepseek-ai/dsh@0.2.2-rc.1`，检查时 `latest` 和 `next` 均指向该版本；它是预发布版。
- [官方版本标签](https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.2.2-rc.1)：`dsh-v0.2.2-rc.1`，源码提交 `66491b05e3f05ad35bcdd4f6cd7ed26041d9e3db`。
- 本插件前一次记录的验证目标为 `0.2.0-rc.1`；本机实际用户宿主为 `0.2.1-rc.5`，本次适配未升级它。
- 使用 [dsh-plugin-upgrade-skill](https://github.com/oh-my-dsh/dsh-plugin-upgrade-skill) 的全局技能，固定提交 `92afb64abf71f36a4bbd991ac9a29ad39a265db9`，结合官方升级指南、源码核对、行为测试和 ego-browser 实机验证。
- 环境：Windows、Node.js 24.20.0。插件 Node 最低版本和 CI 调整为目标宿主要求的 24.9+。

## 耦合点与处理

| 耦合点 | 结论与改动 |
| --- | --- |
| `conversation.sendSession` | 转发第六个 Host acceptance 回调。提交被接收时清理本次引用并让原生 composer 清空；拒绝、取消和失败保留草稿。等待期间新增引用不受影响。 |
| Agent 创建、恢复及模型路由 | 保留独立 Session 和 scoped setup。恢复时提供父 Agent 当前模型或宿主默认模型作为 fallback；DSH 原生已记录的模型选择和 request 仍优先。修复空白侧聊冷恢复后缺少 provider/model 的运行失败。 |
| 归档与侧栏 | 新版 ArchivedSessionGate 阻断归档 Session 的执行。打开时取消归档，通过 `sidebar.session.row.trailing` 标记隐藏侧聊行；`data-row-key` 兜底覆盖空白和运行中的行。将侧聊关联到 cwd 对应工作区，避免新增未分组条目。 |
| 持久化 | `list()` 返回 snapshot，需要读取 `.header`；冷父会话使用 `stat()`，删除使用 snapshot `.location`。保留旧 header 列表及 `locate()` 兜底。支持新版持久化 flush。 |
| 原生会话渲染 | 继续使用 `SessionProvider`、retain 引用和 conversation factory；并排侧聊复用原生 header、正文、视图和输入区，保留无 header 的集成路径。 |
| UI 对齐 | 去掉过时的 24px 侧聊底部留白；同步左右原生 header 的自然高度并随尺寸变化重测。空白侧聊保留关闭/隐藏控制，原生 header 出现后隐藏重复控制。 |
| 上下文工具、权限和配置 | `side_chat_context` 仍从 sessionQuery 读取有界父事件；实际经过原生工具循环验证。没有复制完整 transcript、改写审批规则或扩大工具权限。新增 ui-workspace 的客户端服务依赖。 |

扫描器读取 75 篇升级指南、扫描 3 个文件约 1748 行，产生 4 个启发式命中。逐一核对后属于 handle.dispose、通用 slot 和 read-only 等同名误报；真正的 acceptance、归档执行门、snapshot 和模型恢复问题由行为检查及运行测试发现。不能把扫描结果当作兼容性证明。

## 自动化验证

原基线 28 项通过，修改后 41 项通过（core 5、integration 8、client contract 11、submission 9、native conversation 5、smoke 3）。

新增覆盖：完整六参数转发、接收前后引用生命周期、取消和拒绝、附件失败、旧版成功回退、被替换面板和卸载所有权、侧栏身份标记、冷父 snapshot、保留恢复、空白侧聊模型 fallback、真实临时 artifact 删除。

旧版发送包装器在新增发送测试中复现 4 项失败；修复后全部通过。验证命令：`npm test`。打包命令：`npm pack --ignore-scripts --pack-destination release`。

## 隔离宿主与浏览器验证

运行的是官方完整 DSH 包和打包后的 Side Chat，不是手写 UI。独立 `DSH_HOME`、profile、workspace、端口 `3089`，均在本仓库 `outputs/` 下；未使用用户模型密钥。脚本模型只替代外部 LLM 网络响应，原生 Agent、消息接收、持久化、工具分发和 Web UI 均实际运行。

已执行：

1. 主会话生成已知事实，打开独立侧聊；侧聊实际调用 `side_chat_context` 后得到父事件中的事实并生成回复。
2. 冷重启后找到同一个保留侧聊；修复并验证空白侧聊恢复后的发送路由。
3. 在主消息选中文字，点击“引用到侧聊”并发送；接收后侧聊输入框和引用清空，主会话草稿保留。
4. 通过真实关闭对话框保留并重新打开，侧聊 ID 和已有回复不变。通过“删除并关闭”删除该隔离侧聊，再打开时不再使用已删除 ID（隔离数据中存在更早的保留侧聊，按既有规则恢复）。
5. 检查空白和已有内容侧聊；宽屏、鼠标拖动分隔条、900px 窄屏时主侧两栏均显示。标题栏下沿、同等单行输入框及模型工具栏纵坐标差均为 0px。旧版单行输入框高差为 24px。
6. 用 ego-browser 截图检查实际布局，确认标题栏、输入框、工具栏和关闭控制；没有把单元测试作为视觉验收。

本地证据（`outputs/` 是复现材料，不随 npm 包发布）：

- `outputs/sidechat-tests-1.2.2.log`
- `outputs/sidechat-scan-0.2.2-rc.1.json`
- `outputs/sidechat-runtime-open-result.json`
- `outputs/sidechat-runtime-model-calls.json`、`outputs/sidechat-runtime-final-result.json`
- `outputs/sidechat-ui-geometry-default.json`（空侧聊）
- `outputs/sidechat-ui-geometry-wide.json`、`dragged.json`、`narrow.json`（后两者同前缀）
- `outputs/sidechat-ui-before.png`、`outputs/sidechat-ui-after.png`、`outputs/sidechat-ui-narrow.png`
- `outputs/sidechat-browser-*.mjs`、`outputs/sidechat-runtime-fixture.mjs`

## 验证边界

- 实际验证目标仅为官方 `0.2.2-rc.1`。保留的 DSH engine 历史范围不代表本轮重测了全部旧版本。
- 没有接入真实供应商密钥，不包含外部模型网络、计费或供应商特有流式行为验证。
- 没有实测 Better Sidebar 融合模式；其可选 peer 范围保持原值，不对已安装的更新版 Better Sidebar 作兼容承诺。
- 对齐数据使用相同单行输入高度；各自输入内容导致不同自然高度时，composer 可以独立增长。
- 隔离测试的早期旧侧聊留下的“未分组”空组未作为通用 UI 对象隐藏。用户主 profile 未改动。
- 产物为 `release/dsh-side-chat-1.2.2.tgz`。发布及市场审核状态以 GitHub Releases 和市场 PR 为准；本记录说明发布前的兼容性证据，不代表升级了用户正式宿主。
