#!/usr/bin/env python3
"""
MongoDB Setup for FACTURATION — Smart URI builder
Creates facturation_audit database on the same Atlas cluster as SERAMAR.
Does NOT touch the serramar database in any way.
"""
import os
import sys
import getpass
import hashlib
from datetime import datetime

try:
    from pymongo import MongoClient
except ImportError:
    print("ERROR: pymongo not installed. Run: pip install pymongo")
    sys.exit(1)

print("=" * 60)
print("  FACTURATION Database Setup")
print("=" * 60)
print()

# ─── Method 1: Full URI from env var ─────────────────────────────
mongo_uri = os.environ.get("FACTURATION_MONGO_URI", "").strip()

if not mongo_uri:
    # ─── Method 2: Build URI from components ─────────────────────
    print("Build your MongoDB URI (same cluster as SERAMAR):")
    print()
    
    # Try to find existing serramar URI from env
    seramar_uri = os.environ.get("MONGODB_URI", "").strip()
    
    if seramar_uri:
        print("Found existing MONGODB_URI, deriving facturation_audit URI...")
        mongo_uri = seramar_uri.replace('/serramar', '/facturation_audit')
        print(f"Using: {mongo_uri.replace('//', '//<creds>@')}")
    else:
        print("Enter the cluster address (without credentials):")
        print("Example: cluster0.abc123.mongodb.net")
        cluster = input("Cluster address: ").strip()
        
        if not cluster:
            print()
            print("ALTERNATIVE: Enter the full URI directly.")
            print("Example: mongodb+srv://user:pass@cluster.mongodb.net/facturation_audit")
            mongo_uri = getpass.getpass("Full MONGODB_URI: ").strip()
        else:
            user = input("MongoDB Username: ").strip()
            pw = getpass.getpass("MongoDB Password: ").strip()
            mongo_uri = f"mongodb+srv://{user}:{pw}@{cluster}/facturation_audit?retryWrites=true&w=majority"
            print(f"Built URI: mongodb+srv://{user}:***@{cluster}/facturation_audit")

if not mongo_uri:
    print("ERROR: Cannot build MongoDB URI. Provide it via FACTURATION_MONGO_URI env var.")
    sys.exit(1)

# Ensure we're targeting facturation_audit, not serramar
if '/serramar' in mongo_uri and '/facturation_audit' not in mongo_uri:
    print("⚠️  WARNING: URI points to 'serramar' database.")
    print("   Changing to 'facturation_audit' automatically...")
    mongo_uri = mongo_uri.replace('/serramar', '/facturation_audit')

print()

# ─── Connect ──────────────────────────────────────────────────────
print("Connecting to MongoDB Atlas...")
try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=15000)
    client.admin.command('ping')
    print("✅ Connected!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("   Check: credentials, cluster address, and IP whitelist in Atlas.")
    sys.exit(1)

db = client.get_default_database()
print(f"   Database: {db.name}")

# ─── Create collections ────────────────────────────────────────────
print("\nCreating collections...")
cols = {
    "auditusers": "User accounts for FACTURATION app",
    "invoices": "Invoice records (ENTRADA/SALIDA)", 
    "manualfunds": "Manual booking funds (TPV, Cash, Transfer, Online)",
    "monthlycosts": "Monthly cost data per period",
    "categoryconfigs": "Category configuration",
    "costconcepts": "Cost concept menu items",
}

for name, desc in cols.items():
    if name not in db.list_collection_names():
        db.create_collection(name)
        print(f"   ✅ {name} — {desc}")
    else:
        print(f"   ⚡ {name} — already exists")

# ─── Seed admin user ───────────────────────────────────────────────
print("\nSeeding admin user...")
users_col = db["auditusers"]

existing = users_col.find_one({"username": "admin"})
if existing:
    print("   ⚡ Admin user already exists.")
else:
    # Store a bcrypt-compatible placeholder
    # The Express server will re-hash with bcrypt on first boot
    users_col.insert_one({
        "username": "admin",
        "name": "Administrator (Oudani)",
        "role": "ADMIN",
        "password": "$2b$12$placeholder_will_be_rehashed_by_server",
        "_note": "Server re-hashes password with bcrypt on first boot",
        "createdAt": datetime.utcnow().isoformat(),
    })
    print("   ✅ Admin user seeded (server will bcrypt-rehash on first boot)")

# ─── Create indexes ────────────────────────────────────────────────
print("\nCreating indexes...")
try:
    db["invoices"].create_index("id", unique=True)
    db["invoices"].create_index("fecha")
    db["invoices"].create_index("tipo")
    db["manualfunds"].create_index("id", unique=True)
    db["manualfunds"].create_index("mes_referencia")
    db["monthlycosts"].create_index("month", unique=True)
    db["auditusers"].create_index("username", unique=True)
    print("   ✅ Indexes created")
except Exception as e:
    print(f"   ⚠️  Some indexes may already exist: {e}")

# ─── Summary ───────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("  DATABASE READY")
print("=" * 60)
print(f"  Database:    {db.name}")
print(f"  Collections: {len(db.list_collection_names())}")
for col in sorted(db.list_collection_names()):
    count = db[col].count_documents({})
    print(f"    • {col}: {count} document(s)")
print()
print("  ✅ facturation_audit database is ready.")
print("  ✅ serramar database was NOT touched.")
print("  ✅ Set MONGODB_URI env var on Render to this URI.")
print("=" * 60)

client.close()
