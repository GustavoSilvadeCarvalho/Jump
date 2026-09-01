-- Prepara o banco pra sincronizar com o app.
--
-- Duas coisas faltavam:
--
-- 1. Apagar precisa deixar rastro. Se o registro simplesmente sumisse da tabela,
--    o celular mandaria ele de volta no próximo sync. Então apagar vira
--    `deleted_at` preenchido — a linha fica, marcada como morta.
--
-- 2. O `updated_at` tem que ser o do aparelho que editou, não o do banco. Os
--    triggers de 001 sobrescreviam com now() a cada escrita, o que apagaria a
--    informação de quem editou por último. Saem os triggers; a API grava o
--    carimbo que o app mandou (limitado a now(), pra relógio adiantado não
--    ganhar pra sempre).

alter table plans    add column if not exists deleted_at timestamptz;
alter table workouts add column if not exists deleted_at timestamptz;
alter table jumps    add column if not exists deleted_at timestamptz;
alter table jumps    add column if not exists updated_at timestamptz not null default now();

drop trigger if exists plans_touch    on plans;
drop trigger if exists workouts_touch on workouts;
drop trigger if exists settings_touch on settings;
drop function if exists touch_updated_at();

-- O sync pergunta sempre "o que mudou desde tal hora?"
create index if not exists plans_updated_idx    on plans (updated_at);
create index if not exists workouts_updated_idx on workouts (updated_at);
create index if not exists jumps_updated_idx    on jumps (updated_at);

-- A view não deve mostrar treino apagado.
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
join workout_items i on i.workout_id = w.id
where w.deleted_at is null;
