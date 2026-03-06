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
        data.forEach(item => {
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

        const { error } = await supabase
            .from('shifts')
            .upsert({
                month: yearMonth,
                care_manager_id: 'cm1', // Default
                data: shiftData,
                updated_at: shiftData.updatedAt
            });

        if (error) throw error;

        return NextResponse.json({ message: 'Saved successfully' }, { status: 200 });
    } catch (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
    }
}
