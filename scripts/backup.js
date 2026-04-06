require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function backup() {
  const tables = ['clients', 'events', 'schedule_types', 'clinics', 'holidays', 'shifts'];
  const backupData = {};
  
  for (const table of tables) {
    let allRows = [];
    let start = 0;
    const limit = 1000;
    
    while (true) {
        const { data, error } = await supabase.from(table).select('*').range(start, start + limit - 1);
        if (error) {
            console.error(`Error fetching ${table}:`, error);
            process.exit(1);
        }
        allRows = allRows.concat(data);
        if (data.length < limit) break;
        start += limit;
    }
    backupData[table] = allRows;
    console.log(`Fetched ${allRows.length} rows from ${table}`);
  }
  
  // Format YYYYMMDD_HHMMSS
  const format2Digits = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const timestamp = `${now.getFullYear()}${format2Digits(now.getMonth()+1)}${format2Digits(now.getDate())}_${format2Digits(now.getHours())}${format2Digits(now.getMinutes())}${format2Digits(now.getSeconds())}`;
  
  const backupFilename = `backup_${timestamp}.json`;
  const backupPath = path.join(__dirname, '..', 'data', backupFilename);
  
  // Ensure data directory exists
  if (!fs.existsSync(path.dirname(backupPath))) {
      fs.mkdirSync(path.dirname(backupPath), { recursive: true });
  }
  
  fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`Backup successfully saved to data/${backupFilename}`);
}
backup();
