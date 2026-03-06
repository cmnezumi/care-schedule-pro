const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrate() {
    const dbPath = path.join(__dirname, '../data/db.json');
    if (!fs.existsSync(dbPath)) {
        console.error('Error: data/db.json not found');
        return;
    }

    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

    console.log('Starting migration to Supabase...');

    // 1. Migrate Clients
    const clientSource = data.users || data.clients;
    if (clientSource && clientSource.length > 0) {
        console.log(`Migrating ${clientSource.length} clients...`);
        const formattedClients = clientSource.map(c => ({
            id: c.id,
            name: c.name,
            care_level: c.careLevel,
            address: c.address,
            notes: c.notes,
            care_manager_id: c.careManagerId
        }));
        const { error } = await supabase.from('clients').upsert(formattedClients);
        if (error) console.error('Error migrating clients:', error);
    }

    // 2. Migrate Schedule Types
    if (data.scheduleTypes && data.scheduleTypes.length > 0) {
        console.log(`Migrating ${data.scheduleTypes.length} schedule types...`);
        const formattedTypes = data.scheduleTypes.map(t => ({
            id: t.id,
            name: t.name,
            color: t.color,
            default_start_time: t.defaultStartTime,
            default_end_time: t.defaultEndTime
        }));
        const { error } = await supabase.from('schedule_types').upsert(formattedTypes);
        if (error) console.error('Error migrating schedule types:', error);
    }

    // 3. Migrate Events
    if (data.events && data.events.length > 0) {
        console.log(`Migrating ${data.events.length} events...`);
        const formattedEvents = data.events.map(e => ({
            id: e.id,
            title: e.title,
            all_day: e.allDay,
            start_time: e.start,
            end_time: e.end,
            background_color: e.backgroundColor,
            extended_props: e.extendedProps
        }));
        const { error } = await supabase.from('events').upsert(formattedEvents);
        if (error) console.error('Error migrating events:', error);
    }

    // 4. Migrate Holidays
    if (data.holidays && data.holidays.length > 0) {
        console.log(`Migrating ${data.holidays.length} holidays...`);
        const { error } = await supabase.from('holidays').upsert(data.holidays);
        if (error) console.error('Error migrating holidays:', error);
    }

    // 5. Migrate Shifts
    if (data.shifts) {
        console.log('Migrating shifts...');
        const shiftMonths = Object.keys(data.shifts);
        for (const month of shiftMonths) {
            const shiftData = data.shifts[month];
            const { error } = await supabase.from('shifts').upsert({
                month: month,
                care_manager_id: 'cm1', // Default for now
                data: shiftData,
                updated_at: shiftData.updatedAt || new Date().toISOString()
            });
            if (error) console.error(`Error migrating shifts for ${month}:`, error);
        }
    }

    console.log('Migration completed!');
}

migrate();
