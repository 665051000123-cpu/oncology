import json
import os

raw_data = """
1	5-FU	NSS, D5W	ห้ามผสมรวมในถุง/สายเดียวกับ Leucovorin (ตกตะกอน)	ห้ามผสมรวมในถุง/สายเดียวกับ Leucovorin (ตกตะกอน)
2	6-MP	ยารับประทาน	ห้ามนำมาผสมฉีด	เป็นยาเม็ดสำหรับกินเท่านั้น
3	6-Thioguanine	ยารับประทาน	ห้ามนำมาผสมฉีด	เป็นยาเม็ดสำหรับกินเท่านั้น
4	Actinomycin-D	WFI (เพียวๆ ไม่มีสารกันเสีย)	ห้ามใช้ WFI ที่มีสารกันเสีย	ละลายด้วย WFI ก่อน แล้วเจือจางต่อด้วย NSS หรือ D5W
5	Asparaginase	NSS, WFI	-	ตอนละลายห้ามเขย่าแรง (ทำให้เกิดฟองและยาเสื่อมสภาพ) ให้หมุนขวดเบาๆ
6	Bevacizumab (Avastin)	NSS	ห้ามใช้ D5W เด็ดขาด	สารน้ำน้ำตาลจะทำลายโครงสร้างโปรตีนของยา
7	Bleomycin	NSS	-	แนะนำ NSS เพื่อความคงตัว (เสถียรน้อยใน D5W)
8	Bortezomib (VELCADE)	NSS	ห้ามใช้ตัวทำละลายอื่น	ต้องใช้ NSS ในปริมาณที่กำหนดเป๊ะๆ ในการละลาย
9	Capecitabine	ยารับประทาน	ห้ามนำมาผสมฉีด	เป็นยาเม็ดสำหรับกินหลังอาหาร
10	Carboplatin	D5W, NSS	-	ห้ามใช้เข็มหรืออุปกรณ์ที่มีอลูมิเนียม (Aluminum) ยาจะดำและตกตะกอน
11	CCNU	ยารับประทาน	ห้ามนำมาผสมฉีด	เป็นยาแคปซูลสำหรับกิน
12	Cisplatin	NSS, D5N/2, D5N/5	ห้ามใช้ D5W เพียวๆ	ต้องมี Chloride ในสารน้ำเสมอ ไม่งั้นจะเกิดพิษต่อไตสูงมาก ห้ามใช้อุปกรณ์อลูมิเนียม
13	Cotrimoxazole	D5W (นิยมที่สุด), NSS	-	ยาตกตะกอนง่ายมาก ต้องผสมตามสัดส่วนปริมาตรน้ำที่กำหนดในเอกสารอย่างเคร่งครัด
14	Cyclophosphamide	NSS, D5W, WFI	-	หากละลายด้วย WFI ให้เจือจางต่อด้วย NSS/D5W ก่อนให้
15	Cytarabine	NSS, D5W	-	มีความคงตัวดีในสารน้ำมาตรฐาน
16	Dexamethasone	NSS, D5W	-	ยาสเตียรอยด์ ผสมสารน้ำฉีดเข้าเส้นได้ทั่วไป
17	Docetaxel	NSS, D5W	ห้ามใช้ถุง/สายพลาสติก PVC	ยาจะกัดพลาสติก PVC ต้องใช้ขวดแก้ว หรือถุง Non-PVC
18	Docetaxel (Taxotere)	NSS, D5W	ห้ามใช้ถุง/สายพลาสติก PVC	(เหมือนลำดับ 17) ต้องใช้ขวดแก้ว หรือถุง Non-PVC
19	Doxorubicin	NSS, D5W, WFI	-	ตัวยาเป็นสีแดงเข้ม ละลายได้ทั้งน้ำเกลือและน้ำตาล
20	Doxorubicin (Lipodox)	D5W	ห้ามใช้ NSS หรือสารน้ำอื่น	รูปแบบ Liposomal ต้องใช้ D5W เท่านั้น ไม่งั้นระบบนำส่งยาจะแตกตัว
21	Epirubicin	NSS, D5W, WFI	-	ตัวยาสีแดง ละลายคล้าย Doxorubicin ปกติ
22	Etoposide	NSS, D5W	-	ยาตกตะกอนง่ายมาก ห้ามผสมเข้มข้นเกินไป และควรหลีกเลี่ยง PVC
23	FLUDARABINE	NSS, WFI	-	ละลายผงยาด้วย WFI ก่อน แล้วเจือจางต่อด้วย NSS
24	Gemcitabine	NSS	-	แนะนำให้ละลายผงยาด้วย NSS เพียวๆ ก่อนเจือจาง
25	HD-Cytarabine	NSS, D5W	-	(Cytarabine ขนาดสูง) ระวังเรื่องความเข้มข้นและการล้างสาย
26	HD-Methotrexate	D5W, NSS	-	(Methotrexate ขนาดสูง) มักต้องผสมสารสเตอริไลซ์ที่มีโซเดียมไบคาร์บอเนตเพื่อปรับปัสสาวะให้เป็นด่าง
27	Hydrocortisone	NSS, D5W	-	ยาสเตียรอยด์ ผสมสารน้ำมาตรฐานได้
28	Idarubicin	NSS	ห้ามผสมร่วมกับยาอื่น	แนะนำใช้ NSS เจือจาง (ห้ามผสมในสารน้ำที่เป็นด่างสูง)
29	Ifosfamide	NSS, D5W, WFI	-	มักต้องให้ร่วมกับ Mesna เสมอเพื่อป้องกันกระเพาะปัสสาวะอักเสบ
30	Irinotecan	D5W (นิยมที่สุด), NSS	-	แนะนำให้ผสมใน D5W จะมีความคงตัวทางเคมีที่ดีกว่า
31	Mesna	NSS, D5W	-	สามารถผสมรวมในถุงเดียวกับ Ifosfamide หรือ Cyclophosphamide ได้ตามสูตร
32	Methotrexate	NSS, D5W	-	ยาไวต่อแสง ควรหลีกเลี่ยงการโดนแสงแดดจัดเป็นเวลานาน
33	Methylprednisolone	NSS, D5W	-	ยาสเตียรอยด์ ผสมสารน้ำฉีดทั่วไปได้
34	Mitomycin C	NSS	ไม่แนะนำให้ใช้ D5W	ยาสลายตัวง่ายมากในสภาวะเป็นกรด (D5W เป็นกรดอ่อนๆ) ควรใช้ NSS
35	Mitoxantrone	NSS, D5W	-	ตัวยาสีน้ำเงินเข้ม เจือจางใน NSS หรือ D5W ก็ได้
36	Nitrogen mustard	NSS, WFI	-	ยาสลายตัวเร็วมากหลังจากผสม ต้องรีบให้ผู้ป่วยทันทีหลังผสมเสร็จ
37	Oxaliplatin	D5W	ห้ามใช้ NSS หรือสารที่มี Chloride เด็ดขาด	ยาจะตกตะกอนและเสื่อมสภาพทันที ต้องใช้ D5W เท่านั้น
38	Paclitaxel (Taxol)	NSS, D5W	ห้ามใช้ถุง/สายพลาสติก PVC	ยาจะกัดพลาสติกและปล่อยสารพิษ ต้องใช้ขวดแก้ว หรือถุง Non-PVC และต้องมี Inline filter
39	Pamidronate disodium	NSS, D5W	ห้ามใช้สารน้ำที่มีแคลเซียม (เช่น Ringer's)	ยาจะจับกับแคลเซียมแล้วตกตะกอน
40	Prednisolone	ยารับประทาน	ห้ามนำมาผสมฉีด	(ยกเว้นรูปแบบฉีดเฉพาะทาง แต่ในรายชื่อทั่วไปคือยาทาน)
41	Rescuvolin	NSS, D5W, WFI	ห้ามผสมรวมถุง/สายเดียวกับ 5-FU	(Leucovorin) ละลายทั่วไปได้ แต่ตอนบริหารยาต้องระวังการตกตะกอนกับ 5-FU
42	Rituximab	NSS	ห้ามใช้ D5W เด็ดขาด	สารน้ำน้ำตาลทำให้โปรตีนเกาะกลุ่มกันเป็นก้อน
43	Trastuzumab (Herceptin)	NSS	ห้ามใช้ D5W เด็ดขาด	สารน้ำน้ำตาลทำให้โปรตีนเกาะกลุ่มกันเป็นก้อน
44	UFT	ยารับประทาน	ห้ามนำมาผสมฉีด	เป็นยาแคปซูลสำหรับกิน
45	UFT	ยารับประทาน	ห้ามนำมาผสมฉีด	(ซ้ำกับลำดับ 44)
46	Vinblastine	NSS	ห้ามใช้สารน้ำปริมาณมากๆ หยดเข้าเส้น	-
"""

