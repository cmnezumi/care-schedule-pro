const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('clients').select('kana').limit(1);
  if (error) {
    console.error('Error selecting kana:', error);
  } else {
    console.log('Kana selection succeeded:', data);
  }
}
check();
