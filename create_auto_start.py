import os
import io

base_dir = r'd:\patien-system\local-print-agent'

# 1. setup-startup.js
setup_js = r"""const fs = require('fs');
const path = require('path');
const os = require('os');

// Path to the Windows Startup folder
const startupDir = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');

// Path to the agent.js script in the current directory
const agentPath = path.join(__dirname, 'agent.js');

// Create the VBScript content to run Node silently
const vbsContent = 'Set WshShell = CreateObject("WScript.Shell")\r\n' +
                   'WshShell.Run "cmd.exe /c node \"' + agentPath + '\"", 0, False';

// Output file path
const vbsPath = path.join(startupDir, 'OncologyPrintAgent.vbs');

try {
    fs.writeFileSync(vbsPath, vbsContent);
    console.log('====================================================');
    console.log('✅ ตั้งค่าการเปิดอัตโนมัติสำเร็จแล้ว!');
    console.log('====================================================');
    console.log('โปรแกรม Local Print Agent จะทำงานแบบซ่อนตัวอยู่เบื้องหลัง');
    console.log('ทุกครั้งที่คุณเปิดคอมพิวเตอร์เครื่องนี้ขึ้นมาครับ');
    console.log('');
    console.log('ตำแหน่งไฟล์ตั้งค่า: ' + vbsPath);
    console.log('====================================================');
} catch (err) {
    console.error('❌ เกิดข้อผิดพลาดในการตั้งค่า:', err);
}
"""
with io.open(os.path.join(base_dir, 'setup-startup.js'), 'w', encoding='utf-8') as f:
    f.write(setup_js)

# 2. ตั้งค่าเปิดอัตโนมัติ.bat
bat_content = r"""@echo off
chcp 65001 >nul
echo กำลังติดตั้งโมดูลที่จำเป็น...
call npm install
echo.
echo กำลังสร้างไฟล์ตั้งค่าเปิดเครื่องอัตโนมัติ...
node setup-startup.js
echo.
echo ====================================================
echo.
echo หากเห็นข้อความว่า "ตั้งค่าการเปิดอัตโนมัติสำเร็จแล้ว!"
echo คุณสามารถปิดหน้าต่างนี้ และใช้งานคอมพิวเตอร์ได้ตามปกติครับ
echo.
pause
"""
with io.open(os.path.join(base_dir, 'ตั้งค่าเปิดอัตโนมัติ.bat'), 'w', encoding='utf-8') as f:
    f.write(bat_content)

print("Created auto-start scripts successfully")
