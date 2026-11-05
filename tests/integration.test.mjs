import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, mkdir, writeFile, access, unlink, rmdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { apply } from '../dist/formal-host.mjs'

function fixture({ coldParent = false, modern = false, retained = false, artifactRoot, defaultModel } = {}) {
  const handlers = new Map()
  const registrations = { sections: [], tools: [] }
  const unarchivedSessionIds = []
  const attachedSessionIds = []
  const disposers = []
  const parent = {
    id: 'main-session',
    options: { provider: 'mock', model: 'native-model', temperature: 0.2 },
    session: { header: { id: 'main-session', cwd: 'E:\\work', agentPreset: 'cordis' } },
  }
  let childHandle
  const retainedSide = { id: 'sidechat-retained', parentSession: parent.id, agentPreset: 'standard', cwd: parent.session.header.cwd, createdAt: 2 }
  const location = header => ({ kind: 'jsonl', path: artifactRoot === undefined ? `E:\\sessions\\${header.id}\\session.jsonl` : join(artifactRoot, header.id, 'session.jsonl') })
  const stored = header => modern ? { header, revision: 'test', location: location(header) } : header
  const resumeIds = []
  const services = {
    agentDefaultModel: defaultModel === undefined ? undefined : { currentSelection: () => defaultModel },
    sessionQuery: { readSession: async () => ({ events: [{ type: 'message', seq: 0, data: { text: 'main fact' } }] }) },
    sessionPersistence: {
      list: async () => [...(coldParent ? [parent.session.header] : []), ...(retained ? [retainedSide] : [])].map(stored),
      ...(modern ? {
        stat: async id => {
          const header = id === parent.id ? parent.session.header : id === retainedSide.id && retained ? retainedSide : childHandle?.agent.id === id ? childHandle.agent.session.header : undefined
          return header === undefined ? undefined : stored(header)
        },
      } : { locate: location }),
    },
    sessions: { flush: async () => {} },
    agentPresets: { mount: async (_ctx, preset) => assert.equal(preset, 'standard') },
    workspaceRegistry: {
      unarchiveSession: async sessionId => unarchivedSessionIds.push(sessionId),
      resolveByPath: async () => ({ attachSession: async id => attachedSessionIds.push(id) }),
    },
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
      resume: async options => {
        resumeIds.push(options.resumeSessionId)
        return services.agents.create({ sessionId: options.resumeSessionId, meta: retainedSide, agentOptions: options.agentOptions, setup: options.setup })
      },
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
  return { call, child: () => childHandle, registrations, unarchivedSessionIds, attachedSessionIds, resumeIds, disposers }
}

test('host unarchives the independent side so the archived-session gate cannot block it', async () => {
  const run = fixture()
  const opened = await run.call('sideChat.open', { parentSessionId: 'main-session', anchorText: 'selected' })
  const child = run.child()
  assert.equal(opened.sessionId, child.agent.id)
  assert.equal(child.options.meta.origin, undefined)
  assert.equal(child.options.meta.delegationDepth, undefined)
  assert.equal(child.options.meta.parentSession, 'main-session')
  assert.equal(child.options.meta.agentPreset, 'standard')
  assert.equal(child.options.seed, undefined)
  assert.deepEqual(run.unarchivedSessionIds, [child.agent.id])
  assert.deepEqual(run.attachedSessionIds, [child.agent.id])
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

test('snapshot persistence resolves a cold parent through stat without resuming it', async () => {
  const run = fixture({ coldParent: true, modern: true })
  await run.call('sideChat.open', { parentSessionId: 'main-session' })
  assert.equal(run.child().options.meta.cwd, 'E:\\work')
  assert.deepEqual(run.resumeIds, [])
})

test('snapshot listing resumes and unarchives the retained side instead of creating a new identity', async () => {
  const run = fixture({ modern: true, retained: true })
  const opened = await run.call('sideChat.open', { parentSessionId: 'main-session' })
  assert.equal(opened.sessionId, 'sidechat-retained')
  assert.equal(opened.resumed, true)
  assert.deepEqual(run.resumeIds, ['sidechat-retained'])
  assert.deepEqual(run.unarchivedSessionIds, ['sidechat-retained'])
  assert.equal(run.child().options.agentOptions.provider, 'mock')
  assert.equal(run.child().options.agentOptions.model, 'native-model')
})

test('a blank retained side under a cold parent receives the host default route fallback', async () => {
  const run = fixture({ modern: true, retained: true, coldParent: true, defaultModel: { provider: 'default-provider', model: 'default-model' } })
  await run.call('sideChat.open', { parentSessionId: 'main-session' })
  assert.deepEqual(run.child().options.agentOptions, { provider: 'default-provider', model: 'default-model' })
})

test('snapshot location deletes only the owned side artifact without the removed locate API', async () => {
  const root = await mkdtemp(join(tmpdir(), 'dsh-sidechat-test-'))
  let file
  let directory
  try {
    const run = fixture({ modern: true, artifactRoot: root })
    const opened = await run.call('sideChat.open', { parentSessionId: 'main-session' })
    directory = join(root, opened.sessionId)
    file = join(directory, 'session.jsonl')
    await mkdir(directory)
    await writeFile(file, 'owned test artifact')
    const result = await run.call('sideChat.close', { sessionId: opened.sessionId, mode: 'delete' })
    assert.equal(result.deleted, true)
    assert.equal(run.child().disposed, true)
    await assert.rejects(access(file), { code: 'ENOENT' })
  } finally {
    if (file !== undefined) await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error })
    if (directory !== undefined) await rmdir(directory).catch(error => { if (error.code !== 'ENOENT') throw error })
    await rmdir(root)
  }
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
