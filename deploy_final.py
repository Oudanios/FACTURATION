#!/usr/bin/env python3
"""
ONE-CLICK FACTURATION DEPLOY
=============================
This script:
1. Creates the Render web service from your GitHub repo
2. Adds the custom domain audit.serramaradmin.site on Render
3. Configures Namecheap DNS CNAME record

Prerequisites:
- Render API key (dashboard.render.com → Account Settings → API Keys)
- Namecheap API key (Profile → Tools → API Access)
- MongoDB URI (same as SERAMAR but /facturation_audit at end)
- Your IP whitelisted in Namecheap API

Usage:
  set RENDER_API_KEY=rnd_xxx
  set NAMECHEAP_API_KEY=xxx
  set MONGODB_URI=mongodb+srv://...
  python deploy_final.py
"""
import os, sys, time, json, getpass
import requests
import urllib.request

RENDER_API = "https://api.render.com/v1"
NC_API = "https://api.namecheap.com/xml.response"
GITHUB_REPO = "https://github.com/Oudanios/FACTURATION.git"
SERVICE_NAME = "facturation-audit"
DOMAIN = "audit.serramaradmin.site"
SUBDOMAIN = "audit"
ROOT = "serramaradmin.site"
SLD, TLD = ROOT.rsplit(".", 1)

# ─── Read credentials from env or prompt ────────────────────────
def get_secret(key, prompt, env_key=None):
    val = os.environ.get(env_key or key, "").strip()
    if not val:
        val = getpass.getpass(f"{prompt}: ").strip()
    if not val:
        print(f"ERROR: {key} is required.")
        sys.exit(1)
    return val

print("=" * 60)
print("  FACTURATION Deployment Script")
print("=" * 60)

RENDER_KEY = get_secret("RENDER_API_KEY", "Render API Key")
MONGODB_URI = get_secret("MONGODB_URI", "MongoDB URI (facturation_audit)")
SERAMAR_URI = os.environ.get("SERAMAR_MONGODB_URI", "").strip() or MONGODB_URI.replace("/facturation_audit", "/serramar")
print(f"  SERAMAR_URI derived from MONGODB_URI")
NC_USER = os.environ.get("NAMECHEAP_USER", "oudanios").strip()
NC_KEY = get_secret("NAMECHEAP_API_KEY", "Namecheap API Key (NOT password)", "NAMECHEAP_API_KEY")

try:
    CLIENT_IP = urllib.request.urlopen("https://api.ipify.org", timeout=10).read().decode().strip()
except:
    CLIENT_IP = "127.0.0.1"
print(f"  Client IP: {CLIENT_IP}")

