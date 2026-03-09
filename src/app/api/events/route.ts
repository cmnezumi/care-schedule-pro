import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: 全てのイベントを取得
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*');

    if (error) throw error;

    // Map database fields to FullCalendar format
    const formattedEvents = data.map((e: any) => ({
      id: e.id,
      title: e.title,
      allDay: e.all_day,
      start: e.start_time,
      end: e.end_time,
      backgroundColor: e.background_color,
      extendedProps: e.extended_props
    }));

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error reading from Supabase' }, { status: 500 });
  }
}

// POST: 新しいイベントを追加（配列による一括登録もサポート）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inputEvents = Array.isArray(body) ? body : [body];

    const expandedEvents: any[] = [];

    inputEvents.forEach(event => {
      const baseId = event.id || Math.random().toString(36).substr(2, 9);
      const recurrence = event.extendedProps?.recurrenceType;

      // Add the initial event
      expandedEvents.push({
        id: baseId,
        title: event.title,
        all_day: event.allDay ?? false,
        start_time: event.start,
        end_time: event.end,
        background_color: event.backgroundColor,
        extended_props: { ...event.extendedProps, baseEventId: baseId }
      });

      // Handle recurrence expansion (next 6 months)
      if (recurrence && recurrence !== 'none') {
        const start = new Date(event.start);
        const end = new Date(event.end);

        for (let i = 1; i <= 26; i++) { // Approx 6 months for weekly
          let nextStart = new Date(start);
          let nextEnd = new Date(end);

          if (recurrence === 'weekly') {
            nextStart.setDate(start.getDate() + (7 * i));
            nextEnd.setDate(end.getDate() + (7 * i));
          } else if (recurrence === 'monthly') {
            nextStart.setMonth(start.getMonth() + i);
            nextEnd.setMonth(end.getMonth() + i);
            // Handle day-of-month shift if necessary, but setMonth is usually okay for simple monthly
          }

          expandedEvents.push({
            id: `${baseId}-${i}`,
            title: event.title,
            all_day: event.allDay ?? false,
            start_time: nextStart.toISOString(),
            end_time: nextEnd.toISOString(),
            background_color: event.backgroundColor,
            extended_props: { ...event.extendedProps, isRecurringInstance: true, baseEventId: baseId }
          });

          if (recurrence === 'monthly' && i >= 6) break; // Only 6 months for monthly
        }
      }
    });

    const { data, error } = await supabase
      .from('events')
      .upsert(expandedEvents)
      .select();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
  }
}

// PUT: イベントを更新
export async function PUT(request: Request) {
  try {
    const event = await request.json();
    if (!event.id) {
      return NextResponse.json({ message: 'Event ID is required' }, { status: 400 });
    }

    const formattedEvent = {
      id: event.id,
      title: event.title,
      all_day: event.allDay ?? false,
      start_time: event.start,
      end_time: event.end,
      background_color: event.backgroundColor,
      extended_props: event.extendedProps || {}
    };

    const { data, error } = await supabase
      .from('events')
      .upsert(formattedEvent)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error writing to Supabase' }, { status: 500 });
  }
}

// DELETE: イベントを削除
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let idsToDelete: string[] = [];
    try {
      const body = await request.clone().json();
      if (body && Array.isArray(body.ids)) {
        idsToDelete = body.ids;
      }
    } catch (e) {
      if (id) idsToDelete = [id];
    }

    if (idsToDelete.length === 0) {
      return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .in('id', idsToDelete);

    if (error) throw error;

    return NextResponse.json({ message: 'Deleted successfully', count: idsToDelete.length });
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error deleting from Supabase' }, { status: 500 });
  }
}
