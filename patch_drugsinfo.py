import io

file_path = r'd:\patien-system\client\src\components\DrugsInfo.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add Printer to lucide-react import
content = content.replace("import { ArrowLeft, Pill, Search, FlaskConical, Ruler, ShieldAlert, Activity, Plus, Edit2, Trash2, Save, X } from 'lucide-react';", 
                          "import { ArrowLeft, Pill, Search, FlaskConical, Ruler, ShieldAlert, Activity, Plus, Edit2, Trash2, Save, X, Printer } from 'lucide-react';")

# Add the print button
target = """                    <div className="relative flex-1 md:flex-none">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อยา..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`pl-9 pr-4 py-2 rounded-xl text-sm font-bold border transition-all w-full md:w-[220px] ${isDark
                                ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500'
                                : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 shadow-sm'
                                }`}
                        />
                    </div>"""

replacement = """                    <div className="relative flex-1 md:flex-none">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อยา..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`pl-9 pr-4 py-2 rounded-xl text-sm font-bold border transition-all w-full md:w-[220px] ${isDark
                                ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-sky-500'
                                : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-sky-500 shadow-sm'
                                }`}
                        />
                    </div>
                    <button
                        onClick={() => window.print()}
                        className={`text-sm py-2 px-4 rounded-xl border flex items-center gap-2 cursor-pointer shrink-0 shadow-sm transition-colors ${isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                        title="พิมพ์ข้อมูลยาทั้งหมด"
                    >
                        <Printer size={16} /> พิมพ์
                    </button>"""

if target in content:
    content = content.replace(target, replacement)
else:
    print("Could not find target block to replace.")

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched DrugsInfo.jsx")
