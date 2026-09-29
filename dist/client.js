// dsh-side-chat client: only the split shell and side-chat-specific controls are custom.
// Transcript, header, composer, approvals, questions, attachments and controls stay in DSH slots.

const CSS = `
.dsh-sc-root{container-name:dsh-side-chat;container-type:inline-size;display:flex;height:100%;min-width:0;overflow:hidden;background:var(--dsw-alias-bg-base)}
.dsh-sc-column{position:relative;display:flex;flex-direction:column;width:100%;max-width:100%;min-width:0;height:100%;background:var(--dsw-alias-bg-base)}
.dsh-sc-column-main{flex:1 1 100%}
.dsh-sc-column-side{box-sizing:border-box;flex:1 1 100%}
.dsh-sc-root-split .dsh-sc-column-main{display:flex;flex:1 1 0;width:auto;max-width:none}
.dsh-sc-root-split .dsh-sc-resizer{display:block}
.dsh-sc-root-split .dsh-sc-column-side{flex:0 0 var(--dsh-sc-side-width,50%);width:auto;max-width:none}
.dsh-sc-column-side:not(:has([data-slot="conversation.composer.dock"]>*)){padding-bottom:24px}
.dsh-sc-column>[data-phase],.dsh-sc-column>[data-conversation-content]{flex:1;min-height:0}
.dsh-sc-column-side [data-conversation-scroll]>[data-composer-seat]{margin-top:auto}
.dsh-sc-resizer{position:relative;z-index:1;flex:0 0 7px;margin:0 -3px;cursor:col-resize;touch-action:none;outline:none}
.dsh-sc-resizer::after{content:'';position:absolute;top:0;bottom:0;left:3px;width:1px;background:var(--dsw-alias-border-l2);transition:width .12s,background .12s}
.dsh-sc-resizer:hover::after,.dsh-sc-resizer:focus-visible::after{left:2px;width:3px;background:var(--dsw-alias-state-business-primary)}
body:has([role="dialog"],[aria-modal="true"],[data-modal],[data-overlay],[data-radix-popper-content-wrapper]) .dsh-sc-resizer{pointer-events:none}
.dsh-sc-action{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:30px;padding:5px 10px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer}
.dsh-sc-action:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-sc-action:disabled{opacity:.5;cursor:default}
.dsh-sc-icon-action{width:30px;padding:0}
.dsh-sc-selection{position:fixed;z-index:2147483647;isolation:isolate;display:flex;max-width:calc(100vw - 16px);align-items:center;overflow:hidden;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1,var(--dsw-specific-input-major,#fff));box-shadow:0 6px 22px rgba(0,0,0,.2);color:var(--dsw-alias-label-primary,#111)}
.dsh-sc-selection .dsh-sc-action{min-height:36px;padding:0 14px;border-radius:999px;background:transparent;color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;white-space:nowrap}
.dsh-sc-selection .dsh-sc-action:hover,.dsh-sc-selection .dsh-sc-action:focus-visible{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-sc-selection-dock{position:relative;z-index:2;display:flex;min-width:0;padding:0 4px 2px;color:var(--dsw-alias-label-primary)}
.dsh-sc-quote{position:relative;flex:none;max-width:100%;color:inherit}
.dsh-sc-quote-chip{display:inline-flex;max-width:100%;min-height:36px;align-items:center;overflow:hidden;padding:0;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-1,var(--dsw-specific-input-major,#fff));transition:background-color .12s}
.dsh-sc-quote:hover .dsh-sc-quote-chip,.dsh-sc-quote:focus-within .dsh-sc-quote-chip,.dsh-sc-quote[data-expanded] .dsh-sc-quote-chip{background:var(--dsw-alias-interactive-bg-hover)}
.dsh-sc-quote-trigger{display:inline-flex;min-height:34px;align-items:center;gap:8px;padding:0 11px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer}
.dsh-sc-quote-icon{width:16px;height:16px;flex:none;fill:none;stroke:var(--dsw-alias-label-secondary);stroke-linecap:round;stroke-linejoin:round;stroke-width:1.6}
.dsh-sc-quote-chip-label{overflow:hidden;font-size:13px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}
.dsh-sc-quote-remove{display:grid;width:30px;height:34px;min-height:34px;flex:none;place-items:center;overflow:hidden;padding:0;border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:18px;line-height:1;opacity:.72;cursor:pointer;transition:opacity .1s,background-color .1s}
.dsh-sc-quote:hover .dsh-sc-quote-remove,.dsh-sc-quote:focus-within .dsh-sc-quote-remove{opacity:1}.dsh-sc-quote-remove:hover{background:var(--dsw-alias-interactive-bg-hover);color:inherit}
.dsh-sc-quote-details{position:fixed;z-index:2147483647;left:0;top:0;box-sizing:border-box;width:min(520px,calc(100vw - 32px));max-height:min(60vh,480px);overflow:auto;padding:14px 16px;border:1px solid var(--dsw-alias-border-l2);border-radius:16px;background:var(--dsw-alias-bg-elevated);box-shadow:0 4px 14px rgba(0,0,0,.08);opacity:0;pointer-events:none;transform:translateY(4px);visibility:hidden;transition:opacity .1s,transform .12s,visibility .1s}
.dsh-sc-quote-details[data-visible]{opacity:1;pointer-events:auto;transform:translateY(0);visibility:visible}
.dsh-sc-quote-details-header{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--dsw-alias-label-secondary);font-size:13px;font-weight:500}
.dsh-sc-quote-item-remove{padding:2px 6px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:12px;cursor:pointer}.dsh-sc-quote-item-remove:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
.dsh-sc-quote-item{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:1.55}
.dsh-sc-quote-item+.dsh-sc-quote-item{margin-top:10px;padding-top:10px;border-top:1px solid var(--dsw-alias-border-l2)}
.dsh-sc-modal-backdrop{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.52)}
.dsh-sc-modal{box-sizing:border-box;width:min(420px,100%);padding:20px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);box-shadow:0 20px 64px rgba(0,0,0,.32)}
.dsh-sc-modal h3{margin:0 0 8px;color:var(--dsw-alias-label-primary);font-size:16px}.dsh-sc-modal p{margin:0;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:1.6}
.dsh-sc-modal-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;margin-top:20px}.dsh-sc-modal-actions .dsh-sc-action{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-elevated)}.dsh-sc-remember-choice{display:inline-flex;align-items:center;gap:7px;margin-right:auto;color:var(--dsw-alias-label-secondary);font-size:13px;cursor:pointer}.dsh-sc-remember-choice input{width:16px;height:16px;margin:0;accent-color:var(--dsw-alias-state-business-primary)}.dsh-sc-danger{border-color:var(--dsw-alias-error,var(--dsw-alias-border-l2))!important;color:var(--dsw-alias-error,var(--dsw-alias-label-primary))}
.dsh-sc-corner-entry{display:flex;order:-1;gap:4px;-webkit-app-region:no-drag}.dsh-sc-corner-entry .dsh-sc-action{width:28px;height:28px;min-height:28px;padding:0;border-radius:50%}
body:has(.dsh-sc-corner-entry) .dsh-sc-column-main [data-phase] header{padding-right:var(--dsh-sc-header-reserve,128px)}
body:has(.dsh-sc-root-split)>div:has([data-dsh-better-sidebar]){z-index:2147483647!important}
body:has(.dsh-sc-root-split) [data-dsh-better-sidebar] [data-dsh-toggle-cluster]{z-index:2147483647!important}
body:has(.dsh-sc-root-split) .dsh-sc-column-side [data-phase] header{padding-right:72px}
.dsh-sc-side-utilities{display:inline-flex;align-items:center;gap:4px}.dsh-sc-side-utilities .dsh-sc-action{width:28px;height:28px;min-height:28px;padding:0}
.dsh-sc-factory-controls{position:absolute;top:10px;right:12px;z-index:20;display:flex;padding:2px;border-radius:999px;background:var(--dsw-alias-bg-elevated);box-shadow:0 2px 10px rgba(0,0,0,.08)}
body:has(.dsh-sc-root-split):has([data-dsh-better-sidebar] [data-dsh-toggle-cluster]) .dsh-sc-side-utilities{transform:translateY(-11px)}
.dsh-sc-error{position:absolute;right:14px;bottom:14px;z-index:20;max-width:360px;padding:9px 12px;border:1px solid var(--dsw-alias-border-l2);border-radius:9px;background:var(--dsw-alias-bg-elevated);color:var(--dsw-alias-label-secondary);font-size:12px}
.dsh-sc-settings{width:min(760px,100%);padding:8px 0 40px;color:var(--dsw-alias-label-primary)}
.dsh-sc-settings-head{padding:0 0 20px}.dsh-sc-settings-head h2{margin:0;font-size:20px;font-weight:600;letter-spacing:0}
.dsh-sc-settings-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:24px;min-height:72px;border-bottom:1px solid var(--dsw-alias-border-l2)}
.dsh-sc-settings-title{font-size:14px;font-weight:500}.dsh-sc-settings-desc{margin-top:4px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}
.dsh-sc-settings-select{min-width:148px;height:34px;padding:0 30px 0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:6px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit;font-size:13px}
.dsh-sc-switch{position:relative;width:36px;height:20px;flex:none}.dsh-sc-switch input{position:absolute;opacity:0;pointer-events:none}.dsh-sc-switch span{display:block;width:100%;height:100%;border-radius:10px;background:var(--dsw-alias-border-l2);transition:background .15s}.dsh-sc-switch span::after{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-bg-elevated);box-shadow:0 1px 3px rgba(0,0,0,.22);transition:transform .15s}.dsh-sc-switch input:checked+span{background:var(--dsw-alias-state-business-primary)}.dsh-sc-switch input:checked+span::after{transform:translateX(16px)}.dsh-sc-switch input:focus-visible+span{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
`

