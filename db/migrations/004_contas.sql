-- Contas de verdade, no lugar do código colado em cada aparelho.
--
-- O código funcionava, mas era um segredo compartilhado: quem tivesse ele
-- tinha tudo, não dava pra revogar um aparelho perdido e não havia noção de
-- dono. Agora cada registro pertence a um usuário e cada aparelho tem a sua
-- sessão, que pode ser encerrada sozinha.

create table if not exists users (
  id            text primary key,
  -- Guardado em minúsculas: entrar não pode depender de caixa alta.
  username      text        not null unique,
  password_hash text        not null,
  created_at    timestamptz not null default now()
);

create table if not exists sessions (
  -- Só o hash do token vive aqui. Vazamento do banco não vira sessão válida.
  token_hash text primary key,
  user_id    text        not null references users (id) on delete cascade,
  user_agent text        not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_user_idx    on sessions (user_id);
create index if not exists sessions_expires_idx on sessions (expires_at);

-- Dono de cada coisa. Fica nulo por enquanto: os dados que já existem são
-- adotados pela primeira conta criada (ver api/auth.js).
alter table plans    add column if not exists user_id text references users (id) on delete cascade;
alter table workouts add column if not exists user_id text references users (id) on delete cascade;
alter table jumps    add column if not exists user_id text references users (id) on delete cascade;

-- O sync sempre pergunta "o que mudou pra ESTE usuário desde tal hora".
create index if not exists plans_user_synced_idx    on plans (user_id, synced_at);
create index if not exists workouts_user_synced_idx on workouts (user_id, synced_at);
create index if not exists jumps_user_synced_idx    on jumps (user_id, synced_at);

-- O alcance parado era uma linha única no banco inteiro; agora é por pessoa.
create table if not exists user_settings (
  user_id    text primary key references users (id) on delete cascade,
  reach      numeric(5, 1) check (reach > 0),
  updated_at timestamptz not null default now(),
  synced_at  timestamptz not null default now()
);

insert into user_settings (user_id, reach, updated_at)
select u.id, s.reach, s.updated_at from users u, settings s where s.id = true
on conflict (user_id) do nothing;

-- A tabela `settings` antiga fica de pé de propósito: a versão publicada em
-- produção ainda lê ela a cada sync, e a migration roda antes do deploy. Ela sai
-- numa migration seguinte, quando a produção já estiver com o código de contas.
