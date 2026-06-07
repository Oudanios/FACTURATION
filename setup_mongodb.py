#!/usr/bin/env python3
"""
MongoDB Setup Script for FACTURATION
Creates the facturation_audit database and seeds the admin user.
Uses the same Atlas cluster as SERAMAR but a completely separate database.
"""
import os
import sys
import json
import getpass
import hashlib
from datetime import datetime

try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, OperationFailure
except ImportError:
    print("ERROR: pymongo not installed. Run: pip install pymongo")
    sys.exit(1)

print("=" * 60)
print("  MongoDB Setup — facturation_audit Database")
print("=" * 60)
print()
print("This script creates the 'facturation_audit' database")
print("on your existing MongoDB Atlas cluster.")
print("Your 'serramar' database will NOT be touched.")
print()

# ─── Get MongoDB URIs ─────────────────────────────────────────────
mongo_uri = os.environ.get("FACTURATION_MONGO_URI", "").strip()
seramar_uri = os.environ.get("SERAMAR_MONGO_URI", "").strip()

if not mongo_uri:
    print("Enter your MONGODB_URI for facturation_audit.")
    print('Example: mongodb+srv://user:pass@cluster.mongodb.net/facturation_audit?retryWrites=true&w=majority')
    mongo_uri = getpass.getpass("MONGODB_URI: ").strip()

if not mongo_uri:
    print("ERROR: MongoDB URI is required.")
    sys.exit(1)

print()

# ─── Connect ──────────────────────────────────────────────────────
print("Connecting to MongoDB Atlas...")
try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=15000)
    client.admin.command('ping')
    print("✅ Connected successfully!")
except Exception as e:
    print(f"❌ Connection failed: {e}")
    print("   Check your URI and make sure your IP is whitelisted in Atlas.")
    sys.exit(1)

# ─── Verify we're on the right database ────────────────────────────
db = client.get_default_database()
db_name = db.name
print(f"   Database: {db_name}")

if db_name == "serramar":
    print("⚠️  WARNING: You're connecting to the 'serramar' database!")
    print("   This script should create a SEPARATE database.")
    print("   Make sure your URI ends with /facturation_audit")
    confirm = input("   Continue anyway? (yes/no): ")
    if confirm.lower() != "yes":
        sys.exit(0)

# ─── Create collections ────────────────────────────────────────────
print("\nCreating collections...")
collections = ["auditusers", "invoices", "manualfunds", "monthlycosts", "categoryconfigs", "costconcepts"]
for col_name in collections:
    if col_name not in db.list_collection_names():
        db.create_collection(col_name)
        print(f"   ✅ Created: {col_name}")
    else:
        print(f"   ⚡ Already exists: {col_name}")

# ─── Seed admin user ───────────────────────────────────────────────
print("\nSeeding admin user...")
users_col = db["auditusers"]

existing = users_col.find_one({"username": "admin"})
if existing:
    print("   ⚡ Admin user already exists, skipping.")
else:
    # Hash password with bcrypt-like approach (SHA-256 for standalone script)
    password = "OUDANI@RABI"
    # In production, the Express server uses bcrypt. Here we store a placeholder
    # that the server will re-hash on first login migration.
    salt = os.urandom(16).hex()
    pw_hash = hashlib.sha256(f"{password}:{salt}".encode()).hexdigest()
    
    users_col.insert_one({
        "username": "admin",
        "name": "Administrator (Oudani)",
        "role": "ADMIN",
        "password": pw_hash,
        "salt": salt,
        "_migration_note": "Re-hashed by server on first login via bcrypt",
        "createdAt": datetime.utcnow().isoformat(),
    })
    print("   ✅ Admin user created (password will be bcrypt-rehashed on first server start)")
    print("   ⚠️  On first deploy, the server will re-seed the admin user with proper bcrypt.")

# ─── Import from SERAMAR? ──────────────────────────────────────────
if seramar_uri:
    print("\nChecking SERAMAR database for booking imports...")
    try:
        seramar_client = MongoClient(seramar_uri, serverSelectionTimeoutMS=10000)
        seramar_client.admin.command('ping')
        seramar_db = seramar_client.get_default_database()
        
        # Count bookings in SERAMAR
        bookings_count = seramar_db["bookings"].count_documents({})
        print(f"   ✅ SERAMAR connected! Found {bookings_count} bookings.")
        print(f"   These can be imported via the Admin Panel in the app.")
        seramar_client.close()
    except Exception as e:
        print(f"   ⚠️  Could not connect to SERAMAR: {e}")
        print(f"   Set SERAMAR_MONGODB_URI env var for booking imports.")

# ─── Verify ────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("  DATABASE SETUP COMPLETE")
print("=" * 60)
print(f"  Database:    {db_name}")
print(f"  Collections: {len(db.list_collection_names())}")
for col in sorted(db.list_collection_names()):
    count = db[col].count_documents({})
    print(f"    - {col}: {count} documents")
print()
print("  The FACTURATION server will auto-migrate:")
print("    - bcrypt the admin password on first boot")
print("    - create any missing indexes")
print("=" * 60)

client.close()
