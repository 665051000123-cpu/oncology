
import sys

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: toLowerCase crash
target1 = """value={(() => {
                                                                        const str = row.dose || '';
                                                                        if (str.toLowerCase().includes('auc')) return 'AUC';
                                                                        const u = str.replace(/[\d.\s]/g, '');
                                                                        return u || 'mg';
                                                                    })()}"""
replacement1 = """value={(() => {
                                                                        const str = String(row.dose || '');
                                                                        if (str.toLowerCase().includes('auc')) return 'AUC';
                                                                        const u = str.replace(/[\d.\s]/g, '');
                                                                        return u || 'mg';
                                                                    })()}"""
if target1 in content:
    content = content.replace(target1, replacement1)
    print("Fixed target 1")
else:
    print("Target 1 not found")

# Fix 2: match crash
target2 = """onChange={e => {
                                                                        const newUnit = e.target.value;
                                                                        const str = row.dose || '';
                                                                        const numMatch = str.match(/[\d.]+/);"""
replacement2 = """onChange={e => {
                                                                        const newUnit = e.target.value;
                                                                        const str = String(row.dose || '');
                                                                        const numMatch = str.match(/[\d.]+/);"""
if target2 in content:
    content = content.replace(target2, replacement2)
    print("Fixed target 2")
else:
    print("Target 2 not found")

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)

