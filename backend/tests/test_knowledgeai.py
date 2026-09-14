"""KnowledgeAI backend tests - auth, docs, chat/rag streaming, search, settings, admin, dashboard."""
import io
import json
import time

import pytest
import requests


# ---------------- Auth ----------------
class TestAuth:
    def test_me_requires_auth(self, api, base_url):
        r = api.get(f"{base_url}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_bearer(self, user_client, base_url):
        r = user_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == "user.test@knowledgeai.com"
        assert data["role"] == "user"

    def test_me_admin(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_invalid_token(self, base_url):
        r = requests.get(f"{base_url}/api/auth/me", headers={"Authorization": "Bearer badtoken"})
        assert r.status_code == 401


# ---------------- Documents ----------------
UPLOAD_CONTENT = (
    "KnowledgeAI Testing Document.\n"
    "This is a sample knowledge document about Retrieval Augmented Generation. "
    "The mascot of KnowledgeAI is a friendly blue robot named Bit. "
    "Bit helps enterprise users search their internal knowledge quickly and answer questions with citations. "
    "The company was founded in 2023 to make enterprise search intelligent."
)


@pytest.fixture(scope="module")
def uploaded_doc_id():
    """Upload a doc once for the module and clean up after."""
    files = {"file": ("TEST_kb_sample.txt", io.BytesIO(UPLOAD_CONTENT.encode()), "text/plain")}
    headers = {"Authorization": "Bearer knowledgeai_user_session_TEST"}
    from tests.conftest import BASE_URL
    r = requests.post(f"{BASE_URL}/api/documents/upload", files=files, headers=headers)
    assert r.status_code == 200, r.text
    doc = r.json()
    yield doc
    # Cleanup
    requests.delete(f"{BASE_URL}/api/documents/{doc['id']}", headers=headers)


class TestDocuments:
    def test_upload_txt_ready(self, uploaded_doc_id):
        doc = uploaded_doc_id
        assert doc["status"] == "ready"
        assert doc["chunk_count"] >= 1
        assert doc["filename"] == "TEST_kb_sample.txt"

    def test_list_documents_contains_upload(self, user_client, base_url, uploaded_doc_id):
        r = user_client.get(f"{base_url}/api/documents")
        assert r.status_code == 200
        docs = r.json()
        ids = [d["id"] for d in docs]
        assert uploaded_doc_id["id"] in ids

    def test_upload_unsupported(self, user_client, base_url):
        files = {"file": ("bad.xyz", io.BytesIO(b"nope"), "application/octet-stream")}
        r = requests.post(f"{base_url}/api/documents/upload", files=files,
                          headers={"Authorization": "Bearer knowledgeai_user_session_TEST"})
        assert r.status_code == 400

    def test_delete_document(self, user_client, base_url):
        # Upload extra one to delete
        files = {"file": ("TEST_delete_me.txt", io.BytesIO(b"delete me content for test"), "text/plain")}
        r = requests.post(f"{base_url}/api/documents/upload", files=files,
                          headers={"Authorization": "Bearer knowledgeai_user_session_TEST"})
        assert r.status_code == 200
        did = r.json()["id"]
        r = user_client.delete(f"{base_url}/api/documents/{did}")
        assert r.status_code == 200
        # Verify not in list
        r2 = user_client.get(f"{base_url}/api/documents")
        assert did not in [d["id"] for d in r2.json()]


# ---------------- Chat / RAG streaming ----------------
def _read_sse(resp):
    events = []
    for line in resp.iter_lines():
        if not line:
            continue
        s = line.decode("utf-8") if isinstance(line, bytes) else line
        if s.startswith("data: "):
            try:
                events.append(json.loads(s[6:]))
            except Exception:
                pass
    return events


class TestChat:
    @pytest.fixture(scope="class")
    def conversation(self, base_url):
        r = requests.post(f"{base_url}/api/chat/conversations", json={"title": "TEST conv"},
                          headers={"Authorization": "Bearer knowledgeai_user_session_TEST",
                                   "Content-Type": "application/json"})
        assert r.status_code == 200
        return r.json()

    def test_create_conversation(self, conversation):
        assert conversation["id"].startswith("conv_")
        assert conversation["title"] == "TEST conv"

    def test_list_conversations(self, user_client, base_url, conversation):
        r = user_client.get(f"{base_url}/api/chat/conversations")
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert conversation["id"] in ids

    @pytest.mark.parametrize("provider", ["openai", "anthropic", "gemini"])
    def test_stream_chat_all_providers(self, base_url, conversation, uploaded_doc_id, provider):
        body = {
            "conversation_id": conversation["id"],
            "message": f"What is the mascot of KnowledgeAI? (provider={provider})",
            "provider": provider,
        }
        with requests.post(
            f"{base_url}/api/chat/stream",
            json=body,
            headers={"Authorization": "Bearer knowledgeai_user_session_TEST",
                     "Content-Type": "application/json", "Accept": "text/event-stream"},
            stream=True, timeout=90,
        ) as r:
            assert r.status_code == 200, r.text
            events = _read_sse(r)
        types = [e.get("type") for e in events]
        assert "meta" in types, f"No meta event for {provider}: {events[:3]}"
        assert "done" in types, f"No done event for {provider}: last events={events[-3:]}"
        # Should have at least one delta or error
        deltas = [e for e in events if e.get("type") == "delta"]
        errors = [e for e in events if e.get("type") == "error"]
        assert deltas or errors, f"No delta or error for {provider}"
        assert not errors, f"LLM error for {provider}: {errors}"
        # Meta should include citations from RAG
        meta = next(e for e in events if e["type"] == "meta")
        assert "citations" in meta
        # A user-uploaded doc exists, so decision should be search
        assert meta.get("decision") in ("search", "direct")

    def test_conversation_messages_persisted(self, user_client, base_url, conversation):
        # After streaming tests above, at least one exchange should be saved
        r = user_client.get(f"{base_url}/api/chat/conversations/{conversation['id']}/messages")
        assert r.status_code == 200
        msgs = r.json()
        roles = [m["role"] for m in msgs]
        assert "user" in roles
        assert "assistant" in roles


# ---------------- Search ----------------
class TestSearch:
    def test_search_returns_results(self, user_client, base_url, uploaded_doc_id):
        r = user_client.post(f"{base_url}/api/search", json={"query": "mascot Bit robot"})
        assert r.status_code == 200
        data = r.json()
        assert "results" in data
        assert isinstance(data["results"], list)
        # Should have at least one result (doc uploaded)
        assert len(data["results"]) >= 1
        top = data["results"][0]
        assert "filename" in top
        assert "snippet" in top
        assert "score" in top

    def test_search_empty_query(self, user_client, base_url):
        r = user_client.post(f"{base_url}/api/search", json={"query": ""})
        assert r.status_code == 200
        assert r.json()["results"] == []


# ---------------- Settings ----------------
class TestSettings:
    def test_get_defaults(self, user_client, base_url):
        r = user_client.get(f"{base_url}/api/settings")
        assert r.status_code == 200
        s = r.json()
        assert s["provider"] in ("openai", "anthropic", "gemini")
        assert "temperature" in s and "top_p" in s and "max_tokens" in s

    def test_put_persists(self, user_client, base_url):
        body = {"provider": "anthropic", "temperature": 0.5, "top_p": 0.9, "max_tokens": 1200}
        r = user_client.put(f"{base_url}/api/settings", json=body)
        assert r.status_code == 200
        saved = r.json()
        assert saved["provider"] == "anthropic"
        assert saved["temperature"] == 0.5
        # GET verify persistence
        r2 = user_client.get(f"{base_url}/api/settings")
        assert r2.json()["provider"] == "anthropic"
        # Reset back to openai
        user_client.put(f"{base_url}/api/settings",
                        json={"provider": "openai", "temperature": 0.3, "top_p": 1.0, "max_tokens": 1500})

    def test_models_map(self, user_client, base_url):
        r = user_client.get(f"{base_url}/api/models")
        assert r.status_code == 200
        m = r.json()
        assert "openai" in m and "anthropic" in m and "gemini" in m
        assert isinstance(m["openai"], list)


# ---------------- Dashboard ----------------
class TestDashboard:
    def test_dashboard_returns_totals(self, user_client, base_url):
        r = user_client.get(f"{base_url}/api/dashboard")
        assert r.status_code == 200
        d = r.json()
        for k in ("total_documents", "total_conversations", "ai_usage",
                  "storage_used", "tokens_used", "recent_chats", "activity"):
            assert k in d
        assert isinstance(d["activity"], list)
        assert isinstance(d["recent_chats"], list)


# ---------------- Admin RBAC ----------------
class TestAdmin:
    def test_regular_user_forbidden_overview(self, user_client, base_url):
        r = user_client.get(f"{base_url}/api/admin/overview")
        assert r.status_code == 403

    def test_regular_user_forbidden_users(self, user_client, base_url):
        r = user_client.get(f"{base_url}/api/admin/users")
        assert r.status_code == 403

    def test_regular_user_forbidden_documents(self, user_client, base_url):
        r = user_client.get(f"{base_url}/api/admin/documents")
        assert r.status_code == 403

    def test_admin_overview(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/overview")
        assert r.status_code == 200
        d = r.json()
        assert d["total_users"] >= 2

    def test_admin_users_list(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/users")
        assert r.status_code == 200
        emails = [u["email"] for u in r.json()]
        assert "admin.test@knowledgeai.com" in emails
        assert "user.test@knowledgeai.com" in emails

    def test_admin_documents(self, admin_client, base_url):
        r = admin_client.get(f"{base_url}/api/admin/documents")
        assert r.status_code == 200
        assert isinstance(r.json(), list)
