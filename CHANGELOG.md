# Changelog

## 1.2.1 (2026-09-30)

- Restore compatibility with official DeepSeek Harness `0.2.0-rc.1` after the legacy client runtime and `conversation` slot were removed.
- Render the side Session through the new public `conversation.content` Component Factory and `SessionProvider`, while retaining the DSH 0.1 compatibility path.
- Remove the obsolete `@deepseek-ai/dsh-client-runtime` module-table dependency and add DSH engine compatibility metadata.
- Normalize source newlines in the formal package builder so clean Windows worktrees build deterministically.
- Keep the main conversation visible at every container width instead of replacing it with the side pane below 981px.
- Preserve the plugin's own header entry when Better Sidebar integration is enabled, and close the integrated tab when its side session closes.
- Let Better Sidebar's native tab close control own the integrated-page lifecycle instead of rendering a duplicate floating close button.
- Support DSH 0.2 `session.v4.jsonl(.zstd)` deletion; deletion failures now close the pane, restore the main conversation, and report that data was retained.

## 1.2.0 (2026-08-28)

- Keep Side Chat and Better Sidebar mutually exclusive: opening either panel automatically makes room by hiding the other.
- Align Side Chat controls with Better Sidebar's header controls while preserving the native header layout when Better Sidebar is not installed.
- Keep selected-text references out of the native composer draft and project them into the side-session prompt only when a message is sent, eliminating the visible `@` placeholder.
- Add viewport-safe selection actions, removable reference previews, and a remembered keep-or-delete close preference.
- Make the split layout respond to its actual container width so narrow hosts remain usable without forcing the main view wider.

## 1.1.3 (2026-08-27)

- Fix the Windows cold-start race when Side Chat loads before DSH's native conversation entry.
- Follow native conversation entry registration and hot-reload lifecycles without polling or duplicate component replacement.
- Cancel pending readiness diagnostics during plugin unload and defer child-slot contributions through `slots.inject`.

## 1.1.2

- Keep independent side-session UI state for every main conversation.
- Restore each conversation's own side pane after opening side chats in multiple main conversations.
- Scope hide, close, selected-text references, connection errors, and dialogs to the correct parent conversation.
- Prevent a previous conversation's side-session binding from flashing during navigation.

## 1.1.1

- Scoped each visible side pane to the main conversation that opened it.
- Hide the side pane, divider, selection state, and close dialog when navigating to another main conversation.
- Keep the side-chat entry available in other conversations and restore the original pane when returning to its owner.
- Verified the native conversation, composer, reference-chip, settings, and session APIs against DSH 0.1.0-rc.7.

## 1.1.0

- Replaced selected-text draft prefill with DSH's native reference-chip pipeline.
- Added a Side Chat settings section with enable and native Agent preset controls.
- Kept DSH's native model selector available inside every side conversation.
- Moved side conversations out of subagent routing and archive them from the workspace list.
- Improved native side-session connection and fixed composer/header alignment regressions.

## 1.0.0

- Rebuilt side chat as a real hidden DSH child session with native parent lineage.
- Reused DSH's complete ConversationRoot for both main and side conversations.
- Added on-demand bounded parent context without transcript seeding.
- Added aligned native composers, resizable split, hide/restore, and icon-only controls.
- Added main-text selection entry with native side-draft prefill.
- Added delete-or-keep close confirmation with delete as the documented default.
- Added a formal DSH bundle manifest and prebuilt tarball distribution path.
