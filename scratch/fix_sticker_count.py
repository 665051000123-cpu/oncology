
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("<span>(${index + 1}/${activeRows.length})</span>", "<span>(${index + 1}/${rowsToPrint.length})</span>")

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed sticker count")

