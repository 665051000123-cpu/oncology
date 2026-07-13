
import sys

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

target = "value={(row.dose || '').match(/[\d.]+/) ? (row.dose || '').match(/[\d.]+/)[0] : ''}"
replacement = "value={((row.dose || '').match(/[\d.]+/) && (row.dose || '').match(/[\d.]+/)[0] !== '.') ? (row.dose || '').match(/[\d.]+/)[0] : ''}"

if target in content:
    content = content.replace(target, replacement)
    with open("client/src/App.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")

