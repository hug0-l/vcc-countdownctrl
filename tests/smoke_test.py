#!/usr/bin/env python3
"""Smoke test for County system"""
import subprocess, sys, os

errors = 0

# 1. JS syntax check
js_dir = 'static'
for f in sorted(os.listdir(js_dir)):
    if f.endswith('.js'):
        result = subprocess.run(['node', '--check', os.path.join(js_dir, f)], capture_output=True, text=True)
        if result.returncode != 0:
            print(f'❌ JS syntax: {f}')
            errors += 1
        else:
            print(f'✅ JS syntax: {f}')

# 2. Python syntax check
result = subprocess.run([sys.executable, '-m', 'py_compile', 'server.py'], capture_output=True, text=True)
if result.returncode != 0:
    print('❌ Python syntax: server.py')
    errors += 1
else:
    print('✅ Python syntax: server.py')

# 3. Check all referenced static files exist
expected = ['county.css', 'county-core.js', 'county-helpers.js', 'county-config.js',
            'county-api.js', 'county-time.js', 'county-log.js', 'county-sound.js',
            'county-data.js', 'county-engine.js', 'county-ui-live.js',
            'county-ui-rundown.js', 'county-ui-preset.js', 'county-ui-settings.js',
            'county-ui-clipper.js', 'clipper-sdk.js']
for f in expected:
    if os.path.exists(os.path.join(js_dir, f)):
        print(f'✅ File: {f}')
    else:
        print(f'❌ MISSING: {f}')
        errors += 1

# 4. Check HTML structure
with open('templates/index.html') as f:
    html = f.read()
    pages = ['page-live', 'page-rundown', 'page-preset', 'page-settings',
             'page-changelog', 'page-help', 'page-clipper']
    for p in pages:
        if f'id="{p}"' in html:
            print(f'✅ HTML: {p}')
        else:
            print(f'❌ HTML: MISSING {p}')
            errors += 1

print(f'\n{"="*40}')
if errors == 0:
    print('✅ ALL CHECKS PASSED')
else:
    print(f'❌ {errors} CHECK(S) FAILED')
    sys.exit(1)