const PREFERENCE_KEY = 'dsh-side-chat.preferences.v1'
const SELECTIONS_KEY = 'dsh-side-chat.selections.v1'
const REFERENCE_MIGRATION_KEY = 'dsh-side-chat.reference-storage.v2'
const PRESET_OPTIONS = Object.freeze([
  { id: 'standard', label: '标准模式' },
  { id: 'code', label: 'PTC 模式' },
  { id: 'minimal', label: '极简模式' },
  { id: 'cordis', label: '创造模式' },
])
const CLOSE_BEHAVIOR_OPTIONS = Object.freeze([
  { id: 'ask', label: '每次询问' },
  { id: 'keep', label: '始终保留' },
  { id: 'delete', label: '始终删除' },
])

function storedPreferences() {
  const fallback = { enabled: true, preset: 'standard', closeBehavior: 'ask', integrateBetterSidebar: false }
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(PREFERENCE_KEY) ?? 'null')
    return {
      enabled: typeof parsed?.enabled === 'boolean' ? parsed.enabled : fallback.enabled,
      preset: PRESET_OPTIONS.some(option => option.id === parsed?.preset) ? parsed.preset : fallback.preset,
      closeBehavior: CLOSE_BEHAVIOR_OPTIONS.some(option => option.id === parsed?.closeBehavior) ? parsed.closeBehavior : fallback.closeBehavior,
      integrateBetterSidebar: typeof parsed?.integrateBetterSidebar === 'boolean'
        ? parsed.integrateBetterSidebar
        : fallback.integrateBetterSidebar,
    }
  } catch (_error) {
    return fallback
  }
}
const initialState = Object.freeze({ sides: new Map(), busy: false, dialog: null, sideRatio: 50, error: '', errorParentId: null, betterSidebarAvailable: false, ...storedPreferences() })
let uiState = initialState
const subscribers = new Set()
let sessionsService = null
let NativeConversationRoot = null
let projectedSideSessions = new WeakMap()
let projectedSideProvideInfos = new WeakMap()
let betterSidebarService = null
const conversationKits = new Map()

function update(patch) {
  uiState = Object.freeze({ ...uiState, ...patch })
  for (const subscriber of subscribers) subscriber()
}

function setSide(parentId, side) {
  const sides = new Map(uiState.sides)
  sides.set(parentId, Object.freeze(side))
  update({ sides })
}

function patchSide(parentId, patch) {
  const side = uiState.sides.get(parentId)
  if (side !== undefined) setSide(parentId, { ...side, ...patch })
}

function appendSelection(selections, text) {
  const normalized = String(text ?? '').trim().slice(0, 8000)
  if (normalized === '') return Array.isArray(selections) ? selections : []
  const current = Array.isArray(selections) ? selections : []
  if (current.includes(normalized)) return current
  return [...current, normalized].slice(-8)
}

function storedSelections(sideId) {
  try {
    const all = JSON.parse(globalThis.localStorage?.getItem(SELECTIONS_KEY) ?? '{}')
    const selections = all !== null && typeof all === 'object' ? all[sideId] : undefined
    return Array.isArray(selections) ? selections.filter(item => typeof item === 'string').slice(-8) : []
  } catch (_error) {
    return []
  }
}

function persistSelections(sideId, selections) {
  try {
    const parsed = JSON.parse(globalThis.localStorage?.getItem(SELECTIONS_KEY) ?? '{}')
    const all = parsed !== null && typeof parsed === 'object' ? parsed : {}
    if (selections.length === 0) delete all[sideId]
    else all[sideId] = selections.slice(-8)
    globalThis.localStorage?.setItem(SELECTIONS_KEY, JSON.stringify(all))
  } catch (_error) {}
}

function findSideOwner(state, sideId) {
  for (const [parentId, side] of state.sides) {
    if (side.sideId === sideId) return { parentId, side }
  }
  return undefined
}

function serializeSideSelections(selections) {
  return selections.map(text => `> 主对话选文\n>\n${String(text).split('\n').map(line => `> ${line}`).join('\n')}`).join('\n\n')
}

function installSidePromptProjection(conversationService) {
  const original = conversationService?.sendSession
  if (typeof original !== 'function') throw new Error('dsh-side-chat: conversation.sendSession is unavailable')
  const wrapped = async function (session, text, imageIds, mode, signal) {
    let owner
    for (const [parentId, side] of uiState.sides) {
      if (sessionsService?.binding?.(side.sideId)?.session === session) {
        owner = { parentId, side }
        break
      }
    }
    const selections = Array.isArray(owner?.side.selections) ? [...owner.side.selections] : []
    if (owner === undefined || selections.length === 0) return original.call(this, session, text, imageIds, mode, signal)
    const context = serializeSideSelections(selections)
    const projectedText = String(text).trim() === '' ? context : `${context}\n\n${text}`
    const outcome = await original.call(this, session, projectedText, imageIds, mode, signal)
    if (outcome?.kind === 'success') {
      const current = uiState.sides.get(owner.parentId)
      if (current?.sideId === owner.side.sideId) {
        const remaining = (current.selections ?? []).filter(selection => !selections.includes(selection))
        patchSide(owner.parentId, { selections: remaining })
        persistSelections(owner.side.sideId, remaining)
      }
    }
    return outcome
  }
  conversationService.sendSession = wrapped
  return () => {
    if (conversationService.sendSession === wrapped) conversationService.sendSession = original
  }
}

