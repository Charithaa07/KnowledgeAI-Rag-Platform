from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db import (documents, chunks, conversations, messages, usage_logs, users, settings_col)
from auth import get_current_user, require_admin
from ai import embed_one, rank_chunks, PROVIDER_MODELS

router = APIRouter(tags=["core"])


def _now():
    return datetime.now(timezone.utc).isoformat()


# ---------- Dashboard ----------
@router.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    uid = user["user_id"]
    total_docs = await documents.count_documents({"user_id": uid})
    total_convs = await conversations.count_documents({"user_id": uid})
    total_msgs = await messages.count_documents({"user_id": uid, "role": "assistant"})
    docs = await documents.find({"user_id": uid}, {"_id": 0, "size": 1}).to_list(1000)
    storage = sum(d.get("size", 0) for d in docs)
    tokens = 0
    async for u in usage_logs.find({"user_id": uid}, {"_id": 0, "token_count": 1}):
        tokens += u.get("token_count", 0)
    recent = await conversations.find({"user_id": uid}, {"_id": 0}).sort("updated_at", -1).to_list(5)

    # 7-day activity
    activity = {}
    for i in range(7):
        day = (datetime.now(timezone.utc) - timedelta(days=i)).strftime("%Y-%m-%d")
        activity[day] = 0
    async for m in messages.find({"user_id": uid, "role": "assistant"}, {"_id": 0, "created_at": 1}):
        d = str(m.get("created_at", ""))[:10]
        if d in activity:
            activity[d] += 1
    chart = [{"date": k[5:], "messages": v} for k, v in sorted(activity.items())]

    return {
        "total_documents": total_docs,
        "total_conversations": total_convs,
        "ai_usage": total_msgs,
        "storage_used": storage,
        "tokens_used": tokens,
        "recent_chats": recent,
        "activity": chart,
    }


# ---------- Semantic Search ----------
class SearchBody(BaseModel):
    query: str
    top_k: int = 8


@router.post("/search")
async def semantic_search(body: SearchBody, user=Depends(get_current_user)):
    if not body.query.strip():
        return {"results": []}
    user_chunks = await chunks.find({"user_id": user["user_id"]}, {"_id": 0}).to_list(5000)
    if not user_chunks:
        return {"results": []}
    qvec = await embed_one(body.query)
    top = rank_chunks(qvec, user_chunks, top_k=body.top_k)
    results = [{
        "document_id": c["document_id"], "filename": c["filename"],
        "snippet": c["text"][:400], "score": round(float(score), 4),
        "chunk_index": c.get("chunk_index", 0),
    } for score, c in top]
    return {"results": results}


# ---------- Settings ----------
class SettingsBody(BaseModel):
    provider: str = "openai"
    model: str | None = None
    temperature: float = 0.3
    top_p: float = 1.0
    max_tokens: int = 1500


@router.get("/settings")
async def get_settings(user=Depends(get_current_user)):
    s = await settings_col.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not s:
        s = {"user_id": user["user_id"], "provider": "openai", "model": PROVIDER_MODELS["openai"],
             "temperature": 0.3, "top_p": 1.0, "max_tokens": 1500}
    return s


@router.put("/settings")
async def update_settings(body: SettingsBody, user=Depends(get_current_user)):
    model = body.model or PROVIDER_MODELS.get(body.provider, PROVIDER_MODELS["openai"])
    doc = {"user_id": user["user_id"], "provider": body.provider, "model": model,
           "temperature": body.temperature, "top_p": body.top_p, "max_tokens": body.max_tokens}
    await settings_col.update_one({"user_id": user["user_id"]}, {"$set": doc}, upsert=True)
    return doc


@router.get("/models")
async def available_models(user=Depends(get_current_user)):
    return {
        "openai": ["gpt-4.1", "gpt-4.1-mini", "gpt-5.4", "gpt-4o"],
        "anthropic": ["claude-sonnet-4-6", "claude-opus-4-7", "claude-haiku-4-5-20251001"],
        "gemini": ["gemini-3-flash-preview", "gemini-3.1-pro-preview", "gemini-2.5-flash"],
    }


# ---------- Admin ----------
@router.get("/admin/overview")
async def admin_overview(admin=Depends(require_admin)):
    total_users = await users.count_documents({})
    total_docs = await documents.count_documents({})
    total_convs = await conversations.count_documents({})
    total_msgs = await messages.count_documents({"role": "assistant"})
    docs = await documents.find({}, {"_id": 0, "size": 1}).to_list(10000)
    storage = sum(d.get("size", 0) for d in docs)
    tokens = 0
    model_usage = {}
    latencies = []
    async for u in usage_logs.find({}, {"_id": 0}):
        tokens += u.get("token_count", 0)
        if u.get("type") == "chat":
            m = u.get("model", "unknown")
            model_usage[m] = model_usage.get(m, 0) + 1
            if u.get("latency_ms"):
                latencies.append(u["latency_ms"])
    avg_latency = int(sum(latencies) / len(latencies)) if latencies else 0
    return {
        "total_users": total_users, "total_documents": total_docs,
        "total_conversations": total_convs, "ai_usage": total_msgs,
        "storage_used": storage, "tokens_used": tokens,
        "avg_latency_ms": avg_latency,
        "model_usage": [{"model": k, "count": v} for k, v in model_usage.items()],
    }


@router.get("/admin/users")
async def admin_users(admin=Depends(require_admin)):
    result = []
    async for u in users.find({}, {"_id": 0}):
        uid = u["user_id"]
        result.append({
            "user_id": uid, "email": u["email"], "name": u.get("name"),
            "picture": u.get("picture"), "role": u.get("role", "user"),
            "created_at": u.get("created_at"),
            "documents": await documents.count_documents({"user_id": uid}),
            "conversations": await conversations.count_documents({"user_id": uid}),
        })
    return result


@router.get("/admin/documents")
async def admin_documents(admin=Depends(require_admin)):
    return await documents.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.get("/admin/logs")
async def admin_logs(admin=Depends(require_admin)):
    return await usage_logs.find({"type": "chat"}, {"_id": 0}).sort("created_at", -1).to_list(100)
