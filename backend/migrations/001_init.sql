-- 001_init.sql: Core schema, indexes, and Row Level Security for Meru

-- Profiles table (tracks preferences and opt-ins for each authenticated user)
create table if not exists profiles (
    user_id       uuid primary key references auth.users(id) on delete cascade,
    email         text not null,
    display_name  text,
    digest_opt_in boolean not null default true,
    created_at    timestamptz not null default now()
);

-- Sessions table (persistent posture monitoring records)
create table if not exists sessions (
    id               bigint generated always as identity primary key,
    user_id          uuid not null references auth.users(id) on delete cascade,
    label            text not null,
    created_at       timestamptz not null default now(),
    score            int not null check (score between 0 and 100),
    duration_min     real not null,
    avg_spine_deg    real not null,
    worst_streak     int not null,
    best_good_streak int not null default 0,
    time_of_day      text not null,
    top_issue        text not null,
    tip              text not null,
    posture_counts   jsonb not null,
    ai_report        jsonb default '{}'::jsonb
);

create index if not exists idx_sessions_user_created on sessions (user_id, created_at desc);

-- LLM Calls table (tracks token consumption, latency, and costs per call)
create table if not exists llm_calls (
    id            bigint generated always as identity primary key,
    user_id       uuid references auth.users(id) on delete cascade,
    purpose       text not null,            -- 'coach' | 'digest'
    model         text,
    prompt_tokens int,
    output_tokens int,
    cost_usd      numeric(10, 6),
    latency_ms    int,
    status        text not null,            -- 'success' | 'error'
    created_at    timestamptz not null default now()
);

create index if not exists idx_llm_calls_user_created on llm_calls (user_id, created_at desc);

-- Background Jobs table (asynchronous worker tasks)
create table if not exists jobs (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    kind        text not null,              -- 'coach' | 'digest'
    status      text not null,              -- 'queued' | 'running' | 'done' | 'failed'
    result      jsonb,
    error       text,
    created_at  timestamptz not null default now(),
    finished_at timestamptz
);

create index if not exists idx_jobs_user_created on jobs (user_id, created_at desc);

-- Weekly Digest Idempotency table (ensures one digest email per ISO week)
create table if not exists digests_sent (
    user_id uuid not null references auth.users(id) on delete cascade,
    iso_week text not null,                 -- e.g. '2026-W41'
    sent_at timestamptz not null default now(),
    primary key (user_id, iso_week)
);

-- Row Level Security (RLS) Lockdown
alter table profiles     enable row level security;
alter table sessions     enable row level security;
alter table llm_calls    enable row level security;
alter table jobs         enable row level security;
alter table digests_sent enable row level security;

-- Client read policies (users can only query their own records)
drop policy if exists own_profiles on profiles;
create policy own_profiles on profiles for select using (auth.uid() = user_id);

drop policy if exists own_sessions on sessions;
create policy own_sessions on sessions for select using (auth.uid() = user_id);

drop policy if exists own_llm_calls on llm_calls;
create policy own_llm_calls on llm_calls for select using (auth.uid() = user_id);

drop policy if exists own_jobs on jobs;
create policy own_jobs on jobs for select using (auth.uid() = user_id);

drop policy if exists own_digests on digests_sent;
create policy own_digests on digests_sent for select using (auth.uid() = user_id);
