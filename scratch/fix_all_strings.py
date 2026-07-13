
import sys
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Fix cycle match
content = content.replace("const match = patient.cycle.match(/\d+/);", "const match = String(patient.cycle).match(/\d+/);")

# Fix log includes
content = content.replace("val.includes('CV REGIMEN')", "String(val).includes('CV REGIMEN')")
content = content.replace("val.includes('BC REGIMEN')", "String(val).includes('BC REGIMEN')")
content = content.replace("val.includes('VINCRISTINE')", "String(val).includes('VINCRISTINE')")
content = content.replace("val.includes('CARBOPLATIN')", "String(val).includes('CARBOPLATIN')")
content = content.replace("val.includes('BLEOMYCIN')", "String(val).includes('BLEOMYCIN')")

content = content.replace("let cleaned = val.replace(/[^0-9/]/g, '');", "let cleaned = String(val).replace(/[^0-9/]/g, '');")
content = content.replace("let cleaned = val.replace(/[^0-9:]/g, '');", "let cleaned = String(val).replace(/[^0-9:]/g, '');")

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Safe String injections applied")

