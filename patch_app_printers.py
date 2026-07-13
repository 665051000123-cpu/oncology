import io
import re

file_path = r'd:\patien-system\client\src\App.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update printWorkingFormula to use working_formula_printer
target1 = """    const printWorkingFormula = async () => {
        if (!calculationResult || !selectedPatient) return;
        
        if (user?.a4_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(`${API_BASE}/print`, {
                    html: generateWorkingFormulaHTML(),
                    printerName: user.a4_printer,
                    isA4: true
                });
                if (res.data.success) {
                    showNotification(`พิมพ์ใบเตรียมยาไปที่ ${user.a4_printer} สำเร็จ`, 'success');
                    return;
                }
            } catch (err) {"""
replacement1 = """    const printWorkingFormula = async () => {
        if (!calculationResult || !selectedPatient) return;
        
        if (user?.working_formula_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(`${API_BASE}/print`, {
                    html: generateWorkingFormulaHTML(),
                    printerName: user.working_formula_printer,
                    isA4: true
                });
                if (res.data.success) {
                    showNotification(`พิมพ์ใบเตรียมยาไปที่ ${user.working_formula_printer} สำเร็จ`, 'success');
                    return;
                }
            } catch (err) {"""
content = content.replace(target1, replacement1)

# 2. Update printCalculationA4 to use calculation_printer
target2 = """    const printCalculationA4 = async () => {
        if (!calculationResult || !selectedPatient) return;
        
        if (user?.a4_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(`${API_BASE}/print`, {
                    html: generateCalculationHTML(),
                    printerName: user.a4_printer,
                    isA4: true
                });
                if (res.data.success) {
                    showNotification(`พิมพ์ผลการคำนวณไปที่ ${user.a4_printer} สำเร็จ`, 'success');
                    return;
                }
            } catch (err) {"""
replacement2 = """    const printCalculationA4 = async () => {
        if (!calculationResult || !selectedPatient) return;
        
        if (user?.calculation_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(`${API_BASE}/print`, {
                    html: generateCalculationHTML(),
                    printerName: user.calculation_printer,
                    isA4: true
                });
                if (res.data.success) {
                    showNotification(`พิมพ์ผลการคำนวณไปที่ ${user.calculation_printer} สำเร็จ`, 'success');
                    return;
                }
            } catch (err) {"""
content = content.replace(target2, replacement2)

# 3. Update printDrugInfo to use drug_info_printer
target3 = """        if (user?.a4_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(`${API_BASE}/print`, {
                    html: htmlContent,
                    printerName: user.a4_printer,
                    isA4: true
                });
                if (res.data.success) {
                    showNotification(`พิมพ์ข้อมูลยาไปที่ ${user.a4_printer} สำเร็จ`, 'success');
                    return;
                }
            } catch (err) {"""
replacement3 = """        if (user?.drug_info_printer) {
            showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
            try {
                const res = await axios.post(`${API_BASE}/print`, {
                    html: htmlContent,
                    printerName: user.drug_info_printer,
                    isA4: true
                });
                if (res.data.success) {
                    showNotification(`พิมพ์ข้อมูลยาไปที่ ${user.drug_info_printer} สำเร็จ`, 'success');
                    return;
                }
            } catch (err) {"""
content = content.replace(target3, replacement3)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated App.jsx successfully")
