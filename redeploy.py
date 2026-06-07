import requests, time

KEY = "rnd_W85l2kiRuHrgXNVQmEAIUlwCFfr3"
H = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
SVC = "srv-d8iqmarbc2fs73be7lcg"

# Trigger deploy
r = requests.post(f"https://api.render.com/v1/services/{SVC}/deploys", headers=H, json={})
print(f"Trigger: {r.status_code}")
if r.status_code == 201:
    dep_id = r.json()["id"]
    print(f"Deploy ID: {dep_id}")
    
    # Poll for status
    for i in range(12):
        time.sleep(10)
        r2 = requests.get(f"https://api.render.com/v1/services/{SVC}/deploys/{dep_id}", headers=H)
        status = r2.json().get("status", "?")
        print(f"  [{i+1}] {status}")
        if status in ("live", "build_failed", "update_failed", "crashed"):
            if status != "live":
                print(f"\nDeploy failed. Check logs at:")
                print(f"https://dashboard.render.com/web/{SVC}/deploys/{dep_id}")
            break
else:
    print(f"Error: {r.status_code} {r.text[:300]}")
