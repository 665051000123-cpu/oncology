import sys

with open('client/src/components/PrinterSettings.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = '<div className="space-y-6">'
replacement = '''<div className="space-y-6">
                        {/* Local Agent Toggle */}
                        <div className="bg-sky-50 p-5 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-sky-900 text-lg">เปิดใช้งาน Local Print Agent (พิมพ์ตรงจากเครื่องนี้)</h3>
                                <p className="text-sm text-sky-700">*ต้องเปิดโปรแกรมตัวจิ๋ว (Node.js) ทิ้งไว้ที่เครื่องนี้</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={useLocalAgent} onChange={(e) => setUseLocalAgent(e.target.checked)} />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500"></div>
                            </label>
                        </div>'''

if target in content:
    content = content.replace(target, replacement)
    with open('client/src/components/PrinterSettings.jsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Added Local Agent toggle successfully.')
else:
    print('Target not found in PrinterSettings.jsx')
