import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const apiRoot = path.resolve(__dirname, '..')
const schemaDir = path.join(apiRoot, 'prisma')
const require = createRequire(import.meta.url)

dotenv.config({ path: path.join(apiRoot, '.env') })

function resolveSqlitePath(databaseUrl) {
  if (!databaseUrl?.startsWith('file:')) {
    return null
  }

  const location = databaseUrl.slice('file:'.length).split('?')[0]

  if (!location || location === ':memory:') {
    return null
  }

  if (/^[A-Za-z]:[\\/]/.test(location)) {
    return location
  }

  if (location.startsWith('/')) {
    return location
  }

  return path.resolve(schemaDir, location)
}

async function ensureSqliteDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  const filePath = resolveSqlitePath(databaseUrl)

  if (!filePath) {
    return
  }

  await mkdir(path.dirname(filePath), { recursive: true })

  try {
    await access(filePath)
  } catch {
    await writeFile(filePath, '')
    console.log(`Initialized SQLite database at ${filePath}`)
  }
}

async function main() {
  await ensureSqliteDatabase()

  const prismaPackagePath = require.resolve('prisma/package.json')
  const prismaCliPath = path.join(path.dirname(prismaPackagePath), 'build', 'index.js')
  const child = spawn(
    process.execPath,
    [prismaCliPath, 'db', 'push', '--schema', 'prisma/schema.prisma', ...process.argv.slice(2)],
    {
      cwd: apiRoot,
      stdio: 'inherit',
      env: process.env,
    },
  )

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }

    process.exit(code ?? 0)
  })

  child.on('error', (error) => {
    console.error(error)
    process.exit(1)
  })
}

await main()
