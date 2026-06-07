import requests, time
h={'Authorization':'Bearer rnd_W85l2kiRuHrgXNVQmEAIUlwCFfr3','Content-Type':'application/json'}
S='srv-d8iqmarbc2fs73be7lcg'
r=requests.post(f'https://api.render.com/v1/services/{S}/deploys',headers=h,json={'clearCache':'clear'})
print('Deploy:',r.status_code)
time.sleep(25)
r2=requests.get(f'https://api.render.com/v1/services/{S}/deploys?limit=1',headers=h)
d=r2.json()[0] if isinstance(r2.json(),list) else r2.json()
print(f'{d.get("id")}: {d.get("status")}')
if d.get('status')=='live': print('SUCCESS!')
elif 'failed' in d.get('status',''): print('Failed')
else: print('In progress...')
