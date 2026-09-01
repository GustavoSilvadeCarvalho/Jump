-- Separa dois carimbos que estavam num só: updated_at é do relógio do aparelho e
-- decide quem editou por último; synced_at é do relógio do banco e serve de cursor.
--
-- Usar updated_at como cursor quebrava em silêncio: com o relógio do celular
-- atrasado, a edição dele entrava antes do cursor do outro aparelho e nunca descia.

alter table plans    add column if not exists synced_at timestamptz not null default now();
alter table workouts add column if not exists synced_at timestamptz not null default now();
alter table jumps    add column if not exists synced_at timestamptz not null default now();
alter table settings add column if not exists synced_at timestamptz not null default now();

create index if not exists plans_synced_idx    on plans (synced_at);
create index if not exists workouts_synced_idx on workouts (synced_at);
create index if not exists jumps_synced_idx    on jumps (synced_at);

drop index if exists plans_updated_idx;
drop index if exists workouts_updated_idx;
drop index if exists jumps_updated_idx;