HEADERS = {
    "Authorization": f"Bearer {RENDER_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# ═══════════════════════════════════════════════════════════════
#  STEP 1: Create Render Web Service
# ═══════════════════════════════════════════════════════════════
print("\n[1/4] Getting owner ID...")
try:
    r = requests.get(f"{RENDER_API}/owners", headers=HEADERS, timeout=30)
    r.raise_for_status()
    owners = r.json()
    owner_id = owners[0]["owner"]["id"] if isinstance(owners, list) else owners["id"]
    print(f"  Owner: {owner_id}")
except Exception as e:
    print(f"  ERROR: Cannot authenticate. Is your Render API key correct?")
    print(f"  Response: {r.text[:300]}")
    print(f"\n  Get a new API key: https://dashboard.render.com/account/api-keys")
    sys.exit(1)

print(f"\n[2/4] Creating service '{SERVICE_NAME}'...")
svc_payload = {
    "type": "web_service",
    "name": SERVICE_NAME,
    "ownerId": owner_id,
    "repo": GITHUB_REPO,
    "branch": "main",
    "autoDeploy": "yes",
    "runtime": "node",
    "buildCommand": "npm install && npm run build:all",
    "startCommand": "NODE_ENV=production npm start",
    "envVars": [
        {"key": "NODE_ENV", "value": "production"},
        {"key": "MONGODB_URI", "value": MONGODB_URI},
        {"key": "SERAMAR_MONGODB_URI", "value": SERAMAR_URI},
        {"key": "PORT", "value": "10000"},
    ],
}

service_id = None
try:
    r = requests.post(f"{RENDER_API}/services", headers=HEADERS, json=svc_payload, timeout=30)
    if r.status_code == 201 or r.status_code == 200:
        svc = r.json()
        service_id = svc["id"]
        print(f"  Created! ID: {service_id}")
    elif r.status_code == 409:
        print("  Service may already exist. Finding it...")
        r2 = requests.get(f"{RENDER_API}/services", headers=HEADERS, params={"name": SERVICE_NAME}, timeout=30)
        for s in r2.json():
            sid = (s.get("service", {}) or {}).get("id") or s.get("id")
            if sid:
                service_id = sid
                print(f"  Found: {sid}")
                break
    else:
        r.raise_for_status()
except Exception as e:
    print(f"  ERROR: {e}")
    try: print(f"  Response: {r.text[:500]}")
    except: pass
    sys.exit(1)

if not service_id:
    print("  ERROR: Could not create or find service.")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════
#  STEP 3: Add Custom Domain on Render
# ═══════════════════════════════════════════════════════════════
print(f"\n[3/4] Adding custom domain {DOMAIN}...")
try:
    r = requests.post(
        f"{RENDER_API}/services/{service_id}/custom-domains",
        headers=HEADERS,
        json={"name": DOMAIN},
        timeout=30
    )
    if r.status_code in (200, 201, 409):
        print(f"  ✓ Custom domain {DOMAIN} configured on Render")
    else:
        print(f"  Warning: {r.status_code} - {r.text[:200]}")
except Exception as e:
    print(f"  Warning: {e} (you can add it manually in Render dashboard)")

# ═══════════════════════════════════════════════════════════════
#  STEP 4: Namecheap DNS CNAME
# ═══════════════════════════════════════════════════════════════
print(f"\n[4/4] Configuring DNS CNAME: {SUBDOMAIN} → {SERVICE_NAME}.onrender.com...")

try:
    # Get existing DNS records
    get_params = {
        "ApiUser": NC_USER, "ApiKey": NC_KEY, "UserName": NC_USER,
        "ClientIp": CLIENT_IP, "Command": "namecheap.domains.dns.getHosts",
        "SLD": SLD, "TLD": TLD,
    }
    r = requests.post(NC_API, data=get_params, timeout=30)
    
    import xml.etree.ElementTree as ET
    ns = {"nc": "http://api.namecheap.com/xml.response"}
    root = ET.fromstring(r.text)
    
    existing = []
    hosts_el = root.find(".//nc:hosts", ns)
    if hosts_el is not None:
        for h in hosts_el.findall("nc:host", ns):
            existing.append({
                "HostName": h.get("Name", ""),
                "RecordType": h.get("Type", ""),
                "Address": h.get("Address", ""),
                "TTL": h.get("TTL", "1800"),
            })
    
    print(f"  Found {len(existing)} existing records")
    
    # Add/update CNAME
    updated = False
    for rec in existing:
        if rec["HostName"] == SUBDOMAIN and rec["RecordType"] == "CNAME":
            rec["Address"] = f"{SERVICE_NAME}.onrender.com"
            updated = True
    
    if not updated:
        existing.append({
            "HostName": SUBDOMAIN,
            "RecordType": "CNAME",
            "Address": f"{SERVICE_NAME}.onrender.com",
            "TTL": "1800",
        })
    
    # Push all records
    set_params = {
        "ApiUser": NC_USER, "ApiKey": NC_KEY, "UserName": NC_USER,
        "ClientIp": CLIENT_IP, "Command": "namecheap.domains.dns.setHosts",
        "SLD": SLD, "TLD": TLD,
    }
    for i, rec in enumerate(existing, 1):
        set_params[f"HostName{i}"] = rec["HostName"]
        set_params[f"RecordType{i}"] = rec["RecordType"]
        set_params[f"Address{i}"] = rec["Address"]
        set_params[f"TTL{i}"] = rec.get("TTL", "1800")
    
    r2 = requests.post(NC_API, data=set_params, timeout=30)
    if "DomainDNSSetHostsResult" in r2.text or '"IsSuccess":"true"' in r2.text.lower():
        print(f"  ✓ DNS CNAME created: {DOMAIN} → {SERVICE_NAME}.onrender.com")
    else:
        print(f"  Response: {r2.text[:300]}")
except Exception as e:
    print(f"  Namecheap error: {e}")
    print(f"  MANUAL: Add CNAME | Host: {SUBDOMAIN} | Value: {SERVICE_NAME}.onrender.com")

# ═══════════════════════════════════════════════════════════════
print()
print("=" * 60)
print("  DEPLOYED!")
print("=" * 60)
print(f"  https://{DOMAIN}")
print(f"  Render dashboard: https://dashboard.render.com/web/{service_id}")
print("=" * 60)
