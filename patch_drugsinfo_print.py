import io
import re

file_path = r'd:\patien-system\client\src\components\DrugsInfo.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Hide TH for actions
content = re.sub(
    r'<th className="px-2\.5 py-3 text-\[11px\] font-black uppercase tracking-wider opacity-60 w-\[8%\] text-center">(การจัดการ)</th>',
    r'<th className="px-2.5 py-3 text-[11px] font-black uppercase tracking-wider opacity-60 w-[8%] text-center no-print">\1</th>',
    content
)

# Hide TD for actions
content = re.sub(
    r'<td className="px-2\.5 py-3 text-center">\s*<div className="flex justify-center gap-1\.5">',
    r'<td className="px-2.5 py-3 text-center no-print">\n                                                <div className="flex justify-center gap-1.5">',
    content
)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated DrugsInfo.jsx to hide actions column on print')
