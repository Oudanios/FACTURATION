#!/usr/bin/env python3
"""FACTURATION Deploy — Render Web Service + Namecheap DNS"""
import requests, json, time, sys, urllib.request
import xml.etree.ElementTree as ET

RENDER_KEY = "rnd_W85l2kiRuHrgXNVQmEAIUlwCFfr3"
OWNER_ID = "tea-d8eqbo99rddc73ck4vq0"
MONGO_URI = "mongodb+srv://serramaradmin:Johndoe%4017@cluster0.4bu6lo6.mongodb.net/facturation_audit?retryWrites=true&w=majority&appName=Cluster0"
SERAMAR_URI = "mongodb+srv://serramaradmin:Johndoe%4017@cluster0.4bu6lo6.mongodb.net/serramar?retryWrites=true&w=majority&appName=Cluster0"
NC_USER = "oudanios"
NC_KEY = "Johndoe@17"

H = {"Authorization": f"Bearer {RENDER_KEY}", "Content-Type": "application/json", "Accept": "application/json"}

print("=" * 60)
print("  FACTURATION Deploy")
print("=" * 60)

# ── 1. Create Render service via GraphQL ──────────────────────────
print("\n[1/3] Creating Render web service...")

gql = """
mutation {
  webService: createWebService(input: {
    ownerId: "%s",
    name: "facturation-audit",
    repo: "https://github.com/Oudanios/FACTURATION",
    branch: "main",
    autoDeploy: YES,
    plan: STARTER
  }) {
    id
    name
  }
}
""" % OWNER_ID

r = requests.post("https://api.render.com/graphql", headers=H, json={"query": gql})
print(f"  Status: {r.status_code}")

if r.status_code == 200:
    data = r.json()
    svc = data.get("data", {}).get("webService", {})
    svc_id = svc.get("id", "")
    if svc_id:
        print(f"  Created! ID: {svc_id}")
        
        # ── 2. Update env vars ─────────────────────────────────────
        print("\n[2/3] Setting environment variables...")
        env_vars = [
            {"key": "NODE_ENV", "value": "production"},
            {"key": "MONGODB_URI", "value": MONGO_URI},
            {"key": "SERAMAR_MONGODB_URI", "value": SERAMAR_URI},
            {"key": "PORT", "value": "10000"},
        ]
        r2 = requests.put(
            f"https://api.render.com/v1/services/{svc_id}/env-vars",
            headers=H, json=env_vars
        )
        print(f"  Env vars: {r2.status_code}")

        # ── 3. Custom Domain ───────────────────────────────────────
        print("\n[3/3] Adding custom domain...")
        r3 = requests.post(
            f"https://api.render.com/v1/services/{svc_id}/custom-domains",
            headers=H, json={"name": "audit.serramaradmin.site"}
        )
        print(f"  Domain: {r3.status_code} {r3.text[:200]}")
        
        print(f"\n  DONE! https://dashboard.render.com/web/{svc_id}")
    else:
        print(f"  GraphQL response: {json.dumps(data, indent=2)[:500]}")
        print(f"  Full text: {r.text[:1000]}")
else:
    print(f"  Error: {r.text[:500]}")

# ── 4. Namecheap DNS ──────────────────────────────────────────────
print("\n[4/4] Configuring DNS CNAME...")

try:
    client_ip = urllib.request.urlopen("https://api.ipify.org", timeout=10).read().decode().strip()
    sld, tld = "serramaradmin", "site"
    
    # Get existing records
    get_params = {
        "ApiUser": NC_USER, "ApiKey": NC_KEY, "UserName": NC_USER,
        "ClientIp": client_ip, "Command": "namecheap.domains.dns.getHosts",
        "SLD": sld, "TLD": tld,
    }
    r = requests.post("https://api.namecheap.com/xml.response", data=get_params, timeout=30)
    
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
    
    # Add CNAME
    updated = False
    for rec in existing:
        if rec["HostName"] == "audit" and rec["RecordType"] == "CNAME":
            rec["Address"] = "facturation-audit.onrender.com"
            updated = True
    if not updated:
        existing.append({"HostName": "audit", "RecordType": "CNAME", "Address": "facturation-audit.onrender.com", "TTL": "1800"})
    
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
    
    r2 = requests.post("https://api.namecheap.com/xml.response", data=set_params, timeout=30)
    if "DomainDNSSetHostsResult" in r2.text:
        print("  DNS CNAME created: audit → facturation-audit.onrender.com")
    else:
        print(f"  DNS response: {r2.text[:300]}")
except Exception as e:
    print(f"  DNS error: {e}")

print("\n" + "=" * 60)
print("  https://audit.serramaradmin.site")
print("  Database: facturation_audit (auto-creates on first boot)")
print("=" * 60)
