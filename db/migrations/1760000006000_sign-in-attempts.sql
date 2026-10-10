-- Up Migration
-- M4-T006 EP-15 sign-in rate limit (lld.md §4 `/problems/rate-limited`: more than 10 sign-in attempts in 15 minutes
-- for one email or one address). One row per counted attempt; BE-3 counts the last 15 minutes and deletes older rows.
-- Runs as supplements_owner (Q-3, Q-4).

create table sign_in_attempts (
  id bigint generated always as identity constraint pk_sign_in_attempts primary key,
  email text not null,
  ip text not null,
  attempted_at timestamptz not null default now()
);
create index ix_sign_in_attempts_email on sign_in_attempts (email, attempted_at);
create index ix_sign_in_attempts_ip on sign_in_attempts (ip, attempted_at);
create index ix_sign_in_attempts_attempted_at on sign_in_attempts (attempted_at);

-- BE-3 records, counts and prunes attempts.
grant select, insert, delete on sign_in_attempts to supplements_app;

-- Down Migration
drop table sign_in_attempts;
