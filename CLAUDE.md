# CLAUDE.md — MedTrace Master Orchestration File

> **VERSION:** 3.0 — Supabase + Vercel Rewrite
> **PROJECT:** MedTrace — AI-Powered Drug Interaction & Personalized Medicine Platform
> **DATE:** 2026-03-31

---

## TABLE OF CONTENTS

1. [OPERATING PROTOCOL](#1-operating-protocol)
2. [TECH STACK — LOCKED](#2-tech-stack--locked)
3. [PROJECT STRUCTURE](#3-project-structure)
4. [DESIGN SYSTEM](#4-design-system)
5. [SUPABASE DATABASE SCHEMA](#5-supabase-database-schema)
6. [API ROUTES SPEC](#6-api-routes-spec)
7. [FRONTEND ROUTING & PAGES](#7-frontend-routing--pages)
8. [AI ENGINE RULES](#8-ai-engine-rules)
9. [MOCK DATA REQUIREMENTS](#9-mock-data-requirements)
10. [BUILD ORDER — PHASED](#10-build-order--phased)
11. [DEPLOYMENT](#11-deployment)

---

## 1. OPERATING PROTOCOL

### The Three Laws

| Law | Rule |
|-----|------|
| **LAW 1** | ASK before acting on any architectural, design, or structural decision not covered here |
| **LAW 2** | NEVER deviate from the tech stack or folder structure without explicit approval |
| **LAW 3** | NEVER assume. If the spec is ambiguous, STOP and ASK |

### Hard Rules

- The project is called **MedTrace**. Use it in ALL UI text, titles, meta tags, branding.
- Logo placeholder text: **MT**
- **No API keys required to run** — app MUST start and render UI with mock data when Supabase is unavailable
- **Graceful degradation is king** — never a blank screen, never an unhandled crash
- **TypeScript everywhere** — no `any` unless documented why
- **No console.log** in production — use a logger utility
- All database queries MUST use parameterized queries (Supabase client handles this)
- Never commit: `.env`, `node_modules/`, `.next/`, `.DS_Store`

---

## 2. TECH STACK — LOCKED

**Single codebase. Single deployment. No separate backend.**

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 14+ (App Router)** |
| Styling | **Tailwind CSS + Framer Motion** |
| 3D Graph | **react-force-graph-3d** |
| Voice | **Web Speech API** |
| Database | **Supabase (PostgreSQL)** |
| Auth | **Supabase Auth** (if needed later) |
| API | **Next.js API Routes** (`/app/api/`) |
| ORM/Client | **@supabase/supabase-js** |
| AI/LLM | **Configurable — env-var driven** (rule-based fallback default) |
| Deployment | **Vercel** (single deploy — frontend + API) |

### Dependencies

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@supabase/supabase-js": "latest",
    "react-force-graph-3d": "latest",
    "three": "latest",
    "framer-motion": "latest",
    "lucide-react": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest"
  },
  "devDependencies": {
    "tailwindcss": "latest",
    "typescript": "latest",
    "@types/react": "latest",
    "@types/node": "latest",
    "@types/three": "latest"
  }
}
```

---

## 3. PROJECT STRUCTURE

```
medtrace/
├── CLAUDE.md
├── .env.example
├── .env.local                    # Local dev (gitignored)
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── public/
│   └── fonts/
├── src/
│   ├── app/
│   │   ├── layout.tsx            # Root layout — dark theme, fonts, sidebar
│   │   ├── page.tsx              # Dashboard
│   │   ├── patients/
│   │   │   ├── page.tsx          # Patient list
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Patient detail + 3D graph
│   │   ├── prescribe/
│   │   │   └── page.tsx          # Prescription check flow
│   │   ├── recalls/
│   │   │   └── page.tsx          # Drug recall cascade
│   │   └── api/                  # API Routes (replaces FastAPI backend)
│   │       ├── health/
│   │       │   └── route.ts
│   │       ├── patients/
│   │       │   ├── route.ts      # GET list, POST create
│   │       │   └── [id]/
│   │       │       ├── route.ts  # GET detail
│   │       │       └── graph/
│   │       │           └── route.ts  # GET graph data
│   │       ├── prescribe/
│   │       │   ├── check/
│   │       │   │   └── route.ts  # POST check interactions
│   │       │   └── alternatives/
│   │       │       └── route.ts  # POST get alternatives
│   │       ├── drugs/
│   │       │   └── search/
│   │       │       └── route.ts  # GET search
│   │       ├── recalls/
│   │       │   ├── route.ts      # GET list
│   │       │   └── [drug]/
│   │       │       └── impact/
│   │       │           └── route.ts  # POST blast radius
│   │       └── voice/
│   │           └── extract/
│   │               └── route.ts  # POST entity extraction
│   ├── components/
│   │   ├── ui/                   # Button, Card, Badge, Input, Modal, Skeleton
│   │   ├── graph/                # ForceGraph3D, GraphNode, GraphEdge, GraphControls
│   │   ├── patient/              # PatientCard, MedicationList, RiskSummary
│   │   ├── prescribe/            # DrugSearch, AnalysisProgress, RiskCard, AlternativeCard
│   │   ├── voice/                # VoiceButton, VoiceTranscript, EntityExtraction
│   │   └── layout/               # Sidebar, Navbar, PageHeader
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Browser Supabase client
│   │   │   ├── server.ts         # Server-side Supabase client (for API routes)
│   │   │   └── types.ts          # Generated DB types
│   │   ├── api.ts                # Fetch wrapper for API routes
│   │   ├── types.ts              # App-wide TypeScript interfaces
│   │   ├── constants.ts          # Colors, routes, config
│   │   ├── utils.ts              # Utility functions
│   │   ├── logger.ts             # Logger utility
│   │   ├── mock-data.ts          # Mock data (fallback when no Supabase)
│   │   └── ai-engine.ts          # Rule-based risk analysis (runs server-side)
│   ├── hooks/
│   │   ├── use-patient.ts
│   │   ├── use-graph.ts
│   │   ├── use-prescription-check.ts
│   │   └── use-voice.ts
│   └── styles/
│       └── globals.css
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql  # Full schema
    └── seed.sql                    # Demo data
```

---

## 4. DESIGN SYSTEM

### Colors (Dark Medical Theme)

```
Background:      #09090B   (zinc-950)
Surface:         #18181B   (zinc-900)
Surface-2:       #27272A   (zinc-800)
Border:          #3F3F46   (zinc-700)
Text Primary:    #FAFAFA   (zinc-50)
Text Muted:      #A1A1AA   (zinc-400)

Risk Semantic Colors:
  Critical:      #EF4444   (red-500)     glow: 0 0 20px rgba(239,68,68,0.3)
  High:          #F97316   (orange-500)  glow: 0 0 20px rgba(249,115,22,0.3)
  Moderate:      #EAB308   (yellow-500)
  Low:           #22C55E   (green-500)
  Safe:          #06B6D4   (cyan-500)    glow: 0 0 20px rgba(6,182,212,0.3)

Graph Node Colors:
  Drug:          #8B5CF6   (violet)
  Enzyme:        #EC4899   (pink)
  Condition:     #F59E0B   (amber)
  Gene:          #10B981   (emerald)
  Patient:       #3B82F6   (blue)
```

### Typography

```
Headings:    Inter (font-weight: 600-700)
Body:        Inter (font-weight: 400)
Monospace:   JetBrains Mono (drug names, dosages)
Scale:       12 / 14 / 16 / 20 / 28 / 36 / 48
```

### Spacing & Radius

```
Spacing:     4 / 8 / 12 / 16 / 24 / 32 / 48 / 64
Radius:      8px (cards) / 12px (modals) / 9999px (pills/badges)
```

### Animation Philosophy

- Animation serves FUNCTION, not decoration
- Use Framer Motion for ALL transitions
- Risk paths: red pulse animation along graph edges
- New drug added: node drops in with spring physics
- Risk score: animated counter (0 -> value)
- Safe alternative: red edges dissolve, green edges grow
- Alert cards: slide in from right with stagger
- Voice active: pulsing glow on mic icon

### 3D Graph Spec (THE HERO)

```
Engine: react-force-graph-3d (Three.js)

Nodes:
  - Sphere geometry with emissive glow matching type color
  - Size proportional to connection count
  - Hover: expand + tooltip
  - Click: center camera + detail panel

Edges:
  - Safe: thin, semi-transparent white
  - Risk: thick, red, animated particle flow
  - Critical: red glow + pulse

Camera:
  - Default: orbital auto-rotate (slow)
  - On interaction: stop auto-rotate, user controls
  - On alert: auto-focus risk subgraph

Background: Deep black (#09090B) with subtle radial gradient
```

---

## 5. SUPABASE DATABASE SCHEMA

### Tables

```sql
-- Patients
CREATE TABLE patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('M', 'F', 'Other')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Drugs
CREATE TABLE drugs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  generic_name TEXT,
  drug_class TEXT,
  efficacy_score REAL
);

-- Enzymes (CYP family etc.)
CREATE TABLE enzymes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  gene TEXT,
  function TEXT
);

-- Conditions
CREATE TABLE conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  icd_code TEXT
);

-- Gene Variants
CREATE TABLE gene_variants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gene TEXT NOT NULL,
  variant TEXT NOT NULL,
  type TEXT,            -- e.g., 'poor_metabolizer', 'ultra_rapid'
  frequency REAL
);

-- Manufacturers
CREATE TABLE manufacturers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  country TEXT
);

-- === RELATIONSHIP TABLES ===

-- Patient takes Drug
CREATE TABLE patient_medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  drug_id UUID REFERENCES drugs(id) ON DELETE CASCADE,
  dose TEXT,
  frequency TEXT,
  start_date DATE,
  prescriber TEXT,
  UNIQUE(patient_id, drug_id)
);

-- Drug contains Compound (simplified: compound info stored on drug)
-- Drug interactions
CREATE TABLE drug_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_a_id UUID REFERENCES drugs(id) ON DELETE CASCADE,
  drug_b_id UUID REFERENCES drugs(id) ON DELETE CASCADE,
  severity INTEGER CHECK (severity BETWEEN 1 AND 10),
  mechanism TEXT,
  evidence_level TEXT,
  UNIQUE(drug_a_id, drug_b_id)
);

-- Drug-Enzyme relationships (inhibits/induces)
CREATE TABLE drug_enzyme_effects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_id UUID REFERENCES drugs(id) ON DELETE CASCADE,
  enzyme_id UUID REFERENCES enzymes(id) ON DELETE CASCADE,
  effect TEXT CHECK (effect IN ('inhibits', 'induces')),
  potency REAL
);

-- Enzyme metabolizes Drug
CREATE TABLE enzyme_metabolisms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  enzyme_id UUID REFERENCES enzymes(id) ON DELETE CASCADE,
  drug_id UUID REFERENCES drugs(id) ON DELETE CASCADE,
  rate TEXT  -- 'fast', 'normal', 'slow'
);

-- Drug treats Condition
CREATE TABLE drug_treatments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_id UUID REFERENCES drugs(id) ON DELETE CASCADE,
  condition_id UUID REFERENCES conditions(id) ON DELETE CASCADE
);

