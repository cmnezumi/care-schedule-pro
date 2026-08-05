import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// JST で YYYY-MM-DD を返すユーティリティ
function toJSTDateStr(date: Date): string {
    const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return jst.toISOString().split('T')[0];
}

// YYYY-MM-DD 文字列から Date オブジェクト（JST 0:00）を返す
function parseDateStr(dateStr: string): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    // UTC で前日15時 = JST 当日0時
    return new Date(Date.UTC(y, m - 1, d, -9, 0, 0));
}

// 指定日（YYYY-MM-DD）がシフト上で出勤かどうか判定
function isWorkingDay(
    dateStr: string,
    shiftsMap: Record<string, string>,
    teleworkMap: Record<string, boolean>,
    teleworkEventDates: Set<string>
): boolean {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dIdx = d - 1; // 0-indexed
    const key = `0-${dIdx}`;
    const shiftStatus = shiftsMap[key];
    const isTelework = teleworkMap[key] === true || teleworkEventDates.has(dateStr);
    const isHoliday = ['hope_holiday', 'paid_leave', 'legal_holiday', 'legal_out_holiday', 'auto_holiday'].includes(shiftStatus || '');

    if (isTelework) return false;
    if (shiftStatus) return !isHoliday;

    // シフト未登録の場合は土日を除外
    const dateObj = new Date(y, m - 1, d);
    const dow = dateObj.getDay();
    return dow !== 0 && dow !== 6;
}

// 指定日の翌出勤日（YYYY-MM-DD）を返す（最大60日先まで探す）
function getNextWorkingDay(
    fromDateStr: string,
    shiftsData: Record<string, { shifts: Record<string, string>; telework: Record<string, boolean> }>,
    teleworkEventDates: Set<string>
): string | null {
    const from = parseDateStr(fromDateStr);
    for (let offset = 1; offset <= 60; offset++) {
        const next = new Date(from.getTime() + offset * 86400000);
        const nextStr = toJSTDateStr(next);
        const [y, m] = nextStr.split('-');
        const monthKey = `${y}-${m}`;
        const monthData = shiftsData[monthKey] || { shifts: {}, telework: {} };
        if (isWorkingDay(nextStr, monthData.shifts, monthData.telework, teleworkEventDates)) {
            return nextStr;
        }
    }
    return null;
}

export async function POST() {
    try {
        // 1. 今日のJST日付
        const nowJST = toJSTDateStr(new Date());

        // 2. 未完了・期限切れのルーティンイベントを取得
        //    start_time < 今日の00:00 UTC相当 かつ type=routine かつ status=scheduled
        const todayUTC = `${nowJST}T00:00:00+09:00`; // JST 0:00 = 前日15:00 UTC

        const { data: overdueEvents, error: fetchErr } = await supabase
            .from('events')
            .select('*')
            .filter('extended_props->>type', 'eq', 'routine')
            .filter('extended_props->>status', 'eq', 'scheduled')
            .lt('start_time', todayUTC);

        if (fetchErr) throw fetchErr;
        if (!overdueEvents || overdueEvents.length === 0) {
            return NextResponse.json({ moved: 0 });
        }

        // 3. シフトデータを取得
        const { data: shiftsRaw, error: shiftErr } = await supabase
            .from('shifts')
            .select('*');
        if (shiftErr) throw shiftErr;

        const shiftsData: Record<string, { shifts: Record<string, string>; telework: Record<string, boolean> }> = {};
        (shiftsRaw || []).forEach((row: any) => {
            if (row.month && row.month !== 'system_routines') {
                shiftsData[row.month] = row.data || { shifts: {}, telework: {} };
            }
        });

        // 4. テレワークイベントの日付セットを作成（カレンダー上にあるもの）
        const { data: allEvents } = await supabase
            .from('events')
            .select('start_time, extended_props, title');
        const teleworkEventDates = new Set<string>();
        (allEvents || []).forEach((e: any) => {
            const type = e.extended_props?.type;
            const title = e.title || '';
            if (type === 'telework' || type === 'テレワーク' || title.includes('テレワーク')) {
                const d = new Date(e.start_time);
                teleworkEventDates.add(toJSTDateStr(d));
            }
        });

        // 5. 各イベントを次の出勤日に移動
        let movedCount = 0;
        const updates: any[] = [];

        for (const evt of overdueEvents) {
            const nextDay = getNextWorkingDay(nowJST, shiftsData, teleworkEventDates);
            if (!nextDay) continue;

            // 元の時刻部分を保持して日付だけ変更
            const origStart = new Date(evt.start_time);
            const origEnd = new Date(evt.end_time);
            const jstStart = new Date(origStart.getTime() + 9 * 60 * 60 * 1000);
            const jstEnd = new Date(origEnd.getTime() + 9 * 60 * 60 * 1000);
            const startHHMM = `${String(jstStart.getUTCHours()).padStart(2, '0')}:${String(jstStart.getUTCMinutes()).padStart(2, '0')}`;
            const endHHMM = `${String(jstEnd.getUTCHours()).padStart(2, '0')}:${String(jstEnd.getUTCMinutes()).padStart(2, '0')}`;

            const newStartTime = `${nextDay}T${startHHMM}:00+09:00`;
            const newEndTime = `${nextDay}T${endHHMM}:00+09:00`;

            updates.push({
                id: evt.id,
                title: evt.title,
                all_day: evt.all_day,
                start_time: newStartTime,
                end_time: newEndTime,
                background_color: evt.background_color,
                extended_props: evt.extended_props
            });
            movedCount++;
        }

        if (updates.length > 0) {
            const { error: upsertErr } = await supabase.from('events').upsert(updates);
            if (upsertErr) throw upsertErr;
        }

        return NextResponse.json({ moved: movedCount });
    } catch (error) {
        console.error('Rollover error:', error);
        return NextResponse.json({ message: 'Error during rollover' }, { status: 500 });
    }
}
