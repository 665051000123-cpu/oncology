import io
import re

file_path = r'd:\patien-system\client\src\App.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix BSA formatting
target_bsa = """                BSA = Square root of [(Weight(kg) x Height(cm)) / 3600] = <span class="line-input" style="width: 80px; text-align: center;">${bsa || ''}</span> m²"""
replacement_bsa = """                BSA = Square root of [(Weight(kg) x Height(cm)) / 3600] = <span class="line-input" style="width: 80px; text-align: center;">${bsa ? Number(bsa).toFixed(4) : ''}</span> m²"""
content = content.replace(target_bsa, replacement_bsa)

# 2. Fix selectedRegimen
target_regimen = """                Drug regimen <span class="line-input" style="width: 80%;">${selectedRegimen ? selectedRegimen.name : ''}</span>"""
replacement_regimen = """                Drug regimen <span class="line-input" style="width: 80%;">${selectedRegimen === 'custom' ? 'Custom' : selectedRegimen === 'cv' ? 'CV Regimen' : selectedRegimen === 'bc' ? 'BC Regimen' : (selectedRegimen || '')}</span>"""
content = content.replace(target_regimen, replacement_regimen)

# 3. If activeRows has no drugNames, maybe we can use singleDrugResults as fallback?
# I'll modify the drugBlocks generation.
target_drugblocks = """        let drugBlocks = '';
        activeRows.forEach((row, i) => {
            drugBlocks += `"""
replacement_drugblocks = """        let drugBlocks = '';
        const rowsToPrint = activeRows.some(r => r.drugName) ? activeRows : (singleDrugResults.length > 0 ? singleDrugResults.map(r => ({ drugName: r.name, dose: r.dose })) : activeRows);
        
        rowsToPrint.forEach((row, i) => {
            drugBlocks += `"""
content = content.replace(target_drugblocks, replacement_drugblocks)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed layout bugs in PrintWorkingFormula")
