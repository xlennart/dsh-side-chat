// dsh-side-chat host: an archived root Session plus a scoped parent-context tool.
// Core helpers are inlined at build time because the dynamic Cordis host cannot import.

import { lstat, rmdir, unlink } from 'node:fs/promises'
import { basename, dirname, isAbsolute, resolve } from 'node:path'

export const name = 'dsh-side-chat'
export const inject = ['sessionQuery', 'sessionPersistence', 'sessions', 'agents', 'agentPresets', 'workspaceRegistry', 'connection']

const sideChatHandlers = new Map()
const harness = {
  handle(method, handler) {
    sideChatHandlers.set(method, handler)
    return () => sideChatHandlers.delete(method)
  },
  async deleteSessionArtifact(location, sessionId) {
    if (location?.kind !== 'jsonl' || typeof location.path !== 'string' || !isAbsolute(location.path)) {
      throw new Error('拒绝删除无效的会话存储位置')
    }
    if (typeof sessionId !== 'string' || !sessionId.startsWith('sidechat-')) {
      throw new Error('拒绝删除非侧聊会话')
    }
    const target = resolve(location.path)
    const filename = basename(target)
    const supportedNames = new Set([
      'session.jsonl',
      'session.jsonl.zstd',
      'session.v4.jsonl',
      'session.v4.jsonl.zstd',
    ])
    if (!supportedNames.has(filename)) {
      throw new Error('拒绝删除非 JSONL 会话文件')
    }
    const info = await lstat(target)
    if (!info.isFile()) throw new Error('侧聊存储位置不是普通文件')
    await unlink(target)
    try {
      await rmdir(dirname(target))
    } catch (error) {
      if (error?.code !== 'ENOTEMPTY' && error?.code !== 'ENOENT') throw error
    }
  },
}

export function apply(ctx) {
    const SIDE_ID_PREFIX = 'sidechat-'
const SIDE_CHAT_PRESET = 'standard'
const SIDE_CHAT_PRESETS = Object.freeze(['standard', 'code', 'minimal', 'cordis'])
const MAX_QUERY_LENGTH = 400
const DEFAULT_LIMIT = 24
const MAX_LIMIT = 60

class SideChatError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'SideChatError'
    this.code = code
  }
}

function requireSessionId(value, field = 'sessionId') {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new SideChatError('invalid-request', `${field} 必须是非空字符串`)
  }
  return value.trim()
}

function makeSideSessionId(now = Date.now(), random = Math.random()) {
  const entropy = Math.floor(random * 0x100000000).toString(36).padStart(6, '0')
  return `${SIDE_ID_PREFIX}${now.toString(36)}-${entropy}`
}

function isSideSession(header, parentSessionId, preset) {
  return header !== null
    && typeof header === 'object'
    && typeof header.id === 'string'
    && header.id.startsWith(SIDE_ID_PREFIX)
    && header.origin !== 'subagent'
    && SIDE_CHAT_PRESETS.includes(header.agentPreset)
    && (preset === undefined || header.agentPreset === preset)
    && header.parentSession === parentSessionId
}

function latestRetainedSession(headers, parentSessionId, preset = SIDE_CHAT_PRESET) {
  return [...headers]
    .filter(header => isSideSession(header, parentSessionId, preset))
    .sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))[0]
}

function flattenText(value, depth = 0) {
  if (depth > 5 || value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(item => flattenText(item, depth + 1)).filter(Boolean).join('\n')
  if (typeof value !== 'object') return ''
  const preferred = ['role', 'name', 'text', 'content', 'message', 'path', 'command', 'query', 'title', 'result']
  const parts = []
  for (const key of preferred) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      const text = flattenText(value[key], depth + 1)
      if (text) parts.push(`${key}: ${text}`)
    }
  }
  if (parts.length > 0) return parts.join('\n')
  return Object.values(value).map(item => flattenText(item, depth + 1)).filter(Boolean).join('\n')
}

function eventText(event) {
  const body = flattenText(event?.data)
  return body === '' ? String(event?.type ?? '') : `${String(event?.type ?? 'event')}\n${body}`
}

function queryTerms(query) {
  return [...new Set(String(query ?? '')
    .toLocaleLowerCase()
    .match(/[\p{L}\p{N}_./\\:-]{2,}/gu) ?? [])]
    .slice(0, 24)
}

function relevance(text, terms) {
  if (terms.length === 0) return 0
  const haystack = text.toLocaleLowerCase()
  let score = 0
  for (const term of terms) {
    let from = 0
    while (true) {
      const at = haystack.indexOf(term, from)
      if (at < 0) break
      score += 1
      from = at + term.length
    }
  }
  return score
}

