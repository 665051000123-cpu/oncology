import io

file_path = r'd:\patien-system\client\src\components\DrugsInfo.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

print_function = """    const printAllDrugs = async () => {
        if (!filteredDrugs || filteredDrugs.length === 0) {
            if (showNotification) showNotification('ไม่มีข้อมูลยาสำหรับพิมพ์', 'warning');
            return;
        }

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>พิมพ์ข้อมูลยาทั้งหมด</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700;900&display=swap" rel="stylesheet">
            <style>
                @page { size: A4 landscape; margin: 1.5cm; }
                body { font-family: 'Sarabun', sans-serif; font-size: 12px; color: #000; line-height: 1.5; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
                th { background-color: #f8fafc; font-weight: bold; font-size: 11px; text-transform: uppercase; }
                .text-center { text-align: center; }
                .badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
                .status-active { background: #dcfce7; color: #166534; }
                .status-inactive { background: #fee2e2; color: #991b1b; }
            </style>
        </head>
        <body>
            <h2 style="text-align: center; margin-bottom: 20px;">ข้อมูลยาทั้งหมดในระบบ (Drug Information)</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>CODE</th>
                        <th>ชื่อยา</th>
                        <th class="text-center">กลุ่มยา</th>
                        <th>ประเภทการคำนวณ</th>
                        <th>ขนาดยามาตรฐาน</th>
                        <th>หน่วย</th>
                        <th class="text-center">Dose Cap</th>
                        <th class="text-center">CrCl CAP</th>
                        <th class="text-center">น้ำหนักที่ใช้</th>
                        <th class="text-center">สถานะ</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredDrugs.map((drug, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td><b>${drug.drug_code || '-'}</b></td>
                            <td><b>${drug.drug_name}</b></td>
                            <td class="text-center">${drug.drug_category || '-'}</td>
                            <td>${drug.calculation_type || '-'}</td>
                            <td><b>${drug.standard_dose_value !== null ? parseFloat(drug.standard_dose_value).toFixed(2) : '-'}</b></td>
                            <td>${drug.standard_dose_unit || '-'}</td>
                            <td class="text-center">${drug.max_dose_cap !== null ? parseFloat(drug.max_dose_cap).toFixed(2) + ' mg' : 'ไม่มี'}</td>
                            <td class="text-center">${drug.max_gfr_cap !== null ? drug.max_gfr_cap + ' ml/min' : 'ไม่มี'}</td>
                            <td class="text-center">${drug.default_weight_type || '-'}</td>
                            <td class="text-center">
                                <span class="badge ${drug.is_active === 1 || drug.is_active === true || drug.is_active === '1' ? 'status-active' : 'status-inactive'}">
                                    ${drug.is_active === 1 || drug.is_active === true || drug.is_active === '1' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </body>
        </html>
        `;

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

        const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script></body>');
        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            if (showNotification) showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(fallbackHtml);
        printWindow.document.close();
    };
"""

content = content.replace('    return (', print_function + '\n    return (', 1)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Added printAllDrugs with all_drugs_printer')
