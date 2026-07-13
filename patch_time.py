import io
import re
import sys

file_path = r'd:\patien-system\client\src\App.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

original_content = content

# 1. Update Sticker Footer
content = content.replace('<span>ผลิต: ${pTime}</span>', '<span>ผลิต: ${pTime.split(\' \')[0]}</span>')
content = content.replace('<span>หมดอายุ: ${formatDateTime(exp)}</span>', '<span>หมดอายุ: ${formatDateTime(exp).split(\' \')[0]}</span>')

# 2. Update Table Headers
content = content.replace('<th className="px-3 py-2.5">วันที่ & เวลาเริ่ม</th>', '<th className="px-3 py-2.5">วันที่เริ่ม</th>')
content = content.replace('<th className="px-3 py-2.5">วันที่ & เวลาสิ้นสุด</th>', '<th className="px-3 py-2.5">วันที่สิ้นสุด</th>')

# 3. Remove startTime input div block
pattern_start = r'(\s*)<div className="relative flex items-center">\s*<input\s*type="text"\s*placeholder="HH:MM \(24น\.\)"\s*value=\{row\.startTime \|\| \'\'\}(.|\n)*?\{timePickerOpenRow === idx && !isLockedRow && \((.|\n)*?</div>\s*\)\}\s*</div>'
content = re.sub(pattern_start, '', content)

# 4. Remove endTime input div block
pattern_end = r'(\s*)<div className="relative flex items-center">\s*<input\s*type="text"\s*placeholder="HH:MM \(24น\.\)"\s*value=\{row\.endTime \|\| \'\'\}(.|\n)*?\{timePickerOpenRow === `\$\{idx\}-end` && !isLockedRow && \((.|\n)*?</div>\s*\)\}\s*</div>'
content = re.sub(pattern_end, '', content)

if content == original_content:
    print("No changes made. Something is wrong with regex or replacement strings.")
    sys.exit(1)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Successfully updated App.jsx")