function selectContextEvents(events, query, requestedLimit = DEFAULT_LIMIT) {
  const limit = Math.max(1, Math.min(MAX_LIMIT, Number(requestedLimit) || DEFAULT_LIMIT))
  const normalized = [...events].map((event, index) => ({
    event,
    index,
    text: eventText(event),
  }))
  if (normalized.length <= limit) return normalized.map(item => item.event)

  const terms = queryTerms(String(query ?? '').slice(0, MAX_QUERY_LENGTH))
  const headCount = Math.min(4, Math.ceil(limit * 0.15))
  const tailCount = Math.min(10, Math.ceil(limit * 0.35))
  const chosen = new Set()
  for (let i = 0; i < headCount; i += 1) chosen.add(i)
  for (let i = Math.max(0, normalized.length - tailCount); i < normalized.length; i += 1) chosen.add(i)

  normalized
    .filter(item => !chosen.has(item.index))
    .map(item => ({ ...item, score: relevance(item.text, terms) }))
    .sort((a, b) => b.score - a.score || b.index - a.index)
    .slice(0, Math.max(0, limit - chosen.size))
    .forEach(item => chosen.add(item.index))

  return [...chosen].sort((a, b) => a - b).map(index => normalized[index].event)
}

function formatContextSnapshot(parentSessionId, events, query) {
  const selected = selectContextEvents(events, query)
  const blocks = selected.map((event, index) => {
    const seq = Number.isFinite(event?.seq) ? event.seq : index
    const text = eventText(event).slice(0, 5000)
    return `[${seq}] ${text}`
  })
  return [
    `主会话 ${parentSessionId} 的按需上下文（只读摘录，不是复制到侧聊的消息）：`,
    `检索问题：${String(query ?? '').slice(0, MAX_QUERY_LENGTH) || '最近上下文'}`,
    ...blocks,
  ].join('\n\n')
}

function normalizeOpenRequest(input) {
  const source = input !== null && typeof input === 'object' ? input : {}
  const preset = SIDE_CHAT_PRESETS.includes(source.preset) ? source.preset : SIDE_CHAT_PRESET
  return {
    parentSessionId: requireSessionId(source.parentSessionId, 'parentSessionId'),
    anchorText: typeof source.anchorText === 'string' ? source.anchorText.trim().slice(0, 8000) : '',
    preset,
  }
}