-- Drug contraindicated for Condition
CREATE TABLE drug_contraindications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_id UUID REFERENCES drugs(id) ON DELETE CASCADE,
  condition_id UUID REFERENCES conditions(id) ON DELETE CASCADE,
  reason TEXT
);

-- Patient has Condition
CREATE TABLE patient_conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  condition_id UUID REFERENCES conditions(id) ON DELETE CASCADE,
  severity TEXT,
  diagnosed_date DATE
);

-- Patient has Genotype
CREATE TABLE patient_genotypes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  gene_variant_id UUID REFERENCES gene_variants(id) ON DELETE CASCADE
);

-- Gene variant affects Enzyme expression
CREATE TABLE gene_enzyme_effects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gene_variant_id UUID REFERENCES gene_variants(id) ON DELETE CASCADE,
  enzyme_id UUID REFERENCES enzymes(id) ON DELETE CASCADE,
  effect TEXT  -- 'reduced_activity', 'increased_activity', 'no_activity'
);

-- Drug recalls
CREATE TABLE drug_recalls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_id UUID REFERENCES drugs(id) ON DELETE CASCADE,
  manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE CASCADE,
  recall_date DATE,
  reason TEXT,
  fda_id TEXT
);
```

### Key Queries (Interaction Chain Detection via JOINs)

**Direct drug-drug interaction:**
```sql
SELECT di.*, da.name as drug_a_name, db.name as drug_b_name
FROM drug_interactions di
JOIN drugs da ON di.drug_a_id = da.id
JOIN drugs db ON di.drug_b_id = db.id
WHERE (da.name = $1 AND db.name = ANY($2))
   OR (db.name = $1 AND da.name = ANY($2))