function updatePreferences(patch) {
  const next = { ...patch }
  update(next)
  try {
    globalThis.localStorage?.setItem(PREFERENCE_KEY, JSON.stringify({
      enabled: uiState.enabled,
      preset: uiState.preset,
      closeBehavior: uiState.closeBehavior,
      integrateBetterSidebar: uiState.integrateBetterSidebar,
    }))
  } catch (_error) {}
}

function subscribe(listener) {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

function useSideState() {
  return React.useSyncExternalStore(subscribe, () => uiState, () => uiState)
}

function useObservable(source, selector, fallback) {
  return React.useSyncExternalStore(
    listener => source === undefined ? () => {} : source.subscribe(listener),
    () => source === undefined ? fallback : selector(source.getSnapshot()),
    () => source === undefined ? fallback : selector(source.getSnapshot()),
  )
}

function h(type, props, ...children) {
  return React.createElement(type, props, ...children)
}

async function rpc(method, input) {
  return host.call(method, input)
}

function usesBetterSidebar(state = uiState) {
  return state.integrateBetterSidebar === true && state.betterSidebarAvailable === true && betterSidebarService !== null
}

function openBetterSidebarTab(parentId) {
  if (!usesBetterSidebar()) return false
  betterSidebarService.openTab({
    type: 'dsh-side-chat:conversation',
    id: `dsh-side-chat:${parentId}`,
    title: '侧边聊天',
    meta: { parentSessionId: parentId },
  }, { sessionId: parentId })
  return true
}

function closeBetterSidebarTab(parentId) {
  if (betterSidebarService === null || typeof betterSidebarService.closeTab !== 'function') return false
  betterSidebarService.closeTab(`dsh-side-chat:${parentId}`)
  return true
}

async function openSide(parentId, anchorText = '') {
  if (!uiState.enabled || uiState.busy) return
  if (!usesBetterSidebar()) closeBetterSidebarPanel()
  if (uiState.sides.has(parentId)) {
    const side = uiState.sides.get(parentId)
    const selections = appendSelection(side?.selections, anchorText)
    patchSide(parentId, { hidden: false, selections })
    persistSelections(side.sideId, selections)
    update({ error: '', errorParentId: null })
    openBetterSidebarTab(parentId)
    return
  }
  update({ busy: true, error: '', errorParentId: null })
  try {
    const result = await rpc('sideChat.open', { parentSessionId: parentId, anchorText, preset: uiState.preset })
    const selections = appendSelection(storedSelections(result.sessionId), anchorText)
    setSide(parentId, { sideId: result.sessionId, hidden: false, selections })
    persistSelections(result.sessionId, selections)
    update({ dialog: null, busy: false })
    openBetterSidebarTab(parentId)
  } catch (error) {
    update({ busy: false, error: error instanceof Error ? error.message : String(error), errorParentId: parentId })
  }
}

async function finishClose(mode, parentId, sideId) {
  if (uiState.sides.get(parentId)?.sideId !== sideId || uiState.busy) return
  update({ busy: true, error: '', errorParentId: null })
  try {
    const result = await rpc('sideChat.close', { sessionId: sideId, mode })
    if (result.deleted === true) persistSelections(sideId, [])
    closeBetterSidebarTab(parentId)
    const sides = new Map(uiState.sides)
    sides.delete(parentId)
    update({
      sides,
      busy: false,
      dialog: null,
      error: typeof result.warning === 'string' ? result.warning : '',
      errorParentId: typeof result.warning === 'string' ? parentId : null,
    })
  } catch (error) {
    update({ busy: false, dialog: null, error: error instanceof Error ? error.message : String(error), errorParentId: parentId })
  }
}

function ActionButton({ children, onClick, disabled, className = '' }) {
  return h('button', { type: 'button', className: `dsh-sc-action ${className}`, onClick, disabled }, children)
}

function PanelRightIcon() {
  return h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', 'aria-hidden': true },
    h('rect', { x: 1.5, y: 2, width: 13, height: 12, rx: 2.25, stroke: 'currentColor', strokeWidth: 1.4 }),
    h('path', { d: 'M10.25 2.25v11.5', stroke: 'currentColor', strokeWidth: 1.4 }),
  )
}

// Same message-plus glyph used by DSH's native New Session control.
function SideChatIcon() {
  return h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', 'aria-hidden': true },
    h('path', {
      d: 'M8.00003 .3237C3.76075.3237.32373 3.76072.32373 8c0 1.17603.265391 2.2922.73947 3.2901l.28971.6088 1.21759-.5784-.28971-.6088A6.285 6.285 0 0 1 1.67301 8c0-3.49454 2.83248-6.32702 6.32702-6.32702S14.3271 4.50546 14.3271 8s-2.8325 6.327-6.32707 6.327c-.7153 0-1.23926-.05-1.70382-.1783-.45764-.1263-.8918-.3378-1.41107-.6999-.75945-.5298-1.84736-.7172-2.74414-.151l-.02836.0193-.76378.5369.44773 1.334 1.06463-.7496c.32946-.2079.82203-.1842 1.25204.1155.61463.4287 1.18716.7185 1.82436.8945.63041.174 1.29014.2279 2.06241.2279 4.23927 0 7.67627-3.437 7.67627-7.6763S12.2393.3237 8.00003.3237Zm-.6797 4.50165v2.50001H4.82538v1.34928h2.49495v2.50006H8.6696V8.67464h2.5051V7.32536H8.6696V4.82535H7.32033Z',
      fill: 'currentColor',
    }),
  )
}

