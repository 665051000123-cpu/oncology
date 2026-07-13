import sys
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Fix the title in printHistory
start_idx = content.find("const printHistory = () => {")
end_idx = content.find("onConfirm: async", start_idx)

block = content[start_idx:end_idx]
new_block = re.sub(r"title:\s*['\"].*?['\"]", "title: 'รายงานประวัติการคำนวณ'", block, count=1)
content = content.replace(block, new_block)

# 2. Fix the text colors in history-print-area
target_h1 = "<h1 className=\"text-3xl font-black flex items-center gap-2\">"
replacement_h1 = "<h1 className=\"text-3xl font-black flex items-center gap-2 text-slate-800\">"

target_p = "<p className=\"text-slate-400\">"
replacement_p = "<p className=\"text-slate-500 font-medium\">"

content = content.replace(target_h1, replacement_h1)
content = content.replace(target_p, replacement_p)

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed printHistory title and header colors")
