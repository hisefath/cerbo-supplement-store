-- Up Migration
-- M6-T002 operations access (lld.md §1 access_log, request_stats, health_pings, "M6 grants"): the one M6 migration. It
-- creates the append-only access log (BE-18), the hourly request counts and the 5-minute uptime slots (BE-19, D86,
-- D87), and lets the app change a person's role. Runs as supplements_owner (Q-3, Q-4).

create table access_log (
  id bigint generated always as identity constraint pk_access_log primary key,
  actor_id bigint not null constraint fk_access_log_actor references users (id) on delete restrict,
  target_user_id bigint not null constraint fk_access_log_target references users (id) on delete restrict,
  from_role varchar(30) not null,
  to_role varchar(30) not null,
  reason text not null constraint ck_access_log_reason_len check (char_length(reason) between 1 and 200),
  outcome varchar(10) not null constraint ck_access_log_outcome check (outcome in ('granted', 'refused')),
  created_at timestamptz not null default now(),
  constraint ck_access_log_roles check (
    from_role in ('patient', 'provider', 'finance_lead', 'operations_specialist', 'sre', 'data_analyst', 'none')
    and to_role in ('patient', 'provider', 'finance_lead', 'operations_specialist', 'sre', 'data_analyst', 'none'))
);
-- EP-38 by month, newest first, cursor pagination.
create index ix_access_log_created on access_log (created_at desc, id desc);

create table request_stats (
  hour timestamptz not null,
  route_group text not null,
  requests integer not null default 0,
  errors integer not null default 0,
  slow integer not null default 0,
  stock_refusals integer not null default 0,
  constraint pk_request_stats primary key (hour, route_group),
  constraint ck_request_stats_nonneg check (requests >= 0 and errors >= 0 and slow >= 0 and stock_refusals >= 0)
);

create table health_pings (
  slot timestamptz not null constraint pk_health_pings primary key,
  first_seen_at timestamptz not null default now()
);

-- INV-4: the app may only add and read access history; no UPDATE or DELETE.
grant select, insert on access_log to supplements_app;
-- BE-19's per-request upsert adds to the counts.
grant select, insert, update on request_stats to supplements_app;
grant select, insert on health_pings to supplements_app;
-- BE-18 changes a role only through a logged change (column-level, as M5 did for products.units_in_stock).
grant update (role, role_changed_at) on users to supplements_app;

-- Down Migration
revoke update (role, role_changed_at) on users from supplements_app;
drop table health_pings;
drop table request_stats;
drop table access_log;
