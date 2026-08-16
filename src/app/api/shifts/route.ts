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
        const { yearMonth, shifts, onCall, telework, manualKeys, manualOnCallKeys } = payload;

        if (!yearMonth) {
            return NextResponse.json({ message: 'Missing yearMonth' }, { status: 400 });
        }

        const shiftData = {
            shifts,
            onCall,
            telework,
            manualKeys: manualKeys || {},
            manualOnCallKeys: manualOnCallKeys || {},
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
        // Parse year & month
        const [yearStr, monthStr] = yearMonth.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);

        // Delete existing shift-derived events for this month using date range query
        const startDate = `${yearMonth}-01T00:00:00+09:00`;
        let nextYear = year;
        let nextMonth = month + 1;
        if (nextMonth > 12) {
            nextMonth = 1;
            nextYear += 1;
        }
        const nextMonthStr = String(nextMonth).padStart(2, '0');
        const endDate = `${nextYear}-${nextMonthStr}-01T00:00:00+09:00`;

        const { error: deleteError } = await supabase
            .from('events')
            .delete()
            .filter('extended_props->>fromShift', 'eq', 'true')
            .gte('start_time', startDate)
            .lt('start_time', endDate);

        if (deleteError) throw deleteError;

        // Generate new events from shifts & telework
        const careManagers = [
            { id: 'cm1', name: 'ケアマネ A' },
            { id: 'cm2', name: 'ケアマネ B' },
            { id: 'cm3', name: 'ケアマネ C' }
        ];

        const newEvents: any[] = [];

        // Get total days in month
        const totalDays = new Date(year, month, 0).getDate();

        // Label mapping for holidays
        const labelMap: Record<string, string> = {
            'hope_holiday': '休み',
            'paid_leave': '有休',
            'am_paid_leave': 'AM休',
            'pm_paid_leave': 'PM休',
            'legal_holiday': '法内',
            'legal_out_holiday': '法外'
        };

        for (let sIdx = 0; sIdx < careManagers.length; sIdx++) {
            const cm = careManagers[sIdx];
            // カレンダー同期はケアマネA（ユーザー本人＝cm1）の分のみ
            if (cm.id !== 'cm1') continue;

            for (let dIdx = 0; dIdx < totalDays; dIdx++) {
                const key = `${sIdx}-${dIdx}`;
                const dayStr = String(dIdx + 1).padStart(2, '0');
                const dateStr = `${yearMonth}-${dayStr}`;

                // Process Shift Holidays
                const shiftType = shifts ? shifts[key] : null;
                if (shiftType && labelMap[shiftType]) {
                    const label = labelMap[shiftType];
                    newEvents.push({
                        id: `shift-off-${cm.id}-${dateStr}-${Math.random().toString(36).substring(2, 7)}`,
                        title: label,
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
                        id: `shift-tele-${cm.id}-${dateStr}-${Math.random().toString(36).substring(2, 7)}`,
                        title: `テレワーク`,
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
