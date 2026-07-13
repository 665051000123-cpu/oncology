import sys

with open('client/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find("const printHistory = () => {")
end_idx = content.find("openDrugInfoFallback();", start_idx)

if start_idx != -1 and end_idx != -1:
    section = content[start_idx:end_idx]
    section = section.replace("printerName: user?.default_printer || ''", "printerName: user?.calculation_printer || ''")
    section = section.replace("if (user?.default_printer) {", "if (user?.calculation_printer) {")
    section = section.replace("printerName: user.default_printer,", "printerName: user.calculation_printer,")
    section = section.replace("${user.default_printer}", "${user.calculation_printer}")
    
    content = content[:start_idx] + section + content[end_idx:]
    with open('client/src/App.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Updated printHistory to use calculation_printer.')
else:
    print('Could not find section.')
