import io
import re

# 1. Update App.jsx
file_path_app = r'd:\patien-system\client\src\App.jsx'
with io.open(file_path_app, 'r', encoding='utf-8') as f:
    content_app = f.read()

# Fix printWorkingFormula
target_wf = """        if (user?.a4_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                    html: htmlContent,
                    printerName: user.a4_printer,
                    paperSize: 'A4'
                });
                
                if (res.data.success) {
                    showNotification(`พิมพ์ใบเตรียมยาไปที่ ${user.a4_printer} สำเร็จ`, 'success');
                    return; // Stop here, no browser dialog
                }
            } catch (err) {
                console.error('Local Print Server error', err);
                showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
            }
        }"""
replacement_wf = """        if (user?.working_formula_printer) {
            setPreviewData({
                html: htmlContent,
                printerName: user.working_formula_printer,
                paperSize: 'A4',
                apiEndpoint: user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`
            });
            setShowPreview(true);
            return;
        }"""
content_app = content_app.replace(target_wf, replacement_wf)

# Fix printCalculationA4
target_calc = """        if (user?.a4_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                    html: htmlContent,
                    printerName: user.a4_printer,
                    paperSize: 'A4'
                });
                
                if (res.data.success) {
                    showNotification(`พิมพ์ผลการคำนวณไปที่ ${user.a4_printer} สำเร็จ`, 'success');
                    return; // Stop here, no browser dialog
                }
            } catch (err) {
                console.error('Local Print Server error', err);
                showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
            }
        }"""
replacement_calc = """        if (user?.calculation_printer) {
            setPreviewData({
                html: htmlContent,
                printerName: user.calculation_printer,
                paperSize: 'A4',
                apiEndpoint: user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`
            });
            setShowPreview(true);
            return;
        }"""
content_app = content_app.replace(target_calc, replacement_calc)

# Fix PrintPreviewModal component call in App.jsx (ensure apiEndpoint is passed or handle it inside)
# Actually PrintPreviewModal needs to know where to post.
# I'll check how PrintPreviewModal was defined.
# If I didn't add apiEndpoint to PrintPreviewModal, I need to update it too.

with io.open(file_path_app, 'w', encoding='utf-8') as f:
    f.write(content_app)


# 2. Update DrugsInfo.jsx
file_path_drugs = r'd:\patien-system\client\src\components\DrugsInfo.jsx'
with io.open(file_path_drugs, 'r', encoding='utf-8') as f:
    content_drugs = f.read()

target_druginfo = """        if (currentUser?.drug_info_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(currentUser?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                    html: htmlContent,
                    printerName: currentUser.drug_info_printer,
                    isA4: true
                });
                if (res.data.success) {
                    showNotification(`พิมพ์ข้อมูลยาไปที่ ${currentUser.drug_info_printer} สำเร็จ`, 'success');
                    return;
                }
            } catch (err) {
                console.error('Local Print Server error', err);
                showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
            }
        }"""
replacement_druginfo = """        if (currentUser?.drug_info_printer) {
            setPreviewData({
                html: htmlContent,
                printerName: currentUser.drug_info_printer,
                paperSize: 'A4',
                apiEndpoint: currentUser?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`
            });
            setShowPreview(true);
            return;
        }"""
content_drugs = content_drugs.replace(target_druginfo, replacement_druginfo)

target_alldrugs = """        if (currentUser?.all_drugs_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(currentUser?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                    html: htmlContent,
                    printerName: currentUser.all_drugs_printer,
                    isA4: true
                });
                if (res.data.success) {
                    showNotification(`พิมพ์รายการยาทั้งหมดไปที่ ${currentUser.all_drugs_printer} สำเร็จ`, 'success');
                    return;
                }
            } catch (err) {
                console.error('Local Print Server error', err);
                showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
            }
        }"""
replacement_alldrugs = """        if (currentUser?.all_drugs_printer) {
            setPreviewData({
                html: htmlContent,
                printerName: currentUser.all_drugs_printer,
                paperSize: 'A4',
                apiEndpoint: currentUser?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`
            });
            setShowPreview(true);
            return;
        }"""
content_drugs = content_drugs.replace(target_alldrugs, replacement_alldrugs)

with io.open(file_path_drugs, 'w', encoding='utf-8') as f:
    f.write(content_drugs)

print("Patch applied to App.jsx and DrugsInfo.jsx")
