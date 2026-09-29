import assert from 'node:assert/strict'
import test from 'node:test'
import { apply } from '../dist/formal-host.mjs'

function fixture({ coldParent = false } = {}) {
  const handlers = new Map()
  const registrations = { sections: [], tools: [] }
  const archivedSessionIds = []
  const disposers = []
  const parent = {
    id: 'main-session',
    options: { provider: 'mock', model: 'native-model', temperature: 0.2 },
    session: { header: { id: 'main-session', cwd: 'E:\\work', agentPreset: 'cordis' } },
  }
  let childHandle
  const services = {
    sessionQuery: { readSession: async () => ({ events: [{ type: 'message', seq: 0, data: { text: 'main fact' } }] }) },
    sessionPersistence: {
      list: async () => coldParent ? [parent.session.header] : [],
      locate: header => ({ kind: 'jsonl', path: `E:\\sessions\\${header.id}\\session.jsonl` }),
    },
    sessions: { flush: async () => {} },
    agentPresets: { mount: async (_ctx, preset) => assert.equal(preset, 'standard') },
    workspaceRegistry: { archiveSession: async sessionId => archivedSessionIds.push(sessionId) },
    agents: {
      get: id => !coldParent && id === parent.id ? parent : childHandle?.agent.id === id ? childHandle.agent : undefined,
      create: async options => {
        const childCtx = {
          systemPrompt: { section: section => registrations.sections.push(section) },
          tools: { register: tool => registrations.tools.push(tool) },
        }
        await options.setup(childCtx)
        childHandle = {
          agent: { id: options.sessionId, session: { header: { id: options.sessionId, ...options.meta } } },
          disposed: false,
          async dispose() { this.disposed = true },
        }
        childHandle.options = options
        return childHandle
      },
      resume: async () => { throw new Error('unexpected resume') },
    },
  }
  const ctx = {
    get: name => services[name],
    effect: setup => {
      const disposer = setup()
      disposers.push(disposer)
      return disposer
    },
  }
  const connection = {
    rpc: {
      handle(_path, callback) {
        handlers.set('rpc', callback)
        return async () => handlers.delete('rpc')
      },
    },
  }
  services.connection = connection
  ctx.connection = connection
  apply(ctx)
  const call = async (method, input) => {
    const result = await handlers.get('rpc')(method, input)
    if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code })
    return result.value
  }
  return { call, child: () => childHandle, registrations, archivedSessionIds, disposers }
}

test('host creates an archived root session without copying the parent transcript', async () => {
  const run = fixture()
  const opened = await run.call('sideChat.open', { parentSessionId: 'main-session', anchorText: 'selected' })
  const child = run.child()
  assert.equal(opened.sessionId, child.agent.id)
  assert.equal(child.options.meta.origin, undefined)
  assert.equal(child.options.meta.delegationDepth, undefined)
  assert.equal(child.options.meta.parentSession, 'main-session')
  assert.equal(child.options.meta.agentPreset, 'standard')
  assert.equal(child.options.seed, undefined)
  assert.deepEqual(run.archivedSessionIds, [child.agent.id])
  assert.equal(run.registrations.sections[0].name, 'dsh-side-chat:relationship')
  assert.equal(run.registrations.tools[0].name, 'side_chat_context')
  const context = await run.registrations.tools[0].execute({ query: 'fact' })
  assert.match(context.context, /main fact/)
})

test('host creates the side session from a durable cold parent without resuming the parent', async () => {
  const run = fixture({ coldParent: true })
  const opened = await run.call('sideChat.open', { parentSessionId: 'main-session' })
  const child = run.child()
  assert.equal(opened.sessionId, child.agent.id)
  assert.equal(child.options.meta.cwd, 'E:\\work')
  assert.equal(child.options.meta.agentPreset, 'standard')
})

test('keep closes the live child but preserves persistence', async () => {
  const run = fixture()
  const opened = await run.call('sideChat.open', { parentSessionId: 'main-session' })
  const closed = await run.call('sideChat.close', { sessionId: opened.sessionId, mode: 'keep' })
  assert.equal(closed.deleted, false)
  assert.equal(run.child().disposed, true)
})

test('delete failure still closes the pane contract and reports retained data', async () => {
  const run = fixture()
  const opened = await run.call('sideChat.open', { parentSessionId: 'main-session' })
  const closed = await run.call('sideChat.close', { sessionId: opened.sessionId, mode: 'delete' })
  assert.equal(closed.deleted, false)
  assert.match(closed.warning, /已关闭并保留数据/)
  assert.equal(run.child().disposed, true)
})
