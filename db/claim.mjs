// Adota os registros que estão sem dono, atribuindo eles a uma conta.
//
//   npm run db:claim -- gustavo
//
// A primeira conta criada já faz isso sozinha. Isto aqui é pra quando sobra
// órfão depois — por exemplo, um aparelho que sincronizou com a versão antiga
// do site, sem conta, depois que a conta já existia.
import pg from 'pg'

const username = String(process.argv[2] ?? '').trim().toLowerCase()
if (!username) {
  console.error('Diga a conta: npm run db:claim -- seu-usuario')
  process.exit(1)
}

const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: true } })
await c.connect()
try {
  const { rows } = await c.query('select id from users where username = $1', [username])
  if (!rows.length) {
    console.error('Não existe conta "' + username + '".')
    process.exit(1)
  }
  await c.query('begin')
  const total = {}
  for (const t of ['plans', 'workouts', 'jumps']) {
    const r = await c.query(`update ${t} set user_id = $1 where user_id is null`, [rows[0].id])
    total[t] = r.rowCount
  }
  await c.query('commit')
  console.log('Adotado por ' + username + ': ' + JSON.stringify(total))
} finally {
  await c.end()
}
