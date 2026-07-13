
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace activeRows with rowsToPrint inside printStickers
pattern = r"const htmlContent = `\s*<!DOCTYPE html>\s*<html>\s*<head>.*?(?:<body>\s*\$\{)activeRows\.map"
match = re.search(pattern, content, re.DOTALL)
if match:
    # We need to inject rowsToPrint calculation right before htmlContent
    injection = """
        const rowsToPrint = activeRows.some(r => r.drugName) ? activeRows : (singleDrugResults.length > 0 ? singleDrugResults.map(r => ({ drugName: r.name, dose: r.dose })) : activeRows);
        
        const htmlContent = `"""
    
    content = content.replace("const htmlContent = `", injection, 1)
    # Then replace activeRows.map with rowsToPrint.map ONLY in the printStickers function
    # The first activeRows.map after htmlContent should be replaced.
    start_idx = content.find("const htmlContent = `")
    body_map_idx = content.find("${activeRows.map(", start_idx)
    content = content[:body_map_idx] + "${rowsToPrint.map(" + content[body_map_idx+16:]
    
    with open("client/src/App.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Fixed printStickers to use rowsToPrint")
else:
    print("Could not find printStickers HTML content pattern")

