import io
import os

def patch_file(filepath):
    if not os.path.exists(filepath):
        print(f"File {filepath} not found.")
        return
        
    with io.open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    old_cmd = 'powershell -Command "Get-Printer | Select-Object -ExpandProperty Name"'
    new_cmd = 'powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Printer | Select-Object -ExpandProperty Name"'

    if old_cmd in content:
        content = content.replace(old_cmd, new_cmd)
        with io.open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Patched {filepath}")
    else:
        print(f"Old command not found in {filepath}. Maybe already patched?")

patch_file(r'd:\patien-system\local-print-agent\agent.js')
patch_file(r'd:\patien-system\oncology-backend\server.js')
