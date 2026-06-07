import requests, time, json

KEY = "rnd_W85l2kiRuHrgXNVQmEAIUlwCFfr3"
H = {"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
SVC = "srv-d8iqmarbc2fs73be7lcg"

# Clear deploy
print("Triggering deploy...")
r = requests.post(f"https://api.render.com/v1/services/{SVC}/deploys", headers=H, json={"clearCache": "clear"})

# Wait 3 min, checking every 20s
for i in range(10):
    time.sleep(20)
    r = requests.get(f"https://api.render.com/v1/services/{SVC}/deploys?limit=2", headers=H)
    dep = r.json()
    if isinstance(dep, list) and dep:
        d = dep[0]
        sid = d.get("id", d.get("deploy", {}).get("id", "?"))
        status = d.get("status", d.get("deploy", {}).get("status", "?"))
        print(f"[{i+1}] {sid}: {status}")
        if status == "live":
            print("\n✅ DEPLOY SUCCESSFUL!")
            print("https://facturation-audit.onrender.com")
            break
        elif status in ("build_failed", "update_failed", "crashed"):
            print(f"\n❌ Deploy failed: {status}")
            break
    else:
        print(f"[{i+1}] No deploys yet")
