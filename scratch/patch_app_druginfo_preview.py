
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

druginfo_match = re.search(r"        if \(user\?\.drug_info_printer\) \{.*?\n        printWindow\.document\.close\(\);\n    \};", content, re.DOTALL)
if druginfo_match:
    new_di = """        const openDrugInfoFallback = () => {
            const fallbackHtml = htmlContent.replace("</body>", "<script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script></body>");
            const printWindow = window.open("", "_blank", "width=800,height=800");
            if (!printWindow) {
                showNotification("??????????????????????????????? Pop-up ???????????", "warning");
                return;
            }
            printWindow.document.open();
            printWindow.document.write(fallbackHtml);
            printWindow.document.close();
        };

        setPreviewData({
            isOpen: true,
            htmlContent: htmlContent,
            title: "????????",
            printerName: user?.drug_info_printer || "",
            paperSize: "A4",
            onConfirm: async () => {
                setPreviewData(prev => ({ ...prev, isOpen: false }));
                if (user?.drug_info_printer) {
                    showNotification("???????????????????????????????...", "info");
                    try {
                        const res = await axios.post(user?.use_local_agent ? "http://localhost:5005/api/print" : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.drug_info_printer,
                            isA4: true
                        });
                        if (res.data.success) {
                            showNotification(`?????????????? ${user.drug_info_printer} ??????`, "success");
                        }
                    } catch (err) {
                        console.error("Local Print Server error", err);
                        showNotification("????????????????????????????????????? (???????????????????????????????)...", "warning");
                        openDrugInfoFallback();
                    }
                } else {
                    openDrugInfoFallback();
                }
            }
        });
    };"""
    content = content.replace(druginfo_match.group(0), new_di)
    with open("client/src/App.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Not found")

