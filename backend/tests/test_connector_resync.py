"""Verify connector re-sync bug fix and extract.py refactor.

Key assertions:
- GitHub sync runs succeed on public github/gitignore repo.
- Re-syncing does NOT create duplicate documents nor orphaned chunks.
- Total document count for github source is stable across syncs.
- GET /api/documents lists each github file exactly once.
- extract.py refactor still handles .txt, .csv, .md.
"""
import io
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://knowledge-retrieval-3.preview.emergentagent.com",
).rstrip("/")
USER_TOKEN = os.environ.get("TEST_USER_TOKEN", "knowledgeai_user_session_TEST")
HDRS = {"Authorization": f"Bearer {USER_TOKEN}", "Content-Type": "application/json"}


def _list_docs():
    r = requests.get(f"{BASE_URL}/api/documents", headers={"Authorization": f"Bearer {USER_TOKEN}"})
    assert r.status_code == 200, r.text
    return r.json()


class TestGithubResync:
    """POST /api/connectors/github/sync twice with the same repo -> no duplicates."""

    def test_first_sync(self):
        body = {"owner": "github", "repo": "gitignore", "branch": "main"}
        r = requests.post(f"{BASE_URL}/api/connectors/github/sync", json=body, headers=HDRS, timeout=180)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["source"] == "github"
        assert data["files_synced"] >= 1
        assert data["chunks_indexed"] > 0
        # Save totals for next test via pytest cache
        pytest.first_sync_files = data["files_synced"]
        pytest.first_sync_chunks = data["chunks_indexed"]

        # Snapshot github docs count
        docs = _list_docs()
        gh = [d for d in docs if d.get("source") == "github"]
        pytest.first_gh_docs = len(gh)
        pytest.first_gh_ids = sorted([d["id"] for d in gh])
        pytest.first_gh_chunk_counts = sum(d.get("chunk_count", 0) for d in gh)
        assert pytest.first_gh_docs >= 1

    def test_second_sync_no_duplicates(self):
        # Second sync of the SAME repo/branch
        body = {"owner": "github", "repo": "gitignore", "branch": "main"}
        r = requests.post(f"{BASE_URL}/api/connectors/github/sync", json=body, headers=HDRS, timeout=180)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["files_synced"] == pytest.first_sync_files, (
            f"files_synced changed after re-sync: {pytest.first_sync_files} -> {data['files_synced']}"
        )

        # Total github documents should be unchanged
        docs = _list_docs()
        gh = [d for d in docs if d.get("source") == "github"]
        second_ids = sorted([d["id"] for d in gh])
        assert len(gh) == pytest.first_gh_docs, (
            f"Duplicate documents on re-sync! before={pytest.first_gh_docs} after={len(gh)}"
        )
        # Same document IDs reused (upsert path)
        assert second_ids == pytest.first_gh_ids, "Document IDs changed on re-sync (should reuse)"

        # No duplicates by (source, source_ref)
        refs = [d.get("source_ref") for d in gh]
        assert len(refs) == len(set(refs)), f"Duplicate source_refs after re-sync: {refs}"

        # Chunk counts should be same (chunks got deleted then reinserted)
        second_chunk_counts = sum(d.get("chunk_count", 0) for d in gh)
        assert second_chunk_counts == pytest.first_gh_chunk_counts, (
            f"Total chunk_count changed: {pytest.first_gh_chunk_counts} -> {second_chunk_counts}"
        )

    def test_third_sync_still_stable(self):
        # Third sync just to be thorough (GitHub may rate-limit; skip on 400/403/429)
        body = {"owner": "github", "repo": "gitignore", "branch": "main"}
        r = requests.post(f"{BASE_URL}/api/connectors/github/sync", json=body, headers=HDRS, timeout=180)
        if r.status_code in (400, 403, 429):
            pytest.skip(f"GitHub API rate-limited/unavailable on 3rd sync: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200
        docs = _list_docs()
        gh = [d for d in docs if d.get("source") == "github"]
        assert len(gh) == pytest.first_gh_docs

    def test_search_after_github_sync(self):
        """Semantic search should return github file results with score+filename+snippet."""
        r = requests.post(
            f"{BASE_URL}/api/search",
            json={"query": "python gitignore"},
            headers=HDRS,
            timeout=60,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert "results" in data
        assert isinstance(data["results"], list)
        if data["results"]:
            top = data["results"][0]
            for k in ("filename", "snippet", "score"):
                assert k in top, f"Missing key {k} in search result"


class TestExtractRefactor:
    """extract.py dict-dispatch refactor: verify .txt, .csv, .md still work end-to-end."""

    @pytest.mark.parametrize("filename,content,mime", [
        ("TEST_extract_sample.txt", b"Alpha beta gamma. Refactor extract handler test content.", "text/plain"),
        ("TEST_extract_sample.md", b"# Heading\n\nThis is markdown content for refactor test.", "text/markdown"),
        ("TEST_extract_sample.csv", b"name,role\nAlice,admin\nBob,user\n", "text/csv"),
    ])
    def test_upload_various(self, filename, content, mime):
        files = {"file": (filename, io.BytesIO(content), mime)}
        r = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            headers={"Authorization": f"Bearer {USER_TOKEN}"},
            timeout=60,
        )
        assert r.status_code == 200, f"{filename}: {r.text}"
        doc = r.json()
        assert doc["status"] == "ready", f"{filename} not ready: {doc}"
        assert doc["chunk_count"] >= 1, f"{filename} produced 0 chunks"
        assert doc["filename"] == filename
        # cleanup
        requests.delete(
            f"{BASE_URL}/api/documents/{doc['id']}",
            headers={"Authorization": f"Bearer {USER_TOKEN}"},
        )
