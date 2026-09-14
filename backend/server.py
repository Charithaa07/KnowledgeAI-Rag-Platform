import os
import logging
from pathlib import Path

from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from auth import router as auth_router  # noqa: E402
from routes_docs import router as docs_router  # noqa: E402
from routes_chat import router as chat_router  # noqa: E402
from routes_core import router as core_router  # noqa: E402
from routes_connectors import router as connectors_router  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("knowledgeai")

app = FastAPI(title="KnowledgeAI API")
api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "KnowledgeAI API", "status": "ok"}


api_router.include_router(auth_router)
api_router.include_router(docs_router)
api_router.include_router(chat_router)
api_router.include_router(core_router)
api_router.include_router(connectors_router)
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