function normalizeContextRequest(input) {
  const source = input !== null && typeof input === 'object' ? input : {}
  return {
    query: typeof source.query === 'string' ? source.query.slice(0, MAX_QUERY_LENGTH) : '',
    limit: Math.max(1, Math.min(MAX_LIMIT, Number(source.limit) || DEFAULT_LIMIT)),
  }
}



    const sessionQuery = ctx.get('sessionQuery')
    const persistence = ctx.get('sessionPersistence')
    const sessions = ctx.get('sessions')
    const agents = ctx.get('agents')
    const agentPresets = ctx.get('agentPresets')
    const workspaceRegistry = ctx.get('workspaceRegistry')
    const handles = new Map()
    const byParent = new Map()

    function requireService(value, name) {
      if (value === undefined || value === null) {
        throw new SideChatError('capability-unavailable', `DSH 服务 ${name} 不可用`)
      }
      return value
    }

    async function parentAgent(parentSessionId) {
      const live = requireService(agents, 'agents').get(parentSessionId)
      if (live !== undefined) return live
      if (persistence !== undefined && typeof persistence.list === 'function') {
        const header = (await persistence.list()).find(item => item.id === parentSessionId)
        if (header !== undefined) {
          // A historical main conversation does not need to be resumed just to
          // establish a side Session. Its durable header carries the cwd,
          // preset and ancestry needed by the child composition.
          return { id: parentSessionId, session: { header }, options: {} }
        }
      }
      throw new SideChatError('parent-unavailable', '找不到主会话，无法开启侧聊')
    }

    function safeAgentOptions(parent) {
      const options = parent.options ?? {}
      const next = {}
      for (const key of ['provider', 'model', 'maxTokens', 'temperature', 'reasoningEffort']) {
        if (options[key] !== undefined) next[key] = options[key]
      }
      return next
    }

    function sidePrompt(parentSessionId, preset) {
      return [
        'You are running in a side conversation beside a main DeepSeek Harness conversation.',
        'This is a real independent Session. Never claim that the main transcript was copied into this Session.',
        `The read-only main Session is ${parentSessionId}.`,
        'When the user refers to the main conversation, selected text, earlier decisions, files, tool results, or unresolved work, call side_chat_context with a focused query before answering.',
        'Use the returned excerpts as runtime context only. Do not repeat them unless the answer requires it.',
        `Use the DSH ${preset} agent preset while keeping its native tools, skills, approval rules, and composer behavior unchanged.`,
      ].join('\n')
    }

    async function readParentContext(parentSessionId, request) {
      const normalized = normalizeContextRequest(request)
      const snapshot = await requireService(sessionQuery, 'sessionQuery').readSession(parentSessionId)
      const events = Array.isArray(snapshot?.events) ? snapshot.events : []
      const selected = selectContextEvents(events, normalized.query, normalized.limit)
      return {
        parentSessionId,
        query: normalized.query,
        eventCount: events.length,
        selectedCount: selected.length,
        context: formatContextSnapshot(parentSessionId, selected, normalized.query),
      }
    }

    async function composeChild(childCtx, parent, preset) {
      if (agentPresets !== undefined && typeof agentPresets.mount === 'function') {
        await agentPresets.mount(childCtx, preset)
      }
      childCtx.systemPrompt.section({
        name: 'dsh-side-chat:relationship',
        order: 85,
        text: sidePrompt(parent.id, preset),
      })
      childCtx.tools.register({
        name: 'side_chat_context',
        description: 'Read a focused, bounded excerpt from the main conversation. Use this whenever the side-chat request depends on the main conversation, its files, tool results, decisions, or selected text.',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'A focused retrieval question, keyword, file name, decision, or topic.' },
            limit: { type: 'integer', minimum: 1, maximum: 60, description: 'Maximum excerpts to return. Default 24.' },
          },
          required: ['query'],
          additionalProperties: false,
        },
        output: {
          schema: {
            type: 'object',
            properties: {
              parentSessionId: { type: 'string' },
              query: { type: 'string' },
              eventCount: { type: 'integer' },
              selectedCount: { type: 'integer' },
              context: { type: 'string' },
            },
            required: ['parentSessionId', 'query', 'eventCount', 'selectedCount', 'context'],
            additionalProperties: false,
          },
          render: (_args, value) => [{ type: 'text', text: value.context }],
        },
        execute: args => readParentContext(parent.id, args),
      })
    }

    async function retainedHeader(parentSessionId, preset) {
      if (persistence === undefined || typeof persistence.list !== 'function') return undefined
      const headers = await persistence.list()
      return latestRetainedSession(headers, parentSessionId, preset)
    }

    function remember(parentSessionId, handle) {
      handles.set(handle.agent.id, handle)
      byParent.set(parentSessionId, handle.agent.id)
      return handle
    }

    async function createOrResume(parentSessionId, preset) {
      const knownId = byParent.get(parentSessionId)
      if (knownId !== undefined) {
        const known = handles.get(knownId)
        if (known?.agent?.session?.header?.agentPreset === preset) return { handle: known, resumed: true }
      }

      const parent = await parentAgent(parentSessionId)
      const retained = await retainedHeader(parentSessionId, preset)
      if (retained !== undefined) {
        const live = agents.get(retained.id)
        if (live !== undefined) {
          return { handle: { agent: live, dispose: async () => {} }, resumed: true, borrowed: true }
        }
        const handle = await agents.resume({
          resumeSessionId: retained.id,
          setup: childCtx => composeChild(childCtx, parent, preset),
        })
        return { handle: remember(parentSessionId, handle), resumed: true }
      }

      const sessionId = makeSideSessionId()
      const handle = await agents.create({
        sessionId,
        meta: {
          ...(parent.session?.header?.cwd === undefined ? {} : { cwd: parent.session.header.cwd }),
          parentSession: parentSessionId,
          agentPreset: preset,
        },
        agentOptions: safeAgentOptions(parent),
        setup: childCtx => composeChild(childCtx, parent, preset),
      })
      return { handle: remember(parentSessionId, handle), resumed: false }
    }

    async function open(input) {
      const request = normalizeOpenRequest(input)
      const result = await createOrResume(request.parentSessionId, request.preset)
      const child = result.handle.agent
      await requireService(workspaceRegistry, 'workspaceRegistry').archiveSession(child.id)
      return {
        sessionId: child.id,
        parentSessionId: request.parentSessionId,
        resumed: result.resumed,
        anchorText: request.anchorText,
      }
    }

    async function release(sessionId) {
      const handle = handles.get(sessionId)
      if (handle === undefined) return
      if (sessions !== undefined && typeof sessions.flush === 'function') {
        await sessions.flush(handle.agent.session)
      }
      await handle.dispose()
      handles.delete(sessionId)
      for (const [parent, child] of byParent) {
        if (child === sessionId) byParent.delete(parent)
      }
    }

    async function close(input) {
      const source = input !== null && typeof input === 'object' ? input : {}
      const sessionId = requireSessionId(source.sessionId)
      const mode = source.mode === 'keep' ? 'keep' : source.mode === 'delete' ? 'delete' : undefined
      if (mode === undefined) throw new SideChatError('invalid-request', 'mode 必须是 keep 或 delete')

      if (mode === 'keep') {
        await release(sessionId)
        return { sessionId, mode, deleted: false }
      }

      const handle = handles.get(sessionId)
      const live = handle?.agent ?? agents.get(sessionId)
      const header = live?.session?.header
        ?? (persistence === undefined ? undefined : (await persistence.list()).find(item => item.id === sessionId))
      if (header === undefined || !String(header.id).startsWith(SIDE_ID_PREFIX)) {
        throw new SideChatError('not-side-chat', '拒绝删除非侧聊会话')
      }
      const location = persistence?.locate?.(header)
      if (location === undefined || location.kind !== 'jsonl') {
        await release(sessionId)
        return {
          sessionId,
          mode,
          deleted: false,
          warning: '当前会话存储后端不支持逐会话彻底删除；已关闭并保留该侧聊',
        }
      }
      if (typeof harness.deleteSessionArtifact !== 'function') {
        await release(sessionId)
        return {
          sessionId,
          mode,
          deleted: false,
          warning: '当前插件载入方式不提供安全文件删除能力；已关闭并保留该侧聊',
        }
      }
      await release(sessionId)
      try {
        await harness.deleteSessionArtifact(location, sessionId)
      } catch (error) {
        return {
          sessionId,
          mode,
          deleted: false,
          warning: `未能彻底删除侧聊，已关闭并保留数据：${error instanceof Error ? error.message : String(error)}`,
        }
      }
      return { sessionId, mode, deleted: true }
    }

    harness.handle('sideChat.open', open)
    harness.handle('sideChat.close', close)
    harness.handle('sideChat.context', async input => {
      const source = input !== null && typeof input === 'object' ? input : {}
      return readParentContext(requireSessionId(source.parentSessionId, 'parentSessionId'), source)
    })
    harness.handle('sideChat.ping', async () => ({ pong: Date.now() }))

    ctx.effect(() => async () => {
      const active = [...handles.values()]
      handles.clear()
      byParent.clear()
      await Promise.allSettled(active.map(handle => handle.dispose()))
    }, 'dsh-side-chat: dispose children')
  // Use Cordis' contextual service accessor so registrations are owned by
  // this plugin fiber (ctx.get() would expose the provider's own context).
  const connection = ctx.connection
  if (connection?.fetch?.register === undefined && connection?.rpc?.handle === undefined) {
    throw new Error('dsh-side-chat-dev: public connection.rpc is unavailable')
  }
  const invokeSideChat = async (endpoint, payload, signal) => {
    const handler = sideChatHandlers.get(endpoint)
    if (handler === undefined) {
      return { ok: false, error: { code: 'internal', message: `未知侧聊方法: ${endpoint}`, details: {} } }
    }
    try {
      return { ok: true, value: await handler(payload, signal) }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { ok: false, error: { code: 'internal', message, details: {} } }
    }
  }
  // DSH 0.2 exposes one shared /api interceptor, already owned by Remote.
  // Exact Fetch routes compose with it and keep Connection's auth/trust fence.
  // DSH 0.1 falls back to its dedicated logical channel.
  const rpcMethods = [...sideChatHandlers.keys()]
  const disposeRpc = connection.fetch?.register === undefined
    ? connection.rpc.handle('/side-chat', invokeSideChat)
    : (() => {
      const disposers = rpcMethods.map(method => connection.fetch.register({
        path: `/api/${method}`,
        methods: ['POST'],
        requestBody: 'buffered',
        async fetch(request) {
          let envelope
          try {
            envelope = await request.json()
          } catch {
            return new Response('body is not JSON', { status: 400 })
          }
          if (envelope?.type !== 'client-request' || typeof envelope.rpcId !== 'string' || envelope.method !== method) {
            return new Response('invalid client-request', { status: 400 })
          }
          const result = await invokeSideChat(method, envelope.payload, request.signal)
          return Response.json({ type: 'server-response', rpcId: envelope.rpcId, result })
        },
      }))
      return async () => { await Promise.all(disposers.map(dispose => dispose())) }
    })()
  ctx.effect(() => async () => {
    await disposeRpc()
    sideChatHandlers.clear()
  }, 'dsh-side-chat-dev: connection rpc')
}
