import io
import re

file_path = r'd:\patien-system\client\src\App.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add import
if 'PrintPreviewModal' not in content:
    content = content.replace("import PrinterSettings from './components/PrinterSettings';", "import PrinterSettings from './components/PrinterSettings';\nimport PrintPreviewModal from './components/PrintPreviewModal';")

# 2. Add state
state_target = "    const [showPrinterSettings, setShowPrinterSettings] = useState(false);"
state_replacement = """    const [showPrinterSettings, setShowPrinterSettings] = useState(false);
    const [previewData, setPreviewData] = useState({
        isOpen: false,
        htmlContent: '',
        title: '',
        printerName: '',
        onConfirm: null
    });"""
if 'previewData' not in content:
    content = content.replace(state_target, state_replacement)

# 3. Modify printWorkingFormula
pwf_target = """        if (user?.working_formula_printer) {
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
            } catch (err) {
                console.error('Local Print Server error', err);
                showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
            }
        }

        const fallbackHtml = generateWorkingFormulaHTML().replace('</body>', `
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        `);
        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(fallbackHtml);
        printWindow.document.close();"""

pwf_replacement = """        const htmlContent = generateWorkingFormulaHTML();
        setPreviewData({
            isOpen: true,
            htmlContent: htmlContent,
            title: 'ตัวอย่างก่อนพิมพ์: ใบเตรียมยา (Working Formula)',
            printerName: user?.working_formula_printer,
            onConfirm: async () => {
                setPreviewData(prev => ({ ...prev, isOpen: false }));
                if (user?.working_formula_printer) {
                    showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
                    try {
                        const res = await axios.post(`${API_BASE}/print`, {
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
                }

                const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>');
                const printWindow = window.open('', '_blank', 'width=1000,height=800');
                if (!printWindow) {
                    showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
                    return;
                }
                printWindow.document.open();
                printWindow.document.write(fallbackHtml);
                printWindow.document.close();
            }
        });"""
content = content.replace(pwf_target, pwf_replacement)

# 4. Modify printCalculationA4
pca_target = """        if (user?.calculation_printer) {
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
            } catch (err) {
                console.error('Local Print Server error', err);
                showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
            }
        }

        const fallbackHtml = generateCalculationHTML().replace('</body>', `
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        `);
        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(fallbackHtml);
        printWindow.document.close();"""

pca_replacement = """        const htmlContent = generateCalculationHTML();
        setPreviewData({
            isOpen: true,
            htmlContent: htmlContent,
            title: 'ตัวอย่างก่อนพิมพ์: ผลการคำนวณ (Calculation A5)',
            printerName: user?.calculation_printer,
            onConfirm: async () => {
                setPreviewData(prev => ({ ...prev, isOpen: false }));
                if (user?.calculation_printer) {
                    showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์เอกสาร...', 'info');
                    try {
                        const res = await axios.post(`${API_BASE}/print`, {
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
                }

                const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>');
                const printWindow = window.open('', '_blank', 'width=1000,height=800');
                if (!printWindow) {
                    showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
                    return;
                }
                printWindow.document.open();
                printWindow.document.write(fallbackHtml);
                printWindow.document.close();
            }
        });"""
content = content.replace(pca_target, pca_replacement)

# 5. Modify printDrugInfo
pdi_target = """        if (user?.drug_info_printer) {
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
            } catch (err) {
                console.error('Local Print Server error', err);
                showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
            }
        }

        const fallbackHtml = htmlContent.replace('</body>', `
            <script>
                window.onload = () => {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 500);
                };
            </script>
        </body>
        `);
        const printWindow = window.open('', '_blank', 'width=1000,height=800');
        if (!printWindow) {
            showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
            return;
        }
        printWindow.document.open();
        printWindow.document.write(fallbackHtml);
        printWindow.document.close();"""

pdi_replacement = """        setPreviewData({
            isOpen: true,
            htmlContent: htmlContent,
            title: 'ตัวอย่างก่อนพิมพ์: ข้อมูลยา (Drug Info)',
            printerName: user?.drug_info_printer,
            onConfirm: async () => {
                setPreviewData(prev => ({ ...prev, isOpen: false }));
                if (user?.drug_info_printer) {
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
                    } catch (err) {
                        console.error('Local Print Server error', err);
                        showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
                    }
                }

                const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>');
                const printWindow = window.open('', '_blank', 'width=1000,height=800');
                if (!printWindow) {
                    showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์', 'warning');
                    return;
                }
                printWindow.document.open();
                printWindow.document.write(fallbackHtml);
                printWindow.document.close();
            }
        });"""
