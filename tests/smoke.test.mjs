import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import * as formalHost from '../dist/formal-host.mjs'

test('formal host exposes a normal DSH package face', () => {
  assert.equal(formalHost.name, 'dsh-side-chat')
  assert.equal(typeof formalHost.apply, 'function')
  assert.ok(formalHost.inject.includes('sessionPersistence'))
  assert.ok(formalHost.inject.includes('agentPresets'))
})

test('portable client contains no absolute source checkout path', async () => {
  const client = await readFile(new URL('../dist/formal-client.cjs', import.meta.url), 'utf8')
  assert.ok(client.length > 1000)
  assert.doesNotMatch(client, /E:\/DSH_Work\/dsh-src/i)
  assert.match(client, /dsh-side-chat/)
  assert.match(client, /nativeRpc\.call\("\/side-chat"/)
  assert.match(client, /nativeRpc\.call\("\/api"/)
})

test('formal package composes exact authenticated API routes with a legacy fallback', async () => {
  const host = await readFile(new URL('../dist/formal-host.mjs', import.meta.url), 'utf8')
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.match(host, /connection\.fetch\.register\(\{/)
  assert.match(host, /path: `\/api\/\$\{method\}`/)
  assert.match(host, /connection\.rpc\.handle\('\/side-chat'/)
  assert.match(host, /'session\.v4\.jsonl\.zstd'/)
  assert.match(host, /已关闭并保留数据/)
  assert.equal(pkg.peerDependencies['dsh-better-sidebar'], '>=0.24.1 <0.25.0')
  assert.equal(pkg.peerDependenciesMeta['dsh-better-sidebar'].optional, true)
})
