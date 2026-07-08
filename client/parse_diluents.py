import json

existing = [
    "NSS 50 mL", "NSS 100 mL", "NSS 250 mL", "NSS 500 mL",
    "5% D/W 50 mL", "5% D/W 100 mL", "5% D/W 250 mL", "5% D/W 500 mL"
]

requested = """
*   0
*   D5N/2 300
*   D5N/5 100
*   D5N/5 120
*   D5N/5 130
*   D5N/5 200
*   D5N/5 250
*   D5N/5 50
*   D5N/5 500
*   D5N/5 70
*   D5N/5 75
*   D5N/5 80
*   D5N/5 90
*   D-5-S 1000
*   D-5-S 250
*   D-5-S 500
*   D5S(แก้ว) 500
*   D5S/2 1000
*   D5S/2 200
*   D5S/2 400
*   D5S/2 500
*   D5S/2(แก้ว) 1000
    D5W
*   D-5-W 10
*   D-5-W 100
*   D-5-W 1000
*   D-5-W 20
*   D-5-W 200
*   D-5-W 250
*   D5W 5
*   D-5-W 50
*   D-5-W 500
*   D-5-W(แก้ว) 200
*   D-5-W(แก้ว) 500
*   NSS 100
*   NSS 125
*   NSS 150
*   NSS 200
*   NSS 250
*   NSS 3
*   NSS 50
*   NSS 500
*   NSS(แก้ว) 100
*   NSS(แก้ว) 1000
*   NSS(แก้ว) 500
*   NSS. 10
*   WFI 10
*   WFI 20
*   WFI 50
*   ขวด Doxo 0
"""

# Clean and extract requested items
new_items = []
for line in requested.split('\n'):
    line = line.strip()
    if line.startswith('*'):
        line = line[1:].strip()
        if line.startswith('-'):
            line = line[1:].strip()
    if line:
        new_items.append(line)

# Combine and deduplicate
combined = set(existing + new_items)

# Remove empty strings
if "" in combined:
    combined.remove("")

# Sort case-insensitively
sorted_list = sorted(list(combined), key=lambda x: x.lower())

print("const SOLVENT_OPTIONS = [")
for item in sorted_list:
    print(f'    "{item}",')
print("];")
