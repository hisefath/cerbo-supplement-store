// Kysely table types for db/migrations (lld.md §1). bigint columns come back from pg as strings.
import type { ColumnType, Generated } from 'kysely'

type Id = ColumnType<string, never, never>
type Int8 = ColumnType<string, string | number | bigint, string | number | bigint>
type Timestamp = ColumnType<Date, Date | string, Date | string>
type DefaultTimestamp = ColumnType<Date, Date | string | undefined, Date | string>

export interface PracticesTable {
  id: Id
  name: string
  created_at: DefaultTimestamp
}

export interface UsersTable {
  id: Id
  email: string
  password_hash: string
  display_name: string
  role: string
  practice_id: Int8 | null
  role_changed_at: Timestamp | null
  created_at: DefaultTimestamp
}

export interface SessionsTable {
  id: Id
  token_hash: Buffer
  user_id: Int8
  created_at: DefaultTimestamp
  last_seen_at: DefaultTimestamp
  ended_at: Timestamp | null
}

export interface ProductsTable {
  id: Id
  sku: string
  name: string
  unit_cost_cents: number
  units_in_stock: Generated<number>
  created_at: DefaultTimestamp
}

export interface PracticePricesTable {
  practice_id: Int8
  product_id: Int8
  price_cents: number
  set_by: Int8
  set_at: DefaultTimestamp
}

/** Append-only (INV-4): the app may only insert and select. */
export interface PriceChangesTable {
  id: Id
  practice_id: Int8
  product_id: Int8
  old_price_cents: number
  new_price_cents: number
  reason: string
  changed_by: Int8
  changed_at: DefaultTimestamp
}

export interface OrdersTable {
  id: Id
  practice_id: Int8
  provider_id: Int8
  patient_id: Int8
  status: Generated<string>
  sent_at: DefaultTimestamp
  checkout_started_at: Timestamp | null
  prices_held_until: Timestamp | null
  paid_at: Timestamp | null
  cancelled_at: Timestamp | null
  amount_paid_cents: number | null
  item_cost_cents: number | null
  provider_payout_cents: number | null
  platform_fee_cents: number | null
}

export interface OrderLinesTable {
  id: Id
  order_id: Int8
  product_id: Int8
  product_name: string
  quantity: number
  sent_unit_price_cents: number
  held_unit_price_cents: number | null
  paid_unit_price_cents: number | null
  unit_cost_cents_at_payment: number | null
  fee_share_cents: number | null
}

export interface NoticesTable {
  id: Id
  order_id: Int8
  patient_id: Int8
  practice_id: Int8
  token: string
  created_at: DefaultTimestamp
}

export interface PaymentAttemptsTable {
  id: Id
  order_id: Int8
  idempotency_key: string
  status: Generated<string>
  amount_cents: number
  failure_reason: string | null
  created_at: DefaultTimestamp
  finished_at: Timestamp | null
}

export interface LedgerEntriesTable {
  id: Id
  order_id: Int8
  payment_attempt_id: Int8
  practice_id: Int8
  provider_id: Int8
  category: 'patient_payment' | 'item_cost' | 'provider_payout' | 'platform_fee'
  amount_cents: number
  occurred_at: Timestamp
}

/** Append-only (INV-4): the app may only insert and select. */
export interface StockMovementsTable {
  id: Id
  product_id: Int8
  /** negative for sales and write-offs */
  change: number
  kind: 'sale' | 'sale_release' | 'adjustment'
  reason: string
  /** present exactly for sales and releases */
  order_id: Int8 | null
  /** present exactly for adjustments */
  actor_id: Int8 | null
  units_after: number
  created_at: DefaultTimestamp
}

export interface IdempotencyKeysTable {
  user_id: Int8
  key: string
  route: string
  request_hash: Buffer
  status: Generated<string>
  response_status: number | null
  /** jsonb: written as JSON text, read back parsed */
  response_body: ColumnType<unknown, string | null, string | null>
  created_at: DefaultTimestamp
  expires_at: Timestamp
}

export interface SignInAttemptsTable {
  id: Id
  /** lower-cased */
  email: string
  ip: string
  attempted_at: DefaultTimestamp
}

export interface PayRateAttemptsTable {
  id: Id
  user_id: Int8
  ip: string
  attempted_at: DefaultTimestamp
}

export interface Database {
  practices: PracticesTable
  users: UsersTable
  sessions: SessionsTable
  products: ProductsTable
  practice_prices: PracticePricesTable
  price_changes: PriceChangesTable
  orders: OrdersTable
  order_lines: OrderLinesTable
  notices: NoticesTable
  payment_attempts: PaymentAttemptsTable
  ledger_entries: LedgerEntriesTable
  stock_movements: StockMovementsTable
  idempotency_keys: IdempotencyKeysTable
  sign_in_attempts: SignInAttemptsTable
  pay_rate_attempts: PayRateAttemptsTable
}
