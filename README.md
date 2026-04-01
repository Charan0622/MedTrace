# MedTrace

AI-Powered Drug Interaction and Personalized Medicine Graph

## Overview

MedTrace is a clinical decision support tool that uses graph-based reasoning to detect dangerous drug interactions, pharmacogenomic risks, and recall impacts. The hero feature is a real-time 3D knowledge graph that visualizes a patient's medication network, highlighting interaction chains and enzyme pathways.

## Key Features

- **3D Drug Interaction Graph** -- Interactive force-directed graph built with react-force-graph-3d, showing drugs, enzymes, conditions, and gene variants as glowing nodes with animated risk edges
- **Prescription Safety Checks** -- Add a new drug and instantly see multi-hop interaction chains through enzyme inhibition, induction, and contraindication paths
- **Pharmacogenomic Alerts** -- Patient genotype data (CYP2C9, CYP2D6, CYP2C19 variants) flags metabolism risks for specific drugs
- **Drug Recall Tracking** -- Blast radius analysis showing which patients are affected by a drug recall and their downstream interaction risks
- **Voice Input** -- Web Speech API integration for hands-free medical entity extraction

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Framer Motion |
| 3D Graph | react-force-graph-3d (Three.js) |
| Backend | FastAPI (Python 3.11+) |
| Database | Neo4j (Graph Database) |
| AI Engine | Configurable LLM with rule-based fallback |

## Demo Patients

| Name | Age | Sex | Medications | Risk Profile |
|------|-----|-----|-------------|--------------|
| Raj Patel | 72 | M | 9 medications | 3 critical interactions |
| Maria Lopez | 54 | F | 3 medications | Clean baseline |
| John Doe | 67 | M | 5 medications | 2 moderate alerts |
| Emma Wilson | 41 | F | 6 medications | 1 high alert |

## Setup

### Prerequisites

- Node.js 18+
- Python 3.9+
- Neo4j (optional -- app works with mock data)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp ../.env.example ../.env  # Edit with your settings
uvicorn main:app --reload --port 8000
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your values. The app starts and renders fully with no external services configured -- all features gracefully degrade to mock data.

## Project Structure

```
medtrace/
├── frontend/          # Next.js 14 App Router
│   └── src/
│       ├── app/       # Pages (dashboard, patients, prescribe, recalls)
│       ├── components/ # UI, graph, patient, prescribe, voice, layout
│       └── lib/       # API client, types, mock data, utilities
├── backend/           # FastAPI
│   ├── routers/       # API endpoints (/api/v1/*)
│   ├── services/      # Graph engine, AI engine, alert engine
│   ├── models/        # Pydantic request/response models
│   └── database/      # Neo4j client, schema, seed scripts
└── data/              # Seed JSON files
```

## API Endpoints

All endpoints are prefixed with `/api/v1/`.

| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /patients | List patients |
| POST | /patients | Create patient |
| GET | /patients/{id} | Patient detail |
| GET | /patients/{id}/graph | Patient graph data |
| POST | /prescribe/check | Check drug interactions |
| POST | /prescribe/alternatives | Get safer alternatives |
| POST | /voice/extract | Extract entities from voice |
| GET | /recalls | List active recalls |
| POST | /recalls/{drug}/impact | Recall blast radius |
| GET | /drugs/search?q= | Drug search |

## License

Proprietary