function CloseIcon() {
  return h('svg', { viewBox: '0 0 16 16', width: 16, height: 16, fill: 'none', 'aria-hidden': true },
    h('path', { d: 'M4 4l8 8M12 4l-8 8', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' }),
  )
}

function IconAction({ label, children, onClick, disabled }) {
  return h('button', {
    type: 'button',
    className: 'dsh-sc-action dsh-sc-icon-action',
    'aria-label': label,
    title: label,
    onClick,
    disabled,
  }, children)
}

function SelectionActions({ selection, onApply, onDismiss }) {
  const toolbarRef = React.useRef(null)
  const [position, setPosition] = React.useState({ left: 8, top: 8 })
  React.useLayoutEffect(() => {
    const toolbar = toolbarRef.current
    if (toolbar === null) return undefined
    const place = () => {
      const size = toolbar.getBoundingClientRect()
      const viewport = window.visualViewport
      const width = viewport?.width ?? window.innerWidth
      const height = viewport?.height ?? window.innerHeight
      const edge = 8
      const centered = selection.rect.left + selection.rect.width / 2 - size.width / 2
      const left = Math.min(Math.max(edge, centered), Math.max(edge, width - size.width - edge))
      const above = selection.rect.top - size.height - 8
      const below = selection.rect.bottom + 8
      const top = above >= edge
        ? above
        : Math.min(Math.max(edge, below), Math.max(edge, height - size.height - edge))
      setPosition({ left: Math.round(left), top: Math.round(top) })
    }
    place()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : undefined
    observer?.observe(toolbar)
    window.addEventListener('resize', place)
    window.visualViewport?.addEventListener('resize', place)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', place)
      window.visualViewport?.removeEventListener('resize', place)
    }
  }, [selection])
  React.useEffect(() => {
    const dismissOutside = event => {
      if (event.target instanceof Node && toolbarRef.current?.contains(event.target)) return
      onDismiss()
    }
    const dismissKey = event => { if (event.key === 'Escape') onDismiss() }
    document.addEventListener('mousedown', dismissOutside, true)
    document.addEventListener('keydown', dismissKey, true)
    return () => {
      document.removeEventListener('mousedown', dismissOutside, true)
      document.removeEventListener('keydown', dismissKey, true)
    }
  }, [onDismiss])
  return ReactDOM.createPortal(h('div', {
    ref: toolbarRef,
    className: 'dsh-sc-selection',
    role: 'toolbar',
    'aria-label': '选中文本操作',
    style: { left: `${position.left}px`, top: `${position.top}px` },
    onMouseDown: event => event.preventDefault(),
  },
  h(ActionButton, { onClick: onApply }, h(SideChatIcon), '引用到侧聊')), document.body)
}

function SideSelectionQuote({ selections, onRemove }) {
  const [expanded, setExpanded] = React.useState(false)
  const [hovered, setHovered] = React.useState(false)
  const quoteRef = React.useRef(null)
  const detailsRef = React.useRef(null)
  const leaveTimerRef = React.useRef(undefined)
  if (!Array.isArray(selections) || selections.length === 0) return null
  const visible = hovered || expanded
  const keepOpen = () => {
    if (leaveTimerRef.current !== undefined) clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = undefined
    setHovered(true)
  }
  const closeAfterGrace = () => {
    if (leaveTimerRef.current !== undefined) clearTimeout(leaveTimerRef.current)
    leaveTimerRef.current = setTimeout(() => {
      leaveTimerRef.current = undefined
      setHovered(false)
    }, 220)
  }
  const positionDetails = React.useCallback(() => {
    const quote = quoteRef.current
    const details = detailsRef.current
    if (quote === null || details === null) return
    const quoteRect = quote.getBoundingClientRect()
    const detailsRect = details.getBoundingClientRect()
    const viewport = window.visualViewport
    const width = viewport?.width ?? window.innerWidth
    const height = viewport?.height ?? window.innerHeight
    const margin = 16
    const left = Math.min(Math.max(quoteRect.left, margin), Math.max(margin, width - detailsRect.width - margin))
    const above = quoteRect.top - detailsRect.height - 8
    const below = quoteRect.bottom + 8
    const top = above >= margin ? above : Math.min(below, Math.max(margin, height - detailsRect.height - margin))
    details.style.left = `${Math.round(left)}px`
    details.style.top = `${Math.round(top)}px`
  }, [])
  React.useLayoutEffect(() => { if (visible) positionDetails() }, [visible, positionDetails])
  React.useEffect(() => {
    if (!visible) return undefined
    window.addEventListener('scroll', positionDetails, true)
    window.addEventListener('resize', positionDetails)
    window.visualViewport?.addEventListener('resize', positionDetails)
    return () => {
      window.removeEventListener('scroll', positionDetails, true)
      window.removeEventListener('resize', positionDetails)
      window.visualViewport?.removeEventListener('resize', positionDetails)
    }
  }, [visible, positionDetails])
  React.useEffect(() => {
    if (!expanded) return undefined
    const dismissOutside = event => {
      const target = event.target
      if (target instanceof Node && (quoteRef.current?.contains(target) || detailsRef.current?.contains(target))) return
      setHovered(false)
      setExpanded(false)
    }
    document.addEventListener('mousedown', dismissOutside, true)
    return () => document.removeEventListener('mousedown', dismissOutside, true)
  }, [expanded])
  React.useEffect(() => () => {
    if (leaveTimerRef.current !== undefined) clearTimeout(leaveTimerRef.current)
  }, [])
  const details = h('div', {
    ref: detailsRef,
    className: 'dsh-sc-quote-details',
    role: 'tooltip',
    'data-visible': visible ? '' : undefined,
    onMouseEnter: keepOpen,
    onMouseLeave: closeAfterGrace,
  }, ...selections.map((text, index) => h('div', { className: 'dsh-sc-quote-item', key: `${index}-${text}` },
    h('div', { className: 'dsh-sc-quote-details-header' },
      h('span', null, `${index + 1}. 所选文本：`),
      typeof onRemove === 'function' ? h('button', {
        type: 'button',
        className: 'dsh-sc-quote-item-remove',
        'aria-label': `移除第 ${index + 1} 条引用`,
        onClick: () => onRemove(index),
      }, '移除此条') : null,
    ),
    h('pre', { className: 'dsh-sc-quote-item' }, text),
  )))
  return h(React.Fragment, null,
    h('section', {
      ref: quoteRef,
      className: 'dsh-sc-quote',
      'aria-label': '已引用的主对话选文',
      'data-expanded': expanded ? '' : undefined,
      onMouseEnter: keepOpen,
      onMouseLeave: closeAfterGrace,
    },
    h('div', { className: 'dsh-sc-quote-chip' },
      h('button', {
        type: 'button',
        className: 'dsh-sc-quote-trigger',
        'aria-expanded': expanded,
        'aria-label': `${expanded ? '收起' : '展开'}主对话引用`,
        onClick: () => setExpanded(value => !value),
      },
      h('svg', { className: 'dsh-sc-quote-icon', viewBox: '0 0 24 24', 'aria-hidden': true },
        h('path', { d: 'M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z' }),
        h('path', { d: 'M8 8h8M8 12h5' }),
      ),
      h('strong', { className: 'dsh-sc-quote-chip-label' }, `${selections.length} 条引用`)),
      typeof onRemove === 'function' ? h('button', {
        type: 'button',
        className: 'dsh-sc-quote-remove',
        'aria-label': '移除全部引用',
        onClick: () => onRemove(),
      }, '×') : null,
    )),
    ReactDOM.createPortal(details, document.body),
  )
}

function SideSelectionDock({ session, input, inputActions }) {
  const state = useSideState()
  const owner = findSideOwner(state, session?.sessionId)
  const selections = Array.isArray(owner?.side.selections) ? owner.side.selections : []
  React.useEffect(() => {
    if (owner === undefined || selections.length === 0 || typeof inputActions?.setDraft !== 'function') return
    const migrationId = `${REFERENCE_MIGRATION_KEY}:${owner.side.sideId}`
    if (globalThis.localStorage?.getItem(migrationId) === 'done') return
    const draft = String(input?.draft ?? '')
    const legacyPlaceholder = draft.includes('@\u2063')
    const legacyProjection = draft.trim() !== '' && selections.includes(draft.trim())
    if (legacyPlaceholder || legacyProjection) inputActions.setDraft('')
    globalThis.localStorage?.setItem(migrationId, 'done')
  }, [owner?.side.sideId, input?.draftRev, selections.join('\u0000')])
  if (owner === undefined || owner.side.hidden === true || selections.length === 0) return null
  return h('div', {
    className: 'dsh-sc-selection-dock',
    'data-side-chat-selection-dock': '',
    'aria-label': '侧聊输入所引用的主对话内容',
  }, h(SideSelectionQuote, {
    selections,
    onRemove: index => {
      const remaining = Number.isInteger(index) ? selections.filter((_text, itemIndex) => itemIndex !== index) : []
      patchSide(owner.parentId, { selections: remaining })
      persistSelections(owner.side.sideId, remaining)
    },
  }))
}

function betterSidebarPanelOpen() {
  const host = document.querySelector('[data-dsh-better-sidebar]')
  if (host === null || document.body.hasAttribute('data-dsh-sidebar-collapsed')) return false
  if (host.querySelector('[class$="_panel"]') !== null) return true
  if (host.querySelector('[class$="_panelHidden"]') !== null) return false
  return true
}

function closeBetterSidebarPanel() {
  if (!betterSidebarPanelOpen()) return false
  const button = document.querySelector('[data-dsh-better-sidebar] [data-dsh-toggle-cluster] button:last-of-type')
  if (!(button instanceof HTMLButtonElement)) return false
  button.click()
  return true
}

function useBetterSidebarPanelOpen(active) {
  const [open, setOpen] = React.useState(() => active && betterSidebarPanelOpen())
  React.useEffect(() => {
    if (!active) {
      setOpen(false)
      return undefined
    }
    let frame = 0
    const refresh = () => {
      frame = 0
      setOpen(betterSidebarPanelOpen())
    }
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(refresh)
    }
    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'hidden', 'aria-hidden', 'data-dsh-sidebar-collapsed'],
    })
    refresh()
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [active])
  return open
}

