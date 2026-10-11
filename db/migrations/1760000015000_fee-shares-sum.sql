-- Up Migration
-- M7-J05 LINV-1 (lld.md §1 constraints, §7): at commit, a paid order's line fee shares add up to its platform fee.
-- Fires on line changes and on an order becoming paid. Created by supplements_owner (Q-3, Q-4); not security definer, so it runs as the writing role, which can read orders and order_lines.

create function order_fee_shares_sum() returns trigger language plpgsql set search_path = public, pg_temp as $$
declare
  r jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  v_order bigint := coalesce(r ->> 'order_id', r ->> 'id')::bigint;
  o orders%rowtype;
  s record;
begin
  select * into o from orders where id = v_order;
  if o.status is distinct from 'paid' then
    return null;
  end if;
  select sum(fee_share_cents) as total, count(*) filter (where fee_share_cents is null) as missing
    into s from order_lines where order_id = v_order;
  if s.missing > 0 or s.total is distinct from o.platform_fee_cents then
    raise exception 'fee shares of order % do not add up to its platform fee', v_order using errcode = 'check_violation';
  end if;
  return null;
end $$;
create constraint trigger ct_order_lines_fee_shares_sum after insert or update or delete on order_lines
  deferrable initially deferred for each row execute function order_fee_shares_sum();
create constraint trigger ct_orders_fee_shares_sum after insert or update on orders
  deferrable initially deferred for each row when (new.status = 'paid') execute function order_fee_shares_sum();

-- Down Migration
drop trigger ct_orders_fee_shares_sum on orders;
drop trigger ct_order_lines_fee_shares_sum on order_lines;
drop function order_fee_shares_sum();
