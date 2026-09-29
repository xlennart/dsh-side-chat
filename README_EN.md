# DSH Side Chat

<p align="center">
  <a href="README.md">简体中文</a> · <strong>English</strong>
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
  <strong>Open a truly independent, native, context-aware conversation beside your main DeepSeek Harness session.</strong>
</p>

<p align="center">
  <a href="#interface-preview">Interface Preview</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#sessions-and-data">Sessions and Data</a> ·
  <a href="#core-capabilities">Core Capabilities</a> ·
  <a href="#architecture-boundary">Architecture</a>
</p>

> [!NOTE]
> A side chat is not a floating overlay or a hand-built imitation of the DSH chat UI. It is a real DSH Session that reuses the native conversation components and reads bounded parent context only when needed.

## Start Here

- **Just use it:** download [`release/dsh-side-chat-1.2.1.tgz`](release/dsh-side-chat-1.2.1.tgz) and install it with the command below.
- **Develop it:** clone the repository, run `npm test`, and let the same command build the plugin and run the regression suite.
- **What it solves:** open a native DSH session that can ask questions, use tools, and work in the project without leaving the main conversation.
- **The key boundary:** the main session and side chat share a workspace but keep independent transcripts; the side chat does not automatically copy the full parent conversation.

## Interface Preview

![Native DSH parallel side chat](docs/assets/side-chat-parallel.png)

The main conversation and side chat use the same native DSH interface. The divider is resizable, both composers stay aligned, and side sessions do not appear in the workspace session list.

| Ask about selected text | Native settings page |
| --- | --- |
| ![Open selected text in a side chat](docs/assets/side-chat-selection.png) | ![Side chat settings](docs/assets/side-chat-settings.png) |

## Quick Start

### Install the prebuilt package

Requirements: Node.js 22 or later and a DeepSeek Harness installation that can load Web plugins.

