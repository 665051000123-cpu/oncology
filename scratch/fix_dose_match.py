
import sys

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1
target1 = """let d = prevRow.dose;
                                                                                            if (d.match(/[\d.]+/) && d.match(/[\d.]+/)[0] !== '.') {"""
replacement1 = """let d = String(prevRow.dose);
                                                                                            if (d.match(/[\d.]+/) && d.match(/[\d.]+/)[0] !== '.') {"""

if target1 in content:
    content = content.replace(target1, replacement1)
    print("Fixed 1")

# Fix 2
target2 = "value={((row.dose || '').match(/[\d.]+/) && (row.dose || '').match(/[\d.]+/)[0] !== '.') ? (row.dose || '').match(/[\d.]+/)[0] : ''}"
replacement2 = "value={((row.dose || '').toString().match(/[\d.]+/) && (row.dose || '').toString().match(/[\d.]+/)[0] !== '.') ? (row.dose || '').toString().match(/[\d.]+/)[0] : ''}"

if target2 in content:
    content = content.replace(target2, replacement2)
    print("Fixed 2")

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)