ORDER BY di.severity DESC;
```

**Enzyme cascade (Drug A inhibits enzyme that metabolizes Drug B):**
```sql
SELECT d1.name as inhibitor, e.name as enzyme, d2.name as affected_drug,
       dee.potency, em.rate
FROM drug_enzyme_effects dee
JOIN drugs d1 ON dee.drug_id = d1.id
JOIN enzymes e ON dee.enzyme_id = e.id
JOIN enzyme_metabolisms em ON em.enzyme_id = e.id
JOIN drugs d2 ON em.drug_id = d2.id
WHERE d1.name = $1
  AND d2.name = ANY($2)
  AND dee.effect = 'inhibits';
```

**Pharmacogenomics alert:**
```sql
SELECT d.name as drug, gv.gene, gv.type as metabolizer_type,
       e.name as enzyme
FROM patient_genotypes pg
JOIN gene_variants gv ON pg.gene_variant_id = gv.id
JOIN gene_enzyme_effects gee ON gee.gene_variant_id = gv.id
JOIN enzymes e ON gee.enzyme_id = e.id
JOIN enzyme_metabolisms em ON em.enzyme_id = e.id
JOIN drugs d ON em.drug_id = d.id
JOIN patient_medications pm ON pm.drug_id = d.id AND pm.patient_id = $1
WHERE pg.patient_id = $1;
```

---

## 6. API ROUTES SPEC

All API routes live in `/src/app/api/`. Next.js API route handlers.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (Supabase status) |
| GET | `/api/patients` | List all patients |
| POST | `/api/patients` | Create patient |
| GET | `/api/patients/[id]` | Patient detail + medications |
| GET | `/api/patients/[id]/graph` | Graph data (nodes + edges for 3D viz) |
| POST | `/api/prescribe/check` | Check new drug vs patient's meds |
| POST | `/api/prescribe/alternatives` | Safer alternatives |
| GET | `/api/drugs/search?q=` | Drug name search |
| GET | `/api/recalls` | List active recalls |
| POST | `/api/recalls/[drug]/impact` | Blast radius |
| POST | `/api/voice/extract` | Voice text -> entity extraction |

### Standard Response Format

```json
{
  "success": true,
  "data": { },
  "error": null,
  "meta": {
    "ai_powered": false,
    "query_time_ms": 42
  }
}
```

### Error Response

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "Patient with ID xyz not found"
  },
  "meta": {}
}
```

