
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(r"/^d$/", r"/^\d$/")
content = content.replace(r"/d+/", r"/\d+/")

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Patched cycle regexes successfully")

