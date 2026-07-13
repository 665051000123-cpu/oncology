import sys

with open("client/src/App.jsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace('title: "ใบผสมยา (Working Formula)"', 'title: "ตัวอย่างใบเตรียมยา"')
content = content.replace("title: 'ใบผสมยา (Working Formula)'", "title: 'ตัวอย่างใบเตรียมยา'")

with open("client/src/App.jsx", "w", encoding="utf-8") as f:
    f.write(content)

print("Title changed successfully")
