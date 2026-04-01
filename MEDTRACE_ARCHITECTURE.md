# MEDTRACE v2.0 — Complete System Architecture

> **PURPOSE:** Single source of truth to rebuild MedTrace from scratch. Every file, every line, every color, every route.
> **DATE:** 2026-04-01

---

## TABLE OF CONTENTS

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Configuration Files](#3-configuration-files)
4. [Design System](#4-design-system)
5. [Database Schema & Seed Data](#5-database-schema--seed-data)
6. [TypeScript Types](#6-typescript-types)
7. [Core Libraries](#7-core-libraries)
8. [AI Engine — Drug Interaction Detection](#8-ai-engine--drug-interaction-detection)
9. [AI Client — NVIDIA Nemotron + 30-Day Cache](#9-ai-client--nvidia-nemotron--30-day-cache)
10. [Authentication System](#10-authentication-system)
11. [API Routes](#11-api-routes)
12. [UI Components](#12-ui-components)
13. [Pages](#13-pages)
14. [Hooks](#14-hooks)
15. [Build Order](#15-build-order)

---

## 1. TECH STACK

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| Runtime | React | 19.2.4 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS | 4 |
| Database | SQLite via better-sqlite3 | latest |
| AI | NVIDIA Nemotron via OpenAI SDK | latest |
| Animations | Framer Motion | latest |
| Charts | Recharts | 3.8.1 |
| Icons | Lucide React | latest |
| PDF | jsPDF + jspdf-autotable | latest |
| Utils | clsx + tailwind-merge | latest |

### package.json dependencies

```json
{
  "dependencies": {
    "better-sqlite3": "latest",
    "clsx": "latest",
    "framer-motion": "latest",
    "jspdf": "latest",
    "jspdf-autotable": "latest",
    "lucide-react": "latest",
    "next": "16.2.1",
    "openai": "latest",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "recharts": "^3.8.1",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/better-sqlite3": "latest",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.1",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 2. PROJECT STRUCTURE

```
medtrace-app/
├── package.json
├── tsconfig.json
├── next.config.ts                    # serverExternalPackages: ["better-sqlite3"]
├── postcss.config.mjs                # @tailwindcss/postcss
├── eslint.config.mjs
├── .env.example
├── .gitignore
├── src/
│   ├── app/
│   │   ├── globals.css               # Tailwind + custom theme + glass + animations
│   │   ├── layout.tsx                # Root: AuthProvider → ToastProvider → AppShell
│   │   ├── page.tsx                  # Dashboard (stats, ward map, vitals radar, alerts)
│   │   ├── error.tsx                 # Global error boundary
│   │   ├── loading.tsx               # Global loading skeleton
│   │   ├── not-found.tsx             # 404 page
│   │   ├── login/page.tsx            # Auth + optional NVIDIA API key
│   │   ├── register/page.tsx         # User registration (doctor/nurse)
│   │   ├── logo-preview/page.tsx     # Logo showcase
│   │   ├── patients/
│   │   │   ├── page.tsx              # Patient list (search, filter by ward/status)
│   │   │   ├── loading.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # Patient detail (1116 lines — THE main page)
│   │   │       ├── loading.tsx
│   │   │       └── error.tsx
│   │   ├── prescribe/page.tsx        # 3-step Rx check (select patient → search drug → check)
│   │   ├── vitals/page.tsx           # Record vital signs
│   │   ├── instructions/page.tsx     # Doctor orders management
│   │   ├── admit/page.tsx            # 3-step admission wizard
│   │   ├── handoff/page.tsx          # AI shift handoff report
│   │   ├── recalls/page.tsx          # Drug recall tracker
│   │   ├── discharge/page.tsx        # Patient discharge
│   │   ├── analytics/page.tsx        # Charts dashboard (6 chart types)
│   │   └── api/                      # 29 API routes (see §11)
│   │       ├── login/route.ts
│   │       ├── register/route.ts
│   │       ├── health/route.ts
│   │       ├── patients/
│   │       │   ├── route.ts          # GET list
│   │       │   └── [id]/route.ts     # GET detail
│   │       ├── doctors/route.ts
│   │       ├── rooms/route.ts
│   │       ├── medications/route.ts  # POST create, PATCH update
│   │       ├── med-admin/route.ts
│   │       ├── vitals/route.ts       # GET + POST
│   │       ├── instructions/route.ts # GET + POST + PATCH
│   │       ├── allergies/route.ts    # GET + POST + DELETE
│   │       ├── labs/route.ts
│   │       ├── notes/route.ts        # GET + POST
│   │       ├── analytics/route.ts
│   │       ├── admit/route.ts        # POST (transactional)
│   │       ├── discharge/route.ts    # POST (transactional)
│   │       ├── prescribe/
│   │       │   ├── check/route.ts    # POST → ai-engine.checkPrescription()
│   │       │   └── alternatives/route.ts  # POST → ai-engine.findAlternatives()
│   │       ├── drugs/search/route.ts # GET (local + OpenFDA + RxNorm)
│   │       ├── drug-info/[name]/route.ts  # GET (OpenFDA + AI summary)
│   │       ├── recalls/
│   │       │   ├── route.ts          # GET list
│   │       │   └── [drug]/impact/route.ts # POST blast radius
│   │       ├── voice/extract/route.ts     # POST entity extraction
│   │       └── ai/
│   │           ├── copilot/route.ts       # POST conversational
│   │           ├── care-plan/route.ts     # POST inpatient/discharge
│   │           ├── vitals-analysis/route.ts # POST trend analysis
│   │           ├── shift-handoff/route.ts   # POST SBAR report
│   │           └── suggest-prescription/route.ts # POST drug suggestion
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx          # Sidebar + AuthGuard wrapper
│   │   │   ├── Sidebar.tsx           # Nav, user info, AI status
│   │   │   ├── AuthGuard.tsx         # Redirect to /login if not authenticated
│   │   │   └── PageHeader.tsx        # Title + description + actions
│   │   ├── ui/
│   │   │   ├── Button.tsx            # primary/secondary/danger/ghost × sm/md/lg
│   │   │   ├── Card.tsx              # default/glass/elevated + CardHeader + CardTitle
│   │   │   ├── Badge.tsx             # default + risk variant (5 risk levels)
│   │   │   ├── Input.tsx             # With optional icon
│   │   │   ├── Logo.tsx              # SVG: green gradient rect + heartbeat line + cross
│   │   │   ├── Skeleton.tsx          # Shimmer animation
│   │   │   ├── Toast.tsx             # Provider + context + success/error/warning/info
│   │   │   ├── MarkdownRenderer.tsx  # Full MD parser (headings, lists, tables, bold, code)
│   │   │   ├── AiLoadingTip.tsx      # Health tips while AI generates
│   │   │   └── DrugLink.tsx          # Clickable drug name → DrugInfoModal
│   │   ├── patient/
│   │   │   ├── AICopilot.tsx         # FAB → floating chat panel
│   │   │   └── DrugInfoModal.tsx     # FDA data + AI summary tabs
│   │   └── voice/
│   │       ├── VoiceButton.tsx       # Mic toggle with pulse animation
│   │       └── VoiceTranscript.tsx   # Transcript + extracted entities
│   ├── lib/
│   │   ├── types.ts                  # 40+ TypeScript interfaces
│   │   ├── api.ts                    # Fetch wrapper with timing
│   │   ├── db.ts                     # SQLite schema (27 tables) + seed (8 patients)
│   │   ├── utils.ts                  # cn(), getRiskColor(), formatDate()
│   │   ├── auth-context.tsx          # AuthProvider, useAuth(), session in localStorage
│   │   ├── ai-client.ts             # NVIDIA Nemotron + 30-day DB cache
│   │   ├── ai-engine.ts             # checkPrescription() + findAlternatives()
│   │   ├── logger.ts                # debug/info/warn/error with timestamps
│   │   ├── health-tips.ts           # 30 rotating health tips for loading screens
│   │   ├── mock-data.ts             # Drug/enzyme/condition arrays for fallback
│   │   ├── generate-pdf.ts          # Patient report + discharge summary PDF
│   │   └── gemini.ts                # Drug context retrieval for AI prompts
│   ├── hooks/
│   │   └── use-voice.ts             # Web Speech API hook
│   └── types/
│       └── speech.d.ts              # SpeechRecognition type defs
```

---

## 3. CONFIGURATION FILES

### next.config.ts
```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
};
export default nextConfig;
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true, "skipLibCheck": true, "strict": true, "noEmit": true,
    "esModuleInterop": true, "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts", "**/*.mts"],
  "exclude": ["node_modules"]
}
```

### postcss.config.mjs
```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### .env.example
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENABLE_VOICE=true
ENABLE_PHARMACOGENOMICS=true
ENABLE_RECALL_TRACKER=true
```

### .gitignore
```
node_modules/
.next/
*.db
*.db-shm
*.db-wal
.env.local
.DS_Store
```

---

## 4. DESIGN SYSTEM

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| bg-primary | `#0C0F0E` | Page background |
| bg-surface | `#141918` | Card default |
| bg-surface-2 | `#1C2321` | Elevated |
| bg-glass | `rgba(28,35,33,0.65)` | Glass morphism |
| border | `rgba(255,255,255,0.06)` | All borders |
| text-primary | `#F0FDF4` | Headings |
| text-secondary | `#D1D5DB` | Body text |
| text-muted | `#6B7280` | Labels, hints |
| brand | `#1B6B3A` | Primary green (dark) |
| brand-light | `#22C55E` | Emerald accent |

### Risk Colors

| Level | Color | Tailwind |
|-------|-------|----------|
| Critical | `#EF4444` | red-500 |
| High | `#F97316` | orange-500 |
| Moderate | `#EAB308` | yellow-500 |
| Low | `#22C55E` | green-500 |
| Safe | `#06B6D4` | cyan-500 |

### Typography

| Use | Font | Weight |
|-----|------|--------|
| Headings | Inter | 600-700 |
| Body | Inter | 400 |
| Drug names, dosages, code | JetBrains Mono | 400 |

### globals.css — Complete

```css
@import "tailwindcss";

@theme inline {
  --color-bg-primary: #0C0F0E;
  --color-bg-surface: #141918;
  --color-bg-surface-2: #1C2321;
  --color-bg-elevated: #232A28;
  --color-bg-glass: rgba(28, 35, 33, 0.65);
  --color-border: rgba(255, 255, 255, 0.06);
  --color-text-primary: #F0FDF4;
  --color-text-secondary: #D1D5DB;
  --color-text-muted: #6B7280;
  --color-brand: #1B6B3A;
  --color-brand-light: #22C55E;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

html { color-scheme: dark; }
body { background-color: var(--color-bg-primary); color: var(--color-text-primary); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 10px; }

.glass { background: var(--color-bg-glass); backdrop-filter: blur(16px) saturate(180%); border: 1px solid var(--color-border); }
.glass-hover:hover { background: rgba(28, 35, 33, 0.8); border-color: rgba(255, 255, 255, 0.1); }
.glow-green { box-shadow: 0 0 30px rgba(34, 197, 94, 0.12); }
.glow-red { box-shadow: 0 0 30px rgba(239, 68, 68, 0.15); }
.glow-brand { box-shadow: 0 0 40px rgba(27, 107, 58, 0.2); }

.gradient-mesh {
  background: radial-gradient(ellipse at 20% 50%, rgba(27, 107, 58, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(34, 197, 94, 0.04) 0%, transparent 50%);
}

@keyframes pulse-soft { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
@keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
.animate-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
.animate-shimmer { background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.03) 50%, transparent 75%); background-size: 200% 100%; animation: shimmer 2s infinite; }

.vital-dot { width: 6px; height: 6px; border-radius: 50%; }
.vital-normal { background: #22C55E; box-shadow: 0 0 6px rgba(34, 197, 94, 0.5); }
.vital-warning { background: #F59E0B; box-shadow: 0 0 6px rgba(245, 158, 11, 0.5); }
.vital-critical { background: #EF4444; box-shadow: 0 0 6px rgba(239, 68, 68, 0.5); animation: pulse-soft 1.5s ease-in-out infinite; }

@media print { body { background: white; color: black; } .no-print { display: none !important; } }
```

### Logo SVG (Logo.tsx)

Green gradient rounded rectangle (rx=14) with:
- Faint heart outline (white, 10% opacity fill, 30% stroke)
- ECG/heartbeat line in `#4ADE80` (emerald-400): `M12 24 L18 24 L20 18 L24 32 L28 16 L30 24 L36 24`
- Red cross at top center (two overlapping rects in `#EF4444`)
- Gradient: `#166534 → #15803D → #14532D`

---

## 5. DATABASE SCHEMA & SEED DATA

### 27 Tables

**User/Auth:**
- `users` (id, name, role[doctor/nurse/admin], department, employee_id, email, password)

**Clinical Core:**
- `patients` (id, name, age, sex[M/F/Other], date_of_birth, blood_group, created_at)
- `rooms` (id, room_number, floor, ward, bed_count, room_type[general/icu/private/semi-private], status[occupied/available/maintenance])
- `admissions` (id, patient_id→patients, room_id→rooms, admission_date, discharge_date, reason, diagnosis, status[admitted/discharged/transferred], admitted_by, notes)
- `emergency_contacts` (id, patient_id→patients, name, relationship, phone, alt_phone)
- `doctors` (id, name, specialization, department, phone, employee_id)
- `doctor_assignments` (id, patient_id→patients, doctor_id→doctors, condition, assigned_date, is_primary, notes)

**Vitals & Clinical:**
- `vital_signs` (id, patient_id→patients, recorded_at, recorded_by, heart_rate, blood_pressure_sys, blood_pressure_dia, temperature, spo2, respiratory_rate, blood_sugar, weight, pain_level, notes)
- `lab_results` (id, patient_id→patients, test_name, value, unit, reference_min, reference_max, status, ordered_by, resulted_at)
- `allergies` (id, patient_id→patients, allergen, type[drug/food/environmental/other], reaction, severity[mild/moderate/severe], reported_date, reported_by)
- `nurse_notes` (id, patient_id→patients, recorded_by, note_type[general/assessment/intervention/evaluation/observation/handoff], content, shift[day/evening/night], created_at)
- `doctor_instructions` (id, patient_id→patients, doctor_id→doctors, instruction, category[medication/diet/activity/monitoring/procedure/other], priority[routine/urgent/stat], created_at, completed_at, completed_by, status[pending/in_progress/completed/cancelled])
- `medication_administration` (id, patient_id→patients, medication_id→patient_medications, administered_at, administered_by, dose_given, status[given/skipped/refused/held], reason, notes)

**Pharmacy:**
- `drugs` (id, name, generic_name, drug_class, efficacy_score)
- `patient_medications` (id, patient_id→patients, drug_id→drugs, dose, frequency, route, start_date, end_date, prescriber, status[active/discontinued/completed], instructions, next_due)
- `drug_interactions` (id, drug_a_id→drugs, drug_b_id→drugs, severity[1-10], mechanism, evidence_level)
- `drug_enzyme_effects` (id, drug_id→drugs, enzyme_id→enzymes, effect[inhibits/induces], potency[0-1])
- `enzyme_metabolisms` (id, enzyme_id→enzymes, drug_id→drugs, rate[fast/normal/slow])
- `drug_treatments` (id, drug_id→drugs, condition_id→conditions)
- `drug_contraindications` (id, drug_id→drugs, condition_id→conditions, reason)
- `drug_recalls` (id, drug_id→drugs, manufacturer_id→manufacturers, recall_date, reason, fda_id)

**Reference:**
- `enzymes` (id, name, gene, function)
- `conditions` (id, name, category, icd_code)
- `gene_variants` (id, gene, variant, type[poor_metabolizer/normal_metabolizer/ultra_rapid_metabolizer/reduced_activity], frequency)
- `manufacturers` (id, name, country)
- `patient_conditions` (id, patient_id→patients, condition_id→conditions, severity, diagnosed_date)
- `patient_genotypes` (id, patient_id→patients, gene_variant_id→gene_variants)
- `gene_enzyme_effects` (id, gene_variant_id→gene_variants, enzyme_id→enzymes, effect[no_activity/reduced_activity/increased_activity])

**Cache:**
- `drug_info` (id, drug_name, generic_name, drug_class, mechanism_of_action, indications, contraindications, side_effects, serious_adverse_reactions, dosage_info, interactions_summary, pregnancy_category, half_life, route_of_administration)
- `drug_info_cache` (id, drug_name, response, provider, created_at, expires_at)
- `ai_cache` (cache_key PRIMARY KEY, route, response, created_at, expires_at) — 30-day TTL

### Seed Data Summary

**3 Users:** Dr. Sarah Chen (Cardiology), Nurse James Rivera (General Ward), Dr. Anika Sharma (Endocrinology)

**12 Rooms:** Floor 1 (General Ward: 101-105), Floor 2 (Cardiology: 201-203), Floor 3 (ICU: 301-304)

**5 Doctors:** Sarah Chen, Anika Sharma, Michael Torres (Psychiatry), Emily Watson (Internal Medicine), Raj Gupta (Gastroenterology)

**25 Drugs:** Warfarin, Aspirin, Fluoxetine, Metoprolol, Omeprazole, Simvastatin, Lisinopril, Metformin, Amlodipine, Ibuprofen, Acetaminophen, Clopidogrel, Gabapentin, Levothyroxine, Valsartan, Losartan, Diclofenac, Prednisone, Insulin Glargine, Atorvastatin, Furosemide, Digoxin, Amiodarone, Hydrochlorothiazide, Spironolactone

**5 Enzymes:** CYP2D6, CYP3A4, CYP2C9, CYP2C19, CYP1A2

**12 Conditions:** Atrial Fibrillation (I48.91), Hypertension (I10), Type 2 Diabetes (E11.9), Major Depression (F33.1), GERD (K21.0), Osteoarthritis (M19.90), Hyperlipidemia (E78.5), Hypothyroidism (E03.9), Heart Failure (I50.9), CKD (N18.3), COPD (J44.1), Neuropathic Pain (G89.4)

**8 Patients (all admitted):**

| # | Name | Age | Sex | Room | Ward | Meds | Risk Profile |
|---|------|-----|-----|------|------|------|--------------|
| 1 | Raj Patel | 72 | M | 201 | Cardiology | 9 | Critical — polypharmacy, CYP2C9 poor metabolizer |
| 2 | Maria Lopez | 54 | F | 101 | General | 3 | Clean baseline |
| 3 | John Doe | 67 | M | 102 | General | 5 | 2 moderate interactions |
| 4 | Emma Wilson | 41 | F | 103 | General | 6 | CYP2D6 poor metabolizer |
| 5 | Kenji Tanaka | 78 | M | 301 | ICU | 7 | HF + CKD, CYP2C19 poor metabolizer |
| 6 | Fatima Al-Rashidi | 63 | F | 302 | ICU | 5 | COPD exacerbation |
| 7 | David Okonkwo | 55 | M | 202 | Cardiology | 4 | Moderate risk |
| 8 | Linda Chen | 45 | F | 303 | ICU | 4 | Thyroid storm |

**10 Drug Interactions** (severity 4-9), **5 drug-enzyme effects**, **7 enzyme metabolisms**, **3 contraindications**, **5 allergies**, **13 vital readings**, **10 lab results**, **3 nurse notes**, **5 doctor instructions**, **6 gene variants**, **5 patient genotypes**, **4 gene-enzyme effects**, **2 drug recalls**, **17 drug info records**

---

## 6. TYPESCRIPT TYPES

All in `src/lib/types.ts`. Key types:

- `UserRole = "doctor" | "nurse" | "admin"`
- `RiskLevel = "critical" | "high" | "moderate" | "low" | "safe"`
- `Patient` — full patient with nested room, admission, medications, conditions, vitals
- `VitalSigns` — 10 vital fields (HR, BP sys/dia, temp, SpO2, RR, blood sugar, weight, pain, notes)
- `InteractionChain` — type (direct/enzyme_cascade/contraindication/pharmacogenomic), risk_level, drugs_involved, mechanism, explanation
- `PrescriptionCheckResult` — patient_id, new_drug, overall_risk, interactions[], ai_powered
- `AlternativeDrug` — drug, risk_level, reason, interactions_avoided
- `ApiResponse<T>` — success, data, error, meta
- 40+ interfaces covering every domain entity

---

## 7. CORE LIBRARIES

### api.ts — HTTP Client
- `apiClient<T>(path, options)` → `ApiResponse<T>`
- Merges headers correctly (destructured spread)
- Tracks query_time_ms
- Network error fallback

### utils.ts
- `cn(...inputs)` — clsx + tailwind-merge
- `getRiskColor(level)` — maps RiskLevel to hex
- `formatDate(dateString)` — locale date formatting

### logger.ts
- Levels: debug/info/warn/error
- Production: warn+ only
- Format: `[timestamp] [LEVEL] [MedTrace] message`

### generate-pdf.ts
- `generatePatientReport(patient)` — demographics, allergies, conditions, meds, vitals, labs, instructions, notes
- `generateDischargeReport(patient, summary)` — discharge-specific format
- MedTrace branding in header/footer

### health-tips.ts
- 30 tips across 10 categories (Exercise, Nutrition, Sleep, etc.)
- `getRandomHealthTip()` — no-repeat selection

### gemini.ts
- `retrieveDrugContext(drugName)` — fetches from drug_info table
- Builds context string with interactions for AI prompts

---

## 8. AI ENGINE — DRUG INTERACTION DETECTION

File: `src/lib/ai-engine.ts`

### checkPrescription(patientId, newDrugName) → PrescriptionCheckResult

4-layer interaction analysis against patient's active medications:

1. **Direct Drug-Drug** — queries `drug_interactions` table, maps severity 1-10 to risk
2. **Enzyme Cascade** — new drug inhibits enzyme → impaired metabolism of current drug (bidirectional check)
3. **Contraindication** — new drug contraindicated for patient's conditions → always critical
4. **Pharmacogenomic** — patient's gene variants affect drug metabolism via enzyme activity

Overall risk = highest risk found across all interactions.

### findAlternatives(patientId, originalDrug, condition?) → AlternativeDrug[]

1. Find drugs treating same conditions as original
2. Run `checkPrescription()` on each candidate
3. Sort by risk (safest first), then efficacy
4. Return top 5

---

## 9. AI CLIENT — NVIDIA NEMOTRON + 30-DAY CACHE

File: `src/lib/ai-client.ts`

### Architecture

```
Request → SHA-256 hash(route + system + user prompt) → Check ai_cache table
  ↓ hit → return cached response instantly
  ↓ miss → Call NVIDIA Nemotron → Save to ai_cache with 30-day expiry → return
```

### API Details

- **Provider:** NVIDIA via OpenAI-compatible API
- **Base URL:** `https://integrate.api.nvidia.com/v1`
- **Model:** `nvidia/llama-3.1-nemotron-ultra-253b-v1`
- **Temperature:** 0.4
- **Max tokens:** 4096
- **Timeout:** 120s

### Exports

- `getApiKey(request)` — extracts `x-ai-key` header
- `generateAiResponse(key, systemPrompt, userPrompt, route)` — cache-first, then API
- `getCachedResponse(route, system, user)` — direct cache lookup
- `formatAiError(error)` — user-friendly error messages

---

## 10. AUTHENTICATION SYSTEM

### Flow

1. Login page: email + password + optional NVIDIA API key
2. `POST /api/login` validates credentials against `users` table
3. On success: `login(user, apiKey)` stores to `localStorage` as `medtrace_session`
4. `AuthProvider` wraps app, exposes `useAuth()` hook
5. `AuthGuard` redirects unauthenticated users to `/login`
6. `aiHeaders()` returns `{ "Content-Type", "x-ai-key", "x-ai-provider": "nvidia" }`

### Demo Credentials

- `sarah.chen@hospital.org` / `password` (Doctor, Cardiology)
- `james.rivera@hospital.org` / `password` (Nurse, General Ward)

---

## 11. API ROUTES

### Response Format (all routes)
```json
{ "success": true, "data": {}, "error": null, "meta": { "ai_powered": false, "query_time_ms": 42 } }
```

### 29 Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/login` | User authentication |
| POST | `/api/register` | User registration |
| GET | `/api/health` | Health check + DB stats |
| GET | `/api/patients` | List patients with enriched data (admission, room, meds, conditions, vitals) |
| GET | `/api/patients/[id]` | Full patient detail (everything) |
| GET | `/api/doctors` | List all doctors |
| GET | `/api/rooms` | List rooms with status |
| POST | `/api/medications` | Add medication to patient |
| PATCH | `/api/medications` | Update/discontinue medication |
| POST | `/api/med-admin` | Log medication administration |
| GET | `/api/vitals?patient_id=` | Get vital signs history |
| POST | `/api/vitals` | Record new vital signs |
| GET | `/api/instructions?patient_id=` | Get doctor instructions |
| POST | `/api/instructions` | Create instruction |
| PATCH | `/api/instructions` | Update instruction status |
| GET | `/api/allergies?patient_id=` | Get allergies |
| POST | `/api/allergies` | Add allergy |
| DELETE | `/api/allergies` | Remove allergy |
| GET | `/api/labs?patient_id=` | Get lab results |
| GET | `/api/notes?patient_id=` | Get nurse notes |
| POST | `/api/notes` | Add nurse note |
| GET | `/api/analytics` | Hospital-wide metrics |
| POST | `/api/admit` | Admit patient (transactional) |
| POST | `/api/discharge` | Discharge patient (transactional) |
| POST | `/api/prescribe/check` | Check drug interactions |
| POST | `/api/prescribe/alternatives` | Find safer alternatives |
| GET | `/api/drugs/search?q=` | Multi-source drug search (local → OpenFDA → RxNorm → custom fallback) |
| GET | `/api/drug-info/[name]` | Drug info (FDA + AI summary) |
| GET | `/api/recalls` | List drug recalls |
| POST | `/api/recalls/[drug]/impact` | Affected patients |
| POST | `/api/voice/extract` | Entity extraction from speech text |
| POST | `/api/ai/copilot` | Conversational clinical support |
| POST | `/api/ai/care-plan` | Inpatient or discharge care plan |
| POST | `/api/ai/vitals-analysis` | Vital signs trend analysis |
| POST | `/api/ai/shift-handoff` | SBAR shift report |
| POST | `/api/ai/suggest-prescription` | Medication suggestions |

### AI Route Pattern

Every AI route follows:
1. Extract API key from headers
2. Build patient context from DB
3. If key exists → call `generateAiResponse()` (checks cache first) → return AI response
4. If no key → return template-based fallback (no "rule-based" text in response)

---

## 12. UI COMPONENTS

### Layout
- **AppShell** — hides sidebar on /login, /register, /logo-preview
- **Sidebar** — 10 nav items with active indicator (layoutId animation), collapsible, user info footer
- **AuthGuard** — public paths passthrough, else redirect to /login
- **PageHeader** — title (text-2xl bold) + description (text-sm muted) + actions slot

### Primitives
- **Button** — 4 variants × 3 sizes, gradient primary, glass secondary
- **Card** — glass/default/elevated with CardHeader, CardTitle
- **Badge** — default (gray) + risk variant (5 colors matched to RiskLevel)
- **Input** — rounded-xl with optional leading icon
- **Skeleton** — shimmer animation on glass bg
- **Toast** — context-based, auto-dismiss 4s, 4 types with icons

### Complex
- **Logo** — SVG with green gradient, heartbeat line, red cross
- **MarkdownRenderer** — parses headings (3 levels), bullets, numbered lists, tables, bold, inline code, horizontal rules
- **AiLoadingTip** — rotating health tips + spinner while AI generates
- **DrugLink** — clickable drug name → opens DrugInfoModal
- **DrugInfoModal** — 2 tabs (FDA / AI), fetches from OpenFDA API, DailyMed link
- **AICopilot** — floating action button → chat panel, 4 suggested prompts, message history, markdown rendering
- **VoiceButton** — mic toggle with red pulse animation when listening
- **VoiceTranscript** — shows transcript + extracted drugs/conditions/dosages with confidence

---

## 13. PAGES

### Dashboard (`/`)
- Stats: total patients, active medications, pending instructions, active recalls
- Ward map: 3-floor grid showing room occupancy with status dots
- Vitals radar chart (normalized averages)
- Critical alerts (abnormal vitals + urgent instructions)
- Recent activity (nurse notes)
- Real-time clock

### Patient List (`/patients`)
- Search by name, filter by ward, filter admitted only
- Cards with vital status dots, medication count, conditions

### Patient Detail (`/patients/[id]`) — 1116 lines
- Header: identity, room, admission, doctor, allergies
- 6 tabs: Overview, Vitals, Notes, Labs, Timeline, Care Plan
- Overview: medications table, conditions, emergency contact, pharmacogenomics
- Vitals: line chart + history table with recording nurse
- Notes: filtered by type with shift indicator
- Labs: values with reference ranges and status colors
- Timeline: unified feed of all clinical events
- Care Plan: AI-generated
- Modals: record vitals, add nurse note
- Actions: vitals analysis, care plan, PDF download

### Prescribe (`/prescribe`)
- Step 1: select admitted patient
- Step 2: search drug (voice input supported, local + FDA + RxNorm)
- Step 3: check interactions → risk card + interaction details + safer alternatives
- Add medication form (dose/frequency/route)
- AI suggestion button

### Vitals Entry (`/vitals`)
- Select patient → 9 vital fields with status indicators
- Notes textarea, save button

### Instructions (`/instructions`)
- Filter: pending/completed/all
- Priority badges (stat=red, urgent=orange, routine=gray)
- Category icons, start/complete/undo actions

### Admit (`/admit`)
- 3-step wizard with progress bar
- Step 0: patient info + emergency contact
- Step 1: room selection + doctor + reason/diagnosis
- Step 2: confirmation review + notes

### Shift Handoff (`/handoff`)
- Shift selector (day/evening/night) with time ranges
- Generate SBAR report (AI-enhanced or fallback)
- Download as markdown

### Drug Recalls (`/recalls`)
- List with drug name, manufacturer, date, reason
- Blast radius: affected patients

### Discharge (`/discharge`)
- Select patient, write notes, AI discharge summary
- Download summary, success redirect

### Analytics (`/analytics`)
- 6 charts: ward occupancy (bar), drug class distribution (pie), interaction severity (bar), condition prevalence (bar), lab status (pie), polypharmacy risk (bar)
- Custom dark tooltips

---

## 14. HOOKS

### use-voice.ts
- `useVoice()` → { isListening, isSupported, transcript, interimTranscript, extraction, isExtracting, error, startListening, stopListening, reset }
- Uses Web Speech API (`webkitSpeechRecognition`)
- On stop: sends transcript to `/api/voice/extract` for entity extraction
- Returns `VoiceExtractionResult` with drugs, conditions, dosages, confidence

---

## 15. BUILD ORDER

### Phase 1 — Foundation
1. `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`
2. `globals.css` with full theme
3. `src/lib/types.ts`
4. `src/lib/logger.ts`, `src/lib/utils.ts`
5. `src/lib/db.ts` (schema + seed)
6. `src/lib/api.ts`

### Phase 2 — Auth + Layout
7. `src/lib/auth-context.tsx`
8. `src/components/ui/*` (Button, Card, Badge, Input, Logo, Skeleton, Toast)
9. `src/components/layout/*` (AppShell, Sidebar, AuthGuard, PageHeader)
10. `src/app/layout.tsx`
11. `src/app/login/page.tsx`, `src/app/register/page.tsx`
12. `src/app/api/login/route.ts`, `src/app/api/register/route.ts`

### Phase 3 — Core API Routes
13. `src/app/api/health/route.ts`
14. `src/app/api/patients/route.ts` + `[id]/route.ts`
15. `src/app/api/medications/route.ts`, `vitals/route.ts`, `instructions/route.ts`
16. `src/app/api/allergies/route.ts`, `labs/route.ts`, `notes/route.ts`
17. `src/app/api/doctors/route.ts`, `rooms/route.ts`
18. `src/app/api/admit/route.ts`, `discharge/route.ts`
19. `src/app/api/analytics/route.ts`

### Phase 4 — AI Engine + Drug System
20. `src/lib/ai-engine.ts` (checkPrescription + findAlternatives)
21. `src/lib/ai-client.ts` (NVIDIA + cache)
22. `src/app/api/prescribe/check/route.ts`, `alternatives/route.ts`
23. `src/app/api/drugs/search/route.ts`
24. `src/app/api/drug-info/[name]/route.ts`
25. `src/app/api/recalls/route.ts` + `[drug]/impact/route.ts`

### Phase 5 — AI API Routes
26. `src/app/api/ai/copilot/route.ts`
27. `src/app/api/ai/vitals-analysis/route.ts`
28. `src/app/api/ai/care-plan/route.ts`
29. `src/app/api/ai/shift-handoff/route.ts`
30. `src/app/api/ai/suggest-prescription/route.ts`
31. `src/app/api/voice/extract/route.ts`

### Phase 6 — Complex UI Components
32. `src/components/ui/MarkdownRenderer.tsx`, `AiLoadingTip.tsx`, `DrugLink.tsx`
33. `src/components/patient/AICopilot.tsx`, `DrugInfoModal.tsx`
34. `src/components/voice/VoiceButton.tsx`, `VoiceTranscript.tsx`
35. `src/hooks/use-voice.ts`
36. `src/lib/health-tips.ts`, `mock-data.ts`, `gemini.ts`, `generate-pdf.ts`

### Phase 7 — Pages
37. `src/app/page.tsx` (Dashboard)
38. `src/app/patients/page.tsx` (Patient list)
39. `src/app/patients/[id]/page.tsx` (Patient detail — THE hero page)
40. `src/app/prescribe/page.tsx`
41. `src/app/vitals/page.tsx`
42. `src/app/instructions/page.tsx`
43. `src/app/admit/page.tsx`
44. `src/app/handoff/page.tsx`
45. `src/app/recalls/page.tsx`
46. `src/app/discharge/page.tsx`
47. `src/app/analytics/page.tsx`
48. Error/loading/not-found pages

### Phase 8 — Polish
49. Framer Motion animations on all page transitions
50. Loading skeletons for every page
51. Error boundaries
52. Voice input integration
53. PDF generation
54. Final build verification

---

## FINAL NOTES

1. **Single codebase** — Next.js handles frontend + API. No separate backend.
2. **SQLite database** — zero config, file-based, WAL mode for performance.
3. **AI is optional** — everything works without NVIDIA key. Fallback responses are identical in structure, just template-based instead of AI-generated.
4. **30-day AI cache** — SHA-256 keyed by route + prompts. Cache hits are instant.
5. **Drug search** — 3-tier: local DB → OpenFDA API → RxNorm API → custom entry fallback.
6. **4-layer interaction detection** — direct, enzyme cascade, contraindication, pharmacogenomic.
7. **Demo credentials** — `sarah.chen@hospital.org` / `password`
8. **Project name is MedTrace** — everywhere, always.
