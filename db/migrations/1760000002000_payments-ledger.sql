-- Up Migration
-- M4-T002 payments and the ledger (lld.md §1, §7): payment_attempts, ledger_entries, the paid-order checks and the
-- triggers that freeze paid money. Runs as supplements_owner (Q-3, Q-4).

alter table orders
  add constraint ck_orders_hold_when_in_checkout check (status <> 'in_checkout' or prices_held_until is not null),
  add constraint ck_orders_paid_fields check (
    (status = 'paid') = (paid_at is not null and amount_paid_cents is not null and item_cost_cents is not null
                         and provider_payout_cents is not null and platform_fee_cents is not null)),
  add constraint ck_orders_split_balances check (
    amount_paid_cents = item_cost_cents + provider_payout_cents + platform_fee_cents),
  add constraint ck_orders_payout_nonneg check (provider_payout_cents >= 0),
  add constraint ck_orders_amounts_nonneg check (
    amount_paid_cents >= 0 and item_cost_cents >= 0 and platform_fee_cents >= 0);

-- FR-015, INV-4: a paid order's amounts, paid time and status never change.
create function orders_paid_frozen() returns trigger language plpgsql as $$
begin
  if old.status = 'paid' and (
    new.status, new.paid_at, new.amount_paid_cents, new.item_cost_cents, new.provider_payout_cents, new.platform_fee_cents
  ) is distinct from (
    old.status, old.paid_at, old.amount_paid_cents, old.item_cost_cents, old.provider_payout_cents, old.platform_fee_cents
  ) then
    raise exception 'order % is paid; its recorded amounts cannot change', old.id using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger tg_orders_paid_frozen before update on orders for each row execute function orders_paid_frozen();

-- Lines of a paid order never change, gain or lose rows.
create function order_lines_paid_frozen() returns trigger language plpgsql as $$
begin
  if exists (select 1 from orders where id in (old.order_id, new.order_id) and status = 'paid') then
    raise exception 'order % is paid; its lines cannot change', coalesce(old.order_id, new.order_id)
      using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;
create trigger tg_order_lines_paid_frozen before insert or update or delete on order_lines
  for each row execute function order_lines_paid_frozen();

create table payment_attempts (
  id bigint generated always as identity constraint pk_payment_attempts primary key,
  order_id bigint not null constraint fk_payment_attempts_order references orders (id) on delete restrict,
  idempotency_key text not null,
  status varchar(20) not null default 'processing' constraint ck_payment_attempts_status check (
    status in ('processing', 'succeeded', 'failed')),
  amount_cents integer not null constraint ck_payment_attempts_amount_positive check (amount_cents > 0),
  failure_reason varchar(40),
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  constraint uq_payment_attempts_order_key unique (order_id, idempotency_key)
);
create unique index uq_payment_attempts_one_success on payment_attempts (order_id) where status = 'succeeded';
create unique index uq_payment_attempts_one_processing on payment_attempts (order_id) where status = 'processing';

create table ledger_entries (
  id bigint generated always as identity constraint pk_ledger_entries primary key,
  order_id bigint not null constraint fk_ledger_entries_order references orders (id) on delete restrict,
  payment_attempt_id bigint not null
    constraint fk_ledger_entries_payment_attempt references payment_attempts (id) on delete restrict,
  practice_id bigint not null constraint fk_ledger_entries_practice references practices (id) on delete restrict,
  provider_id bigint not null constraint fk_ledger_entries_provider references users (id) on delete restrict,
  category varchar(20) not null constraint ck_ledger_entries_category check (
    category in ('patient_payment', 'item_cost', 'provider_payout', 'platform_fee')),
  amount_cents integer not null constraint ck_ledger_entries_amount_nonneg check (amount_cents >= 0),
  occurred_at timestamptz not null,
  constraint uq_ledger_entries_order_category unique (order_id, category)
);
create index ix_ledger_entries_occurred_category on ledger_entries (occurred_at, category);
create index ix_ledger_entries_provider_occurred on ledger_entries (provider_id, occurred_at);
create index ix_ledger_entries_practice_occurred on ledger_entries (practice_id, occurred_at);

-- LINV-2, INV-9: at commit, an order with ledger entries has all four, they balance, and each equals the order's own
-- recorded amount.
create function ledger_entries_balance() returns trigger language plpgsql as $$
declare
  v_order bigint := case when tg_op = 'DELETE' then old.order_id else new.order_id end;
  e record;
  o orders%rowtype;
begin
  select
    count(*) as n,
    sum(amount_cents) filter (where category = 'patient_payment') as paid,
    sum(amount_cents) filter (where category = 'item_cost') as cost,
    sum(amount_cents) filter (where category = 'provider_payout') as payout,
    sum(amount_cents) filter (where category = 'platform_fee') as fee
  into e from ledger_entries where order_id = v_order;
  if e.n = 0 then
    return null;
  end if;
  select * into o from orders where id = v_order;
  if e.n <> 4 or e.paid is distinct from e.cost + e.payout + e.fee
     or e.paid is distinct from o.amount_paid_cents or e.cost is distinct from o.item_cost_cents
     or e.payout is distinct from o.provider_payout_cents or e.fee is distinct from o.platform_fee_cents then
    raise exception 'ledger entries of order % do not balance with the order', v_order using errcode = 'check_violation';
  end if;
  return null;
end $$;
create constraint trigger ct_ledger_entries_balance after insert or update or delete on ledger_entries
  deferrable initially deferred for each row execute function ledger_entries_balance();

-- Q-3, INV-4: the app may only add and read ledger lines; attempts move processing -> succeeded / failed.
grant select, insert, update on payment_attempts to supplements_app;
grant select, insert on ledger_entries to supplements_app;

-- Down Migration
drop table ledger_entries;
drop function ledger_entries_balance();
drop table payment_attempts;
drop trigger tg_order_lines_paid_frozen on order_lines;
drop function order_lines_paid_frozen();
drop trigger tg_orders_paid_frozen on orders;
drop function orders_paid_frozen();
alter table orders
  drop constraint ck_orders_amounts_nonneg,
  drop constraint ck_orders_payout_nonneg,
  drop constraint ck_orders_split_balances,
  drop constraint ck_orders_paid_fields,
  drop constraint ck_orders_hold_when_in_checkout;
