-- Up Migration
-- M5-T002 stock reserve and release (lld.md §1 stock_movements, BE-13, SEQ-2): the append-only stock history, and the
-- app's right to change a product's stock count. Runs as supplements_owner (Q-3, Q-4).

create table stock_movements (
  id bigint generated always as identity constraint pk_stock_movements primary key,
  product_id bigint not null constraint fk_stock_movements_product references products (id) on delete restrict,
  change integer not null constraint ck_stock_movements_change_nonzero check (change <> 0),
  kind varchar(20) not null constraint ck_stock_movements_kind check (kind in ('sale', 'sale_release', 'adjustment')),
  reason text not null constraint ck_stock_movements_reason_len check (char_length(reason) between 1 and 200),
  order_id bigint constraint fk_stock_movements_order references orders (id) on delete restrict,
  actor_id bigint constraint fk_stock_movements_actor references users (id) on delete restrict,
  units_after integer not null constraint ck_stock_movements_units_after_nonneg check (units_after >= 0),
  created_at timestamptz not null default now(),
  -- a sale or sale_release names its order and no actor; an adjustment names its actor and no order
  constraint ck_stock_movements_kind_refs check (
    (kind in ('sale', 'sale_release') and order_id is not null and actor_id is null)
    or (kind = 'adjustment' and actor_id is not null and order_id is null)
  )
);
-- EP-31 history, newest first, cursor pagination.
create index ix_stock_movements_created on stock_movements (created_at desc, id desc);
create index ix_stock_movements_product on stock_movements (product_id);

-- INV-4: the app may only add and read stock history; no UPDATE or DELETE.
grant select, insert on stock_movements to supplements_app;
-- BE-13 changes the count only through a recorded movement; ck_products_stock_nonneg keeps it at or above zero (INV-5).
grant update (units_in_stock) on products to supplements_app;

-- Down Migration
revoke update (units_in_stock) on products from supplements_app;
drop table stock_movements;
