import requests, json

RENDER_KEY = "rnd_W85l2kiRuHrgXNVQmEAIUlwCFfr3"
OWNER_ID = "tea-d8eqbo99rddc73ck4vq0"
MONGODB_URI = "mongodb+srv://serramaradmin:Johndoe%4017@cluster0.4bu6lo6.mongodb.net/facturation_audit?retryWrites=true&w=majority&appName=Cluster0"
SERAMAR_URI = "mongodb+srv://serramaradmin:Johndoe%4017@cluster0.4bu6lo6.mongodb.net/serramar?retryWrites=true&w=majority&appName=Cluster0"

h = {"Authorization": f"Bearer {RENDER_KEY}", "Content-Type": "application/json", "Accept": "application/json"}

# 1. Create service
print("Creating service...")
payload = {
    "type": "web_service", "name": "facturation-audit", "ownerId": OWNER_ID,
    "repo": "https://github.com/Oudanios/FACTURATION", "branch": "main",
    "autoDeploy": "yes", "runtime": "node",
    "serviceDetails": {
        "env": "node",
        "buildPlan": "starter",
        "envSpecificDetails": {
            "buildCommand": "npm install && npm run build:all",
            "startCommand": "NODE_ENV=production npm start",
        }
    },
    "envVars": [
        {"key": "NODE_ENV", "value": "production"},
        {"key": "MONGODB_URI", "value": MONGODB_URI},
        {"key": "SERAMAR_MONGODB_URI", "value": SERAMAR_URI},
        {"key": "PORT", "value": "10000"},
    ],
}
r = requests.post("https://api.render.com/v1/services", headers=h, json=payload)
print(f"Status: {r.status_code}")
resp = r.json()
print(json.dumps(resp, indent=2)[:1000])

service_id = resp.get("id", "")
if service_id:
    print(f"\n✅ Service created: {service_id}")
    
    # 2. Add custom domain
    print("\nAdding custom domain...")
    r2 = requests.post(f"https://api.render.com/v1/services/{service_id}/custom-domains", 
                        headers=h, json={"name": "audit.serramaradmin.site"})
    print(f"Status: {r2.status_code} {r2.text[:300]}")
    
    print(f"\n=== DEPLOYED ===")
    print(f"Dashboard: https://dashboard.render.com/web/{service_id}")
    print(f"URL: https://audit.serramaradmin.site (after DNS + deploy)")
else:
    print("Failed. Checking if exists...")
    r3 = requests.get("https://api.render.com/v1/services", headers=h, params={"name": "facturation-audit"})
    print(json.dumps(r3.json(), indent=2)[:1000])
