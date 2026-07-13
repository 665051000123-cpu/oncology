
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add ID to history container
# Search for: <div className="animate-fade-in relative z-10 w-full max-w-[1400px] mx-auto p-4 md:p-8">
content = content.replace(
    "<div className=\"animate-fade-in relative z-10 w-full max-w-[1400px] mx-auto p-4 md:p-8\">", 
    "<div id=\"history-print-area\" className=\"animate-fade-in relative z-10 w-full max-w-[1400px] mx-auto p-4 md:p-8\">"
)

# 2. Add printHistory function
# Let's put it right after printWorkingFormula
print_history_func = """
    const printHistory = () => {
        const historyContainer = document.getElementById('history-print-area');
        if (!historyContainer) return;
        
        let styleTags = '';
        for (let i = 0; i < document.styleSheets.length; i++) {
            try {
                if (document.styleSheets[i].href) {
                    styleTags += `<link rel="stylesheet" href="${document.styleSheets[i].href}">`;
                } else {
                    let cssRules = document.styleSheets[i].cssRules;
                    let css = '';
                    for (let j = 0; j < cssRules.length; j++) {
                        css += cssRules[j].cssText;
                    }
                    styleTags += `<style>${css}</style>`;
                }
            } catch(e) {}
        }

        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>?????????????????????</title>
            ${styleTags}
            <style>
                @page { size: A4 landscape; margin: 1cm; }
                body { background-color: white !important; }
                .no-print { display: none !important; }
                .print-hide { display: none !important; }
                ::-webkit-scrollbar { display: none; }
            </style>
        </head>
        <body class="bg-white">
            ${historyContainer.outerHTML}
        </body>
        </html>
        `;

        setPreviewData({
            isOpen: true,
            htmlContent: htmlContent,
            title: '?????????????????????',
            printerName: user?.default_printer || '',
            paperSize: 'A4',
            onConfirm: async () => {
                setPreviewData(prev => ({ ...prev, isOpen: false }));
                if (user?.default_printer) {
                    showNotification('??????????????...', 'info');
                    try {
                        const res = await axios.post(user?.use_local_agent ? 'http://localhost:5005/api/print' : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.default_printer,
                            paperSize: 'A4'
                        });
                        
                        if (res.data.success) {
                            showNotification(`?????????????????????????? ${user.default_printer} ??????`, 'success');
                        }
                    } catch (err) {
                        console.error('Local Print Server error', err);
                        showNotification('??????????????? Print Server ??? ???????????????????????????????????...', 'warning');
                        openFallback();
                    }
                } else {
                    openFallback();
                }
            }
        });

        const openFallback = () => {
            const printWindow = window.open('', '_blank', 'width=1000,height=800');
            if (!printWindow) {
                showNotification('??????????? Pop-up ??????????', 'warning');
                return;
            }

            const fallbackHtml = htmlContent.replace('</body>', `<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script></body>`);
            printWindow.document.write(fallbackHtml);
            printWindow.document.close();
        };
    };
"""

# Find where to insert it. After printWorkingFormula finishes.
# Let's just insert it before `const handleSaveOrder = async () => {`
start_idx = content.find("const handleSaveOrder = async () => {")
content = content[:start_idx] + print_history_func + "\n    " + content[start_idx:]


# 3. Change the button onClick
content = content.replace(
    "<button onClick={() => window.print()} className=\"no-print bg-slate-800",
    "<button onClick={printHistory} className=\"no-print bg-slate-800"
)

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Added printHistory function")

