import io
import re

file_path = r'd:\patien-system\client\src\App.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace `${API_BASE}/print` with `user?.use_local_agent ? 'http://localhost:5005/api/print' : \`${API_BASE}/print\``
content = content.replace("`${API_BASE}/print`", "user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`")

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated App.jsx print URL successfully")