Download the prebuilt package from [GitHub Releases](https://github.com/KarlOfLaw/dsh-side-chat/releases/latest), or use the copy in the repository's `release/` directory. Installation does not need to run the build again:

```powershell
# After downloading from GitHub Releases:
dsh plugin --profile web add .\dsh-side-chat-1.2.1.tgz

# Or use the in-repo copy:
dsh plugin --profile web add .\release\dsh-side-chat-1.2.1.tgz
```

Start DSH from the project that you want the Agent to work in:

```powershell
cd D:\path\to\your-project
dsh web --port 3080
```

Open the URL printed by DSH. The plugin loads automatically in the Web client.

### Build from source

```powershell
git clone https://github.com/KarlOfLaw/dsh-side-chat.git
cd dsh-side-chat
npm test

$DshSource = "D:\path\to\deepseek-harness"
$PluginSource = (Get-Location).Path
pnpm --dir $DshSource dsh plugin --profile web add $PluginSource
pnpm --dir $DshSource dsh web
```

For an existing installation:

```powershell
npm test
pnpm --dir $DshSource dsh plugin --profile web update dsh-side-chat
```

`npm test` builds the dynamic output and formal local package, then runs the core, host integration, client contract, and smoke tests.

### Local linked development

When the plugin is registered from its source directory, DSH loads `dist/formal-host.mjs` and `dist/formal-client.cjs` rather than reading `src/` directly. After changing source, run `npm test` (or `npm run build`) again and restart `dsh web`; otherwise the browser may still be running the previous build.

## Usage

1. Open a main session and click the message-bubble-plus icon in the header.
2. The side chat immediately shows its complete native header and composer. The hide and close controls are already in the native header before the first message is sent.
3. Use it like a normal DSH conversation: select a model, send messages, attach files, use tools, and handle approvals.
4. Drag the divider to adjust the pane ratio. Focus it and use the arrow keys for fine adjustment; hold `Shift` for larger steps.
5. Select text in a main message and click "Quote in side chat." A removable reference indicator appears above the composer while the native draft itself stays empty; the quote is added only when the message is sent.
6. Use the panel icon in the side header to hide the pane. The message-bubble icon in the main header restores the same side chat.
7. Click the close icon and choose either "Retain conversation" or "Delete and close."

### Useful details

- Each main session keeps its own side-chat state; switching main sessions does not reuse another session's active side chat.
- "Retain conversation" releases the active Agent but keeps the session on disk. Opening the same mode later restores the most recently retained side chat.
- "Delete and close" can delete only sessions created by this plugin and supports DSH 0.2 `session.v4.jsonl.zstd` artifacts. If storage deletion fails, the pane still closes, the main conversation returns, and the retained data is reported clearly.
- When Settings, the plugin market, or another native DSH modal is open, the divider yields pointer interaction and cannot cover or intercept that modal.
- When Better Sidebar is installed, Side Chat can optionally render as a registered page and use the tab's native close control. Its own header entry remains available with or without integration; without integration it opens the native split pane directly.
- The Side Chat settings page can enable or disable the plugin and choose the native Agent mode used by new side chats.

## Sessions and Data

The first open creates a real DSH Session with `parentSession` and archives it immediately, keeping it out of the workspace session list. If a side chat was retained, the next open in the same mode resumes the most recent retained session instead of starting empty.

The plugin does not copy the parent transcript into the side chat. Selected text stays in Side Chat's own reference state instead of the native draft and is projected only into the request that is sent. When more background is actually needed, `side_chat_context` can retrieve a bounded, relevant, chronologically ordered set of parent-session events.

The main session and side chat share the same workspace. File edits, commands, approvals, and other tool side effects from the side chat are real. Hiding, retaining, or closing the pane does not undo them.

## Core Capabilities

| Capability | Implementation |
| --- | --- |
| **Real independent session** | Creates or resumes a Session with `parentSession` through DSH `agents.create/resume`, without occupying subagent routing. |
| **Complete native UI** | DSH 0.2 renders the side pane through the official `conversation.content` Factory, while 0.1 keeps the `ConversationRoot` compatibility path; messages, tools, approvals, attachments, composer, model, and access controls remain native. |
| **Complete before first send** | Even an empty side chat shows native conversation content, the composer, and hide/close controls; the same native UI remains after sending. |
| **On-demand parent context** | The plugin does not copy the parent transcript. `side_chat_context` retrieves bounded, relevant parent excerpts only when needed. |
| **True side-by-side layout** | Adds only a minimal split shell. The main conversation remains visible even in narrow hosts; the divider supports dragging and keyboard adjustment, with the side pane constrained to 25%-70%. |
| **No sidebar pollution** | New side sessions are archived immediately and stay out of the workspace session list. |
| **Ask about a selection** | Selecting text reveals a "Quote in side chat" action. References can be previewed or removed without leaving an `@` marker or hidden text in the native composer. |
| **Better Sidebar compatibility** | Optionally registers a Better Sidebar page while always retaining Side Chat's own shortcut; the complete standalone path remains available when Better Sidebar is absent. |
| **Hide, restore, or delete** | Hiding only collapses the pane; retained chats can be restored, and closing can safely delete the child session. |
| **Native modes and models** | New chats default to Standard mode, with PTC, Minimal, and Creation modes available. The native model selector remains available. |

## Current Limitations and Compatibility

- The current selection entry is primarily designed for mouse selection; mobile long-press selection and a touch action bar are not specially optimized yet.
- A single selected-text reference is limited to 8,000 characters; longer selections are truncated.
- DSH 0.2 uses the public `SessionProvider` and `conversation.content` Factory. The DSH 0.1 compatibility path still uses the older BindingContext adapter. Either path fails explicitly instead of falling back to a custom chat renderer.
- Safe permanent deletion supports DSH 0.1/0.2 JSONL and Zstandard JSONL session files and requires deletion support from the formal local package. Unsupported configurations close the pane, restore the main conversation, retain the data, and show a warning.
- On-demand parent context is intentionally bounded and may not contain every historical detail from the main conversation.

## Architecture Boundary

The host adds only the lifecycle and context capabilities required by side chat:

```text
Main Session
  `-- archived side Session (parentSession=Main Session)
      |-- native DSH Agent / preset / tools / approvals
      |-- independent transcript, shared workspace
      `-- side_chat_context -> bounded, on-demand parent context
```

The client keeps DSH's registered main conversation component and, on DSH 0.2, asks the official Factory to render native conversation content for the side Session; 0.1 uses the compatibility adapter. The plugin does not implement its own message renderer or composer. The split shell owns only layout, resizing, and lifecycle entry points.

## Development and Project Layout

```text
src/core.mjs          Pure functions: side IDs, context filtering, retained child selection
src/host.template.js  Child lifecycle, context tool, retain/delete behavior
src/client.js         Native ConversationRoot bindings and the minimal split shell
dev/                  Isolated DSH profile, local build, and acceptance seed
tests/                Core, integration, client contract, and smoke tests
release/              Prebuilt packages for direct installation
```

The repository intentionally contains both the unbuilt source and prebuilt plugin packages: readers can study and build the implementation, while users can install the `.tgz` directly.

## Upgrade or Remove

Replace the package under `release/`, update the plugin, and restart DSH Web:

```powershell
dsh plugin --profile web update dsh-side-chat
```

Remove the plugin with:

```powershell
dsh plugin --profile web remove dsh-side-chat
```

## License

MIT. The referenced DeepSeek Harness checkout is also MIT licensed.