function useBetterSidebarAutoHide(active, parentId) {
  React.useEffect(() => {
    if (!active) return undefined
    const button = document.querySelector('[data-dsh-better-sidebar] [data-dsh-toggle-cluster] button:last-of-type')
    if (!(button instanceof HTMLButtonElement)) return undefined
    const previousTitle = button.getAttribute('title')
    const hideSideChat = () => {
      if (!betterSidebarPanelOpen()) patchSide(parentId, { hidden: true })
    }
    button.setAttribute('data-side-chat-auto-hide', '')
    button.setAttribute('title', '打开 Sidebar 时自动收起侧聊')
    button.addEventListener('click', hideSideChat)
    return () => {
      button.removeEventListener('click', hideSideChat)
      button.removeAttribute('data-side-chat-auto-hide')
      if (previousTitle === null) button.removeAttribute('title')
      else button.setAttribute('title', previousTitle)
    }
  }, [active, parentId])
}

function useBetterSidebarToggleCluster() {
  const read = () => {
    const cluster = document.querySelector('[data-dsh-better-sidebar] [data-dsh-toggle-cluster]')
    if (!(cluster instanceof HTMLElement)) return null
    const rect = cluster.getBoundingClientRect()
    const style = getComputedStyle(cluster)
    if (rect.width === 0 || rect.height === 0 || style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return null
    const points = [...cluster.querySelectorAll('button')].map(button => {
      const buttonRect = button.getBoundingClientRect()
      return [buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2]
    })
    const visible = points.some(([x, y]) => {
      const hit = document.elementFromPoint(x, y)
      return hit instanceof Node && cluster.contains(hit)
    })
    return visible ? cluster : null
  }
  const [cluster, setCluster] = React.useState(read)
  React.useEffect(() => {
    const refresh = () => setCluster(current => {
      const next = read()
      return current === next ? current : next
    })
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('resize', refresh)
    globalThis.visualViewport?.addEventListener('resize', refresh)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', refresh)
      globalThis.visualViewport?.removeEventListener('resize', refresh)
    }
  }, [])
  return cluster
}

function useBetterSidebarHeaderReserve(entryRef, corner, columnSelector, sessionId) {
  React.useLayoutEffect(() => {
    const entry = entryRef.current
    const column = document.querySelector(columnSelector)
    const header = column?.querySelector('[data-phase] header')
    if (!(entry instanceof HTMLElement) || !(column instanceof HTMLElement) || !(header instanceof HTMLElement)) return undefined
    const property = '--dsh-sc-header-reserve'
    const previous = column.style.getPropertyValue(property)
    let frame = 0
    const refresh = () => {
      frame = 0
      column.style.setProperty(property, '100px')
      const renderedProbe = Number.parseFloat(getComputedStyle(header).paddingRight)
      const scale = Number.isFinite(renderedProbe) && renderedProbe > 0 ? renderedProbe / 100 : 1
      const headerRect = header.getBoundingClientRect()
      const entryRect = entry.getBoundingClientRect()
      const visualReserve = Math.max(0, headerRect.right - entryRect.left + 8)
      column.style.setProperty(property, `${visualReserve / scale}px`)
    }
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(refresh)
    }
    const observer = new ResizeObserver(schedule)
    observer.observe(header)
    observer.observe(corner)
    observer.observe(entry)
    window.addEventListener('resize', schedule)
    globalThis.visualViewport?.addEventListener('resize', schedule)
    refresh()
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', schedule)
      globalThis.visualViewport?.removeEventListener('resize', schedule)
      if (previous === '') column.style.removeProperty(property)
      else column.style.setProperty(property, previous)
    }
  }, [corner, columnSelector, sessionId])
}

function BetterSidebarCornerEntry({ corner, sessionId, children }) {
  const entryRef = React.useRef(null)
  useBetterSidebarHeaderReserve(entryRef, corner, '.dsh-sc-column-main', sessionId)
  return ReactDOM.createPortal(h('span', {
    ref: entryRef,
    className: 'dsh-sc-corner-entry',
    'data-side-chat-corner-entry': '',
  }, children), corner)
}

function HeaderAction({ sessionId }) {
  const state = useSideState()
  const corner = useBetterSidebarToggleCluster()
  if (!state.enabled) return null
  if (findSideOwner(state, sessionId) !== undefined) return null
  const side = state.sides.get(sessionId)
  let action
  if (side !== undefined) {
    if (usesBetterSidebar(state)) {
      action = h(IconAction, {
        label: '在 Better Sidebar 中打开侧聊',
        onClick: () => openBetterSidebarTab(sessionId),
      }, h(SideChatIcon))
    } else {
      if (!side.hidden) return null
      action = h(IconAction, { label: '显示侧聊', onClick: () => patchSide(sessionId, { hidden: false }) }, h(SideChatIcon))
    }
  } else {
    action = h(IconAction, {
      label: state.busy ? '正在开启侧聊' : '打开侧聊',
      disabled: state.busy,
      onClick: () => openSide(sessionId),
    }, h(SideChatIcon))
  }
  return corner === null
    ? action
    : h(BetterSidebarCornerEntry, { corner, sessionId }, action)
}

function Toggle({ checked, onChange, label }) {
  return h('label', { className: 'dsh-sc-switch', title: label },
    h('input', { type: 'checkbox', checked, onChange: event => onChange(event.target.checked), 'aria-label': label }),
    h('span', { 'aria-hidden': true }),
  )
}

function SettingsSection() {
  const state = useSideState()
  return h('div', { className: 'dsh-sc-settings' },
    h('div', { className: 'dsh-sc-settings-head' }, h('h2', null, '侧边聊天')),
    h('div', { className: 'dsh-sc-settings-row' },
      h('div', null, h('div', { className: 'dsh-sc-settings-title' }, '启用侧边聊天'), h('div', { className: 'dsh-sc-settings-desc' }, '关闭后隐藏侧聊入口和并排窗口。')),
      h(Toggle, { checked: state.enabled, label: '启用侧边聊天', onChange: enabled => updatePreferences({ enabled }) }),
    ),
    h('div', { className: 'dsh-sc-settings-row' },
      h('div', null,
        h('div', { className: 'dsh-sc-settings-title' }, '融入 Better Sidebar'),
        h('div', { className: 'dsh-sc-settings-desc' }, state.betterSidebarAvailable
          ? '开启后把侧聊作为 Better Sidebar 的原生右栏页面，同时保留 Side Chat 自己的快捷入口。'
          : '未检测到兼容的 Better Sidebar；独立侧聊入口保持可用。'),
      ),
      h(Toggle, {
        checked: state.integrateBetterSidebar && state.betterSidebarAvailable,
        label: '融入 Better Sidebar',
        onChange: integrateBetterSidebar => updatePreferences({ integrateBetterSidebar }),
      }),
    ),
    h('div', { className: 'dsh-sc-settings-row' },
      h('div', null, h('div', { className: 'dsh-sc-settings-title' }, '新侧聊模式'), h('div', { className: 'dsh-sc-settings-desc' }, '使用 DSH 原生 Agent 预设；已有侧聊保持原模式。')),
      h('select', { className: 'dsh-sc-settings-select', value: state.preset, onChange: event => updatePreferences({ preset: event.target.value }), 'aria-label': '新侧聊模式' },
        ...PRESET_OPTIONS.map(option => h('option', { key: option.id, value: option.id }, option.label)),
      ),
    ),
    h('div', { className: 'dsh-sc-settings-row' },
      h('div', null, h('div', { className: 'dsh-sc-settings-title' }, '关闭侧聊时'), h('div', { className: 'dsh-sc-settings-desc' }, '可每次询问，或直接沿用上次记住的保留/删除选择。')),
      h('select', { className: 'dsh-sc-settings-select', value: state.closeBehavior, onChange: event => updatePreferences({ closeBehavior: event.target.value }), 'aria-label': '关闭侧聊时' },
        ...CLOSE_BEHAVIOR_OPTIONS.map(option => h('option', { key: option.id, value: option.id }, option.label)),
      ),
    ),
  )
}

