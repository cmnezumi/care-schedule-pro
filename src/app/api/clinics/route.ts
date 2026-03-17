import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('clinics')
            .select('*');

        if (error) throw error;

        const formattedClinics = data.map((c: any) => ({
            id: c.id,
            name: c.name,
            monthlyWeeks: c.monthly_weeks,
            dayOfWeek: c.day_of_week,
            startTime: c.start_time,
            endTime: c.end_time
        }));

        return NextResponse.json(formattedClinics);
    } catch (error: any) {
        console.error('Supabase error:', error);
        return NextResponse.json({
            message: 'Error reading from Supabase',
            error: error.message,
            code: error.code
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const newClinic = await request.json();

        if (!newClinic.name) {
            return NextResponse.json({ message: 'Clinic name is required' }, { status: 400 });
        }

        const clinicWithId = {
            id: newClinic.id || Math.random().toString(36).substr(2, 9),
            name: newClinic.name,
            monthly_weeks: newClinic.monthlyWeeks || [],
            day_of_week: newClinic.dayOfWeek ?? 0,
            start_time: newClinic.startTime || '10:00',
            end_time: newClinic.endTime || '11:00'
        };

        const { data, error } = await supabase
            .from('clinics')
            .upsert(clinicWithId)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data, { status: 201 });
    } catch (error) {
        console.error('Supabase error:', error);
        return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const updatedClinic = await request.json();
        if (!updatedClinic.id) {
            return NextResponse.json({ message: 'Clinic ID is required' }, { status: 400 });
        }

        const formattedClinic = {
            id: updatedClinic.id,
            name: updatedClinic.name,
            monthly_weeks: updatedClinic.monthlyWeeks,
            day_of_week: updatedClinic.dayOfWeek,
            start_time: updatedClinic.startTime,
            end_time: updatedClinic.endTime
        };

        const { data, error } = await supabase
            .from('clinics')
            .upsert(formattedClinic)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json(data);
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
            .from('clinics')
            .delete()
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ message: 'Deleted successfully' });
    } catch (error: any) {
        console.error('Supabase error:', error);
        return NextResponse.json({
            message: 'Error deleting from Supabase',
            error: error.message,
            code: error.code
        }, { status: 500 });
    }
}
