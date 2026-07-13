
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace printWorkingFormula
working_formula_match = re.search(r"        if \(user\?\.working_formula_printer\) \{.*?\n        printWindow\.document\.close\(\);\n    \};", content, re.DOTALL)
if working_formula_match:
    new_wf = """        const openWorkingFormulaFallback = () => {
            const printWindow = window.open("", "_blank", "width=1000,height=800");
            if (!printWindow) {
                showNotification("??????????????????????????????? Pop-up ???????????", "warning");
                return;
            }

            const fallbackHtml = htmlContent.replace("</body>", `
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

            printWindow.document.write(fallbackHtml);
            printWindow.document.close();
        };

        setPreviewData({
            isOpen: true,
            htmlContent: htmlContent,
            title: "??????????????????",
            printerName: user?.working_formula_printer || "",
            paperSize: "A4",
            onConfirm: async () => {
                setPreviewData(prev => ({ ...prev, isOpen: false }));
                if (user?.working_formula_printer) {
                    showNotification("???????????????????????????????...", "info");
                    try {
                        const res = await axios.post(user?.use_local_agent ? "http://localhost:5005/api/print" : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.working_formula_printer,
                            paperSize: "A4"
                        });
                        if (res.data.success) {
                            showNotification(`?????????????? ${user.working_formula_printer} ??????`, "success");
                        }
                    } catch (err) {
                        console.error("Local Print Server error", err);
                        showNotification("????????????????????????????????????? (???????????????????????????????)...", "warning");
                        openWorkingFormulaFallback();
                    }
                } else {
                    openWorkingFormulaFallback();
                }
            }
        });
    };"""
    content = content.replace(working_formula_match.group(0), new_wf)


# Replace printCalculation
calc_match = re.search(r"        if \(user\?\.calculation_printer\) \{.*?\n        printWindow\.document\.close\(\);\n    \};", content, re.DOTALL)
if calc_match:
    new_calc = """        const openCalculationFallback = () => {
            const printWindow = window.open("", "_blank", "width=800,height=800");
            if (!printWindow) {
                showNotification("??????????????????????????????? Pop-up ???????????", "warning");
                return;
            }

            const fallbackHtml = htmlContent.replace("</body>", `
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

            printWindow.document.write(fallbackHtml);
            printWindow.document.close();
        };

        setPreviewData({
            isOpen: true,
            htmlContent: htmlContent,
            title: "???????????????",
            printerName: user?.calculation_printer || "",
            paperSize: "A4",
            onConfirm: async () => {
                setPreviewData(prev => ({ ...prev, isOpen: false }));
                if (user?.calculation_printer) {
                    showNotification("???????????????????????????????...", "info");
                    try {
                        const res = await axios.post(user?.use_local_agent ? "http://localhost:5005/api/print" : `${API_BASE}/print`, {
                            html: htmlContent,
                            printerName: user.calculation_printer,
                            paperSize: "A4"
                        });
                        if (res.data.success) {
                            showNotification(`?????????????? ${user.calculation_printer} ??????`, "success");
                        }
                    } catch (err) {
                        console.error("Local Print Server error", err);
                        showNotification("????????????????????????????????????? (???????????????????????????????)...", "warning");
                        openCalculationFallback();
                    }
                } else {
                    openCalculationFallback();
                }
            }
        });
    };"""
    content = content.replace(calc_match.group(0), new_calc)

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Patched successfully")

