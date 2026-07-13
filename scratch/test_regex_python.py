
content = "value={(row.dose || '').match(/[\d.]+/) ? (row.dose || '').match(/[\d.]+/)[0] : ''}"
print("Original:", content)
content = content.replace("[d.]+", r"[\d.]+")
print("Replaced:", content)

