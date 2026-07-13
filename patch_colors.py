import io

file_path = r'd:\patien-system\client\src\App.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Amputation
old_amp = '<div className="premium-card p-5">'
new_amp = '<div className="premium-card p-5 border-t-4 border-t-indigo-500 bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-800">'
content = content.replace(old_amp, new_amp, 1) # Only first occurrence

# 2. Regimen
old_reg = '<div className="premium-card p-5 relative z-50">'
new_reg = '<div className="premium-card p-5 relative z-50 border-t-4 border-t-emerald-500 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-800">'
content = content.replace(old_reg, new_reg, 1)

# 3. Lab
old_lab = '<div className="premium-card p-5">'
new_lab = '<div className="premium-card p-5 border-t-4 border-t-amber-500 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-800">'
# Since I replaced the first occurrence already, the next one is Lab (hopefully)
content = content.replace(old_lab, new_lab, 1)

# 4. Result (Right side)
old_res = '<div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">'
new_res = '<div className="bg-gradient-to-b from-sky-50/50 to-white dark:from-sky-950/20 dark:to-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col border-2 border-slate-200 border-t-sky-500 dark:border-slate-700 dark:border-t-sky-500 animate-in zoom-in-95 duration-300">'
content = content.replace(old_res, new_res)

# 5. Order History (Bottom)
old_ord = '<div className="mt-8 bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 p-4 md:p-6 mb-20 animate-in fade-in duration-500">'
new_ord = '<div className="mt-8 bg-gradient-to-b from-purple-50/50 to-white dark:from-purple-950/20 dark:to-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 border-t-4 border-t-purple-500 dark:border-slate-700 p-4 md:p-6 mb-20 animate-in fade-in duration-500">'
content = content.replace(old_ord, new_ord)

with io.open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied color accents to layout sections")
