# DevIntel AI — Environment Variables Reference

## API (.env)

| Variable | Required | Default | Description |
|---|---|---|---|
| `SECRET_KEY` | ✅ | — | JWT signing secret |
| `DATABASE_URL` | ✅ | — | PostgreSQL async URL |
| `QDRANT_HOST` | ✅ | localhost | Qdrant server host |
| `QDRANT_PORT` | ✅ | 6333 | Qdrant server port |
| `AI_PROVIDER` | ✅ | openai | `openai` or `gemini` |
| `OPENAI_API_KEY` | ⚠️ | — | Required if AI_PROVIDER=openai |
| `GEMINI_API_KEY` | ⚠️ | — | Required if AI_PROVIDER=gemini |
| `EMBEDDING_MODEL` | — | text-embedding-3-small | OpenAI embedding model |
| `CHAT_MODEL` | — | gpt-4o-mini | OpenAI chat model |
| `VECTOR_SIZE` | — | 1536 | Must match embedding model output |
| `GITHUB_TOKEN` | — | — | Increases GitHub rate limit to 5000/hr |
| `TOP_K_SEMANTIC` | — | 10 | Number of semantic results before rerank |
| `TOP_K_RERANKED` | — | 5 | Number of results after reranking |

## Web (.env.local)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | http://localhost:8000 | FastAPI backend URL |
