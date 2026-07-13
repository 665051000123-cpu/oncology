import io
import re

file_path = r'd:\patien-system\client\src\components\DrugsInfo.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add setPreviewData to props
content = content.replace("const DrugsInfo = ({ currentUser, onBack, showNotification, theme }) => {", "const DrugsInfo = ({ currentUser, onBack, showNotification, theme, setPreviewData }) => {")

# Update printAllDrugs
target = """        if (currentUser?.all_drugs_printer) {
            if (showNotification) showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(`${API_BASE}/print`, {
                    html: htmlContent,
                    printerName: currentUser.all_drugs_printer,
                    isA4: true
                });
                if (res.data.success) {
                    if (showNotification) showNotification(`พิมพ์รายการยาไปที่ ${currentUser.all_drugs_printer} สำเร็จ`, 'success');
                    return;
                }
            } catch (err) {
                console.error('Local Print Server error', err);
                if (showNotification) showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
            }
        }

        const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script></body>');
        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            if (showNotification) showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(fallbackHtml);
        printWindow.document.close();"""

replacement = """        if (setPreviewData) {
            setPreviewData({
                isOpen: true,
                htmlContent: htmlContent,
                title: 'ตัวอย่างก่อนพิมพ์: ข้อมูลยาทั้งหมด (All Drugs List)',
                printerName: currentUser?.all_drugs_printer,
                onConfirm: async () => {
                    setPreviewData(prev => ({ ...prev, isOpen: false }));
                    if (currentUser?.all_drugs_printer) {
                        if (showNotification) showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
                        try {
                            const res = await axios.post(`${API_BASE}/print`, {
                                html: htmlContent,
                                printerName: currentUser.all_drugs_printer,
                                isA4: true
                            });
                            if (res.data.success) {
                                if (showNotification) showNotification(`พิมพ์รายการยาไปที่ ${currentUser.all_drugs_printer} สำเร็จ`, 'success');
                                return;
                            }
                        } catch (err) {
                            console.error('Local Print Server error', err);
                            if (showNotification) showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
                        }
                    }

                    const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>');
                    const printWindow = window.open('', '_blank', 'width=1000,height=800');
                    if (!printWindow) {
                        if (showNotification) showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
                        return;
                    }
                    printWindow.document.open();
                    printWindow.document.write(fallbackHtml);
                    printWindow.document.close();
                }
            });
        } else {
            // Fallback if no preview
            if (currentUser?.all_drugs_printer) {
                if (showNotification) showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
                try {
                    const res = await axios.post(`${API_BASE}/print`, {
                        html: htmlContent,
                        printerName: currentUser.all_drugs_printer,
                        isA4: true
                    });
                    if (res.data.success) {
                        if (showNotification) showNotification(`พิมพ์รายการยาไปที่ ${currentUser.all_drugs_printer} สำเร็จ`, 'success');
                        return;
                    }
                } catch (err) {
                    console.error('Local Print Server error', err);
                }
            }
            const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>');
            const printWindow = window.open('', '_blank', 'width=1000,height=800');
            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(fallbackHtml);
                printWindow.document.close();
            }
        }"""
content = content.replace(target, replacement)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated DrugsInfo.jsx with Print Preview state")
