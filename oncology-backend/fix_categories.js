const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost', user: 'root', database: 'oncology_db', password: 'admin'
  });

  // 1. Alter ENUM to add SUPPORTIVE_CARE
  await conn.execute(
    "ALTER TABLE drugs MODIFY COLUMN drug_category ENUM('CHEMOTHERAPY','TARGETED_THERAPY','IMMUNOTHERAPY','SUPPORTIVE_CARE') NOT NULL DEFAULT 'CHEMOTHERAPY'"
  );
  console.log('OK: Altered drug_category ENUM to include SUPPORTIVE_CARE');

  // 2. Set supportive care drugs
  const supportiveDrugs = [
    'COTRIMOXAZOLE','DEXAMETHASONE','HYDROCORTISONE','LEUCOVORIN',
    'MESNA','METHYLPREDNISOLONE','PAMIDRONATE','PREDNISOLONE'
  ];
  for (const name of supportiveDrugs) {
    const [r] = await conn.execute(
      "UPDATE drugs SET drug_category='SUPPORTIVE_CARE' WHERE UPPER(drug_name)=?",
      [name]
    );
    console.log('  Supportive: ' + name + ' (' + r.affectedRows + ' row)');
  }

  // 3. Ensure targeted therapy
  const targetedDrugs = ['TRASTUZUMAB','BEVACIZUMAB','BORTEZOMIB','RITUXIMAB'];
  for (const name of targetedDrugs) {
    const [r] = await conn.execute(
      "UPDATE drugs SET drug_category='TARGETED_THERAPY' WHERE UPPER(drug_name)=? AND drug_category!='TARGETED_THERAPY'",
      [name]
    );
    if (r.affectedRows > 0) console.log('  Targeted: ' + name + ' (' + r.affectedRows + ' row)');
  }

  // 4. Ensure immunotherapy
  const immunoDrugs = ['PEMBROLIZUMAB'];
  for (const name of immunoDrugs) {
    const [r] = await conn.execute(
      "UPDATE drugs SET drug_category='IMMUNOTHERAPY' WHERE UPPER(drug_name)=? AND drug_category!='IMMUNOTHERAPY'",
      [name]
    );
    if (r.affectedRows > 0) console.log('  Immuno: ' + name + ' (' + r.affectedRows + ' row)');
  }

  // 5. Verify
  const [rows] = await conn.execute(
    "SELECT drug_name, drug_category FROM drugs ORDER BY drug_category, drug_name"
  );
  console.log('\n===== Final drug categories =====');
  let lastCat = '';
  for (const row of rows) {
    if (row.drug_category !== lastCat) {
      console.log('\n[' + row.drug_category + ']');
      lastCat = row.drug_category;
    }
    console.log('  ' + row.drug_name);
  }

  await conn.end();
  console.log('\nDone!');
}

main().catch(console.error);