---

## 7. FRONTEND ROUTING & PAGES

| Path | Page | Key Components |
|------|------|----------------|
| `/` | Dashboard | PatientCard, AlertFeed, StatsBar |
| `/patients` | Patient List | PatientGrid, SearchInput |
| `/patients/[id]` | Patient Detail | ForceGraph3D, MedicationList, RiskSummary |
| `/prescribe` | Prescription Check | DrugSearch, AnalysisProgress, RiskCard, AlternativeCard |
| `/recalls` | Recall Tracker | RecallList, BlastRadiusGraph |

---

## 8. AI ENGINE RULES

### Default: Rule-Based (No API Key Needed)

The AI engine runs as a TypeScript module (`/src/lib/ai-engine.ts`) server-side in API routes.

**Risk Scoring Rules:**
- Drug A INHIBITS enzyme that METABOLIZES Drug B = **HIGH** risk
- CONTRAINDICATED_FOR match = **CRITICAL** risk
- Direct interaction severity > 7 = **HIGH**
- Direct interaction severity > 4 = **MODERATE**
- Direct interaction severity <= 4 = **LOW**
- No interactions found = **SAFE**

**Template explanations:**
`"[Drug A] [relationship] [intermediate] which [relationship] [Drug B] -> [consequence]"`

### When AI API Key IS Available (optional enhancement)

- Reads from `AI_API_KEY` env var
- Used for: richer risk reasoning, NLP entity extraction, report generation
- UI shows indicator: "AI-enhanced" vs "Rule-based engine"

