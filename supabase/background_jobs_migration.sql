-- CineTube 백그라운드 작업 큐
-- 작업계획서 7.3 / 단계 7. 반복 실행해도 안전하다.
-- 기존 테이블과 데이터를 변경하지 않고 새 테이블만 추가한다.

create table if not exists public.background_jobs (
  id bigserial primary key,
  job_type text not null,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  result jsonb,
  error text,
  attempts integer not null default 0,
  max_attempts integer not null default 3,
  run_after timestamptz not null default now(),
  locked_by text,
  locked_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint background_jobs_status_check
    check (status in ('queued', 'running', 'succeeded', 'failed', 'canceled'))
);

-- Worker 선점 조회용: queued 상태를 run_after 순으로 읽는다.
create index if not exists idx_background_jobs_claim
  on public.background_jobs (run_after, id)
  where status = 'queued';

create index if not exists idx_background_jobs_status_created_at
  on public.background_jobs (status, created_at desc);

create index if not exists idx_background_jobs_type_created_at
  on public.background_jobs (job_type, created_at desc);

-- 실행 중 상태로 남은 작업을 회수할 때 사용한다.
create index if not exists idx_background_jobs_running_locked_at
  on public.background_jobs (locked_at)
  where status = 'running';
