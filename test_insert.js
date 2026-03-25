const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const dataToInsert = {
    title: "ねずみ: 休み",
    all_day: true,
    start_time: "2026-04-04",
    end_time: "2026-04-04",
    background_color: "#cbd5e1",
    extended_props: {
        isPersonal: true,
        type: "休み",
        baseEventId: "test_id"
    }
  };
  
  const { data, error } = await supabase.from('events').insert(dataToInsert).select();
  console.log("Returned from DB:", JSON.stringify(data, null, 2));
}
test();
