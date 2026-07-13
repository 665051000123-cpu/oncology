import sys
import re
import os

filepath = 'local-print-agent/agent.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

get_path_func = '''
function getExecutablePath() {
    const paths = [
        'C:\\\\Program Files\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
        'C:\\\\Program Files (x86)\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe',
        'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
        'C:\\\\Program Files\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe'
    ];
    for (const p of paths) {
        if (fs.existsSync(p)) return p;
    }
    return undefined; // Let puppeteer try its default
}
'''

content = content.replace('const app = express();', get_path_func + '\nconst app = express();')

launch_pattern = r"await puppeteer\.launch\(\{.*?\}\);"
replacement = "await puppeteer.launch({ headless: 'new', executablePath: getExecutablePath() });"
content = re.sub(launch_pattern, replacement, content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Updated agent.js')