content = content.replace(pdi_target, pdi_replacement)

# 6. Modify printStickersAsync
psa_target = """            if (user?.default_printer) {
                showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์สติ๊กเกอร์...', 'info');
                try {
                    const res = await axios.post(`${API_BASE}/print`, {
                        html: htmlContent,
                        printerName: user.default_printer,
                        paperSize: 'Sticker'
                    });
                    
                    if (res.data.success) {
                        showNotification(`พิมพ์สติ๊กเกอร์ไปที่ ${user.default_printer} สำเร็จ`, 'success');
                        return; // Stop here, no browser dialog
                    }
                } catch (err) {
                    console.error('Local Print Server error', err);
                    showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
                }
            }

            const printWindow = window.open('', '_blank', 'width=800,height=600');
            if (!printWindow) {
                showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์สติ๊กเกอร์', 'warning');
                return;
            }

            const fallbackHtml = htmlContent.replace('</body>', `
                <script>
                    window.onload = () => {
                        setTimeout(() => {
                            window.print();
                            window.close();
                        }, 500);
                    };
                </script>
            </body>
            `);
            printWindow.document.open();
            printWindow.document.write(fallbackHtml);
            printWindow.document.close();"""

psa_replacement = """        setPreviewData({
            isOpen: true,
            htmlContent: htmlContent,
            title: 'ตัวอย่างก่อนพิมพ์: สติ๊กเกอร์ (Stickers)',
            printerName: user?.default_printer,
            onConfirm: async () => {
                setPreviewData(prev => ({ ...prev, isOpen: false }));
                if (user?.default_printer) {
                    showNotification('กำลังส่งข้อมูลไปยังเครื่องพิมพ์สติ๊กเกอร์...', 'info');
                    try {
                        const res = await axios.post(`${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.default_printer,
                            paperSize: 'Sticker'
                        });
                        
                        if (res.data.success) {
                            showNotification(`พิมพ์สติ๊กเกอร์ไปที่ ${user.default_printer} สำเร็จ`, 'success');
                            return; 
                        }
                    } catch (err) {
                        console.error('Local Print Server error', err);
                        showNotification('ไม่สามารถพิมพ์ผ่านระบบอัตโนมัติได้ กำลังเปลี่ยนไปพิมพ์ผ่านเบราว์เซอร์...', 'warning');
                    }
                }

                const printWindow = window.open('', '_blank', 'width=800,height=600');
                if (!printWindow) {
                    showNotification('โปรดอนุญาตให้เบราว์เซอร์เปิดหน้าต่าง Pop-up เพื่อพิมพ์สติ๊กเกอร์', 'warning');
                    return;
                }
                const fallbackHtml = htmlContent.replace('</body>', '<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script></body>');
                printWindow.document.open();
                printWindow.document.write(fallbackHtml);
                printWindow.document.close();
            }
        });"""
content = content.replace(psa_target, psa_replacement)

# 7. Render PrintPreviewModal
render_target = """            <PrinterSettings
                user={user}
                setUser={setUser}
                show={showPrinterSettings}
                onClose={() => setShowPrinterSettings(false)}
                showNotification={showNotification}
            />"""
render_replacement = """            <PrinterSettings
                user={user}
                setUser={setUser}
                show={showPrinterSettings}
                onClose={() => setShowPrinterSettings(false)}
                showNotification={showNotification}
            />

            <PrintPreviewModal
                isOpen={previewData.isOpen}
                htmlContent={previewData.htmlContent}
                title={previewData.title}
                printerName={previewData.printerName}
                onConfirm={previewData.onConfirm}
                onCancel={() => setPreviewData(prev => ({ ...prev, isOpen: false }))}
            />"""
if '<PrintPreviewModal' not in content:
    content = content.replace(render_target, render_replacement)

# Pass setPreviewData to DrugsInfo
drugs_target = """                    <DrugsInfo
                        currentUser={user}
                        onBack={handleBackFromHistory}
                        showNotification={showNotification}
                        theme={theme}
                    />"""
drugs_replacement = """                    <DrugsInfo
                        currentUser={user}
                        onBack={handleBackFromHistory}
                        showNotification={showNotification}
                        theme={theme}
                        setPreviewData={setPreviewData}
                    />"""
content = content.replace(drugs_target, drugs_replacement)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated App.jsx with Print Preview state and modal")
