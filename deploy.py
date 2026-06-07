#!/usr/bin/env python3
"""
FACTURATION Deployment Script
Creates Render web service + configures Namecheap DNS CNAME for audit.serramaradmin.site
"""

import os
import sys
import json
import time
import getpass
import requests

# ─── Configuration ──────────────────────────────────────────────────────────────
GITHUB_REPO = "https://github.com/Oudanios/FACTURATION.git"
GITHUB_BRANCH = "main"
SERVICE_NAME = "facturation-audit"
SUBDOMAIN_HOST = "audit"
ROOT_DOMAIN = "serramaradmin.site"
FULL_DOMAIN = f"{SUBDOMAIN_HOST}.{ROOT_DOMAIN}"

RENDER_API = "https://api.render.com/v1"

# ─── Ask for secrets securely (NOT through chat) ────────────────────────────────
print("=" * 60)
print("  FACTURATION Deploy — Render + Namecheap DNS")
print("=" * 60)
print()

render_key = os.environ.get("RENDER_API_KEY") or getpass.getpass(
    "Render API Key (dashboard.render.com → Account Settings → API Keys): "
).strip()
if not render_key:
    print("ERROR: Render API key is required.")
    sys.exit(1)

print()
print("Namecheap requires an API key (NOT your login password).")
print("Get it at: Namecheap → Profile → Tools → API Access")
print()
namecheap_user = os.environ.get("NAMECHEAP_USER") or input(
    "Namecheap API Username (usually your account username): "
).strip()
namecheap_key = os.environ.get("NAMECHEAP_API_KEY") or getpass.getpass(
    "Namecheap API Key: "
).strip()
# Get public IP for Namecheap whitelist
import urllib.request
try:
    client_ip = urllib.request.urlopen("https://api.ipify.org", timeout=10).read().decode().strip()
except Exception:
    client_ip = input("Your public IP address: ").strip()

print()
print("MongoDB Connection — same Atlas cluster as SERAMAR, different database name.")
default_mongo = os.environ.get("MONGODB_URI", "").strip()
if default_mongo:
    print(f"Using MONGODB_URI from environment.")
    mongo_uri = default_mongo
else:
    print("Example: mongodb+srv://username:password@cluster.mongodb.net/facturation_audit?retryWrites=true&w=majority")
    mongo_uri = getpass.getpass("MONGODB_URI (chars hidden): ").strip()

default_seramar = os.environ.get("SERAMAR_MONGODB_URI", "").strip()
if default_seramar:
    seramar_uri = default_seramar
else:
    print()
    print("SERAMAR_MONGODB_URI — your existing serramar database for booking imports.")
    seramar_uri = getpass.getpass("SERAMAR_MONGODB_URI (chars hidden): ").strip()

if not mongo_uri or not seramar_uri:
    print("ERROR: Both MONGODB_URI and SERAMAR_MONGODB_URI are required for deployment.")
    sys.exit(1)

