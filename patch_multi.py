import os

file_path = os.path.join(os.path.dirname(__file__), 'client', 'src', 'App.jsx')

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

s1 = """    const [formula, setFormula] = useState('mosteller');
    const [drug, setDrug] = useState('vincristine');
    const [drugParams, setDrugParams] = useState({ auc: 5, gfr: '' });"""
r1 = """    const [formula, setFormula] = useState('mosteller');
    const [selectedDrugs, setSelectedDrugs] = useState(['vincristine']);
    const [singleDrugResults, setSingleDrugResults] = useState([]);
    const [drugParams, setDrugParams] = useState({ auc: 5, gfr: '' });"""

s2 = """        if (calcMode === 'single') {
            const params = {};
            if (drug === 'carboplatin' && drugParams.auc) {
                const gfr = useAutoGfr && autoGfrValue ? autoGfrValue : parseFloat(drugParams.gfr) || 125;
                params.auc = parseFloat(drugParams.auc);
                params.gfr = gfr;
            }
            const { dose, note } = calculateDose(currentBsa, drug, params);
            setFinalDose(dose);
            setCalculationDetails({ note });
        } else {"""
r2 = """        if (calcMode === 'single') {
            const results = [];
            selectedDrugs.forEach(d => {
                const params = {};
                if (d === 'carboplatin' && drugParams.auc) {
                    const gfr = useAutoGfr && autoGfrValue ? autoGfrValue : parseFloat(drugParams.gfr) || 125;
                    params.auc = parseFloat(drugParams.auc);
                    params.gfr = gfr;
                }
                const { dose, note } = calculateDose(currentBsa, d, params);
                results.push({
                    id: d,
                    name: drugsInfo.find(info => info.id === d)?.name || d,
                    dose,
                    note,
                    color: drugsInfo.find(info => info.id === d)?.color || 'sky'
                });
            });
            setSingleDrugResults(results);
            setFinalDose(results.map(r => r.dose).join(' + '));
            setCalculationDetails({ note: results.map(r => r.note).join(' | ') });
        } else {"""

s3 = """    }, [patient, formula, drug, drugParams, amputation, ampDetails, calcMode, selectedRegimen, useAutoGfr, patientScr, calculateBSA, calculateDose, setBsa, setFinalDose, setCalculationDetails]);"""
r3 = """    }, [patient, formula, selectedDrugs, drugParams, amputation, ampDetails, calcMode, selectedRegimen, useAutoGfr, patientScr, calculateBSA, calculateDose, setBsa, setFinalDose, setCalculationDetails]);"""

s4 = """        if (calcMode === 'single') {
            activeDrugs.push(drug);
        } else {"""
r4 = """        if (calcMode === 'single') {
            activeDrugs.push(...selectedDrugs);
        } else {"""

s5 = """        if (calcMode === 'single') {
            if (drug === 'bleomycin') {
                doseText = `${finalDose} units`;
            } else {
                doseText = `${finalDose} mg`;
            }
        } else {"""
r5 = """        if (calcMode === 'single') {
            doseText = singleDrugResults.map(r => `${r.dose} ${r.id === 'bleomycin' ? 'units' : 'mg'}`).join(' + ');
        } else {"""

s6_0 = """    const currentDrugInfo = drugsInfo.find(d => d.id === drug) || drugsInfo[0];"""
r6_0 = """    // Multi-drug info mapped dynamically"""

