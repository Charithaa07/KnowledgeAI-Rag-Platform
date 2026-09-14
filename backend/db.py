import os
from motor.motor_asyncio import AsyncIOMotorClient

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

users = db.users
sessions = db.user_sessions
documents = db.documents
chunks = db.chunks
conversations = db.conversations
messages = db.messages
usage_logs = db.usage_logs
settings_col = db.user_settings
