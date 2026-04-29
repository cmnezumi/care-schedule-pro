import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .select('data')
            .eq('month', 'system_routines')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "Results contain 0 rows"
            throw error;
        }

        const routines = data?.data?.routines || [];
        return NextResponse.json(routines);
    } catch (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ message: 'Error reading from Supabase' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const routines = await request.json();

        const { error } = await supabase
            .from('shifts')
            .upsert({
                month: 'system_routines',
                care_manager_id: 'system',
                data: { routines },
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        return NextResponse.json({ message: 'Saved successfully' }, { status: 200 });
    } catch (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
    }
}
