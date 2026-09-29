// dsh-side-chat host: an archived root Session plus a scoped parent-context tool.
// Core helpers are inlined at build time because the dynamic Cordis host cannot import.

return {
  inject: ['sessionQuery', 'sessionPersistence', 'sessions', 'agents', 'agentPresets', 'workspaceRegistry'],
  apply(ctx) {
    /*__CORE_SOURCE__*/

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
  },
}
