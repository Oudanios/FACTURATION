import re

files = [
    'src/components/InvoiceManager.tsx',
    'src/components/ClientFacturation.tsx'
]

for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find and replace the data:text/html approach with Blob URL
    # Pattern: const a = document.createElement('a'); ... a.click();
    old_pattern = r"const a = document\.createElement\('a'\);\s*a\.href = 'data:text/html;charset=utf-8,' \+ encodeURIComponent\(html\);\s*a\.target = '_blank';\s*a\.click\(\);"
    
    new_code = """const blob = new Blob([html], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const w = window.open(url, '_blank');
                if (w) { w.onload = () => { URL.revokeObjectURL(url); w.print(); }; setTimeout(() => { try { if(w.closed) URL.revokeObjectURL(url); } catch(e){} }, 10000); }"""
    
    count = len(re.findall(old_pattern, content))
    print(f'{filepath}: {count} occurrences')
    
    if count > 0:
        content = re.sub(old_pattern, new_code, content)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'  Fixed!')
    else:
        print(f'  Pattern not found')
