// Aplica os arquivos de db/migrations em ordem, uma vez cada.
//
//   npm run db:migrate
//
// A URL do banco vem do .env (via --env-file, embutido no Node 20.6+).
// Cada arquivo roda dentro de uma transação: ou entra inteiro, ou não entra.

import { readFile, readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const dir = join(dirname(fileURLToPath(import.meta.url)), 'migrations')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL não definida. Copie .env.example pra .env e ponha a URL do Neon.')
  process.exit(1)
}

// O certificado do Neon é verificado (cadeia + hostname). O aviso do pg sobre
// 'sslmode=require' virar 'verify-full' é justamente esse comportamento — pode ignorar.
const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: true } })

try {
  await client.connect()
} catch (err) {
  console.error('Não consegui conectar no banco: ' + err.message)
  process.exit(1)
}

try {
  await client.query(`
    create table if not exists schema_migrations (
      name       text primary key,
      applied_at timestamptz not null default now()
    )
  `)

  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  const { rows } = await client.query('select name from schema_migrations')
  const applied = new Set(rows.map((r) => r.name))
  const pending = files.filter((f) => !applied.has(f))

  if (pending.length === 0) {
    console.log('Banco já está atualizado (' + files.length + ' migrations aplicadas).')
  }

  for (const file of pending) {
    const sql = await readFile(join(dir, file), 'utf8')
    process.stdout.write('→ ' + file + ' … ')
    try {
      await client.query('begin')
      await client.query(sql)
      await client.query('insert into schema_migrations (name) values ($1)', [file])
      await client.query('commit')
      console.log('ok')
    } catch (err) {
      await client.query('rollback')
      console.log('falhou')
      console.error('\n' + file + ': ' + err.message)
      process.exitCode = 1
      break
    }
  }

  if (!process.exitCode) {
    const { rows: tables } = await client.query(`
      select table_name, table_type
      from information_schema.tables
      where table_schema = 'public' and table_name <> 'schema_migrations'
      order by table_type desc, table_name
    `)
    console.log('\nNo banco agora:')
    for (const t of tables) {
      console.log('  ' + (t.table_type === 'VIEW' ? 'view  ' : 'tabela') + '  ' + t.table_name)
    }
  }
} finally {
  await client.end()
}
