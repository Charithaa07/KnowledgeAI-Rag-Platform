import os
import uuid
from datetime import datetime, timezone, timedelta

import httpx
from fastapi import APIRouter, Request, Response, HTTPException, Depends

from db import users, sessions

router = APIRouter(prefix="/auth", tags=["auth"])

EMERGENT_SESSION_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"
ADMIN_EMAILS = {e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()}
COOKIE = "session_token"


def _now():
    return datetime.now(timezone.utc)


async def get_current_user(request: Request):
    token = request.cookies.get(COOKIE)
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sess = await sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")

    exp = sess["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < _now():
        raise HTTPException(status_code=401, detail="Session expired")

    user = await users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_admin(user=Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("/session")
async def create_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID")

    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.get(EMERGENT_SESSION_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session id")
    data = r.json()

    email = data["email"].lower()
    existing = await users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name"), "picture": data.get("picture")}})
        user = {**existing, "name": data.get("name"), "picture": data.get("picture")}
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        is_admin = (not await users.find_one({})) or (email in ADMIN_EMAILS)
        user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name"),
            "picture": data.get("picture"),
            "role": "admin" if is_admin else "user",
            "created_at": _now().isoformat(),
        }
        await users.insert_one(dict(user))
        user.pop("_id", None)

    token = data["session_token"]
    await sessions.update_one(
        {"session_token": token},
        {"$set": {
            "user_id": user_id,
            "session_token": token,
            "expires_at": (_now() + timedelta(days=7)).isoformat(),
            "created_at": _now().isoformat(),
        }},
        upsert=True,
    )
    response.set_cookie(COOKIE, token, httponly=True, secure=True, samesite="none", path="/", max_age=7 * 24 * 3600)
    return {"user": {k: user[k] for k in ("user_id", "email", "name", "picture", "role")}}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return {k: user.get(k) for k in ("user_id", "email", "name", "picture", "role")}


@router.post("/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get(COOKIE)
    if token:
        await sessions.delete_one({"session_token": token})
    response.delete_cookie(COOKIE, path="/")
    return {"ok": True}
