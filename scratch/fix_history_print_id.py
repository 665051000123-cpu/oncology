
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "<div className=\"max-w-7xl mx-auto premium-card p-6 md:p-8 relative\">",
    "<div id=\"history-print-area\" className=\"max-w-7xl mx-auto premium-card p-6 md:p-8 relative bg-white\">"
)

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Fixed ID")

