import io
import re

file_path = r'd:\patien-system\client\src\App.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print_function = """    const printDrugInfo = async () => {
        if (!selectedDrugs || selectedDrugs.length === 0) {
            showNotification('ไม่มีข้อมูลยาที่เลือก', 'warning');
            return;
        }
        
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>พิมพ์ข้อมูลยา</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
                @page { size: A4; margin: 1cm; }
                body { font-family: 'Sarabun', sans-serif; font-size: 14px; color: #000; line-height: 1.5; }
                .drug-container { margin-bottom: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 10px; page-break-inside: avoid; }
                .drug-title { font-size: 18px; font-weight: bold; margin-bottom: 5px; color: #0369a1; }
                .drug-desc { font-weight: bold; margin-bottom: 10px; }
                .drug-details { font-size: 14px; white-space: pre-wrap; }
            </style>
        </head>
        <body>
            <h2 style="text-align: center; margin-bottom: 20px;">ข้อมูลยาที่เลือก</h2>
            ${selectedDrugs.map(drugId => {
                const dInfo = drugsInfo.find(d => d.id === drugId) || drugsInfo[0];
                return \\`
                <div class="drug-container">
                    <div class="drug-title">\\${dInfo.name}</div>
                    <div class="drug-desc">\\${dInfo.desc}</div>
                    <div class="drug-details">\\${dInfo.details}</div>
                </div>
                \\`;
            }).join('')}
        </body>
        </html>
        `;

        if (user?.a4_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(\`\\${API_BASE}/print\`, {
                    html: htmlContent,
                    printerName: user.a4_printer,
                    isA4: true
                });
                if (res.data.success) {
                    showNotification(\`พิมพ์ข้อมูลยาไปที่ \\${user.a4_printer} สำเร็จ\`, 'success');
                    return;
                }
            } catch (err) {
                console.error('Local Print Server error', err);
                showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
            }
        }

        const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script></body>');
        const printWindow = window.open('', '_blank', 'width=800,height=800');
        if (!printWindow) {
            showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(fallbackHtml);
        printWindow.document.close();
    };

    const handleAddRow = () => {"""

content = content.replace('    const handleAddRow = () => {', print_function)

# For the button, let's use regex to find the button
pattern = r'(<button\s*onClick=\{\(\) => setShowDrugInfo\(!showDrugInfo\)\}\s*className="flex items-center gap-2 text-\[10px\] font-black text-sky-500 hover:text-sky-400 p-1\.5 bg-sky-600/5 rounded-lg border border-sky-500/20 transition-all no-print"\s*>\s*<Info size=\{12\} /> ข้อมูลยา\s*</button>)'

replacement = r'''<div className="flex gap-2">
                                        \1
                                        {showDrugInfo && (
                                            <button
                                                onClick={printDrugInfo}
                                                className="flex items-center gap-2 text-[10px] font-black text-indigo-500 hover:text-indigo-400 p-1.5 bg-indigo-600/5 rounded-lg border border-indigo-500/20 transition-all no-print"
                                            >
                                                <Printer size={12} /> พิมพ์ข้อมูลยา
                                            </button>
                                        )}
                                    </div>'''

content = re.sub(pattern, replacement, content)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched App.jsx")
