-- Estrutura inicial. Os ids são gerados no cliente (text): o app funciona offline
-- e sincroniza depois, sem precisar pedir id pro banco.

create table if not exists plans (
  id         text primary key,
  name       text        not null,
  type       text        not null check (type in ('pliometria', 'forca', 'alongamento', 'mobilidade')),
  -- Dias da semana em que a ficha se repete: 0 = domingo … 6 = sábado
  days       smallint[]  not null default '{}',
  notes      text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workouts (
  id         text primary key,
  date       date        not null,
  type       text        not null check (type in ('pliometria', 'forca', 'alongamento', 'mobilidade')),
  -- Ficha que originou o treino; apagar a ficha não apaga o histórico
  plan_id    text        references plans (id) on delete set null,
  duration   smallint    check (duration > 0),
  rpe        smallint    check (rpe between 1 and 10),
  notes      text        not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- position guarda a ordem na tela; unit diz se reps são repetições ou segundos.
create table if not exists plan_items (
  plan_id  text     not null references plans (id) on delete cascade,
  position smallint not null,
  name     text     not null,
  sets     smallint check (sets > 0),
  reps     smallint check (reps > 0),
  load     numeric(6, 2) check (load >= 0),
  rest     smallint check (rest >= 0),
  unit     text     not null default 'reps' check (unit in ('reps', 'seg')),
  primary key (plan_id, position)
);

create table if not exists workout_items (
  workout_id text     not null references workouts (id) on delete cascade,
  position   smallint not null,
  name       text     not null,
  sets       smallint check (sets > 0),
  reps       smallint check (reps > 0),
  load       numeric(6, 2) check (load >= 0),
  rest       smallint check (rest >= 0),
  unit       text     not null default 'reps' check (unit in ('reps', 'seg')),
  primary key (workout_id, position)
);

create table if not exists jumps (
  id         text primary key,
  date       date        not null,
  kind       text        not null check (kind in ('cmj', 'sj', 'corrida', 'unilateral')),
  height     numeric(5, 1) not null check (height > 0),
  notes      text        not null default '',
  created_at timestamptz not null default now()
);

-- Linha única: o check (id) impede uma segunda.
create table if not exists settings (
  id         boolean primary key default true check (id),
  reach      numeric(5, 1) check (reach > 0),
  updated_at timestamptz not null default now()
);

insert into settings (id) values (true) on conflict (id) do nothing;

create index if not exists workouts_date_idx        on workouts (date desc);
create index if not exists workouts_type_date_idx   on workouts (type, date desc);
create index if not exists workouts_plan_idx        on workouts (plan_id);
create index if not exists workout_items_name_idx   on workout_items (name);
create index if not exists jumps_kind_date_idx      on jumps (kind, date);

-- updated_at confiável, não importa quem escreveu.
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists plans_touch on plans;
create trigger plans_touch before update on plans
  for each row execute function touch_updated_at();

drop trigger if exists workouts_touch on workouts;
create trigger workouts_touch before update on workouts
  for each row execute function touch_updated_at();

drop trigger if exists settings_touch on settings;
create trigger settings_touch before update on settings
  for each row execute function touch_updated_at();

-- Carga de cada exercício ao longo do tempo.
create or replace view exercise_history as
select
  w.date,
  w.type,
  i.name,
  i.sets,
  i.reps,
  i.unit,
  i.load,
  i.rest
from workouts w
join workout_items i on i.workout_id = w.id;
