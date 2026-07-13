import io

file_path = r'd:\patien-system\client\src\App.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# I will use a simple replace for the try-catch blocks inside the 3 print functions in App.jsx

# 1. printWorkingFormula
old_wf_try = '''                    try {
                        const res = await axios.post(user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.working_formula_printer,
                            isA4: true
                        });
                        if (res.data.success) {
                            showNotification(`พิมพ์ใบเตรียมยาไปที่ ${user.working_formula_printer} สำเร็จ`, 'success');
                        }
                    } catch (err) {
                        console.error('Local Print Server error', err);
                        showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้', 'error');
                    }'''

new_wf_try = '''                    try {
                        const res = await axios.post(user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.working_formula_printer,
                            isA4: true
                        });
                        if (res.data.success) {
                            showNotification(`พิมพ์ใบเตรียมยาไปที่ ${user.working_formula_printer} สำเร็จ`, 'success');
                            return;
                        }
                    } catch (err) {
                        console.error('Local Print Server error', err);
                        showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
                    }
                    
                    // Fallback
                    const printWindow = window.open('', '_blank', 'width=1000,height=800');
                    if (printWindow) {
                        const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>');
                        printWindow.document.open();
                        printWindow.document.write(fallbackHtml);
                        printWindow.document.close();
                    } else {
                        showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิด Pop-up', 'error');
                    }'''
                    
content = content.replace(old_wf_try, new_wf_try)

# 2. printCalculationA4
old_calc_try = '''                    try {
                        const res = await axios.post(user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.calculation_printer,
                            isA4: true
                        });
                        if (res.data.success) {
                            showNotification(`พิมพ์ผลการคำนวณไปที่ ${user.calculation_printer} สำเร็จ`, 'success');
                        }
                    } catch (err) {
                        console.error('Local Print Server error', err);
                        showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้', 'error');
                    }'''

new_calc_try = '''                    try {
                        const res = await axios.post(user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.calculation_printer,
                            isA4: true
                        });
                        if (res.data.success) {
                            showNotification(`พิมพ์ผลการคำนวณไปที่ ${user.calculation_printer} สำเร็จ`, 'success');
                            return;
                        }
                    } catch (err) {
                        console.error('Local Print Server error', err);
                        showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
                    }
                    
                    // Fallback
                    const printWindow = window.open('', '_blank', 'width=1000,height=800');
                    if (printWindow) {
                        const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>');
                        printWindow.document.open();
                        printWindow.document.write(fallbackHtml);
                        printWindow.document.close();
                    } else {
                        showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิด Pop-up', 'error');
                    }'''
content = content.replace(old_calc_try, new_calc_try)

# 3. printDrugInfo
old_drug_try = '''                    try {
                        const res = await axios.post(user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.drug_info_printer,
                            isA4: true
                        });
                        if (res.data.success) {
                            showNotification(`พิมพ์ข้อมูลยาไปที่ ${user.drug_info_printer} สำเร็จ`, 'success');
                        }
                    } catch (err) {
                        console.error('Local Print Server error', err);
                        showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้', 'error');
                    }'''

new_drug_try = '''                    try {
                        const res = await axios.post(user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.drug_info_printer,
                            isA4: true
                        });
                        if (res.data.success) {
                            showNotification(`พิมพ์ข้อมูลยาไปที่ ${user.drug_info_printer} สำเร็จ`, 'success');
                            return;
                        }
                    } catch (err) {
                        console.error('Local Print Server error', err);
                        showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
                    }
                    
                    // Fallback
                    const printWindow = window.open('', '_blank', 'width=1000,height=800');
                    if (printWindow) {
                        const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>');
                        printWindow.document.open();
                        printWindow.document.write(fallbackHtml);
                        printWindow.document.close();
                    } else {
                        showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิด Pop-up', 'error');
                    }'''
content = content.replace(old_drug_try, new_drug_try)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Fallback logic restored in App.jsx")
