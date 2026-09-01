-- Prepara o banco pro sync.
--
-- Apagar vira deleted_at: sem rastro, o celular mandaria o registro de volta no
-- próximo sync. E o updated_at passa a ser o do aparelho que editou, não o do
-- banco — por isso os triggers de 001 saem.

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
