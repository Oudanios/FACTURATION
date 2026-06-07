import requests, json

API = "https://api.render.com/v1"
KEY = "rnd_W85l2kiRuHrgXNVQmEAIUlwCFfr3"
H = {"Authorization": f"Bearer {KEY}", "Accept": "application/json"}
SVC_ID = "srv-d8iqmarbc2fs73be7lcg"

# Get service status
r = requests.get(f"{API}/services/{SVC_ID}", headers=H)
svc = r.json()
print(f"Service: {svc.get('name')}")
print(f"Status:  {svc.get('suspended', '?')}")
print(f"URL:     {svc.get('serviceDetails', {}).get('url', '?')}")
print(f"Updated: {svc.get('updatedAt', '?')}")
print()

# Get deploy status
r2 = requests.get(f"{API}/services/{SVC_ID}/deploys?limit=5", headers=H)
deploys = r2.json()
if isinstance(deploys, list):
    for dep in deploys[:5]:
        sid = dep.get('id', dep.get('deploy', {}).get('id', '?'))
        status = dep.get('status', dep.get('deploy', {}).get('status', '?'))
        msg = dep.get('commit', {}).get('message', '?')
        created = dep.get('createdAt', dep.get('deploy', {}).get('createdAt', '?'))
        print(f"Deploy {sid}: {status} | {msg[:60]} | {created}")

# If no deploys, show full service response
if not isinstance(deploys, list) or len(deploys) == 0:
    print("\nFull service response:")
    print(json.dumps(svc, indent=2)[:2000])
