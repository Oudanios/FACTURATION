import requests, time, json

H = {"Authorization": "Bearer rnd_W85l2kiRuHrgXNVQmEAIUlwCFfr3", "Accept": "application/json"}
SVC = "srv-d8ir346rnols73c1ufl0"

# Check deploy status
r = requests.get(f"https://api.render.com/v1/services/{SVC}", headers=H)
svc = r.json()
print(f"Type: {svc.get('type')}")
print(f"Plan: {svc.get('serviceDetails', {}).get('plan')}")
print(f"URL: {svc.get('serviceDetails', {}).get('url')}")
print(f"Status: {svc.get('suspended')}")

# Check deploys
r2 = requests.get(f"https://api.render.com/v1/services/{SVC}/deploys?limit=1", headers=H)
deploys = r2.json()
if isinstance(deploys, list) and deploys:
    d = deploys[0]
    print(f"Deploy: {d.get('id')}: {d.get('status')}")
elif isinstance(deploys, dict):
    d = deploys.get("deploy", deploys)
    print(f"Deploy: {d.get('id')}: {d.get('status')}")

# Check custom domains
r3 = requests.get(f"https://api.render.com/v1/services/{SVC}/custom-domains", headers=H)
print(f"Domains: {json.dumps(r3.json(), indent=2)[:300]}")
