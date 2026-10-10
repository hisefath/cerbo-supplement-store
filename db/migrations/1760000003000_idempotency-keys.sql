-- Up Migration
-- M4-T003 pay and send exactly once (lld.md §1, §7, SM-2, SM-3): idempotency_keys (D41) and the freeze of a
-- succeeded payment attempt (INV-2). Runs as supplements_owner (Q-3, Q-4).

create table idempotency_keys (
  user_id bigint not null constraint fk_idempotency_keys_user references users (id) on delete cascade,
  key text not null constraint ck_idempotency_keys_key_len check (length(key) between 1 and 255),
  route text not null,
  request_hash bytea not null,
  status varchar(20) not null default 'in_flight' constraint ck_idempotency_keys_status check (
    status in ('in_flight', 'completed')),
  response_status smallint,
  response_body jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint pk_idempotency_keys primary key (user_id, key)
);
create index ix_idempotency_keys_expires on idempotency_keys (expires_at);

-- BE-5 begins, completes, releases (deletes in-flight rows) and purges expired keys.
grant select, insert, update, delete on idempotency_keys to supplements_app;

-- INV-2: a succeeded payment attempt is money taken; it never changes or disappears, as tg_orders_paid_frozen
-- freezes paid orders.
create function payment_attempts_succeeded_frozen() returns trigger language plpgsql as $$
begin
  if old.status = 'succeeded' then
    raise exception 'payment attempt % succeeded; it cannot change', old.id using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end $$;
create trigger tg_payment_attempts_succeeded_frozen before update or delete on payment_attempts
  for each row execute function payment_attempts_succeeded_frozen();

-- Down Migration
drop trigger tg_payment_attempts_succeeded_frozen on payment_attempts;
drop function payment_attempts_succeeded_frozen();
drop table idempotency_keys;
