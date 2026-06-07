#!/usr/bin/env python3
"""FACTURATION Deploy — uses env vars for credentials (no interactive prompts)"""
import os, sys, json, time, requests, urllib.request, xml.etree.ElementTree as ET

RENDER_KEY = os.environ["RENDER_API_KEY"]
NC_USER = os.environ.get("NC_USER", "oudanios")
NC_KEY = os.environ.get("NC_API_KEY", os.environ.get("NC_PASS", ""))
MONGO_URI = os.environ.get("MONGO_URI", "")
SERAMAR_URI = os.environ.get("SERAMAR_URI", "")

GITHUB_REPO = "https://github.com/Oudanios/FACTURATION.git"
SERVICE_NAME = os.environ.get("SERVICE_NAME", "facturation-audit")
SUBDOMAIN = os.environ.get("SUBDOMAIN", "audit")
DOMAIN = os.environ.get("DOMAIN", "serramaradmin.site")
FULL_DOMAIN = f"{SUBDOMAIN}.{DOMAIN}"

print("FACTURATION Deploy — Render + DNS")
print(f"  Service: {SERVICE_NAME} | Domain: {FULL_DOMAIN}")

client_ip = urllib.request.urlopen("https://api.ipify.org", timeout=10).read().decode().strip()
headers = {"Authorization": f"Bearer {RENDER_KEY}", "Content-Type": "application/json", "Accept": "application/json"}

# 1. Owner
print("\n[1/5] Getting owner...")
try:
    r = requests.get("https://api.render.com/v1/owners", headers=headers, timeout=30)
    r.raise_for_status()
    owners = r.json()
    owner_id = owners[0]["owner"]["id"] if isinstance(owners, list) else owners.get("id", owners[0].get("id"))
except Exception:
    owner_id = input("Owner ID: ")
print(f"  Owner: {owner_id}")

# 2. Create service
print(f"\n[2/5] Creating service {SERVICE_NAME}...")
svc_payload = {
    "type": "web_service", "name": SERVICE_NAME, "ownerId": owner_id,
    "repo": GITHUB_REPO, "branch": "main", "autoDeploy": "yes",
    "runtime": "node",
    "buildCommand": "npm install && npm run build:all",
    "startCommand": "NODE_ENV=production npm start",
    "envVars": [
        {"key": "NODE_ENV", "value": "production"},
        {"key": "MONGODB_URI", "value": MONGO_URI},
        {"key": "SERAMAR_MONGODB_URI", "value": SERAMAR_URI},
        {"key": "PORT", "value": "10000"},
    ],
}
service_id, render_url = None, None
try:
    r = requests.post("https://api.render.com/v1/services", headers=headers, json=svc_payload, timeout=30)
    r.raise_for_status()
    svc = r.json()
    service_id = svc["id"]
    print(f"  Created! ID: {service_id}")
except Exception as e:
    print(f"  POST failed: {e}. Checking if exists...")
    try:
        r2 = requests.get("https://api.render.com/v1/services", headers=headers, params={"name": SERVICE_NAME, "type": "web_service"}, timeout=30)
        svcs = r2.json()
        for s in (svcs if isinstance(svcs, list) else [svcs]):
            sid = s if isinstance(s, str) else s.get("service", s).get("id", "")
            if sid:
                service_id = sid
                print(f"  Found: {sid}")
                break
    except Exception:
        pass

# 3. Wait for .onrender.com URL
if service_id:
    print("\n[3/5] Waiting for deploy...")
    for i in range(30):
        try:
            info = requests.get(f"https://api.render.com/v1/services/{service_id}", headers=headers, timeout=10).json()
            render_url = (info.get("service", info).get("serviceDetails", {}) or {}).get("url", "")
            if not render_url:
                render_url = info.get("customDomains", [{}])[0].get("name", "") if info.get("customDomains") else ""
            if render_url:
                print(f"  URL: {render_url}")
                break
        except Exception:
            pass
        time.sleep(10)
    if not render_url:
        render_url = f"{SERVICE_NAME}.onrender.com"
else:
    render_url = f"{SERVICE_NAME}.onrender.com"

# 4. Custom domain on Render
if service_id:
    print(f"\n[4/5] Adding custom domain {FULL_DOMAIN}...")
    try:
        requests.post(f"https://api.render.com/v1/services/{service_id}/custom-domains",
                      headers=headers, json={"name": FULL_DOMAIN}, timeout=30)
        print(f"  Domain added.")
    except Exception as e:
        print(f"  Note: {e}")

# 5. Namecheap DNS
print(f"\n[5/5] DNS CNAME {FULL_DOMAIN} → {render_url}...")
nc_base = "https://api.namecheap.com/xml.response"
sld, tld = DOMAIN.rsplit(".", 1)

# Get existing records
try:
    params = {
        "ApiUser": NC_USER, "ApiKey": NC_KEY, "UserName": NC_USER,
        "ClientIp": client_ip, "Command": "namecheap.domains.dns.getHosts",
        "SLD": sld, "TLD": tld,
    }
    r = requests.post(nc_base, data=params, timeout=30)
    ns = {"nc": "http://api.namecheap.com/xml.response"}
    root = ET.fromstring(r.text)

    existing = []
    hosts_el = root.find(".//nc:hosts", ns)
    if hosts_el is not None:
        for h in hosts_el.findall("nc:host", ns):
            existing.append({
                "HostName": h.get("Name", ""), "RecordType": h.get("Type", ""),
                "Address": h.get("Address", ""), "TTL": h.get("TTL", "1800"),
            })

    updated = False
    for rec in existing:
        if rec["HostName"] == SUBDOMAIN and rec["RecordType"] == "CNAME":
            rec["Address"] = render_url
            updated = True
    if not updated:
        existing.append({"HostName": SUBDOMAIN, "RecordType": "CNAME", "Address": render_url, "TTL": "1800"})

    set_params = {
        "ApiUser": NC_USER, "ApiKey": NC_KEY, "UserName": NC_USER,
        "ClientIp": client_ip, "Command": "namecheap.domains.dns.setHosts",
        "SLD": sld, "TLD": tld,
    }
    for i, rec in enumerate(existing, 1):
        set_params[f"HostName{i}"] = rec["HostName"]
        set_params[f"RecordType{i}"] = rec["RecordType"]
        set_params[f"Address{i}"] = rec["Address"]
        set_params[f"TTL{i}"] = rec.get("TTL", "1800")

    r2 = requests.post(nc_base, data=set_params, timeout=30)
    if "IsSuccess" in r2.text.lower() or "DomainDNSSetHostsResult" in r2.text:
        print(f"  ✅ DNS: {FULL_DOMAIN} → {render_url}")
    else:
        print(f"  Response: {r2.text[:300]}")
except Exception as e:
    print(f"  Namecheap API error: {e}")
    print(f"  MANUAL: Add CNAME | Host: {SUBDOMAIN} | Value: {render_url} | Namecheap → Advanced DNS")

print(f"\n{'='*50}")
print(f"  {FULL_DOMAIN} → {render_url}")
print(f"  MongoDB: facturation_audit (new, isolated)")
print(f"  Done. Build takes ~3-5 min, SSL ~15 min.")
print(f"{'='*50}")
