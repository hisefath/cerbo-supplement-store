// Each role's pages that exist today, in order (lld.md Site root and safe landing; flows.md F7 step 2): a provider the
// practice dashboard, a reviewer Paid orders, an operations specialist also Stock adjustments. Patient, site
// reliability and data analyst have none yet, nor has an account with role `none` (ck_users_role); they land on S15 Your home. Used by the sign-in page (FE-2) and the site
// root (FE-25).
export interface RolePage { path: string; title: string }

export const ROLE_PAGES: Record<string, RolePage[]> = {
  patient: [],
  provider: [
    { path: '/practice/dashboard', title: 'Practice dashboard' },
    { path: '/practice/prices', title: 'Practice prices' },
  ],
  operations_specialist: [
    { path: '/ops/orders', title: 'Paid orders' },
    { path: '/ops/stock', title: 'Stock adjustments' },
  ],
  finance_lead: [{ path: '/ops/orders', title: 'Paid orders' }],
  sre: [],
  data_analyst: [],
  none: [],
}

/** A role's first listed page; a role with none goes to the site root, which shows S15 Your home. */
export const ROLE_HOME: Record<string, string> = Object.fromEntries(
  Object.entries(ROLE_PAGES).map(([role, pages]) => [role, pages[0]?.path ?? '/']),
)
