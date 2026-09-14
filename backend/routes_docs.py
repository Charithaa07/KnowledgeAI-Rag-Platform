import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException

from db import documents, chunks, usage_logs
from auth import get_current_user
from extract import extract_text, chunk_text, SUPPORTED
from ai import embed_texts

router = APIRouter(prefix="/documents", tags=["documents"])
MAX_SIZE = 15 * 1024 * 1024


def _now():
    return datetime.now(timezone.utc).isoformat()


async def _validate_upload(file: UploadFile):
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in SUPPORTED:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: .{ext}")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 15MB)")
    return ext, data


async def _process_document(doc_id, filename, data, user_id):
    """Extract → chunk → embed → store. Returns chunk count. Raises on failure."""
    text = extract_text(filename, data)
    parts = chunk_text(text)
    if not parts:
        await documents.update_one({"id": doc_id}, {"$set": {"status": "failed", "error": "No text extracted"}})
        return 0

    embeddings = await embed_texts(parts)
    chunk_docs = [{
        "id": f"chunk_{uuid.uuid4().hex[:12]}", "document_id": doc_id, "user_id": user_id,
        "filename": filename, "chunk_index": i, "text": p, "embedding": e,
    } for i, (p, e) in enumerate(zip(parts, embeddings))]
    if chunk_docs:
        await chunks.insert_many(chunk_docs)
    await documents.update_one({"id": doc_id}, {"$set": {"status": "ready", "chunk_count": len(chunk_docs)}})
    await usage_logs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": "embedding",
        "model": "local", "token_count": sum(len(p) for p in parts) // 4, "created_at": _now(),
    })
    return len(chunk_docs)


@router.get("")
async def list_documents(user=Depends(get_current_user)):
    return await documents.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)


@router.post("/upload")
async def upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    ext, data = await _validate_upload(file)
    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    doc = {
        "id": doc_id, "user_id": user["user_id"], "filename": file.filename,
        "file_type": ext, "size": len(data), "status": "processing",
        "chunk_count": 0, "created_at": _now(),
    }
    await documents.insert_one(dict(doc))
    doc.pop("_id", None)

    count = 0
    try:
        count = await _process_document(doc_id, file.filename, data, user["user_id"])
    except Exception as e:
        await documents.update_one({"id": doc_id}, {"$set": {"status": "failed", "error": str(e)}})
        raise HTTPException(status_code=500, detail=f"Processing failed: {e}")

    status = "ready" if count else "failed"
    return {**doc, "status": status, "chunk_count": count}


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    res = await documents.delete_one({"id": doc_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Not found")
    await chunks.delete_many({"document_id": doc_id})
    return {"ok": True}
