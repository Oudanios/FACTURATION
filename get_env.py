import requests
r = requests.get(
    'https://api.render.com/v1/services/srv-d8eqrdbr7f7vs73deoes0/env-vars',
    headers={'Authorization': 'Bearer rnd_W85l2kiRuHrgXNVQmEAIUlwCFfr3', 'Accept': 'application/json'}
)
print(r.status_code)
data = r.json()
for e in data:
    print(f"{e['key']}={e['value']}")
