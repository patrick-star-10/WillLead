#!/usr/bin/env node

import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendDir = path.resolve(__dirname, '..')

const children = []
let shuttingDown = false
let viteExited = false

function prefixStream(stream, label, target) {
  let buffered = ''

  stream.on('data', (chunk) => {
    buffered += chunk.toString()
    const lines = buffered.split(/\r?\n/)
    buffered = lines.pop() ?? ''

    for (const line of lines) {
      if (!line) continue
      target.write(`[${label}] ${line}\n`)
    }
  })

  stream.on('end', () => {
    if (!buffered) return
    target.write(`[${label}] ${buffered}\n`)
  })
}

function startProcess(label, args, extraEnv = {}) {
  const child = spawn(process.execPath, args, {
    cwd: frontendDir,
    env: {
      ...process.env,
      ...extraEnv
    },
    stdio: ['inherit', 'pipe', 'pipe']
  })

  children.push(child)
  prefixStream(child.stdout, label, process.stdout)
  prefixStream(child.stderr, label, process.stderr)

  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`

    if (label === 'vite') {
      viteExited = true
      if (!shuttingDown) {
        shuttingDown = true
        shutdown(code ?? 0)
      }
      return
    }

    if (shuttingDown) return

    process.stderr.write(`[${label}] exited with ${reason}\n`)
    if (code && code !== 0) {
      process.stderr.write(
        `[${label}] single-signature test triggering will be unavailable until this operator is running again.\n`
      )
    }
  })

  return child
}

function shutdown(exitCode = 0) {
  for (const child of children) {
    if (child.killed) continue
    try {
      child.kill('SIGTERM')
    } catch {}
  }

  setTimeout(() => {
    for (const child of children) {
      if (child.killed) continue
      try {
        child.kill('SIGKILL')
      } catch {}
    }
  }, 1_500).unref()

  if (viteExited) {
    process.exit(exitCode)
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (shuttingDown) return
    shuttingDown = true
    shutdown(0)
  })
}

startProcess('operator:primary', ['./scripts/operator-auto-arm.mjs'])
startProcess('operator:lasna', ['./scripts/operator-auto-arm.mjs'], {
  EXECUTION_ENV: 'lasna'
})
startProcess('vite', ['./node_modules/vite/bin/vite.js'])
