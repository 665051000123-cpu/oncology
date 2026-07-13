
import re

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

# Add useEffect to sync calculatedDoses with adminRows
match = re.search(r"    const \[adminRows, setAdminRows\] = useState\(\[.*?\]\);", content, re.DOTALL)
if match:
    new_code = match.group(0) + """

    // Auto-sync calculated doses to adminRows
    useEffect(() => {
        if (Object.keys(calculatedDoses).length > 0) {
            setAdminRows(prev => prev.map(row => {
                if (row.drugName && calculatedDoses[row.drugName]) {
                    return {
                        ...row,
                        dose: calculatedDoses[row.drugName].calculatedDose,
                        unit: calculatedDoses[row.drugName].unit || "mg"
                    };
                }
                return row;
            }));
        }
    }, [calculatedDoses]);
"""
    # Wait, we need to make sure calculatedDoses is accessible or exists.
    # It exists in App.jsx. Let us replace it.
    content = content.replace(match.group(0), new_code)
    
    with open("client/src/App.jsx", "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched successfully")
else:
    print("Not found")

