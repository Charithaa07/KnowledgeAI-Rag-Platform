import json
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from db import conversations, messages, chunks, usage_logs, settings_col
from auth import get_current_user
from ai import (embed_one, rank_chunks, route_agent, build_system_prompt, make_chat,
                sanitize_prompt, UserMessage, TextDelta, StreamDone, PROVIDER_MODELS)

router = APIRouter(prefix="/chat", tags=["chat"])


def _now():
    return datetime.now(timezone.utc).isoformat()


class ConvCreate(BaseModel):
    title: str | None = None


class SendBody(BaseModel):
    conversation_id: str
    message: str
    provider: str | None = None
    model: str | None = None


async def get_user_settings(user_id):
    s = await settings_col.find_one({"user_id": user_id}, {"_id": 0})
    if not s:
        s = {"user_id": user_id, "provider": "openai", "model": PROVIDER_MODELS["openai"],
             "temperature": 0.3, "top_p": 1.0, "max_tokens": 1500}
    return s


@router.get("/conversations")
async def list_conversations(user=Depends(get_current_user)):
    return await conversations.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).to_list(200)


@router.post("/conversations")
async def create_conversation(body: ConvCreate, user=Depends(get_current_user)):
    conv = {
        "id": f"conv_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "title": body.title or "New Conversation",
        "created_at": _now(),
        "updated_at": _now(),
    }
    await conversations.insert_one(dict(conv))
    conv.pop("_id", None)
    return conv


@router.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str, user=Depends(get_current_user)):
    conv = await conversations.find_one({"id": conv_id, "user_id": user["user_id"]}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = await messages.find({"conversation_id": conv_id}, {"_id": 0, "embedding": 0}).sort("created_at", 1).to_list(1000)
    return msgs


@router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str, user=Depends(get_current_user)):
    await conversations.delete_one({"id": conv_id, "user_id": user["user_id"]})
    await messages.delete_many({"conversation_id": conv_id})
    return {"ok": True}


def _resolve_model(body, settings):
    if body.provider:
        provider = body.provider
        model = body.model or PROVIDER_MODELS.get(provider)
    else:
        provider = settings["provider"]
        model = body.model or settings.get("model") or PROVIDER_MODELS.get(provider)
    return provider, model


async def _retrieve_context(user_id, question):
    """Agent-routed RAG retrieval. Returns (decision, citations, context_blocks)."""
    user_chunks = await chunks.find({"user_id": user_id}, {"_id": 0}).to_list(5000)
    decision = route_agent(question, has_docs=len(user_chunks) > 0)
    citations, context_blocks = [], []
    if decision == "search":
        qvec = await embed_one(question)
        for score, c in rank_chunks(qvec, user_chunks, top_k=5):
            context_blocks.append({"source": c["filename"], "text": c["text"]})
            citations.append({
                "index": len(citations) + 1, "document_id": c["document_id"],
                "filename": c["filename"], "score": round(float(score), 4),
                "snippet": c["text"][:220],
            })
    return decision, citations, context_blocks


async def _persist_assistant(conv_id, user_id, content, meta):
    """Persist assistant message + usage. `meta` carries citations/model/provider/latency/question."""
    await messages.insert_one({
        "id": f"msg_{uuid.uuid4().hex[:12]}", "conversation_id": conv_id,
        "user_id": user_id, "role": "assistant", "content": content,
        "citations": meta["citations"], "model": meta["model"], "provider": meta["provider"],
        "latency_ms": meta["latency"], "token_count": len(content) // 4, "created_at": _now(),
    })
    await conversations.update_one({"id": conv_id}, {"$set": {"updated_at": _now()}})
    await usage_logs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": "chat",
        "model": meta["model"], "provider": meta["provider"], "token_count": len(content) // 4,
        "latency_ms": meta["latency"], "prompt": meta["question"][:500], "created_at": _now(),
    })


@router.post("/stream")
async def stream_chat(body: SendBody, request: Request, user=Depends(get_current_user)):
    conv = await conversations.find_one({"id": body.conversation_id, "user_id": user["user_id"]}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    settings = await get_user_settings(user["user_id"])
    provider, model = _resolve_model(body, settings)
    question = sanitize_prompt(body.message.strip())

    await messages.insert_one({
        "id": f"msg_{uuid.uuid4().hex[:12]}", "conversation_id": body.conversation_id,
        "user_id": user["user_id"], "role": "user", "content": body.message,
        "citations": [], "created_at": _now(),
    })
    if conv["title"] == "New Conversation":
        await conversations.update_one({"id": body.conversation_id}, {"$set": {"title": body.message[:50]}})

    decision, citations, context_blocks = await _retrieve_context(user["user_id"], question)
    chat = make_chat(body.conversation_id, build_system_prompt(context_blocks), provider, model,
                     settings.get("temperature", 0.3), settings.get("top_p", 1.0),
                     settings.get("max_tokens", 1500))

    async def gen():
        start = time.time()
        full = ""
        yield f"data: {json.dumps({'type': 'meta', 'decision': decision, 'citations': citations, 'model': model, 'provider': provider})}\n\n"
        try:
            async for ev in chat.stream_message(UserMessage(text=question)):
                if isinstance(ev, TextDelta):
                    full += ev.content
                    yield f"data: {json.dumps({'type': 'delta', 'content': ev.content})}\n\n"
                elif isinstance(ev, StreamDone):
                    break
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
        latency = int((time.time() - start) * 1000)
        await _persist_assistant(body.conversation_id, user["user_id"], full, {
            "citations": citations, "model": model, "provider": provider,
            "latency": latency, "question": question,
        })
        yield f"data: {json.dumps({'type': 'done', 'latency_ms': latency})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"})
