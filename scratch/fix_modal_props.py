
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("onClose={() => setPreviewData", "onCancel={() => setPreviewData")

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed PrintPreviewModal props")