function SideUtilities({ sessionId }) {
  const state = useSideState()
  const owner = findSideOwner(state, sessionId)
  if (owner === undefined) return null
  return h('span', { className: 'dsh-sc-side-utilities', 'data-side-chat-utilities': '' },
    h(IconAction, { label: '隐藏侧聊', onClick: () => patchSide(owner.parentId, { hidden: true }) }, h(PanelRightIcon)),
    h(IconAction, {
      label: '关闭侧聊',
      disabled: state.busy,
      onClick: () => state.closeBehavior === 'ask'
        ? update({ dialog: { parentId: owner.parentId, sideId: sessionId } })
        : void finishClose(state.closeBehavior, owner.parentId, sessionId),
    }, h(CloseIcon)),
  )
}

function projectSideSession(value) {
  if (value?.composerPhase !== 'blank' || typeof value !== 'object') return value
  const cached = projectedSideSessions.get(value)
  if (cached !== undefined) return cached
  const projected = Object.freeze({ ...value, composerPhase: 'active' })
  projectedSideSessions.set(value, projected)
  return projected
}

function projectSideProvideInfo(providedInfo) {
  const cached = projectedSideProvideInfos.get(providedInfo)
  if (cached !== undefined) return cached
  const source = providedInfo.hooks.session
  const projected = Object.freeze({
    ...providedInfo,
    hooks: Object.freeze({
      ...providedInfo.hooks,
      session: Object.freeze({
        subscribe: listener => source.subscribe(listener),
        getSnapshot: () => projectSideSession(source.getSnapshot()),
      }),
    }),
  })
  projectedSideProvideInfos.set(providedInfo, projected)
  return projected
}

function SideNativeConversation({ kit, providedInfo }) {
  const useSession = selector => useObservable(
    providedInfo?.hooks?.session,
    selector,
    undefined,
  )
  const useInput = selector => useObservable(providedInfo?.hooks?.input, selector, undefined)
  const useComposerBlock = selector => useObservable(providedInfo?.hooks?.composerBlock, selector, undefined)
  return h(NativeConversationRoot, {
    ...kit,
    sessionId: providedInfo.sessionId,
    useSession,
    useInput,
    useComposerBlock,
  })
}

function FixedChatConversationView({ renderSlot }) {
  return h(React.Fragment, null, renderSlot('conversation.session', { view: 'chat' }))
}

function FactorySideConversation({ renderFactorySlot }) {
  return renderFactorySlot('conversation.content', {
    variant: 'embedded',
    phase: 'active',
    hero: false,
  }, { slots: { views: FixedChatConversationView } })
}

function FactorySidePane({ reference, renderFactorySlot, SessionProvider, sideId }) {
  return h('section', { className: 'dsh-sc-column dsh-sc-column-side', 'data-side-chat-side': '', 'data-side-chat-renderer': 'factory' },
    reference === undefined
      ? h('div', { className: 'dsh-sc-error' }, '正在连接原生侧聊会话…')
      : h(SessionProvider, { session: reference, key: sideId },
        h(FactorySideConversation, { renderFactorySlot }),
      ),
    h('div', { className: 'dsh-sc-factory-controls' }, h(SideUtilities, { sessionId: sideId })),
  )
}

function IntegratedSidebarConversation({ scope }) {
  const state = useSideState()
  const parentId = scope.sessionId
  const side = state.sides.get(parentId)
  const sideId = side?.sideId
  const kit = conversationKits.get(parentId)
  const [reference, setReference] = React.useState(undefined)

  React.useEffect(() => {
    if (!state.enabled || !usesBetterSidebar(state) || sideId === undefined) {
      setReference(undefined)
      return undefined
    }
    let retained
    try {
      retained = sessionsService?.retain?.(sideId, { source: 'sideChatBetterSidebar' })
        ?? sessionsService?.retainAgentScope?.(sideId)
      setReference(retained)
      void Promise.resolve(retained?.ready ?? retained?.binding?.session?.open?.()).catch(error => {
        update({ error: error instanceof Error ? error.message : String(error), errorParentId: parentId })
      })
    } catch (error) {
      update({ error: error instanceof Error ? error.message : String(error), errorParentId: parentId })
    }
    return () => retained?.release?.()
  }, [state.enabled, state.integrateBetterSidebar, state.betterSidebarAvailable, parentId, sideId])

  React.useEffect(() => {
    if (state.enabled && usesBetterSidebar(state) && side === undefined && !state.busy) void openSide(parentId)
  }, [state.enabled, state.integrateBetterSidebar, state.betterSidebarAvailable, state.busy, parentId, side])

  if (!state.enabled) return h('div', { className: 'dsh-sc-error' }, '侧边聊天已停用')
  if (!usesBetterSidebar(state)) return h('div', { className: 'dsh-sc-error' }, '请在侧边聊天设置中开启 Better Sidebar 融合')
  if (kit === undefined || sideId === undefined || reference === undefined) {
    return h('section', { className: 'dsh-sc-column dsh-sc-column-side', 'data-side-chat-renderer': 'better-sidebar' },
      h('div', { className: 'dsh-sc-error' }, state.errorParentId === parentId && state.error !== '' ? state.error : '正在连接原生侧聊会话…'),
    )
  }
  return h('section', {
    className: 'dsh-sc-column dsh-sc-column-side',
    'data-side-chat-renderer': 'better-sidebar',
  },
  h(kit.SessionProvider, { session: reference, key: sideId }, h(FactorySideConversation, { renderFactorySlot: kit.renderFactorySlot })))
}

function LegacySidePane({ providedInfo, kit, SessionProvider, sideId }) {
  const providerProbe = SessionProvider({ empty: () => null, children: () => null })
  const BindingProvider = providerProbe.type
  const projectedSideInfo = providedInfo === undefined ? undefined : projectSideProvideInfo(providedInfo)
  return h('section', { className: 'dsh-sc-column dsh-sc-column-side', 'data-side-chat-side': '', 'data-side-chat-renderer': 'legacy' },
    projectedSideInfo === undefined
      ? h('div', { className: 'dsh-sc-error' }, '正在连接原生侧聊会话…')
      : h(BindingProvider, { value: projectedSideInfo, key: sideId },
        h(SideNativeConversation, { kit, providedInfo: projectedSideInfo }),
      ),
  )
}

