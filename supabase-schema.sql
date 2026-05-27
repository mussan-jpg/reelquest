create table if not exists ranked_parties (
  id text primary key,
  owner_id text not null,
  party_ids jsonb not null,
  party_hash text not null,
  rating integer not null default 1000,
  rank text not null default 'bronze',
  wins integer not null default 0,
  losses integer not null default 0,
  game_version text not null,
  balance_version text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists battle_results (
  id text primary key,
  mode text not null,
  floor integer not null,
  winner text not null,
  player_party_ids jsonb not null,
  enemy_party_ids jsonb not null,
  player_party_slots jsonb not null,
  enemy_party_slots jsonb not null,
  player_set_bonuses jsonb not null default '[]',
  enemy_set_bonuses jsonb not null default '[]',
  player_relics jsonb not null default '[]',
  enemy_relics jsonb not null default '[]',
  battle_stats jsonb not null default '{}',
  game_version text not null,
  balance_version text not null,
  ranked jsonb,
  created_at timestamptz not null default now()
);

alter table battle_results
  add column if not exists player_set_bonuses jsonb not null default '[]',
  add column if not exists enemy_set_bonuses jsonb not null default '[]',
  add column if not exists player_relics jsonb not null default '[]',
  add column if not exists enemy_relics jsonb not null default '[]';

create table if not exists character_global_stats (
  character_id text not null,
  side text not null,
  mode text not null,
  floor integer not null,
  game_version text not null,
  balance_version text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  uses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (character_id, side, mode, floor, game_version, balance_version)
);

create table if not exists character_pair_stats (
  character_a_id text not null,
  character_b_id text not null,
  side text not null,
  mode text not null,
  floor integer not null,
  game_version text not null,
  balance_version text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  uses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (character_a_id, character_b_id, side, mode, floor, game_version, balance_version)
);

create table if not exists species_set_stats (
  species text not null,
  tier integer not null,
  side text not null,
  mode text not null,
  floor integer not null,
  game_version text not null,
  balance_version text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  uses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (species, tier, side, mode, floor, game_version, balance_version)
);

create table if not exists character_species_set_stats (
  character_id text not null,
  species text not null,
  tier integer not null,
  side text not null,
  mode text not null,
  floor integer not null,
  game_version text not null,
  balance_version text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  uses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (character_id, species, tier, side, mode, floor, game_version, balance_version)
);

create table if not exists relic_stats (
  relic_id text not null,
  side text not null,
  mode text not null,
  floor integer not null,
  game_version text not null,
  balance_version text not null,
  wins integer not null default 0,
  losses integer not null default 0,
  uses integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (relic_id, side, mode, floor, game_version, balance_version)
);

create index if not exists ranked_parties_match_idx
  on ranked_parties (enabled, balance_version, rank, rating);

create index if not exists battle_results_stats_idx
  on battle_results (game_version, balance_version, mode, floor, created_at);

create index if not exists battle_results_rebuild_idx
  on battle_results (game_version, created_at desc, id desc);

create index if not exists character_global_stats_lookup_idx
  on character_global_stats (game_version, balance_version, mode, side, floor, character_id);

create index if not exists character_pair_stats_lookup_idx
  on character_pair_stats (game_version, balance_version, mode, side, floor, character_a_id, character_b_id);

create index if not exists character_pair_stats_character_a_idx
  on character_pair_stats (game_version, character_a_id);

create index if not exists character_pair_stats_character_b_idx
  on character_pair_stats (game_version, character_b_id);

create index if not exists species_set_stats_lookup_idx
  on species_set_stats (game_version, balance_version, mode, side, floor, species, tier);

create index if not exists character_species_set_stats_lookup_idx
  on character_species_set_stats (game_version, balance_version, mode, side, floor, character_id, species, tier);

create index if not exists character_species_set_stats_character_idx
  on character_species_set_stats (game_version, character_id);

create index if not exists relic_stats_lookup_idx
  on relic_stats (game_version, balance_version, mode, side, floor, relic_id);

alter table ranked_parties enable row level security;
alter table battle_results enable row level security;
alter table character_global_stats enable row level security;
alter table character_pair_stats enable row level security;
alter table species_set_stats enable row level security;
alter table character_species_set_stats enable row level security;
alter table relic_stats enable row level security;

drop policy if exists "public read ranked parties" on ranked_parties;
create policy "public read ranked parties"
  on ranked_parties for select
  using (enabled = true);

drop policy if exists "public insert ranked parties" on ranked_parties;
create policy "public insert ranked parties"
  on ranked_parties for insert
  with check (true);

drop policy if exists "public update ranked parties results" on ranked_parties;
create policy "public update ranked parties results"
  on ranked_parties for update
  using (true)
  with check (true);

drop policy if exists "public read battle results" on battle_results;
create policy "public read battle results"
  on battle_results for select
  using (true);

drop policy if exists "public insert battle results" on battle_results;
create policy "public insert battle results"
  on battle_results for insert
  with check (true);

drop policy if exists "public read character global stats" on character_global_stats;
create policy "public read character global stats"
  on character_global_stats for select
  using (true);

drop policy if exists "public read character pair stats" on character_pair_stats;
create policy "public read character pair stats"
  on character_pair_stats for select
  using (true);

drop policy if exists "public read species set stats" on species_set_stats;
create policy "public read species set stats"
  on species_set_stats for select
  using (true);

drop policy if exists "public read character species set stats" on character_species_set_stats;
create policy "public read character species set stats"
  on character_species_set_stats for select
  using (true);

drop policy if exists "public read relic stats" on relic_stats;
create policy "public read relic stats"
  on relic_stats for select
  using (true);

create or replace function prune_old_battle_results()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from battle_results
  where id in (
    select id
    from battle_results
    order by created_at desc, id desc
    offset 100000
  );

  return null;
end;
$$;

drop trigger if exists prune_old_battle_results_after_insert on battle_results;
create trigger prune_old_battle_results_after_insert
after insert on battle_results
for each statement
execute function prune_old_battle_results();

create or replace function aggregate_inserted_battle_results()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into character_global_stats (
    character_id, side, mode, floor, game_version, balance_version, wins, losses, uses, updated_at
  )
  with side_entries as (
    select id, mode, floor, winner, game_version, balance_version, 'player'::text as result_side, player_party_slots as slots
    from inserted_battle_results
    union all
    select id, mode, floor, winner, game_version, balance_version, 'enemy'::text as result_side, enemy_party_slots as slots
    from inserted_battle_results
  ),
  expanded as (
    select
      slot_item->>'character_id' as character_id,
      side_value.side,
      se.mode,
      floor_value.floor,
      se.game_version,
      se.balance_version,
      case when se.winner = side_value.source_side then 1 else 0 end as wins,
      case when se.winner <> 'draw' and se.winner <> side_value.source_side then 1 else 0 end as losses,
      1 as uses
    from side_entries se
    cross join lateral jsonb_array_elements(se.slots) as slot_item
    cross join lateral (values (se.result_side, se.result_side), ('all'::text, se.result_side)) as side_value(side, source_side)
    cross join lateral (values (se.floor), (0)) as floor_value(floor)
  )
  select character_id, side, mode, floor, game_version, balance_version, sum(wins), sum(losses), sum(uses), now()
  from expanded
  group by character_id, side, mode, floor, game_version, balance_version
  on conflict (character_id, side, mode, floor, game_version, balance_version)
  do update set
    wins = character_global_stats.wins + excluded.wins,
    losses = character_global_stats.losses + excluded.losses,
    uses = character_global_stats.uses + excluded.uses,
    updated_at = now();

  insert into character_pair_stats (
    character_a_id, character_b_id, side, mode, floor, game_version, balance_version, wins, losses, uses, updated_at
  )
  with side_entries as (
    select id, mode, floor, winner, game_version, balance_version, 'player'::text as result_side, player_party_slots as slots
    from inserted_battle_results
    union all
    select id, mode, floor, winner, game_version, balance_version, 'enemy'::text as result_side, enemy_party_slots as slots
    from inserted_battle_results
  ),
  pairs as (
    select
      least(a.slot_item->>'character_id', b.slot_item->>'character_id') as character_a_id,
      greatest(a.slot_item->>'character_id', b.slot_item->>'character_id') as character_b_id,
      side_value.side,
      se.mode,
      floor_value.floor,
      se.game_version,
      se.balance_version,
      case when se.winner = side_value.source_side then 1 else 0 end as wins,
      case when se.winner <> 'draw' and se.winner <> side_value.source_side then 1 else 0 end as losses,
      1 as uses
    from side_entries se
    cross join lateral jsonb_array_elements(se.slots) as a(slot_item)
    cross join lateral jsonb_array_elements(se.slots) as b(slot_item)
    cross join lateral (values (se.result_side, se.result_side), ('all'::text, se.result_side)) as side_value(side, source_side)
    cross join lateral (values (se.floor), (0)) as floor_value(floor)
    where a.slot_item->>'character_id' < b.slot_item->>'character_id'
  )
  select character_a_id, character_b_id, side, mode, floor, game_version, balance_version, sum(wins), sum(losses), sum(uses), now()
  from pairs
  group by character_a_id, character_b_id, side, mode, floor, game_version, balance_version
  on conflict (character_a_id, character_b_id, side, mode, floor, game_version, balance_version)
  do update set
    wins = character_pair_stats.wins + excluded.wins,
    losses = character_pair_stats.losses + excluded.losses,
    uses = character_pair_stats.uses + excluded.uses,
    updated_at = now();

  insert into species_set_stats (
    species, tier, side, mode, floor, game_version, balance_version, wins, losses, uses, updated_at
  )
  with side_entries as (
    select id, mode, floor, winner, game_version, balance_version, 'player'::text as result_side, player_set_bonuses as set_bonuses
    from inserted_battle_results
    union all
    select id, mode, floor, winner, game_version, balance_version, 'enemy'::text as result_side, enemy_set_bonuses as set_bonuses
    from inserted_battle_results
  ),
  expanded as (
    select
      bonus_item->>'species' as species,
      (bonus_item->>'tier')::integer as tier,
      side_value.side,
      se.mode,
      floor_value.floor,
      se.game_version,
      se.balance_version,
      case when se.winner = side_value.source_side then 1 else 0 end as wins,
      case when se.winner <> 'draw' and se.winner <> side_value.source_side then 1 else 0 end as losses,
      1 as uses
    from side_entries se
    cross join lateral jsonb_array_elements(se.set_bonuses) as bonus_item
    cross join lateral (values (se.result_side, se.result_side), ('all'::text, se.result_side)) as side_value(side, source_side)
    cross join lateral (values (se.floor), (0)) as floor_value(floor)
  )
  select species, tier, side, mode, floor, game_version, balance_version, sum(wins), sum(losses), sum(uses), now()
  from expanded
  group by species, tier, side, mode, floor, game_version, balance_version
  on conflict (species, tier, side, mode, floor, game_version, balance_version)
  do update set
    wins = species_set_stats.wins + excluded.wins,
    losses = species_set_stats.losses + excluded.losses,
    uses = species_set_stats.uses + excluded.uses,
    updated_at = now();

  insert into character_species_set_stats (
    character_id, species, tier, side, mode, floor, game_version, balance_version, wins, losses, uses, updated_at
  )
  with side_entries as (
    select id, mode, floor, winner, game_version, balance_version, 'player'::text as result_side, player_party_slots as slots, player_set_bonuses as set_bonuses
    from inserted_battle_results
    union all
    select id, mode, floor, winner, game_version, balance_version, 'enemy'::text as result_side, enemy_party_slots as slots, enemy_set_bonuses as set_bonuses
    from inserted_battle_results
  ),
  expanded as (
    select
      slot_item->>'character_id' as character_id,
      bonus_item->>'species' as species,
      (bonus_item->>'tier')::integer as tier,
      side_value.side,
      se.mode,
      floor_value.floor,
      se.game_version,
      se.balance_version,
      case when se.winner = side_value.source_side then 1 else 0 end as wins,
      case when se.winner <> 'draw' and se.winner <> side_value.source_side then 1 else 0 end as losses,
      1 as uses
    from side_entries se
    cross join lateral jsonb_array_elements(se.slots) as slot_item
    cross join lateral jsonb_array_elements(se.set_bonuses) as bonus_item
    cross join lateral (values (se.result_side, se.result_side), ('all'::text, se.result_side)) as side_value(side, source_side)
    cross join lateral (values (se.floor), (0)) as floor_value(floor)
  )
  select character_id, species, tier, side, mode, floor, game_version, balance_version, sum(wins), sum(losses), sum(uses), now()
  from expanded
  group by character_id, species, tier, side, mode, floor, game_version, balance_version
  on conflict (character_id, species, tier, side, mode, floor, game_version, balance_version)
  do update set
    wins = character_species_set_stats.wins + excluded.wins,
    losses = character_species_set_stats.losses + excluded.losses,
    uses = character_species_set_stats.uses + excluded.uses,
    updated_at = now();

  insert into relic_stats (
    relic_id, side, mode, floor, game_version, balance_version, wins, losses, uses, updated_at
  )
  with side_entries as (
    select id, mode, floor, winner, game_version, balance_version, 'player'::text as result_side, player_relics as relics
    from inserted_battle_results
    union all
    select id, mode, floor, winner, game_version, balance_version, 'enemy'::text as result_side, enemy_relics as relics
    from inserted_battle_results
  ),
  expanded as (
    select
      relic_item.value #>> '{}' as relic_id,
      side_value.side,
      se.mode,
      floor_value.floor,
      se.game_version,
      se.balance_version,
      case when se.winner = side_value.source_side then 1 else 0 end as wins,
      case when se.winner <> 'draw' and se.winner <> side_value.source_side then 1 else 0 end as losses,
      1 as uses
    from side_entries se
    cross join lateral jsonb_array_elements(se.relics) as relic_item(value)
    cross join lateral (values (se.result_side, se.result_side), ('all'::text, se.result_side)) as side_value(side, source_side)
    cross join lateral (values (se.floor), (0)) as floor_value(floor)
  )
  select relic_id, side, mode, floor, game_version, balance_version, sum(wins), sum(losses), sum(uses), now()
  from expanded
  group by relic_id, side, mode, floor, game_version, balance_version
  on conflict (relic_id, side, mode, floor, game_version, balance_version)
  do update set
    wins = relic_stats.wins + excluded.wins,
    losses = relic_stats.losses + excluded.losses,
    uses = relic_stats.uses + excluded.uses,
    updated_at = now();

  return null;
end;
$$;

drop trigger if exists aggregate_battle_results_after_insert on battle_results;
create trigger aggregate_battle_results_after_insert
after insert on battle_results
referencing new table as inserted_battle_results
for each statement
execute function aggregate_inserted_battle_results();

drop function if exists increment_character_global_stats(jsonb);
drop function if exists increment_character_pair_stats(jsonb);
drop function if exists maintenance_clear_aggregate_stats(text);
drop function if exists maintenance_rebuild_aggregate_stats(text);

create or replace function maintenance_clear_all(p_passcode text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_passcode <> 'Rq7mK2vP9xL4sT8' then
    raise exception 'invalid maintenance passcode';
  end if;

  truncate table battle_results;
  truncate table ranked_parties;
  truncate table character_global_stats;
  truncate table character_pair_stats;
  truncate table species_set_stats;
  truncate table character_species_set_stats;
  truncate table relic_stats;
  return true;
end;
$$;

revoke all on function maintenance_clear_all(text) from public;
grant execute on function maintenance_clear_all(text) to anon;
