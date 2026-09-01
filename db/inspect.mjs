// Mostra o que existe no banco hoje — útil pra conferir depois de uma migration.
//   npm run db:inspect
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } })
await client.connect()

const { rows } = await client.query(`
  select c.relname as tabela,
         a.attname as coluna,
         format_type(a.atttypid, a.atttypmod) as tipo,
         a.attnotnull as obrigatorio
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
  order by c.relname, a.attnum
`)

let atual = null
for (const r of rows) {
  if (r.tabela !== atual) {
    atual = r.tabela
    console.log('\n' + atual)
  }
  console.log('  ' + r.coluna.padEnd(12) + r.tipo.padEnd(28) + (r.obrigatorio ? 'not null' : ''))
}

const { rows: contagem } = await client.query(`
  select relname as tabela, n_live_tup as linhas
  from pg_stat_user_tables order by relname
`)
console.log('\nLinhas: ' + contagem.map((c) => c.tabela + '=' + c.linhas).join('  '))

await client.end()
