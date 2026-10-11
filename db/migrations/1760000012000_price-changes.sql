-- Up Migration
-- M5-T001 practice prices (lld.md §1, SEQ-4): the append-only price_changes history, and the app's right to set a
-- practice price. Runs as supplements_owner (Q-3, Q-4).

create table price_changes (
  id bigint generated always as identity constraint pk_price_changes primary key,
  practice_id bigint not null constraint fk_price_changes_practice references practices (id) on delete restrict,
  product_id bigint not null constraint fk_price_changes_product references products (id) on delete restrict,
  old_price_cents integer not null,
  new_price_cents integer not null,
  reason text not null constraint ck_price_changes_reason_len check (char_length(reason) between 1 and 200),
  changed_by bigint not null constraint fk_price_changes_changed_by references users (id) on delete restrict,
  changed_at timestamptz not null default now(),
  constraint ck_price_changes_positive check (old_price_cents > 0 and new_price_cents > 0)
);
-- EP-27 history, newest first, cursor pagination.
create index ix_price_changes_practice_changed on price_changes (practice_id, changed_at desc, id desc);
-- EP-21 "price changed since sent" lookup (M5-T003).
create index ix_price_changes_practice_product_changed on price_changes (practice_id, product_id, changed_at);

-- INV-4, FR-021: the app may only add and read history; no UPDATE or DELETE.
grant select, insert on price_changes to supplements_app;
-- BE-8 sets a practice price (upsert, row lock for the stale check). Rows are never deleted.
grant insert, update on practice_prices to supplements_app;

-- Down Migration
revoke insert, update on practice_prices from supplements_app;
drop table price_changes;
