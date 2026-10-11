# Screens — In-EHR supplement orders

status: complete
Milestones: M4, M5, M5.1 (visual language), M6 · Flows: docs/design/flows.md · PRD: docs/product/prd.md@998ed94
Updated: 2026-10-11 07:22 CDT (M5.1 visual language added under Global conventions)

## Global conventions

- Widths designed: 375 px and 1280 px · Host frame: the provider screens sit under an imitation chart header (the fictional patient's name only, no real data), full width
- Voice: plain, calm, second person ("Your order"), no jargon or codes
- Error pattern: what happened + what to do next, beside its cause, in text (never color alone)
- Loading pattern: keep the layout; show progress after 1 s; explain the delay after 10 s
- Help: a "Questions? Contact your practice" line (patient) or "Contact platform support" (staff) in the same place at the foot of every screen
- Privacy: platform staff screens show an order number, never a patient's name or contact detail (FR-050); patient notices name only the practice (FR-044)
- Sample data: obviously fake names and values only (Dr. Maya Chen, Ana Ruiz, Willow Creek Wellness)

### Visual language (M5.1)

Revised for M5.1 (decision D75): every screen keeps its layout, states, copy and focus order; only how it looks
changes. Inspired by the airy, sky-blue style of cluely.com. No Cluely name, logo, image or copy is used.

#### Directions considered

```text
VL-1 Sky everywhere                 VL-2 Light page, sky header band     VL-3 Night mode
+--------------------------------+  +--------------------------------+  +--------------------------------+
|~~~~~~ sky gradient page ~~~~~~~|  |~~ sky band: title in serif ~~~~|  |#### deep navy page ############|
|  Practice prices (serif, white)|  |  Practice prices · Willow Cr.  |  |  Practice prices (serif, white)|
|  +--------------------------+  |  +--------------------------------+  |  +--------------------------+  |
|  | glass card, white text   |  |  |  white card, soft blue shadow  |  |  | dark glass card          |  |
|  | rows on frosted glass    |  |  |  rows on white, ink text       |  |  | rows light on dark       |  |
|  +--------------------------+  |  |  [ Change price ] glowing blue |  |  +--------------------------+  |
|  [ Change price ] glowing      |  +--------------------------------+  |  [ Change price ] glowing      |
+--------------------------------+  | pale blue-white page below     |  +--------------------------------+
                                    +--------------------------------+
```

| Direction | Idea | Best when | Costs | Fails for |
|---|---|---|---|---|
| VL-1 Sky everywhere | the whole page is the sky gradient; cards are frosted glass | a marketing page with little text | white text on light blue fails contrast for small text; dense tables of prices and stock are hard to read | providers scanning numbers inside a busy chart |
| VL-2 Light page, sky header band | a sky gradient band carries the page title; content sits on white cards over a pale blue-white page | daily work screens with tables and forms | the sky look appears only in the header band and the primary buttons | nobody named; it is the safest for reading |
| VL-3 Night mode | deep navy page, dark glass cards, glowing accents | evening use, a dramatic demo | inside a light EHR it looks like a different product; more contrast checks | a light host chart around it |

**Recommendation:** VL-2, because these are work screens full of prices and counts that must stay readable inside a
light EHR; the sky band, serif titles and glowing buttons carry the new look without hurting contrast.
**Chosen:** VL-2 — STANDING approval 2026-10-10 23:09 CDT ("i approve all next recommendations until project completion"), recorded with the G-ux Revise row for M5.1.
**Rejected:** VL-1 — small white text on light blue fails WCAG AA contrast · VL-3 — clashes with the light host chart.
Why this layout: the new look lives in the header band and the buttons, so every number on the page stays as easy to read as before.

#### The chosen language (VL-2)

- Page: a pale blue-white background (#F5F9FF); content on white cards with 16 px rounded corners, a hairline
  border (#E3EAF6) and a soft, wide blue shadow; generous space: 24 px inside cards, 32 px between sections
- Header band: on every screen the title sits in a band filled with a blue gradient, deep blue (#1D4ED8) at the
  top-left to bright blue (#2563EB) at the bottom-right, with a soft pale-sky glow (#8EC5F5) in the far right
  corner that never sits behind text; the title and its subtitle are white, which passes 4.5:1 across the whole
  gradient; the imitation chart header (provider screens) stays above the band, unchanged
- Type: page titles in a classic serif (EB Garamond, medium weight, 32 px desktop / 26 px phone); everything else
  in a clean geometric sans (Geist; 16 px body, 14 px for table detail, never smaller); numbers in tables use
  even-width digits so columns line up
- Ink: body text near-black navy (#0F172A); secondary text slate (#475569), which still passes 4.5:1 on white
- Primary button: deep blue (#1D4ED8) with white text (passes 4.5:1), 12 px rounded corners, a soft blue glow
  under it and a faint inner highlight along the top edge; hover brightens the glow; pressed sinks the glow
- Secondary button: white with a blue hairline border and blue text; destructive actions ("Cancel order") use
  dark red (#B91C1C) text on white, never red alone without the words
- Status words keep their text and gain a soft pill behind them: Paid (green tint), Sent and In checkout (blue
  tint), Payment failed and Needs review (amber tint), Cancelled (grey tint); color is never the only signal
- Focus: a 3 px blue ring (#3B82F6, 3:1 or better on white) with a white gap around every focusable thing, always visible on white and on the band
- Dialogs and sheets: white, 20 px rounded corners, the page behind dimmed with a light blur
- Motion: 150-200 ms fades and lifts only; nothing moves when the person has asked their device to reduce motion
- Fonts load with the page and fall back to the device's sans-serif and serif while loading, so the layout never jumps
- Contrast (planned, not verified): every text and control pair above is chosen to meet WCAG 2.2 AA; the build checks them

## S1 Supplement order (in the patient's chart)

Stories: US-1, US-4, US-5 · Flows: F1 steps 1-3 · Key screen: yes

### Variants

#### S1-V1 Builder with a live payout panel

```text
1280 px
+--------------------------------------------------------------+
| Ana Ruiz · chart                     Supplements (selected)   |
| ------------------------------------------------------------ |
| Supplement order for Ana Ruiz                                |
| Products                      | Order                        |
| Vitamin D3   $18.00  12 left  | Vitamin D3     x2   $36.00   |
|   Qty [_2_]  [Add]            | Magnesium Gly. x1   $24.00   |
| Magnesium Gly. $24.00 5 left  | -------------------------    |
|   Qty [_1_]  [Add]            | Total due          $60.00    |
| Omega-3      $30.00  0 left   | Platform fee        -$0.45   |
|   Out of stock                | Your payout          $29.55  |
|                               | [Send to Ana Ruiz]           |
+--------------------------------------------------------------+
```

- Idea: products on the left, the order and the money on the right, updating as she adds.
- Best when: the provider builds an order in one sitting during or after the visit.
- Costs: two columns need the full desktop width; on a phone they stack.
- Fails for: a provider with a long product list, who scrolls the left column a lot.

#### S1-V2 Two steps: pick, then review and send

```text
1280 px
+--------------------------------------------------------------+
| Ana Ruiz · chart                     Supplements (selected)   |
| Step 1 of 2 · Pick supplements                                |
| Vitamin D3          $18.00   12 left   Qty [_2_]              |
| Magnesium Gly.      $24.00    5 left   Qty [_1_]              |
| Omega-3             $30.00    0 left   Out of stock           |
|                                        [Review order]         |
+--------------------------------------------------------------+
+--------------------------------------------------------------+
| Step 2 of 2 · Review and send                                 |
| Vitamin D3 x2 $36.00 · Magnesium Gly. x1 $24.00               |
| Total due $60.00 · Platform fee $0.45 · Your payout $29.55    |
| [Back to products]                      [Send to Ana Ruiz]    |
+--------------------------------------------------------------+
```

- Idea: choose quantities first, then see the money on a separate review step.
- Best when: providers want a calm checklist and a final look before sending.
- Costs: one more click and a back path; the payout is hidden until step 2.
- Fails for: a provider adjusting quantities to reach a payout, who bounces between steps.

#### S1-V3 Order lines with a product search

```text
1280 px
+--------------------------------------------------------------+
| Ana Ruiz · chart                     Supplements (selected)   |
| Supplement order for Ana Ruiz                                |
| Add a supplement                                             |
| Search products                                              |
| [____________________________]  Qty [_1_]  [Add line]       |
| ------------------------------------------------------------ |
| Vitamin D3        x2   $18.00   $36.00   [Remove]            |
| Magnesium Gly.    x1   $24.00   $24.00   [Remove]            |
| ------------------------------------------------------------ |
| Total due $60.00 · Platform fee $0.45 · Your payout $29.55    |
|                                         [Send to Ana Ruiz]    |
+--------------------------------------------------------------+
```

- Idea: type to find a product and add it as a line, like writing a prescription.
- Best when: the catalog is long and the provider knows the product names.
- Costs: stock and price only show after searching, so browsing is harder.
- Fails for: a provider who doesn't remember exact names, or a short seeded list where search is overkill.

**Recommendation:** S1-V1 — the provider sees her payout change as she adds each item (FR-002), stock is visible before she picks (FR-025), and it is one page inside the chart, which is the moment the PRD describes.

**Chosen:** S1-V1 — "go, then run pass 2" (2026-10-09 21:52 CDT)
**Rejected:** S1-V2 — hides the payout until step 2, so the provider can't see what she earns while she builds.
**Rejected:** S1-V3 — stock and prices only show after a search, so she can't browse what is available.
**Why this layout (say it out loud):** The provider sees her payout change with every item she adds, and stock before she picks, all on one page inside the patient's chart.

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Ana Ruiz · chart                     Supplements (selected)   |
| ------------------------------------------------------------ |
| Supplement order for Ana Ruiz                     (title)     |
| Products                      | Your order                   |
| Vitamin D3 2000 IU            | Vitamin D3     x2   $36.00   |
|   $18.00 · 12 in stock        |   [Remove]                   |
|   Quantity [_2_]  [Add]       | Magnesium Gly. x1   $24.00   |
| Magnesium Glycinate           |   [Remove]                   |
|   $24.00 · 5 in stock         | -------------------------    |
|   Quantity [_1_]  [Add]       | Total due          $60.00    |
| Omega-3 Fish Oil              | Platform fee (0.75%) -$0.45  |
|   $30.00 · Out of stock       | Your payout          $29.55  |
|                               | (1)                          |
|                               | [Send to Ana Ruiz]           |
| Prices are set in Practice prices.  > Practice prices        |
| Questions? Contact platform support                          |
+--------------------------------------------------------------+
```

(1) Line messages appear here: price changes, items below their lowest allowed price.

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: no items added yet / Filtered: n/a — no filter on this screen / Cleared: she removed every line | The product list is full; the order panel shows a short message and Send is disabled | First use: "No supplements added yet. Add one from the list." / Filtered: n/a — no filter / Cleared: "Your order is empty. Add a supplement to continue." | Add a product |
| Loading | The product list and prices are loading | The chart header and title stay; the product list shows a progress line after 1 s and an explanation after 10 s | "Loading products…" / after 10 s: "Still loading. Anything you added is kept." | Wait, or leave the chart |
| Error | Their mistake: quantity over stock, a product below its lowest allowed price, or Send with no items / Our failure: the order could not be sent / No connection: offline when sending | The message sits beside the line or above Send; everything she entered is kept | Their mistake: "Only 2 in stock. Lower the quantity." / "Magnesium Glycinate is below its lowest allowed price of $12.09. Remove it or change its price in Practice prices." / "Add at least one supplement before sending." / Our failure: "We couldn't send the order. Nothing was sent. Try again." / No connection: "You're offline. Your order is kept; send it when you're back online." | Fix the line, or press Send again |
| Success | The order was sent | The order panel turns into a sent summary with the total due and the time sent | "Sent. Ana Ruiz will get a notice to sign in and pay." | Start another order; a sent order can't be unsent in this slice |
| Permission denied | Signed out after 15 idle minutes / the patient belongs to another practice / the person is not a provider | Signed out: the sign-in page; otherwise a message with no patient or order details | Signed out: "You were signed out after 15 minutes without activity." / Other practice or role: "You can't open supplement orders for this patient." | Sign in again, or go back to her own patients |
| Edge data | A 60-character product name / 0 in stock / a price changed while she was building / Send pressed twice / 30 lines in one order | Long names wrap to two lines; out-of-stock products show "Out of stock" and no Add; a changed price shows a note on its line; one order is created; the order panel scrolls while the totals and Send stay visible | "Out of stock" / "Price changed to $19.50 since you added it." / "Already sent." | Keep building; remove or re-add the changed line |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Supplement order for Ana Ruiz" |
| Primary action | "Send to Ana Ruiz" |
| Secondary action | "Add" (per product) · "Remove" (per line) · "Practice prices" (link) |
| Field labels and helper text | "Quantity" — helper: "Up to the number in stock." |
| Confirmation | "Sent. Ana Ruiz will get a notice to sign in and pay." |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. First product's Quantity 3. its Add 4. next products in list order 5. each order line's Remove 6. Send to Ana Ruiz 7. Practice prices link
- Labels: each Quantity input is labelled with its product ("Quantity, Vitamin D3 2000 IU"); each Remove button's spoken name names its line ("Remove Vitamin D3")
- Keyboard: Tab reaches every control; Enter in a Quantity field adds the product; Send works with Enter or Space; no dialogs on this screen
- Contrast and color: text 4.5:1, the "Out of stock" and price notes 4.5:1, input borders and focus ring 3:1; stock and errors are always written in words, never shown by color alone
- Targets: Add and Remove at least 24×24 px with space between rows
- Errors and status: errors sit beside their line and name it; "Sent…" and totals updates are announced as status messages without moving focus; Send is the review step for this binding action (3.3.4)
- Focus not hidden: the chart header does not stick over the product list, so focus is never covered

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | The order panel moves below the products as a collapsible "Your order · $60.00" bar pinned to the bottom with Send; the bar opens to show lines; nothing scrolls sideways |
| 1280 px | Products beside the order panel | Both columns visible; the order panel stays in view while the product list scrolls |

## S2 Your supplement order (patient)

Stories: US-2, US-4, US-5 · Flows: F2 steps 1-3 · Key screen: yes

### Variants

#### S2-V1 One page, pay at the bottom

```text
375 px
+--------------------------------+
| Your supplement order          |
| From Dr. Maya Chen             |
| (i) Magnesium Gly. price       |
|     changed: $24.00 to $26.00  |
| Vitamin D3   x2      $36.00    |
| Magnesium Gly. x1    $26.00    |
| ------------------------------ |
| Total due            $62.00    |
| Test payment: no real money    |
| [Pay $62.00]                   |
+--------------------------------+
```

- Idea: everything and the pay button on one page; checkout starts when she presses pay.
- Best when: short orders and patients who just want to pay.
- Costs: the 30-minute price hold has no visible moment, because checkout and payment are one press.
- Fails for: a patient who wants to review calmly first; a price could change while she reads.

#### S2-V2 Two steps: review, then checkout

```text
375 px
+--------------------------------+
| Your supplement order          |
| From Dr. Maya Chen             |
| (i) Magnesium Gly. price       |
|     changed: $24.00 to $26.00  |
| Vitamin D3   x2      $36.00    |
| Magnesium Gly. x1    $26.00    |
| Total due            $62.00    |
| [Continue to payment]          |
+--------------------------------+
+--------------------------------+
| Checkout                       |
| Your prices are held for       |
| 30 minutes.                    |
| Total             $62.00       |
| Test payment: no real money    |
| [Pay $62.00]                   |
| [Back to order]                |
+--------------------------------+
```

- Idea: reviewing and paying are separate steps; pressing Continue holds her prices.
- Best when: prices can change before checkout (FR-022) but must stay fixed during it (FR-023, FR-037).
- Costs: one extra tap.
- Fails for: nobody badly; it is slightly slower for a patient in a hurry.

#### S2-V3 Pay first, details behind a tap

```text
375 px
+--------------------------------+
| You owe $62.00                 |
| to Willow Creek Wellness       |
| [Pay $62.00]                   |
| Test payment: no real money    |
| > See 2 items                  |
| (i) 1 price changed            |
+--------------------------------+
```

- Idea: lead with the amount and the button; items are one tap away.
- Best when: repeat refills the patient already knows.
- Costs: the price-change notice and the items are hidden, so she may pay without reading them.
- Fails for: a first-time patient, and the PRD's promise that she is told what changed (FR-022).

**Recommendation:** S2-V2 — the PRD makes the start of checkout a real moment (prices held for 30 minutes), and a separate step shows that moment plainly; one extra tap is a fair price for no surprises.

**Chosen:** S2-V2 — "go, then run pass 2" (2026-10-09 21:52 CDT)
**Rejected:** S2-V1 — checkout and payment are one press, so the 30-minute price hold has no visible moment.
**Rejected:** S2-V3 — items and the price-change notice sit behind a tap, so she could pay without seeing them.
**Why this layout (say it out loud):** Reviewing and paying are separate steps, so the moment her prices lock is visible and nothing changes under her while she pays.

### Layout

```text
375 px · step 1
+--------------------------------+
| Your supplement order  (title) |
| From Dr. Maya Chen,            |
| Willow Creek Wellness          |
| (i) Magnesium Glycinate price  |
|     changed: $24.00 to $26.00  |
| Vitamin D3 2000 IU             |
|   2 x $18.00          $36.00   |
| Magnesium Glycinate            |
|   1 x $26.00          $26.00   |
| ------------------------------ |
| Total due             $62.00   |
| [Continue to payment]          |
| Questions? Contact your        |
| practice                       |
+--------------------------------+

375 px · step 2
+--------------------------------+
| Checkout               (title) |
| Your prices are held for 30    |
| minutes, until 2:30 PM.        |
| Total                 $62.00   |
| Test payment: no real money    |
| moves.                         |
| [Pay $62.00]                   |
| [Back to order]                |
| Questions? Contact your        |
| practice                       |
+--------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: n/a — a sent order always has at least one item (FR-003) / Filtered: n/a — no filter / Cleared: n/a — a patient can't remove items | n/a — this screen always has an order | n/a — no empty moment | n/a |
| Loading | Opening the order, or waiting for the payment answer | The title stays; after 1 s a progress line; after 10 s an explanation; the Pay button is disabled while paying | Opening: "Loading your order…" / Paying: "Processing your payment…" / after 10 s: "This is taking longer than usual. Don't pay again; we'll show the result here." | Wait; never pay twice |
| Error | Their mistake: n/a — the test payment has nothing to type / Our failure: the payment failed, or an item sold out before she paid / No connection: offline when paying | The message sits above the Pay button; the order and prices are kept | Their mistake: n/a — nothing to type / Our failure: "Your payment didn't go through. No money was taken. Try again." / "Omega-3 Fish Oil sold out before you paid. Nothing was charged. Contact your practice to change your order." / No connection: "You're offline. No money was taken. Try again when you're back online." | Try again, or contact the practice |
| Success | The payment went through | A receipt replaces the checkout: amount, time, items | "Paid $62.00 on Oct 13, 2026 at 2:12 PM." / "Thank you. Your practice has your order." | Close; view the order later from her orders |
| Permission denied | Signed out after 15 idle minutes / the order belongs to someone else | Signed out: the sign-in page, then back to this order; someone else's order: a message with nothing about it | Signed out: "You were signed out after 15 minutes without activity. Sign in to return to your order." / Not hers: "We can't find this order." | Sign in again, or contact the practice |
| Edge data | A price changed before checkout / the 30-minute hold ended / Pay pressed twice or retried / the order is already paid / the practice cancelled the order / a 60-character product name | A notice names the item and both prices; after the hold ends, current prices and a notice; a second press shows the first result; a cancelled order shows the items with no Continue button; long names wrap | "Magnesium Glycinate price changed: $24.00 to $26.00." / "Your 30-minute price hold ended. These are the current prices." / "This order is already paid." / "This order was cancelled by your practice." | Continue to payment again; view the receipt; contact the practice about a cancelled order |

### Microcopy

| Element | Text |
|---|---|
| Page title | Step 1: "Your supplement order" · Step 2: "Checkout" |
| Primary action | Step 1: "Continue to payment" · Step 2: "Pay $62.00" |
| Secondary action | "Back to order" |
| Field labels and helper text | n/a — no fields; helper: "Test payment: no real money moves." |
| Confirmation | "Paid $62.00 on Oct 13, 2026 at 2:12 PM." |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Price-change notice (when shown) 3. Item list 4. Total due 5. Continue to payment, then on step 2: 1. Title 2. Price-hold message 3. Pay 4. Back to order
- Labels: the Pay button's spoken name includes the amount ("Pay $62.00"); the notice starts with "Price changed"
- Keyboard: every action works with Tab and Enter; Back to order returns without losing the hold
- Contrast and color: text 4.5:1 including the test-payment helper; the notice uses an icon plus words, never color alone
- Targets: Continue, Pay and Back are full-width buttons at least 44 px tall on a phone
- Errors and status: errors appear above Pay and say no money was taken; "Processing your payment…" and the receipt are announced as status messages; step 1 is the review before the financial commitment (3.3.4)
- Focus not hidden: no sticky bars on these steps

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column, two steps | As drawn; buttons are full width; nothing scrolls sideways |
| 1280 px | One centred column about 560 px wide | The same two steps with more white space; the total sits beside the item list's last line |

## S3 Paid orders (reviewer)

Stories: US-3, US-8 · Flows: F3 step 1 · Key screen: no

### Variants

n/a — not a key screen

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Paid orders                                       (title)     |
| (•) Paid   ( ) Needs review (1)                               |
| Find an order by number                                       |
| [__________]  [Find]                                          |
| ------------------------------------------------------------ |
| Order   Practice              Provider        Amount  Paid at |
| 1042    Willow Creek Wellness Dr. Maya Chen   $60.00  Oct 13  |
| 1041    Willow Creek Wellness Dr. Maya Chen   $30.00  Oct 12  |
| [Show 25 more]                                                |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: no paid orders yet / Filtered: no order with that number, or nothing needs review / Cleared: she clears the search | The list area shows one message; the tabs and search stay | First use: "No paid orders yet." / Filtered: "No order 1099. Check the number and try again." / "Nothing needs review." / Cleared: the full list returns, no message | Search again, or switch tabs |
| Loading | The list is loading | Tabs and search stay; progress after 1 s; explanation after 10 s | "Loading orders…" / after 10 s: "Still loading. Try a narrower search by order number." | Wait, or search by number |
| Error | Their mistake: letters typed in the order number / Our failure: the list could not load / No connection: offline | The message sits under the search box or in the list area | Their mistake: "Order numbers are digits only, like 1042." / Our failure: "We couldn't load orders. Try again." / No connection: "You're offline. Try again when you're back online." | Fix the number, or retry |
| Success | The list loaded | The count above the list | "Showing 25 of 140 paid orders." | Open an order |
| Permission denied | Signed out / not a platform reviewer | Signed out: the sign-in page; wrong role: a message, no orders | Signed out: "You were signed out after 15 minutes without activity." / Wrong role: "Only platform reviewers can see paid orders." | Sign in, or ask platform support for access |
| Edge data | 200 or more orders / a 60-character practice name / an order moved to Needs review | 25 rows at a time with Show 25 more; long names wrap; the Needs review count updates | "Needs review (1)" | Show more; open the review tab |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Paid orders" |
| Primary action | "Find" |
| Secondary action | "Show 25 more" · tabs "Paid" and "Needs review (1)" |
| Field labels and helper text | "Find an order by number" — helper: "Digits only, like 1042." |
| Confirmation | n/a — nothing is changed on this screen |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Paid tab 3. Needs review tab 4. Order number field 5. Find 6. Each order row link in order 7. Show 25 more
- Labels: the order number field has a visible label; each row's link reads "Order 1042, $60.00, paid Oct 13"
- Keyboard: arrow keys move between the two tabs; Enter opens a row
- Contrast and color: text 4.5:1; the Needs review count is written as a number, not shown by color alone
- Targets: tabs and row links at least 24 px tall
- Errors and status: the search error sits under the field and is announced; the "Showing 25 of 140" count is a status message
- Focus not hidden: no sticky header covers the rows

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column of order cards | Each row becomes a card: order number and amount on the first line, practice and date below; the provider moves into the card's second line; nothing scrolls sideways |
| 1280 px | A list with five columns | As drawn |

## S4 Paid order breakdown (reviewer)

Stories: US-3, US-8 · Flows: F3 step 2 · Key screen: yes

### Variants

#### S4-V1 The equation first

```text
1280 px
+--------------------------------------------------------------+
| Paid order · Willow Creek Wellness · Dr. Maya Chen            |
| Order 1042 · paid 2026-10-13 19:30                            |
|                                                               |
|  $60.00 paid  =  $30.00 item cost  +  $29.55 provider payout  |
|                  +  $0.45 platform fee      Adds up: yes      |
| ------------------------------------------------------------ |
| Item            Qty   Unit price   Unit cost   Line cost      |
| Vitamin D3        2       $18.00       $9.00      $18.00      |
| Magnesium Gly.    1       $24.00      $12.00      $12.00      |
| ------------------------------------------------------------ |
| Fee: 0.75% of $60.00 = $0.45, rounded once per order          |
+--------------------------------------------------------------+
```

- Idea: answer "does it add up?" in one line at the top; the lines that prove it sit below.
- Best when: a reviewer checks many orders and needs the answer at a glance.
- Costs: the per-line detail sits lower on the page.
- Fails for: an order with many lines, where the reviewer scrolls to see them all.

#### S4-V2 Where the money went, one row per destination

```text
1280 px
+--------------------------------------------------------------+
| Order 1042 · Willow Creek Wellness · Dr. Maya Chen            |
| Money in                                                      |
|   Patient payment                                 $60.00      |
| Money out                                                     |
|   Item cost to inventory                          $30.00      |
|   Provider payout to Dr. Maya Chen                $29.55      |
|   Platform fee (0.75%)                             $0.45      |
| ------------------------------------------------------------ |
|   Balance                                          $0.00      |
| > Show items                                                  |
+--------------------------------------------------------------+
```

- Idea: read it like a bank statement: money in, money out, balance zero.
- Best when: finance staff used to statements.
- Costs: the items are behind a tap, and "balance $0.00" is one more idea to explain.
- Fails for: a reviewer answering a provider's question about one item's price.

#### S4-V3 Item by item

```text
1280 px
+--------------------------------------------------------------+
| Order 1042 · Willow Creek Wellness · Dr. Maya Chen            |
| Vitamin D3 x2      paid $36.00  cost $18.00  margin $18.00    |
| Magnesium Gly. x1  paid $24.00  cost $12.00  margin $12.00    |
| ------------------------------------------------------------ |
| Totals             paid $60.00  cost $30.00  margin $30.00    |
| Platform fee from margin                     -$0.45           |
| Provider payout                               $29.55          |
+--------------------------------------------------------------+
```

- Idea: show the margin per item, then take the fee from the total margin.
- Best when: providers ask "what did I make on this product?".
- Costs: the "adds up" check is spread over three rows, not one.
- Fails for: a quick audit; the reviewer has to add it up themselves.

**Recommendation:** S4-V1 — the assignment's test is "can we see exactly where every cent went", and the equation answers it in one line, with the evidence right below.

**Chosen:** S4-V1 — "go, then run pass 2" (2026-10-09 21:52 CDT)
**Rejected:** S4-V2 — the items sit behind a tap, and a zero balance is one more idea to explain.
**Rejected:** S4-V3 — the reviewer has to add three rows herself to see whether it balances.
**Why this layout (say it out loud):** The first line answers the auditor's question, does it add up, and the lines that prove it sit right below, with no patient identity anywhere.

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Order 1042                                        (title)     |
| Willow Creek Wellness · Dr. Maya Chen · paid Oct 13, 7:30 PM  |
|                                                               |
|  $60.00 paid  =  $30.00 item cost  +  $29.55 provider payout  |
|                  +  $0.45 platform fee      Adds up: yes      |
| ------------------------------------------------------------ |
| Item                 Qty   Unit price   Unit cost   Line cost |
| Vitamin D3 2000 IU     2       $18.00       $9.00      $18.00 |
| Magnesium Glycinate    1       $24.00      $12.00      $12.00 |
| ------------------------------------------------------------ |
| Fee: 0.75% of $60.00 = $0.45, rounded half-up once per order  |
| > Back to paid orders                                         |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: n/a — a paid order always has at least one line / Filtered: n/a — no filter / Cleared: n/a — nothing to clear | n/a — this screen always shows one order | n/a — no empty moment | n/a |
| Loading | The order is loading | The title shows the order number; progress after 1 s; explanation after 10 s | "Loading order 1042…" / after 10 s: "Still loading. Try again in a moment." | Wait, or go back |
| Error | Their mistake: n/a — nothing to type / Our failure: the order could not load / No connection: offline | A message in place of the breakdown | Their mistake: n/a — nothing to type / Our failure: "We couldn't load order 1042. Try again." / No connection: "You're offline. Try again when you're back online." | Retry, or go back |
| Success | The breakdown loaded and adds up | The equation with "Adds up: yes" | "Adds up: yes" | Go back to the list |
| Permission denied | Signed out / not a platform reviewer | Signed out: the sign-in page; wrong role: a message with no amounts | Signed out: "You were signed out after 15 minutes without activity." / Wrong role: "Only platform reviewers can see order breakdowns." | Sign in, or ask platform support |
| Edge data | An order on the review list whose parts don't add up / a fee on a half cent / 30 lines / a product cost changed after payment | Not adding up: the equation shows the gap in words; half cents: the fee line shows the rounding; many lines: the equation stays at the top and the lines scroll below; costs show the value at payment | "Adds up: no. The parts are $0.01 short of the amount paid. This order is on the review list." / "Fee: 0.75% of $14.00 = $0.105, rounded half-up to $0.11." | Report it from the review list |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Order 1042" |
| Primary action | n/a — read only |
| Secondary action | "Back to paid orders" |
| Field labels and helper text | n/a — no fields |
| Confirmation | n/a — nothing is changed on this screen |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. The equation 3. The item list 4. The fee note 5. Back to paid orders
- Labels: the equation is one sentence for screen readers: "60 dollars paid equals 30 dollars item cost plus 29 dollars 55 provider payout plus 45 cents platform fee. Adds up: yes."
- Keyboard: Tab reaches the back link; the item list is a real list with column headers
- Contrast and color: text 4.5:1; "Adds up: yes" and "Adds up: no" are words, never only a green or red mark
- Targets: the back link at least 24 px tall
- Errors and status: "Adds up: no" sits next to the equation and says what to do
- Focus not hidden: no sticky bars

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | The equation stacks as four lines (paid, item cost, payout, fee) with "Adds up" below; each item becomes a card with its quantity, price and cost; nothing scrolls sideways |
| 1280 px | Equation above the item list | As drawn |

## S5 Practice prices

Stories: US-4 · Flows: F4 steps 1-3 · Key screen: no

### Variants

n/a — not a key screen

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Practice prices · Willow Creek Wellness           (title)     |
| Product              Cost     Price    Margin   Set by        |
| Vitamin D3 2000 IU   $9.00    $18.00   50%      Default       |
|                                         [Change price]        |
| Omega-3 Fish Oil     $15.00   $37.50   60%      Dr. Maya Chen |
|                                         [Change price]        |
| ------------------------------------------------------------ |
| Change price: Omega-3 Fish Oil          (dialog)              |
|   Enter one:                                                  |
|   (•) New price   [ $37.50 ]                                  |
|   ( ) Margin %    [____]                                      |
|   Lowest allowed price: $15.11                                |
|   Reason (required)                                           |
|   [ new protocol pricing         ]                            |
|   [Save new price]   [Cancel]                                 |
| ------------------------------------------------------------ |
| Price history                                                 |
| Oct 9, 3:05 PM  Dr. Maya Chen  Omega-3  $30.00 to $37.50      |
|                 "new protocol pricing"                        |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: no price has been changed yet / Filtered: n/a — no filter / Cleared: n/a — history can't be cleared | The price list is full; the history area shows one line | First use: "No changes yet. Every price is the default." / Filtered: n/a — no filter / Cleared: n/a — history is permanent | Change a price |
| Loading | Prices or history are loading, or a change is saving | The list stays; progress after 1 s; the Save button is disabled while saving | "Loading prices…" / "Saving…" / after 10 s: "Still saving. Don't close this window." | Wait |
| Error | Their mistake: price below the lowest allowed, both or neither field filled, no reason / Our failure: the change didn't save / No connection: offline | Errors sit under the field in the dialog; typed values are kept | Their mistake: "That price is below the lowest allowed, $15.11. Enter $15.11 or more." / "Enter a new price or a margin, not both." / "Add a reason so others know why the price changed." / Our failure: "We couldn't save the new price. The old price still applies. Try again." / No connection: "You're offline. The old price still applies." | Fix the field, or retry |
| Success | The new price saved | The dialog closes; the row shows the new price and "Set by Dr. Maya Chen"; a new history line | "Omega-3 Fish Oil is now $37.50. Orders not yet in checkout will show the new price." | Change it again (each change is recorded); there is no silent undo |
| Permission denied | Signed out / not a provider at this practice | Signed out: the sign-in page; wrong role: a message, no prices | Signed out: "You were signed out after 15 minutes without activity." / Wrong role: "Only providers at this practice can change its prices." | Sign in, or ask the practice |
| Edge data | Margin of 99% / margin of 0% / a 60-character product name / two providers change one price at once / 200 history lines | 99%: the resulting price shows before saving; 0%: the floor error; long names wrap; a second save shows the latest price first; history shows 25 lines at a time | "A 99% margin makes the price $1,500.00. Check before saving." / "Dr. Sam Lee changed this price to $36.00 a moment ago. Check it before saving yours." / "Show 25 more" | Confirm, adjust, or reload |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Practice prices · Willow Creek Wellness" |
| Primary action | "Save new price" |
| Secondary action | "Change price" (per row) · "Cancel" |
| Field labels and helper text | "New price" — helper: "In dollars, like 37.50." · "Margin %" — helper: "Share of the patient price you keep before the platform fee." · "Reason (required)" — helper: "Shown in the price history." |
| Confirmation | "Omega-3 Fish Oil is now $37.50. Orders not yet in checkout will show the new price." |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Each row's Change price in list order 3. In the dialog: New price option 4. its field 5. Margin option 6. its field 7. Reason 8. Save new price 9. Cancel, then the price history
- Labels: every field has a visible label; each Change price button's spoken name names its product
- Keyboard: Esc and Cancel close the dialog and return focus to the row's Change price; Enter saves
- Contrast and color: text 4.5:1 including helpers and the lowest-allowed line; "Default" is a word, not a color
- Targets: Change price and the option circles at least 24×24 px
- Errors and status: errors name the field and the fix; the success line is announced without moving focus; the dialog's Save is the review before the change (3.3.4)
- Focus not hidden: the dialog sits above the page and keeps focus inside until closed

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | Each product becomes a card with cost, price and margin; the dialog becomes a full-screen sheet; the history sits below; nothing scrolls sideways |
| 1280 px | List, dialog over it, history below | As drawn |

## S6 Practice dashboard

Stories: US-5, US-1 · Flows: F5 steps 1-3 · Key screen: no

### Variants

n/a — not a key screen

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Practice dashboard · Willow Creek Wellness        (title)     |
| Month [October 2026 v]                                        |
| Needs attention                                               |
| ! Ben Ortiz · $30.00 · awaiting payment for 4 days            |
| ! Omega-3 Fish Oil · low stock: 3 left                        |
| ------------------------------------------------------------ |
| Orders                                                        |
| Patient     Total    Status        Sent         Paid          |
| Ana Ruiz    $60.00   Paid          Oct 12 10:00 Oct 13 7:30   |
| Ben Ortiz   $30.00   Sent          Oct 10 9:15  -             |
|                                          [Cancel order]       |
| [Show 25 more]                                                |
| ------------------------------------------------------------ |
| Sales and stock                                               |
| Product              Sold   Patients paid  Your payout  Stock |
| Vitamin D3 2000 IU      3        $54.00       $26.59      8  |
| Omega-3 Fish Oil        0         $0.00        $0.00      3  |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: the practice has no orders yet / Filtered: no orders in the chosen month / Cleared: n/a — no filter to clear beyond the month | Each section shows its own message; stock still shows | First use: "No orders yet. Send one from a patient's chart." / Filtered: "No orders were sent in September 2026." / "Nothing needs attention." / Cleared: n/a — the month always has a value | Pick another month, or open a chart |
| Loading | The month's data is loading | The title and month picker stay; each section shows progress after 1 s | "Loading October 2026…" / after 10 s: "Still loading. Stock counts appear first." | Wait, or pick another month |
| Error | Their mistake: cancelling an order whose checkout has started or that is paid / Our failure: a section could not load, or the cancel didn't save / No connection: offline | The message replaces only the section that failed, or sits on the order's row | Their mistake: "This order can't be cancelled: the patient has started checkout." / "This order is paid, so it can't be cancelled." / Our failure: "We couldn't load your orders. Try again." / "We couldn't cancel the order. It is unchanged. Try again." / No connection: "You're offline. Showing nothing until you're back online." | Retry that section, or leave the order as it is |
| Success | The month loaded / an order was cancelled | The month name above the sections; a cancelled order shows "Cancelled" | "Showing October 2026." / "Order 1043 cancelled. Ben Ortiz will see that your practice cancelled it." | Open an order's patient chart; pick another month; a cancel can't be undone, so send a new order instead |
| Permission denied | Signed out / not a provider at this practice | Signed out: the sign-in page; wrong role: a message, no data | Signed out: "You were signed out after 15 minutes without activity." / Wrong role: "Only providers at Willow Creek Wellness can see this dashboard." | Sign in, or ask the practice |
| Edge data | 200 orders in a month / payment failed / an order needs review / a 60-character patient or product name / stock at 0 | 25 orders at a time; the status is written out; long names wrap; stock 0 shows "Out of stock" and an attention line | "Payment failed" / "Needs review" / "Omega-3 Fish Oil · out of stock" / "Show 25 more" | Show more; follow up with the patient |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Practice dashboard · Willow Creek Wellness" |
| Primary action | Month picker: "Month" |
| Secondary action | "Show 25 more" · "Cancel order" (on a sent or payment-failed order) · "Keep order" |
| Field labels and helper text | "Month" — helper: n/a |
| Confirmation | "Cancel Ben Ortiz's $30.00 order? Ben will see that your practice cancelled it. This can't be undone." with [Cancel order] [Keep order] |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Month picker 3. Each Needs attention line 4. Orders list rows, each with its Cancel order button when shown 5. Show 25 more 6. Sales and stock list; the confirmation dialog keeps focus until Cancel order or Keep order
- Labels: the month picker has a visible label; each attention line starts with its kind ("Awaiting payment", "Low stock")
- Keyboard: the month picker opens with Enter and arrows; every row is reachable with Tab
- Contrast and color: text 4.5:1; status and alerts are words plus a "!" mark, never color alone
- Targets: rows and Show 25 more at least 24 px tall
- Errors and status: section errors are announced; "Showing October 2026." is a status message
- Focus not hidden: no sticky bars

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column of sections | Needs attention first; orders and products become cards; the sold, paid and payout figures stack inside each product card; nothing scrolls sideways |
| 1280 px | Three stacked sections | As drawn; lists use full width |

## S7 Stock adjustments (platform staff)

Stories: US-5 · Flows: F6 steps 1-2 · Key screen: no

### Variants

n/a — not a key screen

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Stock adjustments                                 (title)     |
| Product              In stock                                 |
| Vitamin D3 2000 IU      8      [Record a change]              |
| Omega-3 Fish Oil        3      [Record a change]              |
| ------------------------------------------------------------ |
| Record a change: Vitamin D3 2000 IU                           |
|   Change in units (use a minus for removals)                  |
|   [ +12 ]                                                     |
|   Reason (required)                                           |
|   [ delivery received            ]                            |
|   [Save stock change]   [Cancel]                              |
| ------------------------------------------------------------ |
| Stock history                                                 |
| Oct 9, 4:10 PM  Sam Staff  Vitamin D3  +12  delivery received |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: no changes recorded yet / Filtered: n/a — no filter / Cleared: n/a — history can't be cleared | The product list is full; the history shows one line | First use: "No stock changes recorded yet." / Filtered: n/a — no filter / Cleared: n/a — history is permanent | Record a change |
| Loading | Stock or history is loading, or a change is saving | The list stays; progress after 1 s; Save disabled while saving | "Loading stock…" / "Saving…" / after 10 s: "Still saving. Don't close this window." | Wait |
| Error | Their mistake: not a whole number, a change below zero stock, or no reason / Our failure: the change didn't save / No connection: offline | Errors sit under the field; typed values are kept | Their mistake: "Enter a whole number, like 12 or -3." / "That would take stock below 0. 8 are in stock." / "Add a reason so others know why stock changed." / Our failure: "We couldn't save the change. Stock is still 8. Try again." / No connection: "You're offline. Stock is unchanged." | Fix the field, or retry |
| Success | The change saved | The count updates and a history line appears | "Vitamin D3 2000 IU stock is now 20." | Record another change; a mistake is fixed with a new opposite change |
| Permission denied | Signed out / a provider or anyone not platform staff | Signed out: the sign-in page; wrong role: a message, no stock form | Signed out: "You were signed out after 15 minutes without activity." / Wrong role: "Only platform staff can change stock." | Sign in, or ask platform support |
| Edge data | A sale lowers stock while the form is open / a change of +10,000 / 200 history lines | The new count shows with a note before saving; a very large change asks to confirm; history pages by 25 | "Stock changed while you were here. It's now 7. Check your change." / "Add 10,000 units? Check before saving." / "Show 25 more" | Check and save, or cancel |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Stock adjustments" |
| Primary action | "Save stock change" |
| Secondary action | "Record a change" (per row) · "Cancel" |
| Field labels and helper text | "Change in units (use a minus for removals)" — helper: "Like 12 or -3." · "Reason (required)" — helper: "Shown in the stock history." |
| Confirmation | "Vitamin D3 2000 IU stock is now 20." |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Each row's Record a change in list order 3. Change in units 4. Reason 5. Save stock change 6. Cancel 7. Stock history
- Labels: both fields have visible labels; each Record a change button's spoken name names its product
- Keyboard: Esc and Cancel close the form and return focus to the row; Enter saves
- Contrast and color: text 4.5:1 including helpers; plus and minus are written signs, not colors
- Targets: Record a change, Save and Cancel at least 24×24 px
- Errors and status: errors name the field and the fix; the new count is announced as a status message
- Focus not hidden: the form opens in place under its row, nothing sticky covers it

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | Each product is a card; the form opens as a full-screen sheet; history below; nothing scrolls sideways |
| 1280 px | List, form under the chosen row, history below | As drawn |

## S8 Sign in

Stories: US-8 · Flows: F2 step 2, F7 steps 1-3 · Key screen: no

### Variants

n/a — not a key screen

### Layout

```text
375 px
+--------------------------------+
| Sign in                (title) |
| Test accounts only: no real    |
| identity check.                |
| Email                          |
| [ pat.example@example.test ]    |
| Password                       |
| [________________]  [Show]     |
| [Sign in]                      |
| Questions? Contact your        |
| practice                       |
+--------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: the form opens blank / Filtered: n/a — no filter / Cleared: n/a — nothing to clear | Blank fields with labels | First use: "Sign in to continue." / Filtered: n/a — no filter / Cleared: n/a — nothing to clear | Type email and password |
| Loading | Checking the sign-in | The form stays; the button shows progress | "Signing you in…" / after 10 s: "Still signing you in. Try again if nothing happens." | Wait |
| Error | Their mistake: details not recognised, or a field left blank / Our failure: sign-in is unavailable / No connection: offline | The message sits above the form; the email is kept, the password is cleared | Their mistake: "That email and password don't match. Check them and try again." / "Enter your email." / Our failure: "We couldn't sign you in right now. Try again in a moment." / No connection: "You're offline. Try again when you're back online." | Fix and retry |
| Success | Signed in | The page asked for opens, or the role's home | n/a — the next page's title is the confirmation | Continue |
| Permission denied | Signed out after 15 idle minutes / asked for a page the role can't open | The sign-in form with an explanation; after sign-in, a wrong-role page shows its own message | Idle: "You were signed out after 15 minutes without activity." / Wrong role, after sign-in: "Your account can't open that page. Here is your own work." | Sign in again |
| Edge data | A 60-character email / a pasted password / a password manager fills the form / Sign in pressed twice | Long emails stay inside the field; paste and password managers work; one sign-in happens | n/a — no extra text | Continue |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Sign in" |
| Primary action | "Sign in" |
| Secondary action | "Show" (password) |
| Field labels and helper text | "Email" · "Password" — helper: "Test accounts only: no real identity check." |
| Confirmation | n/a — the next page opens |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Email 3. Password 4. Show 5. Sign in
- Labels: visible labels; the Show button's spoken name is "Show password"
- Keyboard: Enter signs in from either field
- Contrast and color: text 4.5:1 including the test-accounts line; field borders and focus ring 3:1
- Targets: Show and Sign in at least 24×24 px (Sign in full width on a phone)
- Errors and status: errors sit above the form and are announced; paste and password managers are allowed, with no puzzle or memory test (3.3.8)
- Focus not hidden: no sticky bars

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | As drawn; full-width button; nothing scrolls sideways |
| 1280 px | One centred column about 400 px wide | Same form with white space around it |

## S9 Order notice (stand-in message)

Stories: US-1, US-8 · Flows: F2 step 1 · Key screen: no

### Variants

n/a — not a key screen

### Layout

```text
375 px
+--------------------------------+
| Message from Willow Creek      |
| Wellness               (title) |
| Willow Creek Wellness sent you |
| a supplement order. Sign in to |
| view and pay.                  |
| [Sign in to view]              |
| Stand-in message: in a real    |
| launch this arrives by email   |
| or text.                       |
+--------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: n/a — a notice exists only for a sent order / Filtered: n/a — no filter / Cleared: n/a — nothing to clear | n/a — always one message | n/a — no empty moment | n/a |
| Loading | n/a — the message is fixed text | n/a — nothing to wait for | n/a — nothing loads | n/a |
| Error | Their mistake: n/a — nothing to type / Our failure: the sign-in page is down after tapping, shown on S8 / No connection: offline when tapping | The phone's own offline message, or S8's error | Their mistake: n/a — nothing to type / Our failure: n/a — handled on S8 / No connection: n/a — the device shows its own message | Tap again later |
| Success | She taps Sign in to view | The sign-in page opens | n/a — S8's title is the confirmation | Sign in |
| Permission denied | n/a — the message holds nothing private, so anyone holding it may read it | The same message | n/a — nothing is hidden here | Sign in as herself |
| Edge data | The message is forwarded / an old message after the order was paid / a 60-character practice name | A forwarded reader sees only the practice name; after sign-in, a paid order shows its receipt; long names wrap | n/a — the same text for everyone | Sign in |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Message from Willow Creek Wellness" |
| Primary action | "Sign in to view" |
| Secondary action | n/a |
| Field labels and helper text | n/a — no fields; helper: "Stand-in message: in a real launch this arrives by email or text." |
| Confirmation | n/a |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Title 2. Message text 3. Sign in to view
- Labels: the button says where it goes
- Keyboard: Enter on the button opens sign-in
- Contrast and color: text 4.5:1 including the stand-in note
- Targets: the button full width, at least 44 px tall
- Errors and status: n/a — no errors on this screen
- Focus not hidden: no sticky bars

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One message card | As drawn; nothing scrolls sideways |
| 1280 px | One centred card about 480 px wide | Same card with white space |

## S10 Platform health dashboard

Stories: US-6, US-10 · Flows: F8 steps 1-2 · Key screen: yes

### Variants

#### S10-V1 Alerts first, then measures

```text
1280 px
+--------------------------------------------------------------+
| Platform health                Month [October 2026 v]         |
| Needs attention                                               |
| ! Orders needing review: 1 (alert line 1)                     |
| ------------------------------------------------------------ |
| Sent-to-paid 80%  | Median time to pay 20 h | Failed pay 1    |
| Expired checkouts 1 | Out-of-stock refusals 0 | Review 1      |
| ------------------------------------------------------------ |
| In-house volume by practice                                   |
| Willow Creek Wellness   $240.00 paid   $1.80 fees   5 sent    |
+--------------------------------------------------------------+
```

- Idea: what needs attention sits on top; every measure is a tile below it.
- Best when: the reader checks alerts daily and wants the answer in one glance.
- Costs: tiles show values but not how orders flow from one step to the next.
- Fails for: finding the step where most orders stall.

#### S10-V2 Order funnel with alerts

```text
1280 px
+--------------------------------------------------------------+
| Platform health                Month [October 2026 v]         |
| ! 1 measure needs attention: orders needing review            |
| Order funnel                                                  |
| Sent              10  ##########                              |
| Checkout started   9  #########   (1 never opened)            |
| Paid               8  ########    (1 failed, 1 expired)       |
| Median time from sent to paid: 20 h                           |
| ------------------------------------------------------------ |
| Out-of-stock refusals 0 · Needing review 1 (needs attention)  |
| In-house volume by practice                                   |
| Willow Creek Wellness   $240.00 paid   $1.80 fees   5 sent    |
+--------------------------------------------------------------+
```

- Idea: show the orders as a funnel, so the step where the count drops is the bottleneck.
- Best when: the question is "where do orders get stuck?"
- Costs: a funnel takes more space than tiles; small numbers make the bars look jumpy.
- Fails for: a month with very few orders, where one order swings the picture.

#### S10-V3 Measures against their alert lines

```text
1280 px
+--------------------------------------------------------------+
| Platform health                Month [October 2026 v]         |
| Measure                 Value   Alert line   Status           |
| Sent-to-paid rate        80%    after 30 days  Learning       |
| Median time to pay       20 h   after 30 days  Learning       |
| Failed payments           1     after 30 days  Learning       |
| Orders needing review     1     1              Needs attention|
| ------------------------------------------------------------ |
| In-house volume by practice                                   |
| Willow Creek Wellness   $240.00 paid   $1.80 fees   5 sent    |
+--------------------------------------------------------------+
```

- Idea: one row per measure with its alert line beside it, so it is clear why something is flagged.
- Best when: the team is tuning alert lines (A-11 sets them after 30 days).
- Costs: a list of numbers; the flow of orders is hard to see.
- Fails for: a reader who wants the story at a glance.

**Recommendation:** S10-V2 — you asked for a dashboard that shows bottlenecks, and a funnel is the one layout where the bottleneck is literally the step where the count drops; alerts still sit at the top.

**Chosen:** S10-V2 — "go, then run pass 2" (2026-10-09 22:31 CDT)
**Rejected:** S10-V1 — tiles show values but not how orders flow, so the stalling step is hidden.
**Rejected:** S10-V3 — a list of measures against alert lines reads as a wall of numbers.
**Why this layout (say it out loud):** The order funnel makes the bottleneck visible as the step where the count drops, with anything past its alert line pinned on top.

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Platform health                Month [October 2026 v]         |
| ! 1 measure needs attention: orders needing review (1)        |
| Order funnel                                                  |
| Sent              10  ##########                              |
| Checkout started   9  #########   1 never opened              |
| Paid               8  ########    1 failed, 1 expired         |
| Median time from sent to paid: 20 h                           |
| ------------------------------------------------------------ |
| Out-of-stock refusals 0 · Orders needing review 1             |
| In-house volume by practice                                   |
| Practice                Paid      Fees    Sent   Paid orders  |
| Willow Creek Wellness   $240.00   $1.80    5      4           |
| Totals only: single orders open in Paid orders.               |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: no orders ever / Filtered: no orders in the chosen month / Cleared: n/a — the month always has a value | The funnel shows zeros with one message; the volume list is empty | First use: "No orders yet. Figures appear after the first order is sent." / Filtered: "No orders were sent in September 2026." / Cleared: n/a — nothing to clear | Pick another month |
| Loading | The month's figures are loading | Title and month picker stay; progress after 1 s; explanation after 10 s | "Loading October 2026…" / after 10 s: "Still loading. Large months take longer." | Wait, or pick another month |
| Error | Their mistake: n/a — the month picker only offers valid months / Our failure: figures could not load / No connection: offline | The message replaces the funnel and list | Their mistake: n/a — nothing to type / Our failure: "We couldn't load October's figures. Try again." / No connection: "You're offline. Try again when you're back online." | Retry |
| Success | The month loaded | The month name and the funnel | "Showing October 2026." | Pick another month |
| Permission denied | Signed out / a provider or patient / the data analyst tries to open a single order | Signed out: the sign-in page; wrong role: a message, no figures; analyst: a note, no order | Signed out: "You were signed out after 15 minutes without activity." / Wrong role: "Only operations staff can see platform health." / Analyst: "Your role shows totals only." | Sign in, or use totals |
| Edge data | A month with 1 order / 200 practices / an alert line not yet set / every measure needs attention | One order: counts shown as numbers with the bars; practices page by 25; unset lines say so; several alerts list one per line | "Few orders this month; read the counts, not the bars." / "Alert line set after 30 days of orders." / "Show 25 more" | Show more |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Platform health" |
| Primary action | Month picker: "Month" |
| Secondary action | "Show 25 more" |
| Field labels and helper text | "Month" — helper: n/a |
| Confirmation | n/a — nothing is changed on this screen |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Month picker 3. Needs attention line 4. Funnel steps in order 5. Other measures 6. Volume list rows 7. Show 25 more
- Labels: each funnel bar is read as text ("Paid, 8 of 10 sent; 1 failed, 1 expired"); the bars are decorative
- Keyboard: the month picker opens with Enter and arrows; no other controls
- Contrast and color: text 4.5:1; bars 3:1 against the background; "needs attention" is words plus "!", never color alone
- Targets: month picker and Show 25 more at least 24 px tall
- Errors and status: errors are announced; "Showing October 2026." is a status message
- Focus not hidden: no sticky bars

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | The funnel stays as stacked rows with counts; each practice becomes a card; nothing scrolls sideways |
| 1280 px | Funnel above the volume list | As drawn |

## S11 Financial report

Stories: US-9 · Flows: F9 steps 1-3 · Key screen: yes

### Variants

#### S11-V1 The balance equation first

```text
1280 px
+--------------------------------------------------------------+
| Financial report        Period [October 2026 v]  [Export]     |
|  $90.00 patient payments = $45.00 item cost                   |
|     + $44.32 provider payouts + $0.68 platform fees           |
|                                          Balanced: yes        |
| ------------------------------------------------------------ |
| Revenue, two views (your accountant decides which applies)    |
|   Gross: $90.00 (all patient payments)                        |
|   Net:   $0.68  (platform fees only)                          |
| ------------------------------------------------------------ |
| Payouts by provider                                           |
|   Dr. Maya Chen · Willow Creek Wellness        $44.32         |
+--------------------------------------------------------------+
```

- Idea: the same "does it add up" line as the order breakdown (S4), now for a whole period.
- Best when: closing the month and answering "does it balance?" first.
- Costs: the itemized orders live in the export, not on screen.
- Fails for: someone hunting one order on screen; they use Paid orders (S3) instead.

#### S11-V2 Statement lines

```text
1280 px
+--------------------------------------------------------------+
| Financial report        Period [October 2026 v]  [Export]     |
| Patient payments                              $90.00          |
|   less item cost                             -$45.00          |
|   less provider payouts                      -$44.32          |
| Platform fees                                  $0.68          |
| Check: payments minus parts                    $0.00  OK      |
| Gross revenue $90.00 · Net revenue $0.68                      |
| Payouts by provider: Dr. Maya Chen $44.32                     |
+--------------------------------------------------------------+
```

- Idea: read it like an income statement, top to bottom.
- Best when: the reader is an accountant used to statements.
- Costs: "minus parts equals zero" is one more idea; gross and net sit on one line.
- Fails for: a non-finance reviewer.

#### S11-V3 Summary above itemized orders

```text
1280 px
+--------------------------------------------------------------+
| Financial report        Period [October 2026 v]  [Export]     |
| Payments $90.00 · Cost $45.00 · Payouts $44.32 · Fees $0.68   |
| Balanced: yes · Gross $90.00 · Net $0.68                      |
| ------------------------------------------------------------ |
| Order   Provider        Paid     Cost    Payout   Fee         |
| 1042    Dr. Maya Chen   $60.00   $30.00  $29.55   $0.45       |
| 1043    Dr. Maya Chen   $30.00   $15.00  $14.77   $0.23       |
+--------------------------------------------------------------+
```

- Idea: Stripe's two layers on one page: totals, then every order behind them.
- Best when: auditing a small period line by line.
- Costs: a busy month means a long page.
- Fails for: a month with thousands of orders.

**Recommendation:** S11-V1 — it matches the order breakdown the reviewer already knows, answers "does it balance" first, and gives gross and net their own labelled lines; the export carries every order.

**Chosen:** S11-V1 — "go, then run pass 2" (2026-10-09 22:31 CDT)
**Rejected:** S11-V2 — statement lines suit accountants but hide gross and net on one line.
**Rejected:** S11-V3 — every order on screen becomes unreadable in a busy month.
**Why this layout (say it out loud):** The finance lead sees first whether the month balances to the cent, then revenue two ways because that's an accountant's call, and the export carries every order.

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Financial report     Period [October 2026 v] [Export October] |
|  $90.00 patient payments = $45.00 item cost                   |
|     + $44.32 provider payouts + $0.68 platform fees           |
|                                          Balanced: yes        |
| ------------------------------------------------------------ |
| Revenue, two views (your accountant decides which applies)    |
|   Gross: $90.00  all patient payments                         |
|   Net:   $0.68   platform fees only                           |
| ------------------------------------------------------------ |
| Payouts by provider                                           |
|   Dr. Maya Chen · Willow Creek Wellness        $44.32         |
| Records are kept for at least 3 years.                        |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: no paid orders ever / Filtered: no paid orders in the period / Cleared: n/a — the period always has a value | Every total shows $0.00 and the report is balanced; the payouts list says none | First use: "No paid orders yet. Every total is $0.00." / Filtered: "No orders were paid in September 2026. Every total is $0.00." / Cleared: n/a — nothing to clear | Pick another period |
| Loading | The report is building, or the export is being prepared | Title and period stay; progress after 1 s; the Export button shows progress | "Building October 2026…" / "Preparing your export…" / after 10 s: "Still building. Large periods take longer." | Wait |
| Error | Their mistake: n/a — the period picker only offers valid periods / Our failure: the report or export failed / No connection: offline | The message replaces the report, or sits beside Export | Their mistake: n/a — nothing to type / Our failure: "We couldn't build the report. Try again." / "We couldn't prepare the export. Nothing was downloaded. Try again." / No connection: "You're offline. Try again when you're back online." | Retry |
| Success | The report built, or the export downloaded | The equation with "Balanced: yes"; after export, a confirmation | "Balanced: yes" / "Exported October 2026: 4 totals and 2 orders." | Export, or pick another period |
| Permission denied | Signed out / anyone other than the finance lead | Signed out: the sign-in page; other roles: a message with no figures | Signed out: "You were signed out after 15 minutes without activity." / Other role: "Only the finance lead can run financial reports." | Sign in, or ask the finance lead |
| Edge data | The period does not balance / 50 providers / 10,000 orders in the export / a custom date range across months | Not balanced: the equation shows the gap and names the orders; providers page by 25; large exports take longer with progress; ranges show both dates | "Not balanced: $0.01 short. Order 2001 causes the gap and is on the review list." / "Show 25 more" | Open the review list; export anyway |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Financial report" |
| Primary action | "Export October" (names the chosen period) |
| Secondary action | Period picker: "Period" · "Show 25 more" |
| Field labels and helper text | "Period" — helper: "A month, or choose a start and end date." |
| Confirmation | "Exported October 2026: 4 totals and 2 orders." |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Period picker 3. Export 4. The balance equation 5. Revenue, two views 6. Payouts by provider
- Labels: the equation is one sentence for screen readers ending "Balanced: yes"; Export's name includes the period
- Keyboard: Tab and Enter reach the picker and Export; no dialogs
- Contrast and color: text 4.5:1; "Balanced: yes" and "Not balanced" are words, never color alone
- Targets: Export and the picker at least 24 px tall
- Errors and status: errors name what failed and that nothing was downloaded; the export confirmation is a status message
- Focus not hidden: no sticky bars

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | The equation stacks as five lines; gross and net stack; each provider is a card; Export stays at the top; nothing scrolls sideways |
| 1280 px | Equation, revenue, payouts in order | As drawn |

## S12 Operations access

Stories: US-10 · Flows: F10 steps 1-2 · Key screen: yes

### Variants

#### S12-V1 People list, one role each

```text
1280 px
+--------------------------------------------------------------+
| Operations access                                 (title)     |
| Person          Role                    Since                 |
| Fran Fields     Finance lead            Oct 1   [Change role] |
| Omar Ortega     Operations specialist   Oct 1   [Change role] |
| Sam Reyes       SRE                     Oct 1   (you)         |
| Dana Ito        No role                 -       [Change role] |
| ------------------------------------------------------------ |
| Change role: Dana Ito                                         |
|   Role [Data analyst v]                                       |
|   Reason (required) [ new hire                     ]          |
|   [Save role]  [Cancel]                                       |
+--------------------------------------------------------------+
```

- Idea: one row per person, one role each, changed with a reason.
- Best when: a small team where you think in people.
- Costs: you can't see a role's members at a glance.
- Fails for: a large team with many people per role.

#### S12-V2 Roles with their members

```text
1280 px
+--------------------------------------------------------------+
| Operations access                                 (title)     |
| Finance lead           Fran Fields              [Add person]  |
| Operations specialist  Omar Ortega              [Add person]  |
| SRE                    Sam Reyes                              |
| Data analyst           (nobody)                 [Add person]  |
| ------------------------------------------------------------ |
| Add to Data analyst                                           |
|   Person [Dana Ito v]   Reason [ new hire          ]          |
|   [Save role]  [Cancel]                                       |
+--------------------------------------------------------------+
```

- Idea: four role cards, each listing its people.
- Best when: checking who holds a powerful role.
- Costs: moving a person between roles is two actions (remove, then add).
- Fails for: one person changing job.

**Recommendation:** S12-V1 — with four people and one role each, a people list is the simplest way to see and change access, and each change asks for a reason.

**Chosen:** S12-V1 — "go, then run pass 2" (2026-10-09 22:31 CDT)
**Rejected:** S12-V2 — moving one person between roles takes two actions.
**Why this layout (say it out loud):** A small team thinks in people, so each person shows one role, and every change needs a reason that the finance lead later reviews.

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Operations access                                 (title)     |
| Person          Role                    Since                 |
| Fran Fields     Finance lead            Oct 1   [Change role] |
| Omar Ortega     Operations specialist   Oct 1   [Change role] |
| Sam Reyes       SRE                     Oct 1   (you)         |
| Dana Ito        No role                 -       [Change role] |
| ------------------------------------------------------------ |
| Change role: Dana Ito                          (dialog)       |
|   Role [Data analyst v]                                       |
|   Reason (required)                                           |
|   [ new hire                                   ]              |
|   [Save role]  [Cancel]                                       |
| Every change appears in the access log for the finance lead.  |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: only the SRE has a role / Filtered: n/a — no filter / Cleared: n/a — nothing to clear | The list shows the SRE and anyone without a role | First use: "Only you have a role so far. Give others the role their work needs." / Filtered: n/a — no filter / Cleared: n/a — nothing to clear | Change a role |
| Loading | The list is loading, or a change is saving | The list stays; Save disabled while saving | "Loading people…" / "Saving…" / after 10 s: "Still saving. Don't close this window." | Wait |
| Error | Their mistake: no reason / Our failure: the change didn't save / No connection: offline | Errors sit under the field; the choice is kept | Their mistake: "Add a reason so the finance lead knows why." / Our failure: "We couldn't save the role. Dana's access is unchanged. Try again." / No connection: "You're offline. Access is unchanged." | Fix, or retry |
| Success | The role saved | The row shows the new role and today's date | "Saved. Dana Ito is now Data analyst. The finance lead will see this in the access log." | Change another role |
| Permission denied | Signed out / anyone but the SRE / the SRE on their own row | Signed out: the sign-in page; others: a message; own row: no Change role button and a note | Signed out: "You were signed out after 15 minutes without activity." / Others: "Only the SRE can change operations roles." / Own row: "You can't change your own role." | Sign in, or ask another administrator |
| Edge data | Removing the last finance lead / a 60-character name / two changes at once to one person | A confirmation before leaving no finance lead; long names wrap; the second save shows the latest role first | "No one will be able to run financial reports. Remove anyway?" / "Omar Ortega was changed a moment ago to Operations specialist. Check before saving." | Confirm, or cancel |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Operations access" |
| Primary action | "Save role" |
| Secondary action | "Change role" (per row) · "Cancel" |
| Field labels and helper text | "Role" — helper: "Finance lead, Operations specialist, SRE, Data analyst or No role." · "Reason (required)" — helper: "Shown in the access log." |
| Confirmation | "Saved. Dana Ito is now Data analyst. The finance lead will see this in the access log." |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Each row's Change role in list order 3. In the dialog: Role 4. Reason 5. Save role 6. Cancel
- Labels: each Change role button's spoken name names its person; both fields have visible labels
- Keyboard: Esc and Cancel close the dialog and return focus to the row; Enter saves
- Contrast and color: text 4.5:1 including helpers; "(you)" is a word
- Targets: Change role, Save and Cancel at least 24×24 px
- Errors and status: errors name the field; the saved message is announced; the removal confirmation is the review step for a binding change (3.3.4)
- Focus not hidden: the dialog keeps focus inside until closed

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | Each person is a card; the dialog becomes a full-screen sheet; nothing scrolls sideways |
| 1280 px | List with the dialog over it | As drawn |

## S13 Access log

Stories: US-10 · Flows: F11 step 1 · Key screen: no

### Variants

n/a — not a key screen

### Layout

```text
1280 px
+--------------------------------------------------------------+
| Access log                     Month [October 2026 v]         |
| When           Who acted   For        Change          Reason  |
| Oct 20 9:12    Sam Reyes   Dana Ito   No role to      new hire|
|                                       Data analyst            |
| [Show 25 more]                                                |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: no role has ever changed / Filtered: none in the chosen month / Cleared: n/a — the month always has a value | The list area shows one message | First use: "No role changes yet." / Filtered: "No roles changed in September 2026." / Cleared: n/a — nothing to clear | Pick another month |
| Loading | The log is loading | Title and month stay; progress after 1 s | "Loading the access log…" / after 10 s: "Still loading." | Wait |
| Error | Their mistake: n/a — nothing to type / Our failure: the log could not load / No connection: offline | A message in place of the list | Their mistake: n/a — nothing to type / Our failure: "We couldn't load the access log. Try again." / No connection: "You're offline. Try again when you're back online." | Retry |
| Success | The log loaded | The count above the list | "3 role changes in October 2026." | Pick another month |
| Permission denied | Signed out / anyone other than the finance lead | Signed out: the sign-in page; others: a message, no entries | Signed out: "You were signed out after 15 minutes without activity." / Others: "Only the finance lead reviews the access log." | Sign in |
| Edge data | 200 changes / a long reason / a change the SRE tried on their own account | Pages of 25; long reasons wrap; refused attempts are listed and marked | "Refused: Sam Reyes tried to change his own role." / "Show 25 more" | Show more; ask the SRE why |

### Microcopy

| Element | Text |
|---|---|
| Page title | "Access log" |
| Primary action | Month picker: "Month" |
| Secondary action | "Show 25 more" |
| Field labels and helper text | "Month" — helper: n/a |
| Confirmation | n/a — nothing is changed on this screen |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Month picker 3. Each log entry in time order 4. Show 25 more
- Labels: each entry is read as one sentence ("October 20, Sam Reyes changed Dana Ito from No role to Data analyst: new hire")
- Keyboard: the month picker opens with Enter and arrows
- Contrast and color: text 4.5:1; "Refused" is a word
- Targets: month picker and Show 25 more at least 24 px tall
- Errors and status: errors are announced; the count is a status message
- Focus not hidden: no sticky bars

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | Each entry is a card with the time first; nothing scrolls sideways |
| 1280 px | A list with five columns | As drawn |

## S14 System health

Stories: US-10 · Flows: F12 step 1 · Key screen: no

### Variants

n/a — not a key screen

### Layout

```text
1280 px
+--------------------------------------------------------------+
| System health                  Month [October 2026 v]         |
| Measure                 This month   Target       Met         |
| Availability            99.7%        99.5%        yes         |
| Error rate              0.4%         n/a          -           |
| Pages slower than 2 s   2%           5% at most   yes         |
| Planned downtime window 05:00-11:00 UTC                       |
| Questions? Contact platform support                           |
+--------------------------------------------------------------+
```

### States

| State | When it happens | What the user sees | Microcopy (exact) | What they can do |
|---|---|---|---|---|
| Empty | First use: no traffic yet / Filtered: no traffic in the chosen month / Cleared: n/a — the month always has a value | Measures show "No data" | First use: "No traffic yet. Measures appear after the first visits." / Filtered: "No traffic in September 2026." / Cleared: n/a — nothing to clear | Pick another month |
| Loading | Measures are loading | Title and month stay; progress after 1 s | "Loading system health…" / after 10 s: "Still loading." | Wait |
| Error | Their mistake: n/a — nothing to type / Our failure: measures could not load / No connection: offline | A message in place of the list | Their mistake: n/a — nothing to type / Our failure: "We couldn't load system health. Try again." / No connection: "You're offline. Try again when you're back online." | Retry |
| Success | Measures loaded | The list with Met yes or no | "Showing October 2026." | Pick another month |
| Permission denied | Signed out / anyone other than the SRE / the SRE following a link to an order breakdown | Signed out: the sign-in page; others: a message; order link: refused with no amounts | Signed out: "You were signed out after 15 minutes without activity." / Others: "Only the SRE can see system health." / Order link: "Your role can't open order breakdowns." | Sign in |
| Edge data | A target missed / a month still in progress | A missed target says "no" in words with the gap; the current month says it is partial | "Availability 99.1%, target 99.5%: missed by 0.4 points." / "October 2026 so far (partial month)." | Investigate |

### Microcopy

| Element | Text |
|---|---|
| Page title | "System health" |
| Primary action | Month picker: "Month" |
| Secondary action | n/a |
| Field labels and helper text | "Month" — helper: n/a |
| Confirmation | n/a — nothing is changed on this screen |

### Accessibility

WCAG 2.2 AA — planned, not verified.

- Focus order: 1. Page title 2. Month picker 3. Each measure row 4. Planned downtime line
- Labels: each row is read as a sentence ("Availability 99.7 percent, target 99.5, met")
- Keyboard: the month picker opens with Enter and arrows
- Contrast and color: text 4.5:1; met or missed is a word, never color alone
- Targets: month picker at least 24 px tall
- Errors and status: errors are announced; "Showing October 2026." is a status message
- Focus not hidden: no sticky bars

### Responsive

| Width | Layout | What changes |
|---|---|---|
| 375 px | One column | Each measure is a card: value, target, met; nothing scrolls sideways |
| 1280 px | A list with four columns | As drawn |

## Demo layout (90 seconds)

| Beat | Time | Screen · state | What the viewer sees | Action |
|---|---|---|---|---|
| B1 | 0:00-0:08 | S8 · Success | Dr. Chen signs in with a test account | Sign in |
| B2 | 0:08-0:22 | S1 · Error | In Ana's chart she asks for 3 Vitamin D3; "Only 2 in stock. Lower the quantity." | Change 3 to 2 |
| B3 | 0:22-0:32 | S1 · Success | She adds Magnesium Glycinate; total $60.00, fee $0.45, payout $29.55; she sends it | Send to Ana Ruiz |
| B4 | 0:32-0:40 | S9 · Success | Ana's notice names only the practice; she taps and signs in | Sign in to view |
| B5 | 0:40-0:54 | S2 · Success | Checkout "held for 30 minutes", Pay $60.00, receipt; a second tap shows "already paid" | Pay $60.00 |
| B6 | 0:54-1:06 | S4 · Success | Order 1042: $60.00 = $30.00 + $29.55 + $0.45, Adds up: yes, no patient name | Open Order 1042 |
| B7 | 1:06-1:16 | S11 · Success | Fran's October report: Balanced, gross $90.00 and net $0.68 | Export October |
| B8 | 1:16-1:23 | S10 · Success | The funnel: 10 sent, 9 started checkout, 8 paid; one alert pinned on top | Say: "The bottleneck is where the count drops." |
| B9 | 1:23-1:30 | S12 · Success | Sam gives Dana the Data analyst role with a reason; it lands in Fran's access log | Save role |

Total: 1:30 (at most 1:30) · Non-happy state shown in: B2 · Key screens shown: S1, S2, S4, S10, S11, S12

## Open questions

- ⚠ How is an order's single platform fee shared across its products on the practice dashboard (FR-028 per-product payout)? Recommended: in proportion to each line's amount, so Vitamin D3's $54.00 of sales shows a $26.59 payout — a clarify-spec question on FR-028
