/**
 * Build the local, non-dynamic DSH development package.
 *
 * The normal dist files are dynamic Cordis bodies and remain unchanged. This
 * adapter turns the same source into a local dual-face package so the host
 * loads it through the ordinary DSH loader and the browser uses the public
 * Connection RPC instead of a large cordis_define payload.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const devRoot = join(root, 'dev')
const packageName = process.env.DSH_SIDE_CHAT_PACKAGE_ID ?? 'dsh-side-chat-dev'
if (!/^dsh-side-chat(?:-dev)?$/.test(packageName)) {
  throw new Error(`unsupported local package id: ${packageName}`)
}
const packageRoot = join(devRoot, 'node_modules', packageName)
const sandboxPackageRoot = join(devRoot, 'dsh-home', 'profiles', 'web', 'node_modules', packageName)

const normalizeNewlines = source => source.replace(/\r\n/g, '\n')

const coreSource = normalizeNewlines(readFileSync(join(root, 'src', 'core.mjs'), 'utf8'))
  .replace(/\nexport \{[\s\S]*\}\s*$/, '\n')
const hostTemplate = normalizeNewlines(readFileSync(join(root, 'src', 'host.template.js'), 'utf8'))
const clientSource = normalizeNewlines(readFileSync(join(root, 'src', 'client.js'), 'utf8'))

if (!hostTemplate.includes('/*__CORE_SOURCE__*/')) {
  throw new Error('host.template.js 缺少 /*__CORE_SOURCE__*/ 占位符')
}
const hostMarker = "return {\n  inject: ['sessionQuery', 'sessionPersistence', 'sessions', 'agents', 'agentPresets', 'workspaceRegistry'],\n  apply(ctx) {"
const clientMarker = "return {\n  inject: ['slots', 'timer', 'sessions', 'conversation'],\n  apply(ctx) {"
if (!hostTemplate.includes(hostMarker)) {
  throw new Error('host.template.js 的动态入口形状已变化，停止生成本地适配器')
}
if (!clientSource.includes(clientMarker)) {
  throw new Error('client.js 的动态入口形状已变化，停止生成本地适配器')
}

const hostPrelude = `import { lstat, rmdir, unlink } from 'node:fs/promises'
import { basename, dirname, isAbsolute, resolve } from 'node:path'

export const name = '${packageName}'
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

export function apply(ctx) {`

let hostSource = hostTemplate
  .replace(hostMarker, hostPrelude)
  .replace('/*__CORE_SOURCE__*/', coreSource)

const hostTail = `
  // Use Cordis' contextual service accessor so registrations are owned by
  // this plugin fiber (ctx.get() would expose the provider's own context).
  const connection = ctx.connection
  if (connection?.fetch?.register === undefined && connection?.rpc?.handle === undefined) {
    throw new Error('dsh-side-chat-dev: public connection.rpc is unavailable')
  }
  const invokeSideChat = async (endpoint, payload, signal) => {
    const handler = sideChatHandlers.get(endpoint)
    if (handler === undefined) {
      return { ok: false, error: { code: 'internal', message: \`未知侧聊方法: \${endpoint}\`, details: {} } }
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
        path: \`/api/\${method}\`,
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
}`

if (!/\n  \},\n\}\s*$/.test(hostSource)) {
  throw new Error('host.template.js 的结束形状已变化，停止生成本地适配器')
}
hostSource = hostSource.replace(/\n  \},\n\}\s*$/, `${hostTail}\n`)

mkdirSync(packageRoot, { recursive: true })
writeFileSync(join(packageRoot, 'host.mjs'), hostSource)
writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({
  name: packageName,
  version: '0.0.0-dev',
  private: true,
  type: 'module',
  exports: {
    '.': './host.mjs',
    './package.json': './package.json',
    './client': './client.cjs',
  },
  dsh: {
    bundle: {
      patch: './cordis.patch.yml',
    },
    client: {
      platform: 'web',
      inject: ['@deepseek-ai/dsh-client-connection', '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-conversation', '@deepseek-ai/dsh-client-ui-input-trigger', '@deepseek-ai/dsh-client-ui-settings-general'],
      immediately: false,
    },
  },
}, null, 2) + '\n')
cpSync(join(root, 'cordis.patch.yml'), join(packageRoot, 'cordis.patch.yml'), { force: true })

const clientBody = clientSource.replace(
  clientMarker,
  "return {\n  inject: ['slots', 'timer', 'sessions', 'conversation', 'connection'],\n  apply(ctx) {\n    nativeRpc = ctx.get('connection')?.rpc ?? null",
)
const clientEntry = `
const pluginId = '${packageName}'
let nativeRpc = null
const styles = {
  insert(css) {
    if (typeof document === 'undefined') return
    let element = document.querySelector(\`style[data-plugin="\${pluginId}"]\`)
    if (element === null) {
      element = document.createElement('style')
      element.dataset.plugin = pluginId
      document.head.appendChild(element)
    }
    element.textContent = String(css)
  },
}
const host = {
  async call(method, args) {
    if (nativeRpc === null) throw new Error('dsh-side-chat-dev: connection rpc is not ready')
    let result
    try {
      result = await nativeRpc.call('/api', method, args)
    } catch (error) {
      if (!/HTTP (404|405)\b/.test(error instanceof Error ? error.message : String(error))) throw error
      result = await nativeRpc.call('/side-chat', method, args)
    }
    if (result?.ok === true && Object.prototype.hasOwnProperty.call(result, 'value')) return result.value
    if (result?.ok === false) {
      const error = new Error(result.error?.message ?? '侧聊 Host RPC 失败')
      error.code = result.error?.code ?? 'error'
      throw error
    }
    return result
  },
}

const factory = (require) => {
const React = require('react')
const ReactDOM = require('react-dom')
${clientBody}
}

globalThis.__ModuleLoader__.load({ id: pluginId, factory })
`

const { build } = await import('esbuild')
const result = await build({
  stdin: {
    contents: clientEntry,
    resolveDir: devRoot,
    sourcefile: 'client-entry.js',
    loader: 'js',
  },
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  external: ['react'],
  write: false,
  legalComments: 'none',
  minifyWhitespace: true,
})
const clientBundle = result.outputFiles?.[0]?.text
if (typeof clientBundle !== 'string' || clientBundle.length === 0) {
  throw new Error('esbuild did not produce a client bundle')
}
writeFileSync(join(packageRoot, 'client.cjs'), clientBundle)
mkdirSync(dirname(sandboxPackageRoot), { recursive: true })
cpSync(packageRoot, sandboxPackageRoot, { recursive: true, force: true })

console.log('dsh-side-chat: local DSH package built')
console.log(`  package: ${packageRoot}`)
console.log(`  sandbox package: ${sandboxPackageRoot}`)
console.log(`  host.mjs: ${Buffer.byteLength(hostSource)} bytes`)
console.log(`  client.cjs: ${Buffer.byteLength(clientBundle)} bytes`)
