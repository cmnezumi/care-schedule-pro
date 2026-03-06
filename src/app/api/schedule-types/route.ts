import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('schedule_types')
            .select('*');

        if (error) throw error;

        const formattedTypes = data.map(t => ({
            id: t.id,
            name: t.name,
            color: t.color,
            defaultStartTime: t.default_start_time,
            defaultEndTime: t.default_end_time
        }));

        return NextResponse.json(formattedTypes);
    } catch (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ message: 'Error reading from Supabase' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const newType = await request.json();
        if (!newType.name) {
            return NextResponse.json({ message: 'Type name is required' }, { status: 400 });
        }

        const typeWithId = {
            id: newType.id || Math.random().toString(36).substr(2, 9),
            name: newType.name,
            color: newType.color,
            default_start_time: newType.defaultStartTime,
            default_end_time: newType.defaultEndTime
        };

        const { data, error } = await supabase
            .from('schedule_types')
            .upsert(typeWithId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ message: 'ID is required' }, { status: 400 });
        }

        const { error } = await supabase
            .from('schedule_types')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ message: 'Error deleting from Supabase' }, { status: 500 });
    }
}