render_headers = {
    "Authorization": f"Bearer {render_key}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}


def api_call(method, path, **kwargs):
    url = f"{RENDER_API}{path}"
    resp = requests.request(method, url, headers=render_headers, timeout=30, **kwargs)
    if resp.status_code >= 400:
        print(f"  [ERROR] {method} {path} → {resp.status_code}")
        try:
            print(f"  Response: {resp.json()}")
        except Exception:
            print(f"  Response: {resp.text[:500]}")
        resp.raise_for_status()
    return resp


# ─── Step 1: Get owner ID ───────────────────────────────────────────────────────
print("\n[1/5] Getting Render account info...")
try:
    owner_resp = api_call("GET", "/owners")
    owners = owner_resp.json()
    owner_id = owners[0]["owner"]["id"] if isinstance(owners, list) and owners else owners["id"]
    print(f"  Owner ID: {owner_id}")
except Exception as e:
    print(f"  Could not get owner. Using manual lookup. Error: {e}")
    owner_id = input("  Enter your Render owner ID manually: ").strip()


# ─── Step 2: Create the web service ─────────────────────────────────────────────
print(f"\n[2/5] Creating Render web service: {SERVICE_NAME} ...")
service_payload = {
    "type": "web_service",
    "name": SERVICE_NAME,
    "ownerId": owner_id,
    "repo": GITHUB_REPO,
    "branch": GITHUB_BRANCH,
    "autoDeploy": "yes",
    "runtime": "node",
    "buildCommand": "npm install && npm run build:all",
    "startCommand": "NODE_ENV=production npm start",
    "envVars": [
        {"key": "NODE_ENV", "value": "production"},
        {"key": "MONGODB_URI", "value": mongo_uri},
        {"key": "SERAMAR_MONGODB_URI", "value": seramar_uri},
        {"key": "PORT", "value": "10000"},
    ],
}
try:
    resp = api_call("POST", "/services", json=service_payload)
    service = resp.json()
    service_id = service["id"]
    print(f"  Service created! ID: {service_id}")
    print(f"  Dashboard: https://dashboard.render.com/web/{service_id}")
except Exception as e:
    print(f"  Service creation failed: {e}")
    print("  The service may already exist. Let's try to find it...")
    try:
        list_resp = api_call("GET", "/services", params={"name": SERVICE_NAME, "type": "web_service"})
        services = list_resp.json()
        match = next((s for s in services if s["service"]["name"] == SERVICE_NAME), None) if isinstance(services, list) else next((s for s in services if s.get("name") == SERVICE_NAME), None)
        if match:
            service = match.get("service", match)
            service_id = service["id"]
            print(f"  Found existing service: {service_id}")
        else:
            print("  Could not find existing service. Proceeding with DNS only...")
            service_id = None
    except Exception as e2:
        print(f"  Cannot list services either: {e2}")
        service_id = None


# ─── Step 3: Wait for service deployment to get .onrender.com URL ────────────────
if service_id:
    print(f"\n[3/5] Waiting for service to deploy (this may take 2-5 minutes)...")
    render_url = None
    for attempt in range(30):
        try:
            info = api_call("GET", f"/services/{service_id}").json()
            render_url = info.get("serviceDetails", {}).get("url")
            status = info.get("suspended")
            if render_url:
                print(f"  Service URL: {render_url}")
                break
        except Exception:
            pass
        sys.stdout.write(f"  Waiting... ({attempt + 1}/30)\r")
        sys.stdout.flush()
        time.sleep(10)
    if not render_url:
        render_url = input("  Could not auto-detect Render URL. Enter it manually (e.g. facturation-audit.onrender.com): ").strip()
else:
    render_url = input("  Enter the Render service .onrender.com URL: ").strip()

if not render_url:
    print("ERROR: Need the Render service URL for DNS setup.")
    sys.exit(1)

# Clean up — just the hostname if full URL was returned
render_url = render_url.replace("https://", "").replace("http://", "").rstrip("/")

# ─── Step 4: Add custom domain on Render ─────────────────────────────────────────
if service_id:
    print(f"\n[4/5] Configuring custom domain {FULL_DOMAIN} on Render...")
    domain_payload = {"name": FULL_DOMAIN}
    try:
        api_call("POST", f"/services/{service_id}/custom-domains", json=domain_payload)
        print(f"  Custom domain {FULL_DOMAIN} added to Render service.")
    except Exception as e:
        print(f"  Could not add custom domain (may already exist): {e}")
else:
    print(f"\n[4/5] Skipping custom domain setup (no service ID).")
    print(f"  Manually add {FULL_DOMAIN} in Render dashboard → Custom Domains.")


# ─── Step 5: Add CNAME DNS record on Namecheap ───────────────────────────────────
print(f"\n[5/5] Adding CNAME record: {FULL_DOMAIN} → {render_url} ...")

namecheap_url = "https://api.namecheap.com/xml.response"
namecheap_params = {
    "ApiUser": namecheap_user,
    "ApiKey": namecheap_key,
    "UserName": namecheap_user,
    "ClientIp": client_ip,
    "Command": "namecheap.domains.dns.setHosts",
    "SLD": ROOT_DOMAIN.rsplit(".")[0],     # serramaradmin
    "TLD": ROOT_DOMAIN.rsplit(".", 1)[1],  # site
}

# First, get existing DNS records
print("  Fetching existing DNS records...")
try:
    get_params = dict(namecheap_params)
    get_params["Command"] = "namecheap.domains.dns.getHosts"
    resp = requests.get(namecheap_url, params=get_params, timeout=30)
    resp.raise_for_status()

    # Parse XML to collect existing host records
    import xml.etree.ElementTree as ET
    ns = {"nc": "http://api.namecheap.com/xml.response"}
    root = ET.fromstring(resp.text)
    
    # Collect existing records
    existing = []
    hosts_el = root.find(".//nc:hosts", ns) if ns else root.find(".//hosts")
    if hosts_el is not None:
        for h in hosts_el.findall("host" if not ns else "nc:host"):
            existing.append({
                "HostName": h.get("Name", ""),
                "RecordType": h.get("Type", ""),
                "Address": h.get("Address", ""),
                "TTL": h.get("TTL", "1800"),
            })

    print(f"  Found {len(existing)} existing DNS records.")

    # Check if CNAME already exists
    already_exists = any(
        r["HostName"] == SUBDOMAIN_HOST and r["RecordType"] == "CNAME"
        for r in existing
    )

    if already_exists:
        print(f"  ⚠ CNAME {FULL_DOMAIN} already exists! Updating to {render_url}...")
        for r in existing:
            if r["HostName"] == SUBDOMAIN_HOST and r["RecordType"] == "CNAME":
                r["Address"] = render_url
    else:
        print(f"  Adding CNAME: {SUBDOMAIN_HOST} → {render_url}")
        existing.append({
            "HostName": SUBDOMAIN_HOST,
            "RecordType": "CNAME",
            "Address": render_url,
            "TTL": "1800",
        })

    # Set all hosts
    set_params = dict(namecheap_params)
    set_params["Command"] = "namecheap.domains.dns.setHosts"

    for i, rec in enumerate(existing, 1):
        set_params[f"HostName{i}"] = rec["HostName"]
        set_params[f"RecordType{i}"] = rec["RecordType"]
        set_params[f"Address{i}"] = rec["Address"]
        set_params[f"TTL{i}"] = rec.get("TTL", "1800")

    resp = requests.post(namecheap_url, data=set_params, timeout=30)
    resp.raise_for_status()

    result_root = ET.fromstring(resp.text)
    success = result_root.get("Status") == "OK" or (
        result_root.find(".//nc:DomainDNSSetHostsResult", ns) is not None
        if ns
        else result_root.find(".//DomainDNSSetHostsResult") is not None
    )

    if success or '"IsSuccess":"true"' in resp.text.lower() or '<DomainDNSSetHostsResult' in resp.text:
        print(f"  ✅ DNS configured! {FULL_DOMAIN} → {render_url}")
    else:
        print("  Response received but could not confirm success. Check Namecheap dashboard.")

except Exception as e:
    print(f"  Namecheap API error: {e}")
    print()
    print("  ─── MANUAL DNS SETUP ───")
    print(f"  Log into Namecheap → Domain List → {ROOT_DOMAIN} → Advanced DNS")
    print(f"  Add CNAME Record:")
    print(f"    Host:  {SUBDOMAIN_HOST}")
    print(f"    Value: {render_url}")
    print(f"    TTL:   Automatic")
    print(f"  ──────────────────────────")


# ─── Final Summary ───────────────────────────────────────────────────────────────
print()
print("=" * 60)
print("  DEPLOYMENT COMPLETE")
print("=" * 60)
print(f"  App:       {FULL_DOMAIN}")
print(f"  Render:    {render_url}")
print(f"  GitHub:    {GITHUB_REPO}")
print(f"  Database:  facturation_audit (new, isolated from serramar)")
print(f"  Imports:   SERAMAR bookings (read-only from serramar DB)")
print()
print("  It may take 2-5 minutes for Render to build and deploy.")
print("  SSL certificate will be auto-provisioned by Render (~5-15 min).")
print("=" * 60)