function CloseDialog({ parentId, sideId }) {
  const state = useSideState()
  const [remember, setRemember] = React.useState(false)
  React.useEffect(() => { setRemember(false) }, [state.dialog?.sideId])
  if (state.dialog?.parentId !== parentId || state.dialog.sideId !== sideId) return null
  const choose = mode => {
    if (remember) updatePreferences({ closeBehavior: mode })
    void finishClose(mode, parentId, sideId)
  }
  return ReactDOM.createPortal(h('div', { className: 'dsh-sc-modal-backdrop', role: 'presentation', onMouseDown: event => {
    if (event.target === event.currentTarget && !state.busy) update({ dialog: null })
  } },
  h('div', { className: 'dsh-sc-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dsh-sc-close-title' },
    h('h3', { id: 'dsh-sc-close-title' }, '关闭侧聊'),
    h('p', null, '默认会删除这段侧聊，且无法恢复。如果需要稍后继续，请选择“保留对话”。'),
    h('div', { className: 'dsh-sc-modal-actions' },
      h('label', { className: 'dsh-sc-remember-choice' },
        h('input', { type: 'checkbox', checked: remember, onChange: event => setRemember(event.target.checked) }),
        h('span', null, '记住此选择'),
      ),
      h(ActionButton, { disabled: state.busy, onClick: () => update({ dialog: null }) }, '取消'),
      h(ActionButton, { disabled: state.busy, onClick: () => choose('keep') }, '保留对话'),
      h(ActionButton, { disabled: state.busy, className: 'dsh-sc-danger', onClick: () => choose('delete') }, state.busy ? '正在删除…' : '删除并关闭'),
    ),
  )), document.body)
}

function ParallelConversation(props) {
  const state = useSideState()
  const sideState = state.sides.get(props.sessionId)
  const ownsSide = state.enabled && sideState !== undefined
  const integrated = usesBetterSidebar(state)
  const sideVisible = ownsSide && sideState.hidden !== true && !integrated
  const sideId = sideState?.sideId ?? null
  const splitRef = React.useRef(null)
  const mainRef = React.useRef(null)
  const [selection, setSelection] = React.useState(null)
  const [sideBinding, setSideBinding] = React.useState(undefined)
  const betterSidebarOpen = useBetterSidebarPanelOpen(sideVisible)
  useBetterSidebarAutoHide(sideVisible, props.sessionId)
  const SessionProvider = props.SessionProvider
  const factoryMode = typeof props.renderFactorySlot === 'function'
  if (factoryMode) conversationKits.set(props.sessionId, {
    renderFactorySlot: props.renderFactorySlot,
    SessionProvider: props.SessionProvider,
  })

  React.useEffect(() => () => { conversationKits.delete(props.sessionId) }, [props.sessionId])

  React.useEffect(() => {
    if (integrated && ownsSide) openBetterSidebarTab(props.sessionId)
  }, [integrated, ownsSide, props.sessionId])

  React.useEffect(() => {
    if (!state.enabled || !ownsSide) {
      setSideBinding(undefined)
      return undefined
    }
    let cancelled = false
    if (factoryMode) {
      let reference
      let ready
      try {
        reference = sessionsService?.retain?.(sideId, { source: 'sideChat' })
        ready = reference?.ready
      } catch (error) {
        try {
          reference = sessionsService?.retainAgentScope?.(sideId)
          ready = reference?.binding?.session?.open?.()
        } catch (fallbackError) {
          const failure = fallbackError ?? error
          update({ error: failure instanceof Error ? failure.message : String(failure), errorParentId: props.sessionId })
        }
      }
      if (reference === undefined) {
        update({ error: 'DSH 0.2 无法保留侧聊会话', errorParentId: props.sessionId })
        return undefined
      }
      setSideBinding({ kind: 'factory', sideId, reference })
      Promise.resolve(ready).catch(error => {
        if (!cancelled) update({ error: error instanceof Error ? error.message : String(error), errorParentId: props.sessionId })
      })
      return () => {
        cancelled = true
        reference.release?.()
      }
    }
    let attempts = 0
    const connect = () => {
      if (cancelled) return
      const info = sessionsService?.provideInfo?.(sideId)
      const session = sessionsService?.binding?.(sideId)?.session
      if (info !== undefined && typeof session?.open === 'function') {
        void session.open().then(() => {
          if (!cancelled) setSideBinding({ kind: 'legacy', sideId, providedInfo: info })
        }).catch(error => {
          if (!cancelled) update({ error: error instanceof Error ? error.message : String(error), errorParentId: props.sessionId })
        })
        return
      }
      attempts += 1
      if (attempts < 40) setTimeout(connect, 100)
      else update({ error: '无法打开侧聊的原生会话窗口', errorParentId: props.sessionId })
    }
    connect()
    return () => { cancelled = true }
  }, [state.enabled, ownsSide, sideId, props.sessionId, factoryMode])

  React.useEffect(() => {
    setSelection(null)
    if (state.dialog !== null && state.dialog.parentId !== props.sessionId) update({ dialog: null })
  }, [props.sessionId, state.dialog?.parentId])

  React.useLayoutEffect(() => {
    if (sideVisible && betterSidebarOpen) closeBetterSidebarPanel()
  }, [sideVisible, betterSidebarOpen])

  React.useEffect(() => {
    if (!state.enabled) {
      setSelection(null)
      return undefined
    }
    const root = mainRef.current
    if (root === null) return undefined
    const onMouseUp = event => {
      const target = event.target
      if (!(target instanceof Node) || !root.contains(target)) return
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target.closest?.('[contenteditable="true"]')) return
      const selected = window.getSelection()
      const text = selected?.toString().trim() ?? ''
      if (text.length < 2 || selected.rangeCount === 0) {
        setSelection(null)
        return
      }
      const range = selected.getRangeAt(0)
      if (!root.contains(range.commonAncestorContainer)) return
      const rect = range.getBoundingClientRect()
      setSelection({
        text: text.slice(0, 8000),
        rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
      })
    }
    root.addEventListener('mouseup', onMouseUp)
    return () => root.removeEventListener('mouseup', onMouseUp)
  }, [state.enabled, props.sessionId])

  const dismissSelection = React.useCallback(() => setSelection(null), [])
  const selectionButton = selection === null ? null : h(SelectionActions, {
    selection,
    onDismiss: dismissSelection,
    onApply: () => {
      const text = selection.text
      setSelection(null)
      window.getSelection()?.removeAllRanges()
      void openSide(props.sessionId, text)
    },
  })

  const main = h('section', { ref: mainRef, className: 'dsh-sc-column dsh-sc-column-main', 'data-side-chat-main': '' },
    h(NativeConversationRoot, props),
  )
  const resize = event => {
    const root = splitRef.current
    if (root === null) return
    event.preventDefault()
    const rect = root.getBoundingClientRect()
    const move = moveEvent => {
      const ratio = Math.min(70, Math.max(25, ((rect.right - moveEvent.clientX) / rect.width) * 100))
      update({ sideRatio: Math.round(ratio * 10) / 10 })
    }
    const stop = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }
  const resizeKey = event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const delta = event.shiftKey ? 5 : 2
    update({ sideRatio: Math.min(70, Math.max(25, state.sideRatio + (event.key === 'ArrowLeft' ? delta : -delta))) })
  }
  const divider = sideVisible
    ? h('div', {
      className: 'dsh-sc-resizer',
      role: 'separator',
      tabIndex: 0,
      'aria-label': '调整主对话与侧聊宽度',
      'aria-orientation': 'vertical',
      'aria-valuemin': 25,
      'aria-valuemax': 70,
      'aria-valuenow': Math.round(state.sideRatio),
      onPointerDown: resize,
      onKeyDown: resizeKey,
    })
    : null
  let side = null
  if (sideVisible) {
    const current = sideBinding?.sideId === sideId ? sideBinding : undefined
    side = factoryMode
      ? h(FactorySidePane, {
        reference: current?.kind === 'factory' ? current.reference : undefined,
        renderFactorySlot: props.renderFactorySlot,
        SessionProvider,
        sideId,
      })
      : h(LegacySidePane, {
        providedInfo: current?.kind === 'legacy' ? current.providedInfo : undefined,
        kit: props,
        SessionProvider,
        sideId,
      })
  }
  if (!state.enabled) return h(NativeConversationRoot, props)
  return h(React.Fragment, null,
    h('div', {
      ref: splitRef,
      className: `dsh-sc-root ${sideVisible ? 'dsh-sc-root-split' : 'dsh-sc-root-single'}`,
      'data-side-chat-layout': sideVisible ? 'split' : 'single',
      style: { '--dsh-sc-side-width': `${state.sideRatio}%` },
    }, main, divider, side),
    selectionButton,
    state.error === '' || state.errorParentId !== props.sessionId ? null : h('div', { className: 'dsh-sc-error' }, state.error),
    ownsSide ? h(CloseDialog, { parentId: props.sessionId, sideId }) : null,
  )
}

