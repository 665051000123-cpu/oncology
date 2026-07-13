
import sys

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "// Auto-sync calculated doses to adminRows" in line:
        skip = True
    if skip and "    }, [calculatedDoses]);" in line:
        skip = False
        continue
    if not skip:
        new_lines.append(line)

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.writelines(new_lines)
print("Removed broken useEffect")

