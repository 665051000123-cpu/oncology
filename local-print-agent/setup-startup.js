const fs = require('fs');
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
