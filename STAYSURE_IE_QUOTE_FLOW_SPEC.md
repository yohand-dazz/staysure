# Staysure Ireland — "Get a Quote" Flow: Full Development Specification

> **Market:** Ireland (IE)
> **Product:** Travel Insurance — Get a Quote flow
> **Version:** 1.0
> **Status:** Ready for Development
> **Author:** UX Design / Product

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Summary](#2-architecture-summary)
3. [Flow States Reference](#3-flow-states-reference)
4. [Pre-Flow: Eligibility Gate](#4-pre-flow-eligibility-gate)
5. [Section 1: Trip Details](#5-section-1-trip-details)
6. [Section 2: Value Reveal](#6-section-2-value-reveal)
7. [Section 3: Medical Screening](#7-section-3-medical-screening)
8. [Section 4: Policy & Purchase](#8-section-4-policy--purchase)
9. [Exit Paths](#9-exit-paths)
10. [Branching Logic Rules](#10-branching-logic-rules)
11. [Data Model](#11-data-model)
12. [API Contracts](#12-api-contracts)
13. [Validation Rules](#13-validation-rules)
14. [Session & State Management](#14-session--state-management)
15. [UI Requirements](#15-ui-requirements)
16. [Copy & Microcopy](#16-copy--microcopy)
17. [Edge Cases](#17-edge-cases)
18. [Progress Indicator](#18-progress-indicator)
19. [Drop-off Recovery](#19-drop-off-recovery)
20. [Accessibility Requirements](#20-accessibility-requirements)

---

## 1. Project Overview

### Problem Statement

The existing Staysure IE quote flow has three compounding problems:

1. **Late rejection**: Users who are ineligible for coverage (e.g. terminal illness, advised not to travel) complete the entire form — 8–10 minutes of effort — before discovering they cannot be covered. This destroys trust and creates negative brand sentiment.

2. **Medical anxiety driving dishonesty**: Because declaring a medical condition significantly expands the form, users are incentivised to omit or downplay health information. This creates downstream compliance and claims risk.

3. **No value hook before hard questions**: Without seeing a price first, users have no reason to persist through medical screening. They drop off or lie.

### Solution Overview

The redesign introduces **three structural layers**:

| Layer | What it does | Business impact |
|---|---|---|
| **Eligibility Gate (Step 0)** | 3 knockout questions before the form starts | Ineligible users exit in <60 seconds, not 10 minutes |
| **Value Reveal (Step 6)** | Indicative price shown before medical questions | Anchors user to a price; dramatically reduces medical drop-off |
| **Progressive Medical Screening** | Conditional, per-traveller, per-condition disclosure | Medical data accuracy improves; form feels manageable |

### Users

- People buying travel insurance for Ireland-departing trips
- Mixed age range; significant proportion of older users (65+)
- High need for: clarity, trust, reassurance
- Low tolerance for: long forms, ambiguous medical questions, unexpected complexity

### Goals

| User goals | Business goals |
|---|---|
| Get a price quickly | More users complete the quote |
| Feel confident they are covered | Accurate medical data for underwriting |
| Understand medical questions without anxiety | Reduce drop-off rate |
| Know upfront if they can't be covered | Comply with Consumer Protection Code (Ireland) |

---

## 2. Architecture Summary

```
START
  │
  ▼
[PRE-FLOW: Eligibility Gate]
  KO-Q1: Advised not to travel?
  KO-Q2: Terminal illness?
  KO-Q3: Awaiting surgery?
  │
  ├── Any YES ──► EXIT PATH A (Cannot provide cover)
  │
  └── All NO ──►
                │
                ▼
        [SECTION 1: Trip Details]
        Step 1: Cover type
        Step 2: Destination
        Step 3: Travel dates
        Step 4: Travellers + ages + email
        Step 5: Trip extras
                │
                ▼
        [SECTION 2: Value Reveal]
        Step 6: Indicative price range
                │
                ▼
        [SECTION 3: Medical Screening]
        Step 7: Any conditions? (YES/NO gate)
          │
          ├── NO ──────────────────────────────────────────────┐
          │                                                    │
          └── YES ──►                                          │
                    Step 8: Select travellers with conditions  │
                    Step 9a: Condition categories              │
                    Step 9b: Condition-specific questions      │
                    Step 9c: Outcome assessment                │
                      │                                        │
                      ├── COVERABLE ──► Apply loading ──► loop │
                      │                                        │
                      ├── EXCLUSION ──► Show notice            │
                      │     │                                  │
                      │     ├── Accept ──► loop                │
                      │     └── Decline ──► EXIT PATH B-2      │
                      │                                        │
                      └── NOT COVERABLE                        │
                            │                                  │
                            ├── Others coverable?              │
                            │     ├── YES ──► EXIT PATH B-1    │
                            │     │    ├── Accept ────────────►│
                            │     │    └── Decline ──► EXIT B-2│
                            │     └── NO ──► EXIT PATH B-2     │
                            └──────────────────────────────────┘
                                                               │
                                                               ▼
                                                    [SECTION 4: Policy & Purchase]
                                                    Step 10: Policyholder details
                                                    Step 11: Cover summary + final price
                                                    Step 12: Payment + T&Cs
                                                               │
                                                               ▼
                                                           COMPLETE
```

---

## 3. Flow States Reference

Every step maps to a named state used in frontend routing and backend session tracking.

| State ID | Step | Description |
|---|---|---|
| `INIT` | — | Landing / quote entry point |
| `ELIGIBILITY_CHECK` | 0 | Pre-qualification knockout gate |
| `DISQUALIFIED` | — | Exit Path A: hard knockout |
| `TRAVEL_COVER_TYPE` | 1 | Single / Annual / Backpacker |
| `TRAVEL_DESTINATION` | 2 | Destination region and country |
| `TRAVEL_DATES` | 3 | Departure and return dates |
| `TRAVEL_TRAVELLERS` | 4 | Traveller count, ages, email |
| `TRAVEL_EXTRAS` | 5 | Add-on selections |
| `VALUE_REVEAL` | 6 | Indicative price display (read-only) |
| `MEDICAL_PRECHECK` | 7 | High-level yes/no medical gate |
| `MEDICAL_SELECT_TRAVELLERS` | 8 | Which travellers have conditions |
| `MEDICAL_CONDITION_CATEGORY` | 9a | Condition category selection per traveller |
| `MEDICAL_CONDITION_QUESTIONS` | 9b | Condition-specific question set |
| `MEDICAL_ASSESSMENT` | 9c | Internal outcome assessment (no UI screen) |
| `MEDICAL_EXCLUSION_OFFER` | — | Exit Path B-1: partial policy offer |
| `MEDICAL_REJECTED` | — | Exit Path B-2: full rejection |
| `POLICY_HOLDER_DETAILS` | 10 | Policyholder name, DOB, contact |
| `COVER_SUMMARY` | 11 | Final price and cover breakdown |
| `CHECKOUT` | 12 | Payment and T&C acceptance |
| `COMPLETE` | — | Policy issued, confirmation sent |

**Route pattern:** `/quote/:state` or `/quote/:step-slug`

Example: `/quote/cover-type`, `/quote/value-reveal`, `/quote/medical/conditions`

---

## 4. Pre-Flow: Eligibility Gate

### Purpose

Identify hard knockout conditions **before** the progress bar appears. Frame this as a helpful first step: _"Let us check we can help you"_ — not an interrogation.

### Screen Design

- No progress bar shown yet
- Single-page with all 3 questions visible
- Binary radio buttons: **Yes / No** for each
- Submit only enabled when all 3 are answered
- Warm, plain-language heading

### Questions

```
Q1: Has any traveller been advised by a doctor not to travel for medical reasons?
    [ ] Yes    [ ] No

Q2: Is any traveller currently receiving palliative or terminal care,
    with a life expectancy of less than 12 months?
    [ ] Yes    [ ] No

Q3: Is any traveller currently on a waiting list for surgery
    or a hospital investigation?
    [ ] Yes    [ ] No
```

> **Legal note:** Q3 (awaiting surgery) is a grey area — confirm with legal/compliance whether this is a hard knockout or should trigger a premium-loading flag instead. Implement as a configurable rule.

### Branching

```
IF any(Q1 === true OR Q2 === true OR Q3 === true)
  → state: DISQUALIFIED
  → render: EXIT PATH A

IF all(Q1 === false AND Q2 === false AND Q3 === false)
  → state: TRAVEL_COVER_TYPE
  → render: Section 1 + show progress bar
```

### Data fields

```typescript
interface EligibilityCheck {
  advised_not_to_travel: boolean;   // Q1
  terminal_illness: boolean;         // Q2
  awaiting_surgery: boolean;         // Q3
}
```

---

## 5. Section 1: Trip Details

**User mindset:** Low effort, high motivation. These questions are familiar and non-threatening.

**Progress bar shows:** Step 1 of 4 — Trip Details

---

### Step 1 — Cover Type

**State:** `TRAVEL_COVER_TYPE`

**UI:** 3 large selection cards (not a dropdown)

```
Options:
  - Single Trip         "Cover for one trip"
  - Annual Multi-trip   "Cover for multiple trips in a year"
  - Backpacker          "Long-term travel cover"
```

**Data:**
```typescript
cover_type: 'single' | 'annual' | 'backpacker'
```

**Validation:** Required. Cannot proceed without selection.

---

### Step 2 — Destination

**State:** `TRAVEL_DESTINATION`

**UI:** Region selector first, then country/countries

```
Regions: Europe | Worldwide (exc. USA/Canada) | Worldwide (inc. USA/Canada) | Custom
Countries: Multi-select searchable dropdown
```

**Data:**
```typescript
destination_region: string;
destination_countries: string[];  // ISO 3166-1 alpha-2 codes
```

**Validation:**
- At least one country/region required
- If region = "Custom", at least one country must be selected

---

### Step 3 — Travel Dates

**State:** `TRAVEL_DATES`

**UI:** Date picker (departure) + date picker (return)

```
Fields:
  Departure date: [Date picker]
  Return date:    [Date picker]

Auto-calculated display:
  Trip duration: X days
```

**Data:**
```typescript
depart_date: Date;         // ISO 8601
return_date: Date;         // ISO 8601
trip_duration_days: number; // computed: (return_date - depart_date)
```

**Validation:**
- `depart_date` >= today + 1 day
- `return_date` > `depart_date`
- Single trip max duration: 365 days
- Annual cover max single trip: 45 days (warn, not block)
- `cover_type === 'annual'` + `trip_duration_days > 45`: show inline warning

---

### Step 4 — Travellers

**State:** `TRAVEL_TRAVELLERS`

**UI:** Traveller type selector + per-traveller age inputs + email field

```
Who is travelling?
  [ ] Individual
  [ ] Couple
  [ ] Family
  [ ] Group

Number of travellers: [Stepper: 1–10]

For each traveller:
  Name (optional, for reference): [Text input]
  Age: [Number input]
  Role: Self | Partner | Child | Other

Email address (required):
  [Email input]
  Sub-copy: "We'll use this to save your progress if you need to come back"
```

**Data:**
```typescript
interface Traveller {
  id: string;              // UUID, generated client-side
  name?: string;           // optional display name
  age: number;             // integer, 0–89
  relationship: 'self' | 'partner' | 'child' | 'other';
}

quote_email: string;       // REQUIRED at this step for drop-off recovery
travellers: Traveller[];
num_travellers: number;    // computed from travellers.length
```

**Validation:**
- At least 1 traveller
- Maximum 10 travellers
- Each traveller age: 0–89 (inclusive)
- Traveller age > 89: show error with phone number for specialist advice
- Policyholder (self) age: 18–89
- `quote_email`: valid email format
- Email collected here (not at checkout) to enable drop-off recovery

**Business rule:** Age > 75 → flag `age_loading_required: true` for pricing API

---

### Step 5 — Trip Extras

**State:** `TRAVEL_EXTRAS`

**UI:** Toggle switches or checkbox cards

```
Add-ons (each Yes/No):
  □ Cruise cover          "Travelling on a cruise?"
  □ Winter sports cover   "Skiing, snowboarding or other winter activities?"
  □ High-value items      "Taking valuables worth over €1,500?"
```

**Data:**
```typescript
interface AddOns {
  cruise: boolean;           // default: false
  winter_sports: boolean;    // default: false
  high_value_items: boolean; // default: false
}
```

**Validation:** No required fields. All default to false.

**Trigger:** After this step is completed → call Indicative Price API (async, before Step 6 renders)

---

## 6. Section 2: Value Reveal

**State:** `VALUE_REVEAL`

**Purpose:** Show a price anchor before medical questions. This is the single highest-impact change in the flow.

**Progress bar shows:** Step 2 of 4 — Your Price

### Why this step exists

- Answers the user's unspoken question: _"Is this worth my time?"_
- Once a user sees a reasonable, specific price, psychological commitment increases dramatically
- Reframes the medical section from _"I'm being screened"_ to _"I've almost got my quote"_

### UI

```
Heading:     "Good news — here's your estimated price"

Price:       €85 – €110
Sub-copy:    "Based on your trip to [destination] for [N] traveller(s)"

Note:        "This may adjust slightly after a few health questions —
              most people see little or no change."

CTA:         [Continue to confirm your price →]

Secondary:   [What's included?]  (expandable accordion)
```

### Price persistence

After Step 6, the price range must remain **persistently visible** for the remainder of the journey:
- Sticky header or sticky footer element
- Display: `Est. €85 – €110`
- Updates to final confirmed price only after medical screening is complete

### API call (triggered after Step 5)

See [Section 12 — Indicative Price API](#121-indicative-price-api)

**Fallback:** If API fails → show: _"We'll calculate your price after the health questions"_ and continue. Do not block the flow.

### Data displayed (read-only, no new input)

```typescript
indicative_price_min: number;  // from API
indicative_price_max: number;  // from API
quote_reference_id: string;    // from API, store in session
```

---

## 7. Section 3: Medical Screening

**Progress bar shows:** Step 3 of 4 — Health Details

**Heading:** _"Help us cover you properly"_

**Reassurance banner (persistent throughout Section 3):**
> "Over 90% of medical conditions are covered by Staysure — declaring yours ensures your claim is protected."

---

### Step 7 — Medical Pre-Check

**State:** `MEDICAL_PRECHECK`

**UI:** Single large yes/no question. Do NOT show a list of conditions here.

```
Question:
  "Do any travellers have pre-existing medical conditions?"

Options:
  [ ] Yes
  [ ] No, we're all fit and healthy

Micro-copy:
  "Most conditions are covered. Being honest here protects your claim."
```

**Branching:**
```
IF has_conditions === false
  → state: POLICY_HOLDER_DETAILS
  → skip entire medical screening loop

IF has_conditions === true
  → state: MEDICAL_SELECT_TRAVELLERS
```

**Data:**
```typescript
has_conditions: boolean;
```

---

### Step 8 — Select Travellers With Conditions

**State:** `MEDICAL_SELECT_TRAVELLERS`

**UI:** Checklist of travellers (populated from Step 4 traveller list)

```
"Which travellers have medical conditions?"

  [✓] Traveller 1 (Age 62) — Self
  [ ] Traveller 2 (Age 58) — Partner
  [ ] Traveller 3 (Age 28) — Child

  [Continue]
```

**Data:**
```typescript
travellers_with_conditions: string[];  // array of traveller IDs
```

**Validation:** At least one traveller must be checked.

**Internal state:** Sets up a screening queue. Each traveller in `travellers_with_conditions` must complete Steps 9a–9c before proceeding.

---

### Step 9a — Condition Categories

**State:** `MEDICAL_CONDITION_CATEGORY`

**Context:** Runs once per traveller in the screening queue.

**UI:** Multi-select checkbox grid (can have multiple conditions)

```
Progress: "Medical details — [Name / Traveller 1] — Step 1 of 3"

"What type of condition does [Name] have?"
Select all that apply:

  [✓] Heart & Circulation
  [ ] Cancer
  [ ] Respiratory (e.g. asthma, COPD)
  [ ] Diabetes
  [ ] Mental Health
  [ ] Musculoskeletal (e.g. back, joints)
  [ ] Neurological (e.g. stroke, epilepsy)
  [ ] Digestive
  [ ] Other / Not listed
```

**Data:**
```typescript
interface ConditionRecord {
  traveller_id: string;
  category: ConditionCategory;
  // populated in Steps 9b and 9c:
  question_responses?: QuestionResponse[];
  outcome?: 'coverable' | 'exclusion_only' | 'not_coverable';
  loading_amount?: number;
  exclusion_text?: string;
}

type ConditionCategory =
  | 'heart_circulation'
  | 'cancer'
  | 'respiratory'
  | 'diabetes'
  | 'mental_health'
  | 'musculoskeletal'
  | 'neurological'
  | 'digestive'
  | 'other';
```

**Trigger:** After category selection → call Medical Question Set API per category

---

### Step 9b — Condition-Specific Questions

**State:** `MEDICAL_CONDITION_QUESTIONS`

**Context:** Runs once per condition category per traveller.

**UI principle:** **One question per screen.** Never group multiple questions on one page during this step.

```
Progress indicator: "Question 2 of 5 — Heart & Circulation — [Name]"

[Question text from API]

[Answer options from API — radio or checkbox depending on question type]

[Back]  [Next →]
```

**Question types (from API):**
- `radio` — single select
- `checkbox` — multi-select
- `date` — date picker (e.g. "When were you diagnosed?")
- `number` — numeric input (e.g. "How many episodes in the last 12 months?")
- `boolean` — Yes / No

**Data:**
```typescript
interface QuestionResponse {
  question_id: string;
  answer: string | string[] | boolean | number | Date;
}
```

**After final question for a condition → trigger:** Call Condition Assessment API

---

### Step 9c — Condition Outcome Assessment

**State:** `MEDICAL_ASSESSMENT`

**This is an internal step — no dedicated UI screen.**

The system processes the API response and routes to the appropriate outcome.

#### Outcome: COVERABLE

```
Action:
  - Add condition_loading to premium
  - Mark condition as covered
  - Check if more conditions or travellers remain in queue

IF more conditions/travellers
  → loop back to MEDICAL_CONDITION_CATEGORY for next item

IF queue empty
  → state: POLICY_HOLDER_DETAILS
```

#### Outcome: EXCLUSION_ONLY

```
UI — Exclusion Notice Screen:

  Heading: "We can cover [Name], but not this condition"

  Body: "[Exclusion text from API]"
  e.g. "Your pre-existing [condition] will be excluded from this policy.
        Any claims related to this condition won't be covered."

  Options:
    [ ] I understand and accept this exclusion
    [ ] I do not accept — I don't want this policy

  CTA: [Continue with exclusion accepted]
       [Cancel quote]
```

```
Branching:
  IF user accepts exclusion
    → mark condition as EXCLUDED
    → check queue for more conditions/travellers
    → loop or proceed

  IF user declines exclusion
    → state: MEDICAL_REJECTED (EXIT PATH B-2)
```

#### Outcome: NOT_COVERABLE

```
Internal check:
  IF remaining travellers (excluding affected traveller) are all coverable
    → state: MEDICAL_EXCLUSION_OFFER (EXIT PATH B-1)

  IF affected traveller is the only traveller
  OR no remaining travellers can be covered
    → state: MEDICAL_REJECTED (EXIT PATH B-2)
```

#### Screening loop logic

```
// Pseudocode for the screening queue
queue = travellers_with_conditions.flatMap(t =>
  selectedCategories[t.id].map(cat => ({ traveller_id: t.id, category: cat }))
)

currentIndex = 0

function processNext() {
  if (currentIndex >= queue.length) {
    return navigateTo(POLICY_HOLDER_DETAILS)
  }

  const item = queue[currentIndex]
  currentIndex++

  // load questions for item.category + item.traveller_id
  // run through 9b questions
  // call assessment API
  // handle outcome
  // call processNext() when done
}
```

---

## 8. Section 4: Policy & Purchase

**Progress bar shows:** Step 4 of 4 — Purchase

---

### Step 10 — Policyholder Details

**State:** `POLICY_HOLDER_DETAILS`

**UI:**

```
"Who is buying the policy?"

  First name:     [Text input]
  Last name:      [Text input]
  Date of birth:  [Date picker]
  Email address:  [Email input — pre-fill from Step 4 if available]
  Phone number:   [Tel input — Irish format]
  Address line 1: [Text input]
  Address line 2: [Text input] (optional)
  Town / City:    [Text input]
  County:         [Dropdown — Irish counties]
  Eircode:        [Text input]
```

**Pre-population rule:** If a traveller with `relationship === 'self'` exists in Step 4, pre-populate name and DOB from that traveller's data. Show a note: _"We've pre-filled your details from your traveller information."_

**Data:**
```typescript
interface Policyholder {
  first_name: string;
  last_name: string;
  dob: Date;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    county: string;
    eircode: string;
    country: 'IE';
  };
}
```

**Validation:**
- All fields required except `address.line2`
- `dob` → age must be 18–89
- `email` → valid format
- `phone` → Irish format: starts with `+353` or `0`, 10–13 digits
- `eircode` → Irish Eircode format: `[A-Z][0-9][0-9W] [A-Z0-9]{4}` (case-insensitive)

---

### Step 11 — Cover Summary & Final Price

**State:** `COVER_SUMMARY`

**Trigger:** On entering this state, call Final Price API (see Section 12)

**UI:**

```
Heading: "Your cover summary"

Price breakdown:
  Base price:           €X.XX
  Medical loading:      +€X.XX   (if applicable, per condition)
  Cruise add-on:        +€X.XX   (if selected)
  Winter sports:        +€X.XX   (if selected)
  High-value items:     +€X.XX   (if selected)
  ─────────────────────────────
  Total:                €XX.XX

Cover details:
  [Expandable: What's covered]
  [Expandable: What's excluded]  ← shows any accepted exclusions

Trip summary:
  Destination, Dates, Travellers

CTA: [Buy now — €XX.XX]

⚠️ If final_price > indicative_price_max × 1.3:
  Show price change notice:
  "Your price has changed from the estimate. Here's why: [reason from API]"
  Require user to tap "I understand" before proceeding.
```

**Data (read-only, from API):**
```typescript
final_price: number;
price_breakdown: PriceBreakdown;
cover_summary: CoverItem[];
exclusions: ExclusionItem[];
```

---

### Step 12 — Checkout & Payment

**State:** `CHECKOUT`

**UI:**

```
Payment details:
  Card number:    [Card input — PCI compliant component]
  Expiry:         [MM/YY input]
  CVV:            [CVV input]
  Name on card:   [Text input]

OR:
  [Pay with Apple Pay]
  [Pay with Google Pay]

Terms:
  [ ] I have read and agree to the Policy Terms & Conditions
  [ ] I confirm the information I have provided is accurate and complete
  [ ] I understand that any claims related to excluded conditions will not be covered

CTA: [Complete purchase — €XX.XX]
```

**On successful payment:**
- Trigger Policy Issuance API
- Navigate to `COMPLETE`
- Send confirmation email (triggered server-side)

**Data:**
```typescript
payment_method: 'card' | 'apple_pay' | 'google_pay';
t_and_c_accepted: boolean;     // required: true
accuracy_confirmed: boolean;   // required: true
exclusions_confirmed: boolean; // required: true (if any exclusions exist)
```

---

### Complete Screen

**State:** `COMPLETE`

```
Heading:  "You're covered! 🎉"

Body:     "Your policy number is: [POLICY_NUMBER]"
          "A confirmation email has been sent to [email]"

Actions:
  [Download policy documents]
  [Return to homepage]
```

---

## 9. Exit Paths

### Exit Path A — Cannot Provide Cover (Knockout)

**State:** `DISQUALIFIED`

**Triggered by:** Any YES in the Eligibility Gate

**Rules:**
- Never use the word "rejected" or "denied"
- Frame as a product limitation, not a personal failure
- Always provide an alternative
- Warm, empathetic tone

**UI:**

```
Heading:  "Unfortunately, we're not the right insurer for this trip"

Body:     "Based on your answers, we're unable to provide travel insurance
           cover for this trip. This is because [reason — see below].

           This doesn't mean you can't travel — specialist insurers
           may be able to help."

Reason text (conditional):
  Q1 triggered: "One of your travellers has been advised not to travel by their doctor."
  Q2 triggered: "One of your travellers is currently receiving terminal care."
  Q3 triggered: "One of your travellers is awaiting a medical procedure."

Actions:
  [Find a specialist insurer →]   (opens curated list or link to ie.gov.ie resources)
  [Save my details]               (stores email + quote shell for future)
  [Call us: 1800 XXX XXX]

Footer note:
  "If your circumstances change, we'd be happy to help you in the future."
```

---

### Exit Path B-1 — Partial Policy Offer

**State:** `MEDICAL_EXCLUSION_OFFER`

**Triggered by:** A traveller's condition is NOT_COVERABLE, but other travellers are still insurable.

**UI:**

```
Heading:  "We can't cover [Name]'s [condition], but here's what we can do"

Body:     "We're unable to include [Name] on this policy due to their [condition].
           However, we can still cover the remaining travellers on your trip."

Adjusted policy:
  Travellers covered:   [list of remaining travellers]
  Traveller excluded:   [Name]
  New price:            €XX.XX

Options:
  [Continue with adjusted policy →]
  [I don't want this — exit]
```

**Branching:**
```
IF user accepts
  → remove affected traveller from policy
  → recalculate price (call Final Price API with adjusted traveller list)
  → state: POLICY_HOLDER_DETAILS

IF user declines
  → state: MEDICAL_REJECTED (EXIT PATH B-2)
```

---

### Exit Path B-2 — Full Medical Rejection

**State:** `MEDICAL_REJECTED`

**Triggered by:**
- NOT_COVERABLE condition + no other coverable travellers
- User declines exclusion
- User declines partial policy (B-1)

**UI:**

```
Heading:  "We're unable to provide cover for this trip"

Body:     "Unfortunately, we can't provide travel insurance cover
           for this trip based on the health information provided.

           Specialist travel insurers may be able to help —
           they work with people who have a wider range of
           medical conditions."

Actions:
  [Find a specialist insurer →]
  [Call us: 1800 XXX XXX]
  [Return to homepage]
```

---

## 10. Branching Logic Rules

### Eligibility Gate Rules

| Rule ID | Condition | Action |
|---|---|---|
| KO-1 | `advised_not_to_travel === true` | → DISQUALIFIED |
| KO-2 | `terminal_illness === true` | → DISQUALIFIED |
| KO-3 | `awaiting_surgery === true` | → DISQUALIFIED (confirm with legal) |
| KO-PASS | All three are `false` | → TRAVEL_COVER_TYPE |

### Medical Pre-Check Rules

| Rule ID | Condition | Action |
|---|---|---|
| MC-1 | `has_conditions === false` | → POLICY_HOLDER_DETAILS (skip medical) |
| MC-2 | `has_conditions === true` | → MEDICAL_SELECT_TRAVELLERS |

### Medical Screening Outcome Rules

| Rule ID | Condition | Action |
|---|---|---|
| MS-1 | `outcome === 'coverable'` | Add premium loading. Continue queue. |
| MS-2 | `outcome === 'exclusion_only'` | Show exclusion notice. Await user response. |
| MS-3 | `outcome === 'exclusion_only'` + user accepts | Mark excluded. Continue queue. |
| MS-4 | `outcome === 'exclusion_only'` + user declines | → MEDICAL_REJECTED |
| MS-5 | `outcome === 'not_coverable'` + other travellers coverable | → MEDICAL_EXCLUSION_OFFER |
| MS-6 | `outcome === 'not_coverable'` + no other coverable travellers | → MEDICAL_REJECTED |
| MS-7 | Queue empty (all processed) | → POLICY_HOLDER_DETAILS |

### Premium Adjustment Rules

| Rule ID | Condition | Action |
|---|---|---|
| PA-1 | `outcome === 'coverable'` | `final_price += condition_loading` (from API) |
| PA-2 | `add_ons.cruise === true` | `final_price += cruise_premium` |
| PA-3 | `add_ons.winter_sports === true` | `final_price += winter_sports_premium` |
| PA-4 | `add_ons.high_value_items === true` | `final_price += high_value_premium` |
| PA-5 | Any traveller `age > 75` | Set `age_loading_required: true` flag for API |
| PA-6 | `final_price > indicative_price_max × 1.3` | Show price change notification before checkout |

---

## 11. Data Model

### Full Quote Object

```typescript
interface Quote {
  // Meta
  quote_id: string;               // UUID, generated at Step 1
  quote_reference_id?: string;    // from Indicative Price API
  created_at: Date;
  updated_at: Date;
  expires_at: Date;               // created_at + 24 hours
  current_state: FlowState;
  quote_email: string;            // collected at Step 4

  // Eligibility
  eligibility: EligibilityCheck;

  // Trip Details
  cover_type: 'single' | 'annual' | 'backpacker';
  destination_region: string;
  destination_countries: string[];  // ISO 3166-1 alpha-2
  depart_date: Date;
  return_date: Date;
  trip_duration_days: number;       // computed
  travellers: Traveller[];
  add_ons: AddOns;

  // Pricing
  indicative_price_min?: number;
  indicative_price_max?: number;
  final_price?: number;
  price_breakdown?: PriceBreakdown;

  // Medical
  has_conditions: boolean;
  travellers_with_conditions: string[];    // traveller IDs
  condition_records: ConditionRecord[];

  // Policy
  policyholder?: Policyholder;
  cover_summary?: CoverItem[];
  exclusions?: ExclusionItem[];

  // Payment
  payment_status?: 'pending' | 'complete' | 'failed';
  policy_number?: string;
}

interface EligibilityCheck {
  advised_not_to_travel: boolean;
  terminal_illness: boolean;
  awaiting_surgery: boolean;
}

interface Traveller {
  id: string;
  name?: string;
  age: number;
  relationship: 'self' | 'partner' | 'child' | 'other';
  age_loading_required: boolean;    // computed: age > 75
}

interface AddOns {
  cruise: boolean;
  winter_sports: boolean;
  high_value_items: boolean;
}

interface ConditionRecord {
  traveller_id: string;
  category: ConditionCategory;
  question_responses: QuestionResponse[];
  outcome?: 'coverable' | 'exclusion_only' | 'not_coverable';
  loading_amount?: number;
  exclusion_text?: string;
  user_accepted_exclusion?: boolean;
  accepted_exclusion_at?: Date;      // timestamp — required for claims evidence
}

interface QuestionResponse {
  question_id: string;
  answer: string | string[] | boolean | number | Date;
}

interface PriceBreakdown {
  base_price: number;
  medical_loadings: { condition: string; amount: number }[];
  add_on_premiums: { type: string; amount: number }[];
  total: number;
}

interface CoverItem {
  category: string;
  description: string;
  limit?: string;
}

interface ExclusionItem {
  traveller_id: string;
  traveller_name?: string;
  condition: string;
  exclusion_text: string;
  accepted_at: Date;
}

interface Policyholder {
  first_name: string;
  last_name: string;
  dob: Date;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    county: string;    // Irish county name
    eircode: string;
    country: 'IE';
  };
}

type FlowState =
  | 'INIT'
  | 'ELIGIBILITY_CHECK'
  | 'DISQUALIFIED'
  | 'TRAVEL_COVER_TYPE'
  | 'TRAVEL_DESTINATION'
  | 'TRAVEL_DATES'
  | 'TRAVEL_TRAVELLERS'
  | 'TRAVEL_EXTRAS'
  | 'VALUE_REVEAL'
  | 'MEDICAL_PRECHECK'
  | 'MEDICAL_SELECT_TRAVELLERS'
  | 'MEDICAL_CONDITION_CATEGORY'
  | 'MEDICAL_CONDITION_QUESTIONS'
  | 'MEDICAL_ASSESSMENT'
  | 'MEDICAL_EXCLUSION_OFFER'
  | 'MEDICAL_REJECTED'
  | 'POLICY_HOLDER_DETAILS'
  | 'COVER_SUMMARY'
  | 'CHECKOUT'
  | 'COMPLETE';

type ConditionCategory =
  | 'heart_circulation'
  | 'cancer'
  | 'respiratory'
  | 'diabetes'
  | 'mental_health'
  | 'musculoskeletal'
  | 'neurological'
  | 'digestive'
  | 'other';
```

---

## 12. API Contracts

### 12.1 Indicative Price API

**Triggered:** After Step 5 completes (async, before Step 6 renders)

**Endpoint:** `POST /api/quote/indicative-price`

**Request:**
```json
{
  "cover_type": "single",
  "destination_countries": ["ES", "FR"],
  "destination_region": "europe",
  "depart_date": "2026-07-01",
  "return_date": "2026-07-14",
  "trip_duration_days": 13,
  "travellers": [
    { "id": "t1", "age": 62, "relationship": "self" },
    { "id": "t2", "age": 58, "relationship": "partner" }
  ],
  "add_ons": {
    "cruise": false,
    "winter_sports": false,
    "high_value_items": false
  }
}
```

**Response (200):**
```json
{
  "quote_reference_id": "QR-20260701-ABCD1234",
  "indicative_price_min": 85.00,
  "indicative_price_max": 110.00,
  "currency": "EUR",
  "valid_until": "2026-07-02T00:00:00Z"
}
```

**Response (422 — uninsurable trip parameters):**
```json
{
  "error": "TRIP_NOT_INSURABLE",
  "reason": "trip_duration_exceeds_maximum"
}
```

**Fallback behaviour:** If API returns error or times out (>5s), store `indicative_price_unavailable: true` and show text-only value reveal: _"We'll calculate your exact price after the health questions."_

---

### 12.2 Medical Question Set API

**Triggered:** When a condition category is selected in Step 9a

**Endpoint:** `GET /api/medical/questions?category={category}&traveller_age={age}`

**Response (200):**
```json
{
  "category": "heart_circulation",
  "questions": [
    {
      "id": "hc_q1",
      "text": "Has the traveller ever been diagnosed with a heart condition?",
      "type": "boolean",
      "required": true
    },
    {
      "id": "hc_q2",
      "text": "Have they had a heart attack in the last 12 months?",
      "type": "boolean",
      "required": true,
      "depends_on": { "question_id": "hc_q1", "answer": true }
    },
    {
      "id": "hc_q3",
      "text": "When were they last seen by a cardiologist?",
      "type": "date",
      "required": true,
      "depends_on": { "question_id": "hc_q1", "answer": true }
    }
  ]
}
```

**Note:** `depends_on` enables conditional questions within a category. Frontend should hide/show questions based on prior answers.

---

### 12.3 Condition Assessment API

**Triggered:** After all questions for a condition are answered

**Endpoint:** `POST /api/medical/assess`

**Request:**
```json
{
  "quote_reference_id": "QR-20260701-ABCD1234",
  "traveller_id": "t1",
  "traveller_age": 62,
  "category": "heart_circulation",
  "question_responses": [
    { "question_id": "hc_q1", "answer": true },
    { "question_id": "hc_q2", "answer": false },
    { "question_id": "hc_q3", "answer": "2025-11-01" }
  ]
}
```

**Response (200):**
```json
{
  "outcome": "coverable",
  "loading_amount": 22.50,
  "exclusion_text": null,
  "message": "This condition can be covered with an additional premium."
}
```

```json
{
  "outcome": "exclusion_only",
  "loading_amount": 0,
  "exclusion_text": "Pre-existing cardiac condition will be excluded from cover. Any claim arising from, related to, or caused by this condition will not be covered.",
  "message": null
}
```

```json
{
  "outcome": "not_coverable",
  "loading_amount": 0,
  "exclusion_text": null,
  "message": "We're unable to provide cover for this condition."
}
```

---

### 12.4 Final Price API

**Triggered:** On entering `COVER_SUMMARY` state

**Endpoint:** `POST /api/quote/final-price`

**Request:**
```json
{
  "quote_reference_id": "QR-20260701-ABCD1234",
  "travellers": [
    { "id": "t1", "age": 62 },
    { "id": "t2", "age": 58 }
  ],
  "condition_records": [
    {
      "traveller_id": "t1",
      "category": "heart_circulation",
      "outcome": "coverable",
      "loading_amount": 22.50
    }
  ],
  "add_ons": {
    "cruise": false,
    "winter_sports": false,
    "high_value_items": false
  }
}
```

**Response (200):**
```json
{
  "final_price": 107.50,
  "currency": "EUR",
  "breakdown": {
    "base_price": 85.00,
    "medical_loadings": [
      { "condition": "Heart & Circulation (Traveller 1)", "amount": 22.50 }
    ],
    "add_on_premiums": [],
    "total": 107.50
  },
  "cover_summary": [...],
  "exclusions": [...]
}
```

---

### 12.5 Policy Issuance API

**Triggered:** On successful payment in Step 12

**Endpoint:** `POST /api/policy/issue`

**Request:**
```json
{
  "quote_reference_id": "QR-20260701-ABCD1234",
  "policyholder": { ... },
  "payment": {
    "method": "card",
    "transaction_id": "TXN-XXXXXXXXXX"
  },
  "consents": {
    "t_and_c_accepted": true,
    "accuracy_confirmed": true,
    "exclusions_confirmed": true,
    "accepted_at": "2026-04-05T12:00:00Z"
  }
}
```

**Response (200):**
```json
{
  "policy_number": "SIE-2026-XXXXXXXX",
  "status": "issued",
  "confirmation_email_sent": true
}
```

---

## 13. Validation Rules

### Global

| Field | Rule |
|---|---|
| All date pickers | Must be valid calendar dates |
| All required fields | Must not be empty / null |
| Navigation forward | All required fields for current step must pass validation |

### Step-specific

| Step | Field | Rule |
|---|---|---|
| 3 | `depart_date` | >= today + 1 day |
| 3 | `return_date` | > `depart_date` |
| 3 | `trip_duration_days` (single) | <= 365 |
| 3 | `trip_duration_days` (annual) | <= 45 (warn, don't block) |
| 4 | `travellers[].age` | 0–89 inclusive |
| 4 | `travellers[].age` (self/policyholder) | 18–89 |
| 4 | `travellers[].age` | > 89: show error + phone number |
| 4 | `num_travellers` | 1–10 |
| 4 | `quote_email` | Valid email format |
| 10 | `policyholder.dob` | Age 18–89 |
| 10 | `policyholder.email` | Valid email format |
| 10 | `policyholder.phone` | Irish format (`+353` or `0`, 10–13 digits total) |
| 10 | `policyholder.eircode` | Format: `A99 A9AA` (case-insensitive) |
| 12 | `t_and_c_accepted` | Must be `true` |
| 12 | `accuracy_confirmed` | Must be `true` |
| 12 | `exclusions_confirmed` | Must be `true` if any exclusions exist |

### Inline error display

- Show errors inline beneath the relevant field
- Do not use alert boxes or page-level error banners for field-level errors
- Show a page-level summary only for server-side errors
- Error copy: plain language, specific, non-blaming

Example:
```
❌ "Please enter a valid date of birth"  ✓
❌ "Invalid input"                       ✗
```

---

## 14. Session & State Management

### Quote persistence

```
quote_id generated at: Step 1 (TRAVEL_COVER_TYPE)
session expires after: 24 hours of inactivity
storage:
  - Frontend: sessionStorage (current session) + localStorage (for resume)
  - Backend: server-side session keyed by quote_id
```

### Auto-save behaviour

- All completed steps auto-save to backend on forward navigation
- If user presses Back, previous step data is restored from session
- Never lose data on Back navigation

### Drop-off recovery

```
Trigger: email collected at Step 4 + user abandons
Wait time: 2 hours of inactivity
Email: "Continue your Staysure quote" with resume link
Resume link: /quote/resume?id={quote_id}&token={secure_token}
On resume: restore last saved state, show from current step
```

### Data invalidation rules

If a user edits earlier steps after progressing further:

| Edited step | Invalidates |
|---|---|
| Cover type (Step 1) | Indicative price, medical underwriting rules |
| Destination (Step 2) | Indicative price |
| Dates (Step 3) | Indicative price |
| Travellers (Step 4) | Indicative price, medical screening queue |
| Trip extras (Step 5) | Indicative price |
| Medical (Steps 7–9) | Final price, exclusions list |

On invalidation: re-fetch affected APIs and re-run affected steps.

### Back navigation in medical section

If user navigates Back from `CHECKOUT` into `COVER_SUMMARY` or medical section:
- Show warning modal: _"Changing your details will recalculate your price."_
- Require confirmation before allowing the edit
- If exclusions were accepted and conditions change: require re-confirmation of exclusions

---

## 15. UI Requirements

### Layout

- Single-column form layout, centred
- Max content width: 640px
- Mobile-first responsive design
- Touch targets: minimum 44×44px (WCAG 2.1 AA)

### Progress bar

- Always visible from Step 1 onwards (not in Pre-Flow)
- Section-based, not step-based:

```
[● Trip Details] [○ Your Price] [○ Health Details] [○ Purchase]
```

- Active section: filled dot + label
- Completed section: check icon
- Upcoming section: empty dot
- Do NOT show step numbers (e.g. "Step 3 of 12") — this increases perceived length

### Persistent price element (after Step 6)

```
Header or sticky bar:
  Est. €85 – €110   [What's included? ▾]
```

Update to confirmed final price when available.

### Medical section reassurance banner

Persistent throughout Section 3:

```
ℹ️  Over 90% of medical conditions are covered by Staysure.
    Declaring yours ensures your claim is protected.
```

### Back button

- Always visible
- Returns to previous step (not previous page)
- Never clears data on back navigation

### Loading states

- Show skeleton loader or spinner during API calls
- Disable forward button during API loading
- Timeout: if API does not respond in 8 seconds, show friendly retry message

---

## 16. Copy & Microcopy

### Eligibility Gate

| Element | Copy |
|---|---|
| Page heading | "Before we get started, let us check we can help you — this takes about 30 seconds." |
| CTA | "Check my eligibility" |
| Q1 label | "Has any traveller been advised by a doctor not to travel for medical reasons?" |
| Q2 label | "Is any traveller currently receiving palliative or terminal care (life expectancy under 12 months)?" |
| Q3 label | "Is any traveller currently on a waiting list for surgery or a hospital investigation?" |

### Section 1 — Trip Details

| Element | Copy |
|---|---|
| Email capture sub-copy | "We'll save your progress so you can come back if needed." |
| Traveller age error (>89) | "Unfortunately we can't provide cover online for travellers over 89. Please call us on 1800 XXX XXX and we'll be happy to help." |

### Section 2 — Value Reveal

| Element | Copy |
|---|---|
| Heading | "Good news — here's your estimated price" |
| Price sub-copy | "Based on your trip to [Destination] for [N] traveller(s)" |
| Adjustment note | "This may adjust slightly after a few health questions — most people see little or no change." |
| CTA | "Continue to confirm your price" |

### Section 3 — Medical Screening

| Element | Copy |
|---|---|
| Section heading | "Help us cover you properly" |
| Reassurance banner | "Over 90% of medical conditions are covered by Staysure — declaring yours ensures your claim is protected." |
| Medical pre-check question | "Do any travellers have pre-existing medical conditions?" |
| No option label | "No, we're all fit and healthy" |
| Pre-check micro-copy | "Most conditions are covered. Being honest here protects your claim." |
| Condition category heading | "What type of condition does [Name] have?" |
| Question progress | "Question [N] of [N] — [Category] — [Name]" |
| Exclusion notice heading | "We can cover [Name], but not this condition" |
| Exclusion accept label | "I understand and accept this exclusion" |
| Exclusion decline label | "I don't want to continue with this exclusion" |

### Exit Path A

| Element | Copy |
|---|---|
| Heading | "Unfortunately, we're not the right insurer for this trip" |
| Body (Q1) | "One of your travellers has been advised not to travel by their doctor. We're unable to provide cover in this situation." |
| Body (Q2) | "One of your travellers is currently receiving terminal care. We're unable to provide cover in this situation." |
| Body (Q3) | "One of your travellers is currently awaiting a medical procedure. We're unable to provide cover in this situation." |
| Alternative CTA | "Find a specialist insurer" |
| Footer | "If your circumstances change, we'd be happy to help you in the future." |

### Exit Path B-2

| Element | Copy |
|---|---|
| Heading | "We're unable to provide cover for this trip" |
| Body | "Unfortunately, we can't provide travel insurance cover based on the health information provided. Specialist travel insurers may be able to help." |

### Price change notification

| Element | Copy |
|---|---|
| Alert heading | "Your price has changed slightly" |
| Body | "Based on the health information you provided, your final price is [€XX.XX]. Here's what changed: [reason]." |
| Confirm CTA | "I understand — continue" |

---

## 17. Edge Cases

| Scenario | Handling |
|---|---|
| Traveller age > 89 | Inline error at Step 4 + phone number. Cannot proceed online. |
| Single trip duration > 365 days | Inline error. Suggest annual cover. |
| Annual cover + single trip > 45 days | Inline warning (not block). Suggest switching to single trip cover. |
| Departure date in the past | Block with inline error: "Please select a future departure date." |
| Return date = departure date (same day) | Block with inline error: "Return date must be after departure date." |
| Multiple travellers, only some have conditions | Screening loop runs only for flagged travellers. Others unaffected. |
| User accepts exclusion then disputes at claims | Exclusion acceptance stored: user ID, timestamp, exclusion text. Use as claims evidence. |
| Indicative Price API timeout | Fallback: continue without price estimate. Don't block flow. |
| Condition Assessment API timeout | Retry once (after 3s). If fails again: show generic error + option to call. |
| User navigates back from checkout into medical section | Show warning modal. Require re-confirmation of any accepted exclusions after editing. |
| User changes traveller ages after seeing Value Reveal | Invalidate indicative price. Re-fetch and update display. |
| User with 0 travellers | Prevent forward navigation. Minimum 1 traveller required. |
| Email already used for an active policy | Accept and continue. (Duplicate email detection is not a flow blocker.) |
| Network offline | Show persistent offline banner. Save current form state locally. Resume on reconnect. |
| Policy issuance API failure after payment | Do NOT re-charge. Log failure. Show: "Your payment was taken but we couldn't issue your policy. Please call us on 1800 XXX XXX." |

---

## 18. Progress Indicator

### Display logic

```
Pre-Flow (Eligibility Gate):  Progress bar NOT shown
Step 1–5 (Trip Details):      [● Trip Details] [○ Your Price] [○ Health] [○ Purchase]
Step 6 (Value Reveal):        [✓ Trip Details] [● Your Price] [○ Health] [○ Purchase]
Step 7–9 (Medical):           [✓ Trip Details] [✓ Your Price] [● Health] [○ Purchase]
Step 10–12 (Purchase):        [✓ Trip Details] [✓ Your Price] [✓ Health] [● Purchase]
Exit Paths:                   Progress bar hidden (user is leaving the flow)
```

### Section names for progress bar

```
Section 1: "Trip Details"
Section 2: "Your Price"
Section 3: "Health Details"
Section 4: "Purchase"
```

---

## 19. Drop-off Recovery

### Email capture timing

Email is collected at **Step 4** (Travellers), not at checkout. This is intentional — it enables recovery emails for users who drop off during the medical section.

### Recovery email trigger

```
Condition: quote_email is set + quote state has not reached COMPLETE + 2 hours of inactivity
Email:     "You're almost done — here's your Staysure quote"
CTA:       "Resume my quote" → /quote/resume?id={quote_id}&token={token}
Send:      Once only per quote. Do not repeat-send.
```

### Resume link behaviour

```
On visit to /quote/resume:
  1. Validate token (expires 24h from generation)
  2. Restore quote session from backend
  3. Navigate to last completed step
  4. Show: "Welcome back — your quote has been saved."
```

---

## 20. Accessibility Requirements

All screens must meet **WCAG 2.1 AA** minimum.

| Requirement | Implementation |
|---|---|
| Keyboard navigation | All form elements accessible via Tab/Shift+Tab. No mouse-only interactions. |
| Focus management | On step change, move focus to step heading (not page top) |
| Screen reader labels | All inputs have associated `<label>` elements or `aria-label` |
| Error announcements | Validation errors announced via `aria-live="assertive"` |
| Required fields | Marked with `aria-required="true"` and visible indicator |
| Colour contrast | Minimum 4.5:1 for normal text, 3:1 for large text |
| Touch targets | Minimum 44×44px for all interactive elements |
| Date pickers | Must be keyboard-accessible; include text input alternative |
| Loading states | `aria-busy="true"` on container during API calls |
| Progress bar | `role="progressbar"`, `aria-valuenow`, `aria-valuetext` |
| Exclusion notice | Use `role="alert"` to announce to screen readers |
| Exit screens | Clear heading hierarchy (h1 → h2 → h3) |

### Special considerations for older users

- Font size minimum: 16px body
- Line height: 1.6 minimum
- No time-limited interactions
- Avoid CAPTCHA or complex verification
- Phone support prominently displayed throughout
- Avoid jargon — use "pre-existing condition" not "co-morbidity"

---

## Appendix A: File Structure Suggestion

```
/src
  /quote-flow
    /components
      ProgressBar.tsx
      QuoteLayout.tsx
      PriceDisplay.tsx           ← persistent price element
      ReassuranceBanner.tsx      ← medical section banner
      ExclusionNotice.tsx
    /steps
      /eligibility
        EligibilityGate.tsx
        ExitPathA.tsx
      /trip-details
        CoverType.tsx
        Destination.tsx
        TravelDates.tsx
        Travellers.tsx
        TripExtras.tsx
      /value-reveal
        ValueReveal.tsx
      /medical
        MedicalPreCheck.tsx
        SelectTravellers.tsx
        ConditionCategories.tsx
        ConditionQuestions.tsx
        ExclusionOffer.tsx        ← Exit Path B-1
        MedicalRejected.tsx       ← Exit Path B-2
      /purchase
        PolicyholderDetails.tsx
        CoverSummary.tsx
        Checkout.tsx
        Complete.tsx
    /hooks
      useQuoteSession.ts          ← session persistence
      useDropoffRecovery.ts       ← email + resume
      useMedicalQueue.ts          ← screening loop logic
    /api
      indicativePrice.ts
      medicalQuestions.ts
      conditionAssessment.ts
      finalPrice.ts
      policyIssuance.ts
    /store
      quoteStore.ts               ← global quote state (Zustand / Redux)
    /types
      quote.types.ts              ← all TypeScript interfaces
    /utils
      validation.ts
      priceUtils.ts
      routeUtils.ts
    /constants
      conditions.ts               ← ConditionCategory enum values
      irishCounties.ts
      irishEircodePattern.ts
```

---

## Appendix B: Environment Variables

```env
# API endpoints
NEXT_PUBLIC_API_BASE_URL=https://api.staysure.ie
QUOTE_API_INDICATIVE_PRICE=/api/quote/indicative-price
QUOTE_API_FINAL_PRICE=/api/quote/final-price
MEDICAL_API_QUESTIONS=/api/medical/questions
MEDICAL_API_ASSESS=/api/medical/assess
POLICY_API_ISSUE=/api/policy/issue

# Session
QUOTE_SESSION_TTL_HOURS=24
DROPOFF_EMAIL_DELAY_HOURS=2

# Feature flags
FEATURE_APPLE_PAY=true
FEATURE_GOOGLE_PAY=true
FEATURE_AWAITING_SURGERY_HARD_KNOCKOUT=false   # confirm with legal

# Contact
STAYSURE_IE_PHONE=1800XXXXXX
SPECIALIST_INSURER_LINK=https://www.ccpc.ie/consumers/travel/travel-insurance/
```

---

## Appendix C: Key Business Decisions Requiring Legal/Compliance Sign-off

| # | Decision | Current assumption | Who decides |
|---|---|---|---|
| 1 | Is "awaiting surgery" a hard knockout or a premium-loading flag? | Hard knockout (configurable) | Legal/Compliance |
| 2 | What exclusion text templates are legally required? | Provided by API | Underwriting / Legal |
| 3 | How long must exclusion acceptance records be retained? | Stored indefinitely | Compliance / Data |
| 4 | GDPR: How long should pre-qualification answers be retained? | Not stored after session expiry | Data Protection Officer |
| 5 | Which specialist insurers can we signpost to? | CCPC directory link | Compliance / Marketing |
| 6 | Is the "90% of conditions covered" claim verifiable? | Confirm before using | Marketing / Underwriting |
| 7 | Consumer Protection Code (Ireland) — specific disclosure obligations? | Handled by exclusion notice screens | Legal |

---

*End of specification.*