rules = []
for line in raw_data.strip().split('\n'):
    parts = line.split('\t')
    if len(parts) >= 5:
        drug_name = parts[1].strip()
        recommended = parts[2].strip()
        prohibited = parts[3].strip()
        warning = parts[4].strip()
        
        keywords = []
        if 'ห้ามใช้ D5W' in prohibited or 'ไม่แนะนำให้ใช้ D5W' in prohibited:
            keywords.extend(['d5w', 'dextrose', 'd5'])
        elif 'ห้ามใช้ NSS' in prohibited:
            keywords.extend(['nss', 'nacl', '0.9%', 'chloride', '0.9'])
        elif 'แคลเซียม' in prohibited:
            keywords.extend(['ringer', 'calcium', 'แคลเซียม'])
        elif 'กันเสีย' in prohibited:
            keywords.extend(['bacteriostatic', 'กันเสีย'])
        elif 'ห้ามนำมาผสมฉีด' in prohibited:
            keywords.append('*')
            
        prohibited_clean = prohibited if prohibited != '-' else 'ควรระวังเป็นพิเศษ'
        warning_clean = warning if warning != '-' else ''

        rules.append({
            'drugName': drug_name,
            'keywords': keywords,
            'title': f"คำเตือนการให้ยา: {drug_name}",
            'desc': f"❌ {prohibited_clean}\\n⚠️ {warning_clean}"
        })

js_content = f"export const DRUG_SOLVENT_RULES = {json.dumps(rules, ensure_ascii=False, indent=4)};\n"

with open(os.path.join('src', 'drugRules.js'), 'w', encoding='utf-8') as f:
    f.write(js_content)