s6 = """                                    {showDrugInfo && (
                                        <div className="animate-pop mt-4 mb-6">
                                            {calcMode === 'single' ? (
                                                <div className={`p-5 rounded-2xl border-2 transition-all shadow-md ${currentDrugInfo.color === 'sky'
                                                    ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500/50'
                                                    : currentDrugInfo.color === 'amber'
                                                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/50'
                                                        : currentDrugInfo.color === 'purple'
                                                            ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-500/50'
                                                            : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/50'
                                                    }`}>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded tracking-widest ${currentDrugInfo.color === 'sky'
                                                            ? 'bg-sky-500 text-white'
                                                            : currentDrugInfo.color === 'amber'
                                                                ? 'bg-amber-500 text-slate-900'
                                                                : currentDrugInfo.color === 'purple'
                                                                    ? 'bg-purple-500 text-white'
                                                                    : 'bg-emerald-500 text-slate-900'
                                                            }`}>
                                                            ข้อมูลยาที่เลือก
                                                        </span>
                                                        <div className={`text-base font-black uppercase tracking-wider ${currentDrugInfo.color === 'sky'
                                                            ? 'text-sky-700 dark:text-sky-400'
                                                            : currentDrugInfo.color === 'amber'
                                                                ? 'text-amber-700 dark:text-amber-400'
                                                                : currentDrugInfo.color === 'purple'
                                                                    ? 'text-purple-700 dark:text-purple-400'
                                                                    : 'text-emerald-700 dark:text-emerald-400'
                                                            }`}>
                                                            {currentDrugInfo.name}
                                                        </div>
                                                    </div>
                                                    <p className="text-sm font-extrabold text-slate-800 dark:text-white leading-snug">
                                                        {currentDrugInfo.desc}
                                                    </p>
                                                    <div className="mt-3 p-3 rounded-lg bg-white/60 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                                                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                                            {currentDrugInfo.details}
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : ("""
r6 = """                                    {showDrugInfo && (
                                        <div className="animate-pop mt-4 mb-6 space-y-4">
                                            {calcMode === 'single' ? (
                                                selectedDrugs.map(drugId => {
                                                    const dInfo = drugsInfo.find(d => d.id === drugId) || drugsInfo[0];
                                                    return (
                                                        <div key={dInfo.id} className={`p-5 rounded-2xl border-2 transition-all shadow-md ${dInfo.color === 'sky'
                                                            ? 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500/50'
                                                            : dInfo.color === 'amber'
                                                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500/50'
                                                                : dInfo.color === 'purple'
                                                                    ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-500/50'
                                                                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/50'
                                                            }`}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded tracking-widest ${dInfo.color === 'sky'
                                                                    ? 'bg-sky-500 text-white'
                                                                    : dInfo.color === 'amber'
                                                                        ? 'bg-amber-500 text-slate-900'
                                                                        : dInfo.color === 'purple'
                                                                            ? 'bg-purple-500 text-white'
                                                                            : 'bg-emerald-500 text-slate-900'
                                                                    }`}>
                                                                    ข้อมูลยาที่เลือก
                                                                </span>
                                                                <div className={`text-base font-black uppercase tracking-wider ${dInfo.color === 'sky'
                                                                    ? 'text-sky-700 dark:text-sky-400'
                                                                    : dInfo.color === 'amber'
                                                                        ? 'text-amber-700 dark:text-amber-400'
                                                                        : dInfo.color === 'purple'
                                                                            ? 'text-purple-700 dark:text-purple-400'
                                                                            : 'text-emerald-700 dark:text-emerald-400'
                                                                    }`}>
                                                                    {dInfo.name}
                                                                </div>
                                                            </div>
                                                            <p className="text-sm font-extrabold text-slate-800 dark:text-white leading-snug">
                                                                {dInfo.desc}
                                                            </p>
                                                            <div className="mt-3 p-3 rounded-lg bg-white/60 dark:bg-black/30 border border-slate-200 dark:border-white/5">
                                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
                                                                    {dInfo.details}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : ("""

s7 = """                                        return (
                                            <select className="form-control mb-4" value={drug} onChange={e => setDrug(e.target.value)} size={1}>
                                                {Object.entries(grouped).map(([cat, catDrugs]) => {
                                                    const cfg = categoryConfig[cat] || categoryConfig['CHEMOTHERAPY'];
                                                    return (
                                                        <optgroup key={cat} label={cfg.label}>
                                                            {catDrugs.map(d => {
                                                                const label = thaiLabelMap[d.id] || d.name;
                                                                const calcLabel = calcTypeMap[d.raw?.calculation_type] || d.desc;
                                                                const limitLabel = d.raw?.max_dose_cap ? ` · Cap ${parseFloat(d.raw.max_dose_cap)} mg` : '';
                                                                return (
                                                                    <option key={d.id} value={d.id}>
                                                                        {`${cfg.prefix}${label}  (${calcLabel}${limitLabel})`}
                                                                    </option>
                                                                );
                                                            })}
                                                        </optgroup>
                                                    );
                                                })}
                                            </select>
                                        );"""
