import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://knowledge-retrieval-3.preview.emergentagent.com").rstrip("/")
ADMIN_TOKEN = os.environ.get("TEST_ADMIN_TOKEN", "knowledgeai_admin_session_TEST")
USER_TOKEN = os.environ.get("TEST_USER_TOKEN", "knowledgeai_user_session_TEST")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {ADMIN_TOKEN}"})
    return s


@pytest.fixture(scope="session")
def user_client():
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {USER_TOKEN}"})
    return s
