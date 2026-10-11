// Each role's home (flows.md F7 step 2): a patient her orders, a provider the practice dashboard, a reviewer Paid
// orders. Finance, SRE and analyst roles open the one operations page their role is for. Used by the sign-in page
// (FE-2) and the site root.
export const ROLE_HOME: Record<string, string> = {
  patient: '/orders',
  provider: '/practice/dashboard',
  operations_specialist: '/ops/orders',
  finance_lead: '/ops/orders',
  sre: '/ops/system',
  data_analyst: '/ops/health',
}
