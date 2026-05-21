import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .select('*');

        if (error) throw error;

        // Convert array to the structured object expected by the frontend
        const shiftsObj: any = {};
        data.forEach((item: any) => {
            shiftsObj[item.month] = item.data;
        });

        return NextResponse.json(shiftsObj);
    } catch (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ message: 'Error reading from Supabase' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = await request.json(); // Expected: { yearMonth: "2026-02", shifts: {...}, onCall: {...}, telework: {...} }
        const { yearMonth, shifts, onCall, telework } = payload;

        if (!yearMonth) {
            return NextResponse.json({ message: 'Missing yearMonth' }, { status: 400 });
        }

        const shiftData = {
            shifts,
            onCall,
            telework,
            updatedAt: new Date().toISOString()
        };

        // 1. Save to shifts table
        const { error } = await supabase
            .from('shifts')
            .upsert({
                month: yearMonth,
                care_manager_id: 'cm1', // Default
                data: shiftData,
                updated_at: shiftData.updatedAt
            });

        if (error) throw error;

        // 2. Sync to events table
        // Delete existing shift-derived events for this month
        const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .filter('extended_props->>fromShift', 'eq', 'true')
            .like('start_time', `${yearMonth}%`);

        if (deleteError) throw deleteError;

        // Generate new events from shifts & telework
        const careManagers = [
            { id: 'cm1', name: 'ねずみ' },
            { id: 'cm2', name: 'ケアマネ A' },
            { id: 'cm3', name: 'ケアマネ B' }
        ];

        const newEvents: any[] = [];
        const [yearStr, monthStr] = yearMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        // Get total days in month
        const totalDays = new Date(year, month, 0).getDate();

        // Label mapping for holidays
        const labelMap: Record<string, string> = {
            'hope_holiday': '休み',
            'paid_leave': '有休',
            'legal_holiday': '法内',
            'legal_out_holiday': '法外'
        };

        for (let sIdx = 0; sIdx < careManagers.length; sIdx++) {
            const cm = careManagers[sIdx];
            for (let dIdx = 0; dIdx < totalDays; dIdx++) {
                const key = `${sIdx}-${dIdx}`;
                const dayStr = String(dIdx + 1).padStart(2, '0');
                const dateStr = `${yearMonth}-${dayStr}`;

                // Process Shift Holidays
                const shiftType = shifts ? shifts[key] : null;
                if (shiftType && labelMap[shiftType]) {
                    const label = labelMap[shiftType];
                    newEvents.push({
                        title: `${cm.name}: ${label}`,
                        all_day: false,
                        start_time: `${dateStr}T09:00:00+09:00`,
                        end_time: `${dateStr}T10:00:00+09:00`,
                        background_color: '#eab308', // yellow
                        extended_props: {
                            isPersonal: true,
                            type: 'offday',
                            careManagerId: cm.id,
                            status: 'scheduled',
                            fromShift: true
                        }
                    });
                }

                // Process Telework
                const isTele = telework ? telework[key] : false;
                if (isTele) {
                    newEvents.push({
                        title: `${cm.name}: テレワーク`,
                        all_day: false,
                        start_time: `${dateStr}T09:00:00+09:00`,
                        end_time: `${dateStr}T10:00:00+09:00`,
                        background_color: '#22c55e', // green
                        extended_props: {
                            isPersonal: true,
                            type: 'telework',
                            careManagerId: cm.id,
                            status: 'scheduled',
                            fromShift: true
                        }
                    });
                }
            }
        }

        if (newEvents.length > 0) {
            const { error: insertError } = await supabase
                .from('events')
                .insert(newEvents);
            if (insertError) throw insertError;
        }

        return NextResponse.json({ message: 'Saved and synced successfully' }, { status: 200 });
    } catch (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
    }
}