function adoptNativeConversation(slots, timer, {
  timeoutMs = 15_000,
  onUnavailable = error => console.error(error),
} = {}) {
  // ui-slots intentionally exposes child rendering only to the entry that owns
  // the declarations. Preserve that exact native entry and change only its face.
  // `_core` is the current DSH runtime adapter seam; fail loud only when the seam
  // itself moved. A missing entry is a normal parallel-loader state and is watched.
  const core = slots?._core
  if (typeof core?.entries !== 'function'
    || typeof core?.subscribe !== 'function'
    || typeof core?.register !== 'function'
    || typeof timer?.setTimeout !== 'function') {
    throw new Error('dsh-side-chat: native conversation lifecycle API is unavailable')
  }

  let disposed = false
  let watching = true
  let adoptedEntry
  let previousComponent
  let cancelDeadline

  const pulse = (key) => {
    if (key === undefined) return
    // During layout/HMR teardown the declaration may already have collapsed.
    if (typeof core.specDynamic === 'function' && core.specDynamic(key) === undefined) return
    const release = core.register({ name: key, priority: -100 }, () => null)
    release()
  }
  const clearDeadline = () => {
    const cancel = cancelDeadline
    cancelDeadline = undefined
    cancel?.()
  }
  let unsubscribe = () => {}
  const stopWatching = () => {
    if (!watching) return
    watching = false
    unsubscribe()
    clearDeadline()
  }
  const armDeadline = () => {
    if (cancelDeadline !== undefined || disposed || !watching) return
    let active = true
    const cancel = timer.setTimeout(() => {
      if (!active || disposed || adoptedEntry !== undefined) return
      active = false
      cancelDeadline = undefined
      stopWatching()
      onUnavailable(new Error(`dsh-side-chat: native conversation entry was unavailable after ${timeoutMs}ms`))
    }, timeoutMs)
    cancelDeadline = () => {
      if (!active) return
      active = false
      cancel()
    }
  }
  let adoptedKey
  const releaseAdoption = () => {
    if (adoptedEntry === undefined) return
    const entry = adoptedEntry
    const key = adoptedKey
    const previous = previousComponent
    adoptedEntry = undefined
    adoptedKey = undefined
    previousComponent = undefined
    if (entry.component === ParallelConversation) {
      entry.component = previous
      pulse(key)
    }
    if (NativeConversationRoot === previous) NativeConversationRoot = null
  }
  const findNativeEntry = () => {
    const factory = typeof core.factory === 'function' ? core.factory('conversation.content') : undefined
    const modernEntries = factory === undefined ? [] : core.entries('main.conversation')
    const modern = Array.isArray(modernEntries)
      ? modernEntries.find(entry => entry?.children?.['conversation.header'] !== undefined)
      : undefined
    if (modern !== undefined) return { entry: modern, key: 'main.conversation' }
    const legacyEntries = core.entries('conversation')
    const legacy = Array.isArray(legacyEntries)
      ? legacyEntries.find(entry => entry?.children?.['conversation.session'] !== undefined
        && entry?.children?.['conversation.composer.bar'] !== undefined)
      : undefined
    return legacy === undefined ? undefined : { entry: legacy, key: 'conversation' }
  }
  const reconcile = () => {
    if (disposed || !watching) return
    const target = findNativeEntry()
    if (adoptedEntry !== undefined) {
      if (target?.entry === adoptedEntry && target.key === adoptedKey && adoptedEntry.component === ParallelConversation) return
      releaseAdoption()
    }
    if (target === undefined || target.entry.component === ParallelConversation) {
      armDeadline()
      return
    }
    previousComponent = target.entry.component
    adoptedEntry = target.entry
    adoptedKey = target.key
    NativeConversationRoot = previousComponent
    target.entry.component = ParallelConversation
    clearDeadline()
    // A transient lower-priority occupant changes the conversation version once,
    // so an already-mounted page adopts the new face without owning child slots.
    pulse(target.key)
  }

  const releases = [core.subscribe('conversation', reconcile)]
  if (typeof core.factory === 'function' && typeof core.subscribeFactory === 'function') {
    releases.push(core.subscribe('main.conversation', reconcile))
    releases.push(core.subscribeFactory('conversation.content', reconcile))
  }
  unsubscribe = () => {
    for (const release of releases.splice(0)) release()
  }
  reconcile()
  return () => {
    if (disposed) return
    disposed = true
    stopWatching()
    releaseAdoption()
  }
}

return {
  inject: ['slots', 'timer', 'sessions', 'conversation'],
  apply(ctx) {
    const slots = ctx.get('slots')
    const timer = ctx.get('timer')
    sessionsService = ctx.get('sessions')
    const releasePromptProjection = installSidePromptProjection(ctx.get('conversation'))
    styles.insert(CSS)

    const releaseConversation = adoptNativeConversation(slots, timer)
    ctx.inject(['betterSidebar'], injected => {
      const service = injected.get('betterSidebar')
      if (service === undefined || typeof service.registerTab !== 'function') return
      betterSidebarService = service
      update({ betterSidebarAvailable: true })
      injected.effect(() => {
        const releaseTab = service.registerTab({
          id: 'dsh-side-chat:conversation',
          title: '侧边聊天',
          description: '使用独立 DSH Session 的原生侧聊',
          icon: SideChatIcon,
          order: 36,
          single: true,
          available: () => uiState.integrateBetterSidebar === true,
          component: IntegratedSidebarConversation,
        })
        return () => {
          releaseTab()
          if (betterSidebarService === service) {
            betterSidebarService = null
            update({ betterSidebarAvailable: false })
          }
        }
      }, 'dsh-side-chat: better-sidebar tab')
    })

    slots.inject('conversation.session.header.actions', () => slots.register({
      name: 'conversation.session.header.actions',
      id: 'side-chat',
      order: 90,
    }, HeaderAction))

    slots.inject('conversation.session.header.utilities', () => slots.register({
      name: 'conversation.session.header.utilities',
      id: 'side-chat-controls',
      order: 1000,
    }, SideUtilities))

    slots.inject('conversation.input.dock', () => slots.register({
      name: 'conversation.input.dock',
      id: 'side-chat-selection-context',
      order: -20,
    }, SideSelectionDock))

    slots.inject('settings.section', () => slots.register({
      name: 'settings.section',
      id: 'side-chat',
      order: 60,
      label: () => '侧边聊天',
    }, SettingsSection))

    ctx.effect(() => () => {
      releaseConversation()
      releasePromptProjection()
      subscribers.clear()
      sessionsService = null
      betterSidebarService = null
      conversationKits.clear()
      projectedSideSessions = new WeakMap()
      projectedSideProvideInfos = new WeakMap()
      uiState = initialState
    }, 'dsh-side-chat: client state')
  },
}
