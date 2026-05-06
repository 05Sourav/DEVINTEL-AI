<div align="center">

# 🧠 DevIntel AI

![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat-square&logo=fastapi)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
![Qdrant](https://img.shields.io/badge/Qdrant-f9005a?style=flat-square&logo=qdrant)
![Gemini](https://img.shields.io/badge/Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)

</div>

> **Engineering Intelligence Platform for Repositories**
>
> RAG-powered codebase analysis with hybrid search, reranking, and file-level citations.

---

## 💡 What It Does

DevIntel AI lets developers understand unfamiliar codebases instantly.

- Import any GitHub repository
- Ask natural language questions about architecture, auth, APIs, data flow
- Get precise answers with **file-level citations** — no hallucinations
- One-click **architecture summary** (stack detection, language breakdown)

---

## 🛠️ Tech Stack

| Layer        | Technology                                              |
| ------------ | ------------------------------------------------------- |
| Frontend     | Next.js 14 (App Router), TypeScript, Tailwind CSS       |
| Backend API  | FastAPI (Python), async SQLAlchemy                      |
| Database     | PostgreSQL                                              |
| Vector Store | Qdrant                                                  |
| AI           | OpenAI (GPT-4o-mini + text-embedding-3-small) or Gemini |
| Retrieval    | Hybrid: semantic + keyword, LLM reranking               |

---

## 🏗️ System Architecture

```
User → Next.js Frontend
         ↓
      FastAPI API
         ↓
  ┌──────────────────────────────────────┐
  │          Ingestion Pipeline          │
  │  GitHub API → Parser → Chunker       │
  │  → Embeddings → Qdrant + PostgreSQL  │
  └──────────────────────────────────────┘
         ↓
  ┌──────────────────────────────────────┐
  │          Retrieval Pipeline          │
  │  Semantic Search (Qdrant)            │
  │  + Keyword Scoring                   │
  │  → Hybrid Merge → LLM Reranker      │
  └──────────────────────────────────────┘
         ↓
      Chat Engine (GPT-4o-mini)
         ↓
      Answer + Citations
```

---

## 📂 Project Structure

```
devintel-ai/
├── api/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── core/           # config, security
│   │   ├── db/             # models, session
│   │   ├── routes/         # auth, projects, ingest, chat
│   │   ├── services/       # github_loader, parser, chunker,
│   │   │                   # embeddings, vector_store, retrieval,
│   │   │                   # reranker, chat_engine, architecture
│   │   └── schemas/
│   └── requirements.txt
│
├── web/                    # Next.js frontend
│   ├── app/
│   │   ├── page.tsx        # Landing page
│   │   ├── login/
│   │   ├── dashboard/
│   │   ├── project/[id]/
│   │   └── chat/[id]/
│   ├── lib/api.ts
│   ├── hooks/useAuth.ts
│   └── types/
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### 1. Clone and configure

```bash
git clone https://github.com/yourusername/devintel-ai
cd devintel-ai
```

Copy env files:

```bash
cp api/.env.example api/.env
cp web/.env.local.example web/.env.local
```

Edit `api/.env` and add your `OPENAI_API_KEY` (or `GEMINI_API_KEY`).

### 2. Start infrastructure

```bash
docker-compose up postgres qdrant -d
```

### 3. Run the backend

```bash
cd api
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

### 4. Run the frontend

```bash
cd web
npm install
npm run dev
```

Frontend: http://localhost:3000

---

## 🔌 API Endpoints

| Method | Endpoint                    | Description      |
| ------ | --------------------------- | ---------------- |
| POST   | `/auth/register`            | Register user    |
| POST   | `/auth/login`               | Login → JWT      |
| GET    | `/auth/me`                  | Current user     |
| POST   | `/projects/`                | Create project   |
| GET    | `/projects/`                | List projects    |
| POST   | `/ingest/repo`              | Start ingestion  |
| GET    | `/ingest/status/{id}`       | Ingestion status |
| GET    | `/ingest/architecture/{id}` | Arch summary     |
| POST   | `/chat/`                    | Create chat      |
| POST   | `/chat/ask`                 | Ask question     |
| GET    | `/chat/{id}/messages`       | Message history  |

---

## 🧠 Key Engineering Decisions

### Why Qdrant?

Fast, production-grade vector database with payload filtering — lets us scope queries per project without complex SQL joins.

### Why Hybrid Search?

Semantic search finds conceptually relevant code ("how login works"), while keyword search finds exact identifiers (`jwtMiddleware`, `RedisClient`). Combining both increases precision significantly.

### Why Chunk by Functions?

Functions are the atomic unit of code understanding. Chunking by function boundaries preserves context and prevents irrelevant code bleeding into answers.

### Why LLM Reranking?

Vector similarity scores don't always reflect true relevance. A second pass with an LLM scorer selects the best 3–5 chunks from the top 10 retrieved.

### Why File Citations?

Citations ground answers in the actual codebase. This is the key differentiator from generic chatbots — every claim is verifiable.

---

## 📄 License

MIT
