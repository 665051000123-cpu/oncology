
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("[d.]+", r"[\d.]+")
content = content.replace("[^d.]", r"[^\d.]")
# Also let us check if [d.s] exists! Yes, line 3843 might have had [d.s] for [\d.\s]
content = content.replace("[d.s]", r"[\d.\s]")

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Patched regexes successfully")

