import uuid
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from db import documents, chunks, usage_logs
from auth import get_current_user
from extract import extract_text, chunk_text
from ai import embed_texts

router = APIRouter(prefix="/connectors", tags=["connectors"])

MAX_FILES = 30
MAX_SIZE = 15 * 1024 * 1024
ALLOWED = {"md", "markdown", "txt", "pdf", "docx", "csv", "pptx"}


def _now():
    return datetime.now(timezone.utc).isoformat()


async def ingest(user_id, filename, file_type, text, source, source_ref):
    parts = chunk_text(text)
    if not parts:
        return 0
    embeddings = await embed_texts(parts)

    # Reuse existing doc id on re-sync so we can cleanly replace its chunks (no orphans).
    existing = await documents.find_one(
        {"user_id": user_id, "source": source, "source_ref": source_ref}, {"_id": 0, "id": 1}
    )
    doc_id = existing["id"] if existing else f"doc_{uuid.uuid4().hex[:12]}"
    if existing:
        await chunks.delete_many({"document_id": doc_id})

    chunk_docs = [{
        "id": f"chunk_{uuid.uuid4().hex[:12]}", "document_id": doc_id, "user_id": user_id,
        "filename": filename, "chunk_index": i, "text": p, "embedding": e,
    } for i, (p, e) in enumerate(zip(parts, embeddings))]

    await documents.update_one(
        {"user_id": user_id, "source": source, "source_ref": source_ref},
        {"$set": {
            "id": doc_id, "user_id": user_id, "filename": filename, "file_type": file_type,
            "size": len(text.encode("utf-8")), "status": "ready", "chunk_count": len(chunk_docs),
            "source": source, "source_ref": source_ref, "created_at": _now(),
        }},
        upsert=True,
    )
    if chunk_docs:
        await chunks.insert_many(chunk_docs)
    await usage_logs.insert_one({
        "id": str(uuid.uuid4()), "user_id": user_id, "type": "embedding",
        "model": "local", "token_count": sum(len(p) for p in parts) // 4, "created_at": _now(),
    })
    return len(chunk_docs)


class GitHubSync(BaseModel):
    owner: str
    repo: str
    branch: str = "main"
    token: Optional[str] = None


class NotionSync(BaseModel):
    token: str


async def _fetch_github_tree(client, owner, repo, branch, headers):
    """Return (tree, resolved_branch). Tries the requested branch, then common defaults."""
    last_status = None
    for candidate in [branch, "master", "main"]:
        url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/{candidate}?recursive=1"
        r = await client.get(url, headers=headers)
        last_status = r.status_code
        if r.status_code == 200:
            return r.json().get("tree", []), candidate
    raise HTTPException(status_code=400, detail=f"Repo or branch not found (or private without token): {last_status}")


async def _sync_github_file(client, headers, user_id, owner, repo, branch, path):
    """Download + ingest a single repo file. Returns chunk count (0 if skipped)."""
    raw_url = f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
    rr = await client.get(raw_url, headers=headers)
    if rr.status_code != 200:
        return 0
    text = ""
    try:
        text = extract_text(path, rr.content)
    except Exception:
        return 0
    ext = path.rsplit(".", 1)[-1].lower()
    return await ingest(user_id, f"{repo}/{path}", ext, text, "github", f"{owner}/{repo}/{path}")


@router.post("/github/sync")
async def github_sync(body: GitHubSync, user=Depends(get_current_user)):
    headers = {"X-GitHub-Api-Version": "2022-11-28", "Accept": "application/vnd.github+json"}
    if body.token:
        headers["Authorization"] = f"Bearer {body.token}"

    async with httpx.AsyncClient(timeout=30) as client:
        tree, branch = await _fetch_github_tree(client, body.owner, body.repo, body.branch, headers)

        files = [f for f in tree if f["type"] == "blob"
                 and f["path"].rsplit(".", 1)[-1].lower() in ALLOWED
                 and f.get("size", 0) <= MAX_SIZE][:MAX_FILES]
        if not files:
            raise HTTPException(status_code=400, detail="No supported files (.md/.txt/.pdf/.docx/.csv/.pptx) found in repo")

        synced, chunks_total = 0, 0
        for f in files:
            n = await _sync_github_file(client, headers, user["user_id"], body.owner, body.repo, branch, f["path"])
            if n:
                synced += 1
                chunks_total += n

    return {"source": "github", "files_synced": synced, "chunks_indexed": chunks_total,
            "repo": f"{body.owner}/{body.repo}"}


def _extract_title(page):
    props = page.get("properties", {})
    for v in props.values():
        if v.get("type") == "title" and v.get("title"):
            return "".join(t.get("plain_text", "") for t in v["title"]) or "Untitled"
    return "Untitled"


async def _page_text(client, headers, block_id, depth=0):
    if depth > 3:
        return ""
    text, cursor, has_more = "", None, True
    while has_more:
        params = {"page_size": 100}
        if cursor:
            params["start_cursor"] = cursor
        r = await client.get(f"https://api.notion.com/v1/blocks/{block_id}/children", headers=headers, params=params)
        if r.status_code != 200:
            break
        data = r.json()
        for block in data.get("results", []):
            bt = block.get("type")
            content = block.get(bt, {})
            if isinstance(content, dict) and "rich_text" in content:
                text += "".join(rt.get("plain_text", "") for rt in content["rich_text"]) + "\n"
            if block.get("has_children"):
                text += await _page_text(client, headers, block["id"], depth + 1)
        has_more = data.get("has_more", False)
        cursor = data.get("next_cursor")
    return text


@router.post("/notion/sync")
async def notion_sync(body: NotionSync, user=Depends(get_current_user)):
    headers = {"Authorization": f"Bearer {body.token}", "Notion-Version": "2022-06-28",
               "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post("https://api.notion.com/v1/search", headers=headers,
                              json={"filter": {"value": "page", "property": "object"}, "page_size": MAX_FILES})
        if r.status_code != 200:
            raise HTTPException(status_code=400, detail=f"Notion auth failed ({r.status_code}). Check token & shared pages.")
        pages = r.json().get("results", [])
        if not pages:
            raise HTTPException(status_code=400, detail="No pages shared with this integration. Share pages in Notion first.")

        synced, chunks_total = 0, 0
        for page in pages[:MAX_FILES]:
            title = _extract_title(page)
            text = await _page_text(client, headers, page["id"])
            if not text.strip():
                continue
            n = await ingest(user["user_id"], f"Notion · {title}", "notion", text, "notion", page["id"])
            if n:
                synced += 1
                chunks_total += n

    return {"source": "notion", "files_synced": synced, "chunks_indexed": chunks_total}
