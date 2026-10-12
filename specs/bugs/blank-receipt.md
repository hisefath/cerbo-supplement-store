# Bug: the receipt never shows after paying

- Found: 2026-10-11 19:01 CDT while recording the demo (local app, synthetic data).
- Symptom: after Ana pays, and whenever she opens a paid order, the page is blank under the header. The payment itself is recorded (order paid, ledger written).
- Cause: `app/pages/orders/[orderId].vue:54` used `<ReceiptView>`; Nuxt registers `app/components/checkout/ReceiptView.vue` as `CheckoutReceiptView`, so the tag rendered nothing (Vue warn "Failed to resolve component"). Present since M4 (a2ee382). Acceptance tests drive the API, not the page, so none caught it.
- Repro: `tests/unit/components-resolve.test.ts` (red before the fix: `<ReceiptView>`).
- Fix: use `<CheckoutReceiptView>`. The new test fails on any template tag Nuxt cannot resolve.
