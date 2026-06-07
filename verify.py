import requests

# Check site
r = requests.get('https://facturation-audit.onrender.com', timeout=10)
print(f'Site: {r.status_code} | {len(r.text)} bytes')

# Check JS bundle for clean login
html = r.text
js_url = None
for line in html.split('\n'):
    if 'src="/assets/' in line:
        js_url = 'https://facturation-audit.onrender.com' + line.split('src="')[1].split('"')[0]
        break

if js_url:
    r2 = requests.get(js_url, timeout=10)
    print(f'JS:   {r2.status_code} | {len(r2.text)} bytes')
    # Check for the clean login card text
    has_administrador = 'Administrador' in r2.text
    has_gerente = 'Gerente' in r2.text
    has_auditor = 'Auditor' in r2.text
    no_demo = 'Demo' not in r2.text and 'demo' not in r2.text
    no_passwords = 'OUDANI@RABI' not in r2.text and 'KRISTIAN@2026' not in r2.text
    
    print(f'Administrador: {has_administrador}')
    print(f'Gerente: {has_gerente}')
    print(f'Auditor: {has_auditor}')
    print(f'No demo mode: {no_demo}')
    print(f'No exposed passwords: {no_passwords}')
    print()
    if has_administrador and has_gerente and has_auditor and no_demo and no_passwords:
        print('ALL CHECKS PASSED - Clean login page!')
    else:
        print('SOME CHECKS FAILED - Not yet clean')
else:
    print('Could not find JS bundle URL')
