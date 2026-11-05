import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const client = await readFile(new URL('../src/client.js', import.meta.url), 'utf8')
const projection = client.slice(client.indexOf('function serializeSideSelections('), client.indexOf('function updatePreferences('))

test('public sidebar row marker hides only Side Chat identities without archiving them', () => {
  const source = client.slice(client.indexOf('function SideSessionRowMarker('), client.indexOf('function FactorySideConversation('))
  const marker = new Function('h', `${source}\nreturn SideSessionRowMarker`)((tag, props) => ({ tag, props }))
  assert.equal(marker({ sessionId: 'main-session' }), null)
  assert.equal(marker({ sessionId: 'user-sidechat-note' }), null)
  assert.equal(marker({}), null)
  assert.deepEqual(marker({ sessionId: 'sidechat-retained-session' }), { tag: 'span', props: { 'data-side-chat-row': '', hidden: true } })
})

function fixture(sendSession, selections = ['main fact']) {
  const session = {}
  const uiState = { sides: new Map([['parent', { sideId: 'side', selections }]]) }
  const persisted = []
  const service = { sendSession }
  const install = new Function('uiState', 'sessionsService', 'patchSide', 'persistSelections', `${projection}\nreturn installSidePromptProjection`)(
    uiState,
    { binding: id => id === 'side' ? { session } : undefined },
    (id, patch) => uiState.sides.set(id, { ...uiState.sides.get(id), ...patch }),
    (id, remaining) => persisted.push({ id, remaining }),
  )
  return { session, service, uiState, persisted, dispose: install(service) }
}

for (const target of ['main', 'side without quotes']) {
  test(`${target} forwards Host acceptance, attachments and cancellation unchanged`, async () => {
    let received
    const run = fixture(function (...args) { assert.equal(this, run.service); received = args; return { kind: 'success' } }, [])
    const args = [target === 'main' ? {} : run.session, 'hello', ['attachment'], 'steer', new AbortController().signal, () => {}]
    await run.service.sendSession(...args)
    assert.deepEqual(received, args)
    assert.equal(run.persisted.length, 0)
  })
}

test('accepted quoted send settles the composer before completion and preserves later quotes', async () => {
  const completion = Promise.withResolvers()
  let accepted
  let composerSettled = 0
  const attachments = ['file']
  const signal = new AbortController().signal
  const run = fixture(function (session, text, ids, mode, cancel, accept) {
    assert.equal(this, run.service)
    assert.equal(session, run.session)
    assert.equal(text, '> 主对话选文\n>\n> main fact\n\nquestion')
    assert.equal(ids, attachments)
    assert.equal(mode, 'queue')
    assert.equal(cancel, signal)
    accepted = accept
    return completion.promise
  })
  const sending = run.service.sendSession(run.session, 'question', attachments, 'queue', signal, () => {
    assert.deepEqual(run.uiState.sides.get('parent').selections, [])
    composerSettled++
  })
  accepted()
  assert.equal(composerSettled, 1)
  run.uiState.sides.get('parent').selections = ['main fact']
  completion.resolve({ kind: 'success' })
  await sending
  assert.deepEqual(run.uiState.sides.get('parent').selections, ['main fact'])
  assert.deepEqual(run.persisted, [{ id: 'side', remaining: [] }])
})

test('rejected or cancelled admission preserves quotes and the composer draft', async () => {
  for (const kind of ['rejected', 'cancelled']) {
    const outcome = { kind }
    let accepted = false
    const run = fixture(async () => outcome)
    assert.equal(await run.service.sendSession(run.session, 'question', [], 'queue', undefined, () => { accepted = true }), outcome)
    assert.equal(accepted, false)
    assert.deepEqual(run.uiState.sides.get('parent').selections, ['main fact'])
    assert.deepEqual(run.persisted, [])
  }
})

test('attachment preparation failure preserves quotes and propagates the error', async () => {
  const failure = new Error('file not ready')
  const run = fixture(async () => { throw failure })
  await assert.rejects(run.service.sendSession(run.session, 'question', ['file'], 'queue'), error => error === failure)
  assert.deepEqual(run.uiState.sides.get('parent').selections, ['main fact'])
})

test('legacy success retires captured quotes without discarding quotes added in flight', async () => {
  const run = fixture(async () => {
    run.uiState.sides.get('parent').selections.push('later quote')
    return { kind: 'success' }
  })
  await run.service.sendSession(run.session, '', [], 'queue')
  assert.deepEqual(run.uiState.sides.get('parent').selections, ['later quote'])
})

test('acceptance for a replaced side pane cannot clear its new selections', async () => {
  const run = fixture(async (_session, _text, _ids, _mode, _signal, accept) => {
    run.uiState.sides.set('parent', { sideId: 'replacement', selections: ['replacement quote'] })
    accept()
    return { kind: 'success' }
  })
  await run.service.sendSession(run.session, 'question', [], 'queue')
  assert.deepEqual(run.uiState.sides.get('parent').selections, ['replacement quote'])
  assert.deepEqual(run.persisted, [])
})

test('unloading restores the original sender without overwriting a later owner', () => {
  const original = async () => ({ kind: 'success' })
  const run = fixture(original)
  run.dispose()
  assert.equal(run.service.sendSession, original)
  const next = fixture(original)
  const later = async () => ({ kind: 'rejected' })
  next.service.sendSession = later
  next.dispose()
  assert.equal(next.service.sendSession, later)
})
