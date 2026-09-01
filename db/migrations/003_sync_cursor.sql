-- Separa dois carimbos que estavam sendo confundidos num só.
--
-- `updated_at` é do relógio do aparelho que editou. Serve pra decidir quem
-- editou por último quando dois aparelhos mexem no mesmo registro.
--
-- `synced_at` é do relógio do banco, gravado pela API a cada escrita. Serve de
-- cursor: "me dá o que entrou aqui depois da última vez que conversamos".
--
-- Usar `updated_at` como cursor dava um bug silencioso: se o relógio do celular
-- estivesse alguns segundos atrás do relógio do banco, a edição feita no
-- celular entrava com um carimbo anterior ao cursor do outro aparelho — e nunca
-- era baixada. O treino ficava só num aparelho, sem nenhum erro aparecer.

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
