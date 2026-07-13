import io
import re

file_path = r'd:\patien-system\client\src\components\PrinterSettings.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state for useLocalAgent
state_target = "    const [allDrugsPrinter, setAllDrugsPrinter] = useState('');"
state_replacement = """    const [allDrugsPrinter, setAllDrugsPrinter] = useState('');
    const [useLocalAgent, setUseLocalAgent] = useState(false);"""
content = content.replace(state_target, state_replacement)

# 2. Load state in useEffect
effect_target = """            const savedDrugInfo = localStorage.getItem('drug_info_printer');
            const savedAllDrugs = localStorage.getItem('all_drugs_printer');"""
effect_replacement = """            const savedDrugInfo = localStorage.getItem('drug_info_printer');
            const savedAllDrugs = localStorage.getItem('all_drugs_printer');
            const savedUseLocalAgent = localStorage.getItem('use_local_agent') === 'true';"""
content = content.replace(effect_target, effect_replacement)

effect_target2 = """            if (savedDrugInfo) setDrugInfoPrinter(savedDrugInfo);
            if (savedAllDrugs) setAllDrugsPrinter(savedAllDrugs);
        }
    }, [show]);"""
effect_replacement2 = """            if (savedDrugInfo) setDrugInfoPrinter(savedDrugInfo);
            if (savedAllDrugs) setAllDrugsPrinter(savedAllDrugs);
            setUseLocalAgent(savedUseLocalAgent);
        }
    }, [show]);"""
content = content.replace(effect_target2, effect_replacement2)

# 3. Modify fetchPrinters to use useLocalAgent
# Notice we need to use a ref or pass the current state, but since we toggle it, we should re-fetch!
# Wait, fetchPrinters is called on show. If user toggles the switch, we should re-fetch.
fetch_target = """    const fetchPrinters = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get('/api/printers');
            setPrinters(res.data);"""
fetch_replacement = """    const fetchPrinters = async (isLocal = useLocalAgent) => {
        setLoading(true);
        setError(null);
        try {
            const apiUrl = isLocal ? 'http://localhost:5005/api/printers' : '/api/printers';
            const res = await axios.get(apiUrl);
            setPrinters(res.data);"""
content = content.replace(fetch_target, fetch_replacement)

# Update the useEffect call to fetchPrinters
content = content.replace("fetchPrinters();", "fetchPrinters(localStorage.getItem('use_local_agent') === 'true');")

# 4. Save useLocalAgent in handleSave
save_target = """        localStorage.setItem('drug_info_printer', drugInfoPrinter);
        localStorage.setItem('all_drugs_printer', allDrugsPrinter);"""
save_replacement = """        localStorage.setItem('drug_info_printer', drugInfoPrinter);
        localStorage.setItem('all_drugs_printer', allDrugsPrinter);
        localStorage.setItem('use_local_agent', useLocalAgent);"""
content = content.replace(save_target, save_replacement)

save_target2 = """            drug_info_printer: drugInfoPrinter,
            all_drugs_printer: allDrugsPrinter
        };"""
save_replacement2 = """            drug_info_printer: drugInfoPrinter,
            all_drugs_printer: allDrugsPrinter,
            use_local_agent: useLocalAgent
        };"""
content = content.replace(save_target2, save_replacement2)


# 5. Add UI toggle
ui_target = """                    {error && (
                        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-3">
                            <AlertCircle size={20} />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}"""
ui_replacement = """                    {/* Local Agent Toggle */}
                    <div className="mb-6 bg-sky-50 border border-sky-200 p-4 rounded-xl flex items-start gap-3">
                        <div className="pt-1">
                            <input 
                                type="checkbox" 
                                id="useLocalAgent"
                                checked={useLocalAgent}
                                onChange={(e) => {
                                    setUseLocalAgent(e.target.checked);
                                    fetchPrinters(e.target.checked);
                                }}
                                className="w-5 h-5 text-sky-600 rounded border-sky-300 focus:ring-sky-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="useLocalAgent" className="font-bold text-sky-900 block cursor-pointer">
                                ใช้งาน Local Print Agent (ปริ้นท์ออกคอมพิวเตอร์เครื่องนี้)
                            </label>
                            <p className="text-xs text-sky-700 mt-1">
                                ดึงรายชื่อเครื่องปริ้นท์จากคอมพิวเตอร์เครื่องที่คุณกำลังใช้งานอยู่ (จำเป็นต้องรันโปรแกรม Local Print Agent ไว้ที่เครื่องนี้)
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-3">
                            <AlertCircle size={20} />
                            <span className="text-sm font-medium">{error}</span>
                        </div>
                    )}"""
content = content.replace(ui_target, ui_replacement)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated PrinterSettings.jsx successfully")
