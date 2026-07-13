import io

file_path = r'd:\patien-system\client\src\components\DrugsInfo.jsx'
with io.open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

bad_start = '''    const filteredDrugs = drugs.filter(d => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        
    const printAllDrugs = async () => {'''

good_start = '''    const filteredDrugs = drugs.filter(d => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        
        return (
            d.drug_code?.toLowerCase().includes(q) ||
            d.drug_name?.toLowerCase().includes(q) ||
            d.calculation_type?.toLowerCase().includes(q) ||
            d.standard_dose_unit?.toLowerCase().includes(q)
        );
    });

    const printAllDrugs = async () => {'''

bad_end = '''            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(fallbackHtml);
                printWindow.document.close();
            }
        }
    };

    return (
            d.drug_code?.toLowerCase().includes(q) ||
            d.drug_name?.toLowerCase().includes(q) ||
            d.calculation_type?.toLowerCase().includes(q) ||
            d.standard_dose_unit?.toLowerCase().includes(q)
        );
    });'''

good_end = '''            if (printWindow) {
                printWindow.document.open();
                printWindow.document.write(fallbackHtml);
                printWindow.document.close();
            }
        }
    };'''

if bad_start in content and bad_end in content:
    content = content.replace(bad_start, good_start)
    content = content.replace(bad_end, good_end)
    with io.open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed corrupted DrugsInfo.jsx')
else:
    print('Could not find exact patterns to fix.')
