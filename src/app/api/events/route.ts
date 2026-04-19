import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ensureJst = (iso: string) => {
  if (!iso || typeof iso !== 'string') return iso;
  if (iso.includes('+') || iso.endsWith('Z')) return iso;
  // If it's a date-only string (YYYY-MM-DD), keep it as is for all-day events
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return `${iso}+09:00`;
};

const toJstIso = (y: number, m: number, d: number, h: number, min: number, allDay: boolean = false) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  if (allDay) return `${y}-${pad(m)}-${pad(d)}`;
  return `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}:00+09:00`;
};

// GET: 全てのイベントを取得
export async function GET() {
  try {
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      if (data.length < pageSize) break;
      page++;
    }

    // Map database fields to FullCalendar format
    const formattedEvents = allData.map((e: any) => ({
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

// Helper: Get JST date components safely
function getJSTInfo(date: Date) {
  // Use toLocaleString to get components in JST
  const jstStr = date.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
  // Format: "2024/3/25 10:00:00" or similar
  const [datePart, timePart] = jstStr.split(' ');
  const [y, m, d] = datePart.split('/').map(Number);
  const [h, min, s] = timePart.split(':').map(Number);
  
  // Get day of week by creating a temporary Date object in JST
  const dayOfWeek = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay();

  return { y, m, d, h, min, s, dayOfWeek };
}

// Helper: Expand recurring events
function expandEvent(event: any) {
  const baseId = event.id || Math.random().toString(36).substr(2, 9);
  const recurrence = event.extendedProps?.recurrenceType;

  const baseStartTime = ensureJst(event.start);
  const baseEndTime = ensureJst(event.end);
  const start = new Date(baseStartTime);
  const end = new Date(baseEndTime);

  const expanded: any[] = [];
  
  if (!recurrence || recurrence === 'none') {
    expanded.push({
      id: baseId,
      title: event.title,
      all_day: event.allDay ?? false,
      start_time: baseStartTime,
      end_time: baseEndTime,
      background_color: event.backgroundColor,
      extended_props: { ...event.extendedProps, baseEventId: baseId }
    });
    return expanded;
  }

  const { dayOfWeek: startDayJst, y: startYear, m: startMonth, d: startDate } = getJSTInfo(start);
  const { h: startH, min: startMin } = getJSTInfo(start);
  const { h: endH, min: endMin } = getJSTInfo(end);

  const limitDate = new Date(start);
  limitDate.setFullYear(start.getFullYear() + 2);

  let baseAdded = false;

  if (recurrence === 'weekly') {
    const days = event.extendedProps?.weeklyDays || [startDayJst];
    days.forEach((dayNum: number) => {
      for (let i = 0; i < 104; i++) {
        const diff = (dayNum - startDayJst + 7) % 7;
        const dayOffset = diff + (7 * i);

        // Using timestamp addition is safer for day offsets
        const nStart = new Date(start.getTime() + dayOffset * 86400000);
        const nEnd = new Date(end.getTime() + dayOffset * 86400000);
        const iStart = getJSTInfo(nStart);
        const iEnd = getJSTInfo(nEnd);

        if (nStart > limitDate) break;

        const isInitial = dayOffset === 0;
        if (isInitial) baseAdded = true;

        expanded.push({
          id: isInitial ? baseId : `${baseId}-w${dayNum}-${i}`,
          title: event.title,
          all_day: event.allDay ?? false,
          start_time: toJstIso(iStart.y, iStart.m, iStart.d, iStart.h, iStart.min, event.allDay),
          end_time: toJstIso(iEnd.y, iEnd.m, iEnd.d, iEnd.h, iEnd.min, event.allDay),
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
    const monthlyRecur = event.extendedProps?.monthlyRecur;
    const isWeekdayRecur = monthlyRecur?.type === 'weekday';
    const targetWeeks = monthlyRecur?.weeks || (monthlyRecur?.week ? [monthlyRecur.week] : [1]);
    const targetDay = monthlyRecur?.day || 0;

    for (let i = 0; i < 24; i++) {
      if (isWeekdayRecur) {
        const year = startYear + Math.floor((startMonth - 1 + i) / 12);
        const month = (startMonth - 1 + i) % 12;

        // Use JST for day of week calculation
        const firstOfMonthJstDay = new Date(new Date(year, month, 1).toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getDay();
        let firstDayOffset = targetDay - firstOfMonthJstDay;
        if (firstDayOffset < 0) firstDayOffset += 7;

        targetWeeks.forEach((targetWeek: number) => {
          const expectedDate = 1 + firstDayOffset + (targetWeek - 1) * 7;
          const lastDay = new Date(year, month + 1, 0).getDate();

          if (expectedDate <= lastDay) {
            if (i > 0 || expectedDate >= startDate) {
              const nextDate = new Date(year, month, expectedDate, startH, startMin, 0);
              const nextEndDate = new Date(year, month, expectedDate, endH, endMin, 0);
              
              const isInitial = i === 0 && expectedDate === startDate && !baseAdded;
              if (isInitial) baseAdded = true;

              expanded.push({
                id: isInitial ? baseId : `${baseId}-m-${i}-w${targetWeek}`,
                title: event.title,
                all_day: event.allDay ?? false,
                start_time: toJstIso(year, month + 1, expectedDate, startH, startMin, event.allDay),
                end_time: toJstIso(year, month + 1, expectedDate, endH, endMin, event.allDay),
                background_color: event.backgroundColor,
                extended_props: {
                  ...event.extendedProps,
                  isRecurringInstance: !isInitial,
                  baseEventId: baseId
                }
              });
            }
          }
        });
      } else {
        const year = startYear + Math.floor((startMonth - 1 + i) / 12);
        const month = (startMonth - 1 + i) % 12;
        const lastDay = new Date(year, month + 1, 0).getDate();
        const targetDate = Math.min(startDate, lastDay);

        const nextDate = new Date(year, month, targetDate, startH, startMin, 0);
        const nextEndDate = new Date(year, month, targetDate, endH, endMin, 0);

        const isInitial = i === 0;
        if (isInitial) baseAdded = true;

        expanded.push({
          id: isInitial ? baseId : `${baseId}-m-${i}`,
          title: event.title,
          all_day: event.allDay ?? false,
          start_time: toJstIso(year, month + 1, targetDate, startH, startMin, event.allDay),
          end_time: toJstIso(year, month + 1, targetDate, endH, endMin, event.allDay),
          background_color: event.backgroundColor,
          extended_props: {
            ...event.extendedProps,
            isRecurringInstance: !isInitial,
            baseEventId: baseId
          }
        });
      }
    }
  }

  if (!baseAdded) {
    expanded.push({
      id: baseId,
      title: event.title,
      all_day: event.allDay ?? false,
      start_time: baseStartTime,
      end_time: baseEndTime,
      background_color: event.backgroundColor,
      extended_props: { ...event.extendedProps, baseEventId: baseId }
    });
  }

  return expanded;
}

// POST: 新しいイベントを追加
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inputEvents = Array.isArray(body) ? body : [body];
    const expandedEvents: any[] = [];

    inputEvents.forEach(event => {
      expandedEvents.push(...expandEvent(event));
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

    const baseEventId = event.extendedProps?.baseEventId;
    const updateAll = event.editTargetChoice === 'all' && baseEventId;

    if (updateAll) {
      // 1. Delete all existing instance of this series
      const { error: deleteError } = await supabase
        .from('events')
        .delete()
        .filter('extended_props->>baseEventId', 'eq', baseEventId);

      if (deleteError) throw deleteError;

      // 2. Re-expand and upsert
      // Use the same baseEventId to maintain the link
      const regenedEvents = expandEvent({
        ...event,
        id: baseEventId // Ensure the base ID is consistent
      });

      const { data, error: updateError } = await supabase
        .from('events')
        .upsert(regenedEvents)
        .select();

      if (updateError) throw updateError;
      return NextResponse.json(data);
    }

    // Default: update a single instance
    const formattedEvent = {
      id: event.id,
      title: event.title,
      all_day: event.allDay ?? false,
      start_time: ensureJst(event.start),
      end_time: ensureJst(event.end),
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
    const choice = searchParams.get('choice');
    const dateQuery = searchParams.get('date');

    if (!id) {
      return NextResponse.json({ message: 'ID is required' }, { status: 400 });
    }

    if (choice === 'this_instance' && dateQuery) {
        // Find the base event
        const { data: eventData } = await supabase.from('events').select('extended_props').eq('id', id).single();
        if (eventData) {
            const dateStr = dateQuery.split('T')[0];
            const currentExcluded = eventData.extended_props?.excludedDates || [];
            if (!currentExcluded.includes(dateStr)) {
                currentExcluded.push(dateStr);
            }
            await supabase.from('events').update({
                extended_props: {
                    ...eventData.extended_props,
                    excludedDates: currentExcluded
                }
            }).eq('id', id);
            return NextResponse.json({ message: 'Instance excluded successfully' });
        }
    }

    if (choice === 'all' || choice === 'following') {
      if (choice === 'all') {
         await supabase.from('events').delete().eq('id', id);
         return NextResponse.json({ message: 'Series deleted successfully' });
      }

      if (choice === 'following' && dateQuery) {
         const { data: eventData } = await supabase.from('events').select('extended_props').eq('id', id).single();
         if (eventData) {
             const dateStr = dateQuery.split('T')[0];
             await supabase.from('events').update({
                 extended_props: {
                     ...eventData.extended_props,
                     endRecur: dateStr
                 }
             }).eq('id', id);
             return NextResponse.json({ message: 'Upcoming events removed' });
         }
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
