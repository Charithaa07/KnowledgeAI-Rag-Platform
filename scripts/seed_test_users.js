// Seed test users + sessions for KnowledgeAI. Run: mongosh < /app/scripts/seed_test_users.js
db = db.getSiblingDB('test_database');

function upsertUser(userId, email, name, role) {
  db.users.updateOne(
    { email: email },
    { $set: { user_id: userId, email: email, name: name, picture: "", role: role, created_at: new Date().toISOString() } },
    { upsert: true }
  );
}
function upsertSession(userId, token) {
  var exp = new Date(Date.now() + 7*24*60*60*1000).toISOString();
  db.user_sessions.updateOne(
    { session_token: token },
    { $set: { user_id: userId, session_token: token, expires_at: exp, created_at: new Date().toISOString() } },
    { upsert: true }
  );
}

upsertUser("user_admintest01", "admin.test@knowledgeai.com", "Admin Tester", "admin");
upsertSession("user_admintest01", "knowledgeai_admin_session_TEST");

upsertUser("user_regtest0001", "user.test@knowledgeai.com", "Regular Tester", "user");
upsertSession("user_regtest0001", "knowledgeai_user_session_TEST");

print("Seeded admin + user test accounts.");
