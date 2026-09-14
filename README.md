# KnowledgeAI

Enterprise-style AI knowledge assistant built with RAG, React, FastAPI, MongoDB, and multi-model LLM support.

KnowledgeAI lets users upload documents or connect external data sources such as GitHub and Notion, then ask natural-language questions and receive answers grounded in their own data with source citations.

## Features

- RAG-based document question answering
- PDF, DOCX, PPTX, CSV, Markdown, and TXT ingestion
- Semantic search using cosine similarity
- Streaming AI responses using Server-Sent Events
- Source citations with similarity scores
- OpenAI, Claude, and Gemini model switching
- GitHub and Notion connectors
- Google OAuth authentication
- Role-based access control
- Admin dashboard and usage analytics
- Docker-based local deployment
- Automated backend and frontend testing

## Tech Stack

### Frontend
- React
- React Router
- TanStack React Query
- Tailwind CSS
- shadcn/ui
- Recharts

### Backend
- Python
- FastAPI
- MongoDB
- Motor
- Pydantic
- SSE streaming

### AI / RAG
- OpenAI
- Anthropic Claude
- Google Gemini
- Retrieval-Augmented Generation
- Embeddings
- Cosine similarity
- Agent routing

### DevOps
- Docker
- Docker Compose
- Pytest
- Playwright

## Architecture

```text
React Frontend
      |
      | REST / SSE
      v
FastAPI Backend
      |
      |-- Authentication
      |-- Document Processing
      |-- RAG Retrieval
      |-- AI Model Router
      |-- GitHub / Notion Connectors
      |
      v
MongoDB
```

## RAG Flow

1. User uploads a document or connects a data source.
2. Text is extracted and split into chunks.
3. Embeddings are generated and stored with document metadata.
4. User sends a natural-language question.
5. Relevant chunks are retrieved using cosine similarity.
6. Retrieved context is added to the LLM prompt.
7. The model streams the response back to the UI using SSE.
8. Source citations and similarity scores are displayed with the answer.

## Project Structure

```text
KnowledgeAI-Rag-Platform/
├── backend/
├── frontend/
├── scripts/
├── docs/
├── docker-compose.yml
├── .gitignore
└── README.md
```
