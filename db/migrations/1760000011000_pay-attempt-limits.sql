-- Up Migration
-- M4-T011 EP-23 pay rate limit (SEC-9, TH-3): more than 10 payment attempts in 15 minutes for one person or one
-- address answers 429 /problems/rate-limited, the same pattern as sign_in_attempts (1760000006000). One row per counted
-- attempt; BE-10 counts the last 15 minutes, and BE-10 and the prune-attempts task delete older rows (SEC-11).
-- Runs as supplements_owner (Q-3, Q-4).

create table pay_rate_attempts (
  id bigint generated always as identity constraint pk_pay_rate_attempts primary key,
  user_id bigint not null,
  ip text not null,
  attempted_at timestamptz not null default now()
);
create index ix_pay_rate_attempts_user on pay_rate_attempts (user_id, attempted_at);
create index ix_pay_rate_attempts_ip on pay_rate_attempts (ip, attempted_at);
create index ix_pay_rate_attempts_attempted_at on pay_rate_attempts (attempted_at);

-- BE-10 records, counts and prunes attempts; the prune-attempts task prunes them.
grant select, insert, delete on pay_rate_attempts to supplements_app;

-- Down Migration
drop table pay_rate_attempts;
