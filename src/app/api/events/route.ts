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

      // Add the initial event with JST timezone marker if not present
      const ensureJst = (iso: string) => iso.includes('+') || iso.endsWith('Z') ? iso : `${iso}+09:00`;

      const baseStartTime = ensureJst(event.start);
      const baseEndTime = ensureJst(event.end);

      // Handle recurrence expansion (next 6 months)
      if (recurrence && recurrence !== 'none') {
        const start = new Date(baseStartTime);
        const end = new Date(baseEndTime);
        const limitDate = new Date(start);
        limitDate.setMonth(start.getMonth() + 6);

        // We only add the base event if it's NOT a recurring instance that will be generated below
        // This avoids double-posting on the first day
        let baseAdded = false;

        if (recurrence === 'weekly') {
          const days = event.extendedProps?.weeklyDays || [start.getDay()];
          days.forEach((dayNum: number) => {
            for (let i = 0; i < 26; i++) {
              let nextStart = new Date(start);
              let nextEnd = new Date(end);
              const diff = (dayNum - start.getDay() + 7) % 7;
              const dayOffset = diff + (7 * i);

              nextStart.setDate(start.getDate() + dayOffset);
              nextEnd.setDate(end.getDate() + dayOffset);
              if (nextStart > limitDate) break;

              const isInitial = dayOffset === 0;
              if (isInitial) baseAdded = true;

              expandedEvents.push({
                id: isInitial ? baseId : `${baseId}-w${dayNum}-${i}`,
                title: event.title,
                all_day: event.allDay ?? false,
                start_time: nextStart.toISOString().replace(/Z$/, '+09:00'),
                end_time: nextEnd.toISOString().replace(/Z$/, '+09:00'),
                background_color: event.backgroundColor,
                extended_props: {
                  ...event.extendedProps,
                  isRecurringInstance: !isInitial,
                  baseEventId: baseId
                }
              });
            }
          });
        } else if (recurrence === 'monthly') {
          // Manual first event
          expandedEvents.push({
            id: baseId,
            title: event.title,
            all_day: event.allDay ?? false,
            start_time: baseStartTime,
            end_time: baseEndTime,
            background_color: event.backgroundColor,
            extended_props: { ...event.extendedProps, baseEventId: baseId }
          });
          baseAdded = true;

          for (let i = 1; i <= 6; i++) {
            let nextStart = new Date(start);
            let nextEnd = new Date(end);
            nextStart.setMonth(start.getMonth() + i);
            nextEnd.setMonth(end.getMonth() + i);
            expandedEvents.push({
              id: `${baseId}-m-${i}`,
              title: event.title,
              all_day: event.allDay ?? false,
              start_time: nextStart.toISOString().replace(/Z$/, '+09:00'),
              end_time: nextEnd.toISOString().replace(/Z$/, '+09:00'),
              background_color: event.backgroundColor,
              extended_props: { ...event.extendedProps, isRecurringInstance: true, baseEventId: baseId }
            });
          }
        }

        if (!baseAdded) {
          // If for some reason the clicked day wasn't in the recurrence days, still add it?
          // Actually, if it's weekly, we usually want it to land on a valid day.
          // For now, let's just make sure something is added if nothing was.
          expandedEvents.push({
            id: baseId,
            title: event.title,
            all_day: event.allDay ?? false,
            start_time: baseStartTime,
            end_time: baseEndTime,
            background_color: event.backgroundColor,
            extended_props: { ...event.extendedProps, baseEventId: baseId }
          });
        }
      } else {
        // No recurrence
        expandedEvents.push({
          id: baseId,
          title: event.title,
          all_day: event.allDay ?? false,
          start_time: baseStartTime,
          end_time: baseEndTime,
          background_color: event.backgroundColor,
          extended_props: { ...event.extendedProps, baseEventId: baseId }
        });
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

    const ensureJst = (iso: string) => iso.includes('+') || iso.endsWith('Z') ? iso : `${iso}+09:00`;

    const formattedEvent = {
      id: event.id,
      title: event.title,
      all_day: event.allDay ?? false,
      start_time: ensureJst(event.start),
      end_time: ensureJst(event.end),
      background_color: event.backgroundColor,
      extended_props: event.extendedProps || {}
    };

    const baseEventId = event.extendedProps?.baseEventId;
    const updateAll = event.editTargetChoice === 'all' && baseEventId;

    if (updateAll) {
      const { error } = await supabase
        .from('events')
        .update({
          title: event.title,
          background_color: event.backgroundColor,
          extended_props: event.extendedProps
        })
        .filter('extended_props->>baseEventId', 'eq', baseEventId);

      if (error) throw error;
      return NextResponse.json({ message: 'Series updated' });
    }

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
    const choice = searchParams.get('choice');

    if (!id) {
      return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    if (choice === 'all' || choice === 'following') {
      // First, get the event to find its baseEventId and start_time
      const { data: eventData } = await supabase
        .from('events')
        .select('start_time, extended_props')
        .eq('id', id)
        .single();

      const baseEventId = eventData?.extended_props?.baseEventId;

      if (baseEventId) {
        let query = supabase
          .from('events')
          .delete()
          .filter('extended_props->>baseEventId', 'eq', baseEventId);

        if (choice === 'following') {
          query = query.gte('start_time', eventData.start_time);
        }

        const { error } = await query;
        if (error) throw error;
        return NextResponse.json({ message: choice === 'all' ? 'Series deleted successfully' : 'Upcoming events deleted successfully' });
      }
    }

    // Default: delete single event
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ message: 'Error deleting from Supabase' }, { status: 500 });
  }
}