r7 = """                                        return (
                                            <div className="relative mb-4" ref={drugDropdownRef}>
                                                <button
                                                    type="button"
                                                    onClick={() => setDrugDropdownOpen(!drugDropdownOpen)}
                                                    className="w-full text-left px-5 py-3.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 transition-all flex items-center justify-between shadow-sm"
                                                >
                                                    <span className="truncate pr-4 font-bold text-slate-700 dark:text-slate-200">
                                                        {selectedDrugs.length > 0
                                                            ? `เลือกยาแล้ว ${selectedDrugs.length} ชนิด (${selectedDrugs.map(id => drugsInfo.find(d => d.id === id)?.name || id).join(', ')})`
                                                            : 'โปรดเลือกยาอย่างน้อย 1 ชนิด'}
                                                    </span>
                                                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${drugDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                                {drugDropdownOpen && (
                                                    <div className="absolute top-full left-0 mt-2 w-full max-h-[400px] overflow-y-auto bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 p-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        {Object.entries(grouped).map(([cat, catDrugs]) => {
                                                            const cfg = categoryConfig[cat] || categoryConfig['CHEMOTHERAPY'];
                                                            return (
                                                                <div key={cat} className="mb-3 last:mb-0">
                                                                    <div className="px-3 py-1.5 text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50 rounded-lg mb-2 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                                                                        {cfg.label}
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        {catDrugs.map(d => {
                                                                            const label = thaiLabelMap[d.id] || d.name;
                                                                            const calcLabel = calcTypeMap[d.raw?.calculation_type] || d.desc;
                                                                            const limitLabel = d.raw?.max_dose_cap ? ` · Cap ${parseFloat(d.raw.max_dose_cap)} mg` : '';
                                                                            const isChecked = selectedDrugs.includes(d.id);
                                                                            return (
                                                                                <label
                                                                                    key={d.id}
                                                                                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all border ${isChecked ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                                                >
                                                                                    <div className="flex-shrink-0 mt-0.5">
                                                                                        <input
                                                                                            type="checkbox"
                                                                                            className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-500 dark:border-slate-600 dark:bg-slate-700 cursor-pointer"
                                                                                            checked={isChecked}
                                                                                            onChange={(e) => {
                                                                                                if (e.target.checked) {
                                                                                                    setSelectedDrugs([...selectedDrugs, d.id]);
                                                                                                } else {
                                                                                                    setSelectedDrugs(selectedDrugs.filter(id => id !== d.id));
                                                                                                }
                                                                                            }}
                                                                                        />
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className={`font-bold text-sm ${isChecked ? 'text-sky-700 dark:text-sky-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                                                            {cfg.prefix}{label}
                                                                                        </div>
                                                                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                                                            {calcLabel}{limitLabel}
                                                                                        </div>
                                                                                    </div>
                                                                                </label>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );"""

s8 = """                                    {((calcMode === 'single' && drug === 'carboplatin') || calcMode === 'regimen') && ("""
r8 = """                                    {((calcMode === 'single' && selectedDrugs.includes('carboplatin')) || calcMode === 'regimen') && ("""

s9 = """                                        {calcMode === 'single' ? (
                                            <div className="text-center border-t border-slate-700/20 pt-4">
                                                <span className="text-xs uppercase text-slate-500 font-black">Dose</span>
                                                <div className="text-3xl font-black text-amber-500">
                                                    {sanitizeNaN(finalDose)} <span className="text-sm">{drug === 'bleomycin' ? 'units' : 'mg'}</span>
                                                </div>
                                            </div>
                                        ) : ("""
r9 = """                                        {calcMode === 'single' ? (
                                            <div className="border-t border-slate-700/20 pt-4 space-y-3">
                                                <span className="text-xs uppercase text-slate-500 font-black block text-center mb-1">Single Drug Doses</span>
                                                {singleDrugResults.length > 0 ? singleDrugResults.map(item => (
                                                    <div key={item.id} className="flex justify-between items-center bg-slate-100 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700/30">
                                                        <span className="text-xs font-black text-slate-700 dark:text-slate-300">{item.name}</span>
                                                        <span className="text-sm font-black text-amber-600 dark:text-amber-500">
                                                            {sanitizeNaN(item.dose)} <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.id === 'bleomycin' ? 'units' : 'mg'}</span>
                                                        </span>
                                                    </div>
                                                )) : (
                                                    <div className="text-center text-sm font-bold text-slate-400 pb-2">ยังไม่ได้เลือกยา</div>
                                                )}
                                            </div>
                                        ) : ("""

s10 = """                                            className={`w-full btn-primary ${isIncompleteDose(finalDose) || bsa > 4.5 || bsa < 0.3
                                                ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-none'
                                                : 'shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm'
                                                }`}
                                            disabled={isIncompleteDose(finalDose) || bsa > 4.5 || bsa < 0.3}"""
r10 = """                                            className={`w-full btn-primary ${(calcMode === 'single' && selectedDrugs.length === 0) || isIncompleteDose(finalDose) || bsa > 4.5 || bsa < 0.3
                                                ? 'opacity-50 cursor-not-allowed bg-slate-300 dark:bg-slate-700 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-none'
                                                : 'shadow-lg shadow-sky-500/20 hover:shadow-sky-500/40 hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm'
                                                }`}
                                            disabled={(calcMode === 'single' && selectedDrugs.length === 0) || isIncompleteDose(finalDose) || bsa > 4.5 || bsa < 0.3}"""

reps = [
    (s1, r1), (s2, r2), (s3, r3), (s4, r4), (s5, r5), (s6_0, r6_0), (s6, r6), (s7, r7), (s8, r8), (s9, r9), (s10, r10)
]

def clean_str(s):
    return "\\n".join([line.rstrip() for line in s.splitlines()]).strip()

content_clean = "\\n".join([line.rstrip() for line in content.splitlines()])

for i, (s, r) in enumerate(reps):
    cs = clean_str(s)
    cr = clean_str(r)
    
    if cs in content_clean:
        content_clean = content_clean.replace(cs, cr)
        print(f"Replacement {i+1} SUCCESS")
    else:
        print(f"Replacement {i+1} FAILED to find exact match")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content_clean)
