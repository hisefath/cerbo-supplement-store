-- Up Migration
-- M4-T001 core tables (lld.md §1): practices, users, sessions, products, practice_prices, orders, order_lines, notices.
-- Runs as supplements_owner (Q-3, Q-4). orders and order_lines get every §1 column now; the paid-order checks and
-- triggers (ck_orders_hold_when_in_checkout, ck_orders_paid_fields, ck_orders_split_balances, ck_orders_payout_nonneg,
-- tg_orders_paid_frozen, ...) arrive with M4-T002.

create table practices (
  id bigint generated always as identity constraint pk_practices primary key,
  name text not null constraint ck_practices_name_len check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now()
);

create table users (
  id bigint generated always as identity constraint pk_users primary key,
  email text not null,
  password_hash text not null,
  display_name text not null constraint ck_users_display_name_len check (char_length(display_name) between 1 and 120),
  role varchar(30) not null constraint ck_users_role check (
    role in ('patient', 'provider', 'finance_lead', 'operations_specialist', 'sre', 'data_analyst', 'none')),
  practice_id bigint constraint fk_users_practice references practices (id) on delete restrict,
  role_changed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint ck_users_practice_matches_role check ((practice_id is not null) = (role in ('patient', 'provider'))),
  constraint uq_users_id_practice unique (id, practice_id)
);
create unique index uq_users_email_lower on users (lower(email));
create index ix_users_practice_role on users (practice_id, role);
create index ix_users_role on users (role);

create table sessions (
  id bigint generated always as identity constraint pk_sessions primary key,
  token_hash bytea not null constraint uq_sessions_token_hash unique,
  user_id bigint not null constraint fk_sessions_user references users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz
);
create index ix_sessions_user on sessions (user_id);

create table products (
  id bigint generated always as identity constraint pk_products primary key,
  sku text not null constraint uq_products_sku unique,
  name text not null constraint ck_products_name_len check (char_length(name) between 1 and 120),
  unit_cost_cents integer not null constraint ck_products_cost_positive check (unit_cost_cents > 0),
  units_in_stock integer not null default 0 constraint ck_products_stock_nonneg check (units_in_stock >= 0),
  created_at timestamptz not null default now()
);

create table practice_prices (
  practice_id bigint not null constraint fk_practice_prices_practice references practices (id) on delete restrict,
  product_id bigint not null constraint fk_practice_prices_product references products (id) on delete restrict,
  price_cents integer not null constraint ck_practice_prices_positive check (price_cents > 0),
  set_by bigint not null constraint fk_practice_prices_set_by references users (id) on delete restrict,
  set_at timestamptz not null default now(),
  constraint pk_practice_prices primary key (practice_id, product_id)
);

create table orders (
  id bigint generated always as identity (start with 1001) constraint pk_orders primary key,
  practice_id bigint not null constraint fk_orders_practice references practices (id) on delete restrict,
  provider_id bigint not null,
  patient_id bigint not null,
  status varchar(20) not null default 'sent' constraint ck_orders_status check (
    status in ('sent', 'in_checkout', 'payment_failed', 'paid', 'needs_review', 'cancelled')),
  sent_at timestamptz not null default now(),
  checkout_started_at timestamptz,
  prices_held_until timestamptz,
  paid_at timestamptz,
  cancelled_at timestamptz,
  amount_paid_cents integer,
  item_cost_cents integer,
  provider_payout_cents integer,
  platform_fee_cents integer,
  constraint fk_orders_provider_in_practice foreign key (provider_id, practice_id)
    references users (id, practice_id) on delete restrict,
  constraint fk_orders_patient_in_practice foreign key (patient_id, practice_id)
    references users (id, practice_id) on delete restrict
);
create index ix_orders_practice_sent on orders (practice_id, sent_at desc, id desc);
create index ix_orders_patient on orders (patient_id);
create index ix_orders_status_paid on orders (status, paid_at desc, id desc);
create index ix_orders_needs_review on orders (id) where status = 'needs_review';
create index ix_orders_sent_at on orders (sent_at);

create table order_lines (
  id bigint generated always as identity constraint pk_order_lines primary key,
  order_id bigint not null constraint fk_order_lines_order references orders (id) on delete restrict,
  product_id bigint not null constraint fk_order_lines_product references products (id) on delete restrict,
  product_name text not null,
  quantity integer not null constraint ck_order_lines_quantity_positive check (quantity >= 1),
  sent_unit_price_cents integer not null,
  held_unit_price_cents integer,
  paid_unit_price_cents integer,
  unit_cost_cents_at_payment integer,
  fee_share_cents integer constraint ck_order_lines_fee_share_nonneg check (fee_share_cents >= 0),
  constraint ck_order_lines_prices_positive check (
    sent_unit_price_cents > 0
    and (held_unit_price_cents is null or held_unit_price_cents > 0)
    and (paid_unit_price_cents is null or paid_unit_price_cents > 0)
    and (unit_cost_cents_at_payment is null or unit_cost_cents_at_payment > 0)),
  constraint uq_order_lines_order_product unique (order_id, product_id)
);
create index ix_order_lines_product on order_lines (product_id);

create table notices (
  id bigint generated always as identity constraint pk_notices primary key,
  order_id bigint not null constraint fk_notices_order references orders (id) on delete restrict
    constraint uq_notices_order unique,
  patient_id bigint not null constraint fk_notices_patient references users (id) on delete restrict,
  practice_id bigint not null constraint fk_notices_practice references practices (id) on delete restrict,
  token text not null constraint uq_notices_token unique,
  created_at timestamptz not null default now()
);

-- The app connects as supplements_app (Q-3): no DELETE on orders or order_lines (INV-4).
grant select on practices, users, products, practice_prices to supplements_app;
grant select, insert, update on sessions to supplements_app;
grant select, insert, update on orders, order_lines to supplements_app;
grant select, insert on notices to supplements_app;

-- Down Migration
drop table notices;
drop table order_lines;
drop table orders;
drop table practice_prices;
drop table products;
drop table sessions;
drop table users;
drop table practices;
