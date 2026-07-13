import io
import re

file_path = r'd:\patien-system\client\src\components\PrinterSettings.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new state variables
state_target = """    // Selected printers
    const [stickerPrinter, setStickerPrinter] = useState('');
    const [a4Printer, setA4Printer] = useState('');"""
state_replacement = """    // Selected printers
    const [stickerPrinter, setStickerPrinter] = useState('');
    const [workingFormulaPrinter, setWorkingFormulaPrinter] = useState('');
    const [calculationPrinter, setCalculationPrinter] = useState('');
    const [drugInfoPrinter, setDrugInfoPrinter] = useState('');
    const [allDrugsPrinter, setAllDrugsPrinter] = useState('');"""
content = content.replace(state_target, state_replacement)

# 2. Update useEffect
effect_target = """            // Load saved settings
            const savedSticker = localStorage.getItem('sticker_printer');
            const savedA4 = localStorage.getItem('a4_printer');
            if (savedSticker) setStickerPrinter(savedSticker);
            if (savedA4) setA4Printer(savedA4);"""
effect_replacement = """            // Load saved settings
            const savedSticker = localStorage.getItem('sticker_printer');
            const savedWorkingFormula = localStorage.getItem('working_formula_printer');
            const savedCalculation = localStorage.getItem('calculation_printer');
            const savedDrugInfo = localStorage.getItem('drug_info_printer');
            const savedAllDrugs = localStorage.getItem('all_drugs_printer');
            
            if (savedSticker) setStickerPrinter(savedSticker);
            if (savedWorkingFormula) setWorkingFormulaPrinter(savedWorkingFormula);
            if (savedCalculation) setCalculationPrinter(savedCalculation);
            if (savedDrugInfo) setDrugInfoPrinter(savedDrugInfo);
            if (savedAllDrugs) setAllDrugsPrinter(savedAllDrugs);"""
content = content.replace(effect_target, effect_replacement)

# 3. Update handleSave
save_target = """        localStorage.setItem('sticker_printer', stickerPrinter);
        localStorage.setItem('a4_printer', a4Printer);
        
        // Also save to user context for backward compatibility in App.jsx if needed
        const updatedUser = { ...user, default_printer: stickerPrinter, a4_printer: a4Printer };"""
save_replacement = """        localStorage.setItem('sticker_printer', stickerPrinter);
        localStorage.setItem('working_formula_printer', workingFormulaPrinter);
        localStorage.setItem('calculation_printer', calculationPrinter);
        localStorage.setItem('drug_info_printer', drugInfoPrinter);
        localStorage.setItem('all_drugs_printer', allDrugsPrinter);
        
        // Also save to user context for backward compatibility in App.jsx if needed
        const updatedUser = { 
            ...user, 
            default_printer: stickerPrinter,
            working_formula_printer: workingFormulaPrinter,
            calculation_printer: calculationPrinter,
            drug_info_printer: drugInfoPrinter,
            all_drugs_printer: allDrugsPrinter
        };"""
content = content.replace(save_target, save_replacement)

# 4. Update UI to render 5 sections
ui_target = """                        {/* A4 Printer Setting */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">เครื่องพิมพ์เอกสาร (A4/A5)</h3>
                                    <p className="text-sm text-slate-500">สำหรับพิมพ์ใบเตรียมยาและใบสรุปผล</p>
                                </div>
                            </div>
                            
                            {loading ? (
                                <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
                            ) : (
                                <select 
                                    value={a4Printer}
                                    onChange={(e) => setA4Printer(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block p-3 font-medium transition-all"
                                >
                                    <option value="">-- ปิดระบบพิมพ์อัตโนมัติ (Manual Print) --</option>
                                    {printers.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </select>
                            )}
                        </div>"""

ui_replacement = """                        {/* Working Formula Printer */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="mb-4">
                                <h3 className="font-bold text-slate-800 text-lg">พิมพ์ใบเตรียมยา (Working Formula - A4)</h3>
                                <p className="text-sm text-slate-500">เครื่องสำหรับพิมพ์ใบเตรียมยาขนาด A4</p>
                            </div>
                            {loading ? ( <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div> ) : (
                                <select value={workingFormulaPrinter} onChange={(e) => setWorkingFormulaPrinter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block p-3 font-medium transition-all">
                                    <option value="">-- ปิดระบบพิมพ์อัตโนมัติ (Manual Print) --</option>
                                    {printers.map(p => ( <option key={p} value={p}>{p}</option> ))}
                                </select>
                            )}
                        </div>

                        {/* Calculation Result Printer */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="mb-4">
                                <h3 className="font-bold text-slate-800 text-lg">พิมพ์ผลการคำนวณ (Calculation - A5)</h3>
                                <p className="text-sm text-slate-500">เครื่องสำหรับพิมพ์ใบสรุปผลการคำนวณขนาด A5</p>
                            </div>
                            {loading ? ( <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div> ) : (
                                <select value={calculationPrinter} onChange={(e) => setCalculationPrinter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block p-3 font-medium transition-all">
                                    <option value="">-- ปิดระบบพิมพ์อัตโนมัติ (Manual Print) --</option>
                                    {printers.map(p => ( <option key={p} value={p}>{p}</option> ))}
                                </select>
                            )}
                        </div>

                        {/* Drug Info Printer */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="mb-4">
                                <h3 className="font-bold text-slate-800 text-lg">พิมพ์ข้อมูลยา (Selected Drug Info)</h3>
                                <p className="text-sm text-slate-500">เครื่องสำหรับพิมพ์รายละเอียดข้อมูลยาที่เลือก</p>
                            </div>
                            {loading ? ( <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div> ) : (
                                <select value={drugInfoPrinter} onChange={(e) => setDrugInfoPrinter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block p-3 font-medium transition-all">
                                    <option value="">-- ปิดระบบพิมพ์อัตโนมัติ (Manual Print) --</option>
                                    {printers.map(p => ( <option key={p} value={p}>{p}</option> ))}
                                </select>
                            )}
                        </div>

                        {/* All Drugs Printer */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="mb-4">
                                <h3 className="font-bold text-slate-800 text-lg">พิมพ์ข้อมูลยาทั้งหมด (All Drugs List)</h3>
                                <p className="text-sm text-slate-500">เครื่องสำหรับพิมพ์ตารางรายการยาทั้งหมดในระบบ</p>
                            </div>
                            {loading ? ( <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div> ) : (
                                <select value={allDrugsPrinter} onChange={(e) => setAllDrugsPrinter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block p-3 font-medium transition-all">
                                    <option value="">-- ปิดระบบพิมพ์อัตโนมัติ (Manual Print) --</option>
                                    {printers.map(p => ( <option key={p} value={p}>{p}</option> ))}
                                </select>
                            )}
                        </div>"""
content = content.replace(ui_target, ui_replacement)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated PrinterSettings.jsx successfully")
