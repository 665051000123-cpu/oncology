
import sys

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

target = """                                                                                        if (prevRow && prevRow.dose) {
                                                                                            matchedDose = prevRow.dose;
                                                                                            break;
                                                                                        }"""

replacement = """                                                                                        if (prevRow && prevRow.dose) {
                                                                                            let d = prevRow.dose;
                                                                                            if (d.match(/[\d.]+/) && d.match(/[\d.]+/)[0] !== '.') {
                                                                                                matchedDose = d;
                                                                                            }
                                                                                            break;
                                                                                        }"""

if target in content:
    content = content.replace(target, replacement)
    with open("client/src/App.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Target not found")