---

## 9. MOCK DATA REQUIREMENTS

### 4 Demo Patients

| # | Name | Age | Sex | Medications | Risk Profile |
|---|------|-----|-----|-------------|--------------|
| 1 | **Raj Patel** | 72 | M | 9 medications | 3 critical interactions (THE demo patient) |
| 2 | **Maria Lopez** | 54 | F | 3 medications | No risks (clean baseline) |
| 3 | **John Doe** | 67 | M | 5 medications | 2 moderate alerts |
| 4 | **Emma Wilson** | 41 | F | 6 medications | 1 high alert |

### Required Mock Data

1. Full graph data for Raj Patel (drugs, enzymes, conditions, gene variants, all edges)
2. Prescription check: "Ibuprofen added to Raj Patel" -> 3 interaction chains
3. Alternative suggestions (Acetaminophen, Topical Diclofenac)
4. Recall sample: Valsartan recall affecting multiple patients

Mock data lives in `/src/lib/mock-data.ts` and is used when Supabase is unavailable.

---

## 10. BUILD ORDER — PHASED

### Phase 1 — Foundation

```
1.1  .gitignore, .env.example, README.md, package.json
1.2  Next.js scaffold (tsconfig, tailwind.config, next.config, globals.css)
1.3  Supabase client setup (lib/supabase/client.ts, server.ts)
1.4  TypeScript types (lib/types.ts)
1.5  Mock data (lib/mock-data.ts)
1.6  Logger + utils
1.7  SQL migration file (supabase/migrations/001_initial_schema.sql)
1.8  Seed SQL (supabase/seed.sql)

CHECKPOINT: App scaffolded, types defined, mock data ready.
```

### Phase 2 — API Routes + Data Layer

```
2.1  Health check route
2.2  Patients CRUD routes
2.3  Drug search route
2.4  Prescription check route + ai-engine.ts (rule-based)
2.5  Graph data route (builds node/edge structure for 3D viz)
2.6  API client (lib/api.ts with mock fallback)

CHECKPOINT: All API routes return valid JSON, rule-based risk works.
```

### Phase 3 — Frontend

```
3.1  Root layout (dark theme, Inter font, sidebar)
3.2  UI primitives (Button, Card, Badge, Input, Skeleton, Modal)
3.3  Dashboard page
3.4  Patient list page
3.5  Patient detail + 3D Graph (THE HERO)
3.6  Prescription check flow
3.7  Risk cards + Alternative cards

CHECKPOINT: Full UI renders with mock data, 3D graph is stunning.
```

### Phase 4 — Advanced

```
4.1  Voice input (Web Speech API)
4.2  Recall tracker + blast radius
4.3  Pharmacogenomics alerts
4.4  All Framer Motion animations
4.5  Loading states + error boundaries
4.6  Setup banner when no Supabase configured

CHECKPOINT: Demo-ready. Raj Patel walkthrough works flawlessly.
```

---

## 11. DEPLOYMENT

### Vercel

- Single `vercel deploy` — handles frontend + API routes
- Environment variables set in Vercel dashboard:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `AI_API_KEY` (optional)
  - `AI_PROVIDER` (optional)

### Supabase

- Create project at supabase.com
- Run migration SQL in Supabase SQL editor
- Run seed SQL for demo data
- Copy URL + anon key to env vars

### Environment Variables (.env.example)

```env
# === Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# === AI / LLM (optional — app works without) ===
AI_PROVIDER=none
AI_API_KEY=
AI_MODEL=

# === Feature Flags ===
ENABLE_VOICE=true
ENABLE_PHARMACOGENOMICS=true
ENABLE_RECALL_TRACKER=true
```

---

## FINAL REMINDERS

1. **ONE CODEBASE** — Next.js handles everything. No separate backend.
2. **GRACEFUL DEGRADATION** — works with mock data when Supabase is down.
3. **THE 3D GRAPH IS THE HERO** — stunning visuals, glowing nodes, animated risk edges.
4. **RULE-BASED FALLBACK** works perfectly without any API key.
5. **PROJECT NAME IS MEDTRACE** — everywhere, always.
6. **DEPLOY TO VERCEL** — single command deployment.
7. **ASK before deviating from this file.**
