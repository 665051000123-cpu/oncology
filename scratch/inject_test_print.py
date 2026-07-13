import sys

with open('client/src/components/PrinterSettings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

test_func = '''
    const handleTestPrint = async (printerName, paperSize) => {
        if (!printerName) {
            setError('กรุณาเลือกเครื่องปริ้นก่อนทดสอบ');
            return;
        }
        setLoading(true);
        setError(null);
        setStatus('กำลังส่งข้อมูลทดสอบ...');
        try {
            const res = await axios.post(useLocalAgent ? 'http://localhost:5005/api/print' : '/api/print', {
                html: '<html><body><h1 style="text-align:center; padding: 20px; font-family: sans-serif;">TEST PRINT / พิมพ์ทดสอบ</h1><p style="text-align:center;">This is a test print from Oncology System.</p></body></html>',
                printerName: printerName,
                paperSize: paperSize
            });
            if (res.data.success) {
                setStatus('ส่งข้อมูลทดสอบสำเร็จแล้ว! กรุณาเช็คที่เครื่องปริ้น');
                showNotification('ส่งทดสอบสำเร็จ', 'success');
            }
        } catch (err) {
            setError('การส่งทดสอบล้มเหลว: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = () => {'''

content = content.replace('const handleSave = () => {', test_func)

target_sticker = '''<select 
                                    value={stickerPrinter}
                                    onChange={(e) => setStickerPrinter(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block p-3 font-medium transition-all"
                                >'''
repl_sticker = target_sticker + '''
                                <option value="">-- ทดสอบพิมพ์ (Test Print) --</option>'''

# I'll just add the button after the <select> using replace
def add_button_after_select(printer_state, paper_size):
    global content
    idx = content.find(f'value={{{printer_state}}}')
    if idx == -1: return
    end_select = content.find('</select>', idx)
    if end_select == -1: return
    
    btn = f'''
                                <button onClick={{() => handleTestPrint({printer_state}, '{paper_size}')}} className="mt-3 w-full py-2 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 text-sm font-bold transition-colors">
                                    ทดสอบพิมพ์ (Test Print)
                                </button>'''
    content = content[:end_select + 9] + btn + content[end_select + 9:]

add_button_after_select('stickerPrinter', 'Sticker')
add_button_after_select('workingFormulaPrinter', 'A4')
add_button_after_select('calculationPrinter', 'A5')
add_button_after_select('drugInfoPrinter', 'A4')
add_button_after_select('allDrugsPrinter', 'A4')


with open('client/src/components/PrinterSettings.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print('Done injecting test prints.')
