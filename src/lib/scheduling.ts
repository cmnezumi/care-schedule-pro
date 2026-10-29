import { Client, Visit } from '@/types';

// extract prefix for categorization
export function extractPrefixAndName(name: string): { prefix: string, cleanName: string } {
    if (name.startsWith('●') || name.startsWith('★')) {
        return { prefix: name.charAt(0), cleanName: name.substring(1).trim() };
    }
    return { prefix: '', cleanName: name.trim() };
}

export function generateMonitoringSchedule(
    clients: Client[],
    monthStr: string, // YYYY-MM
    shifts: Record<string, string>,
    telework: Record<string, boolean>,
    existingEvents: any[] = []
): any[] {
    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    // 1. Extract valid working days for the month
    const availableDays: number[] = [];
    const todayDate = new Date();
    const currentYear = todayDate.getFullYear();
    const currentMonth = todayDate.getMonth() + 1;
    const currentDay = todayDate.getDate();

    const isCurrentMonth = (year === currentYear && month === currentMonth);

    for (let i = 0; i < lastDay; i++) {
        const dayOfMonth = i + 1;
        
        // 当月の場合は、今日より前の日付（過去日）を除外する
        if (isCurrentMonth && dayOfMonth < currentDay) {
            continue;
        }

        // Shift format assumes '0-{dayIndex}' where 0 is the care manager
        const shiftStatus = shifts[`0-${i}`]; 
        
        const pad = (n: number) => String(n).padStart(2, '0');
        const toJSTDateStr = (dateInput: any): string => {
            if (!dateInput) return '';
            const d = new Date(dateInput);
            if (isNaN(d.getTime())) return '';
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(d);
        };
        const targetDateStr = `${year}-${pad(month)}-${pad(dayOfMonth)}`;

        // Check if there is an existing telework or holiday event on this day in existingEvents
        const hasTeleworkEvent = existingEvents.some(e => {
            if (!e) return false;
            const isTele = e.extendedProps?.type === 'telework' || 
                          e.extendedProps?.type === 'テレワーク' || 
                          e.title?.includes('テレワーク') ||
                          e.title?.includes('在宅');
            return isTele && toJSTDateStr(e.start) === targetDateStr;
        });

        const hasHolidayEvent = existingEvents.some(e => {
            if (!e) return false;
            const isHol = e.extendedProps?.type === 'holiday' || 
                          e.extendedProps?.type === 'paid_leave' || 
                          e.title?.includes('有休') || 
                          e.title?.includes('公休') || 
                          e.title?.includes('希望休') || 
                          e.title?.includes('休暇') ||
                          e.title?.includes('休み');
            return isHol && toJSTDateStr(e.start) === targetDateStr;
        });

        const isTelework = telework[`0-${i}`] === true || telework[`${dayOfMonth}`] === true || hasTeleworkEvent || shiftStatus === 'telework' || shiftStatus === 'テレワーク' || shiftStatus === '在宅';
        const isHoliday = ['hope_holiday', 'paid_leave', 'am_paid_leave', 'pm_paid_leave', 'legal_holiday', 'legal_out_holiday', 'auto_holiday', 'holiday', '休', '有休', '公休', '希望休'].includes(shiftStatus || '') || hasHolidayEvent;
        
        const dateObj = new Date(year, month - 1, dayOfMonth);
        const dayOfWeek = dateObj.getDay();
        
        if (shiftStatus) {
            if (!isHoliday && !isTelework) availableDays.push(dayOfMonth);
        } else {
            // fallback: not weekend, not holiday, and not telework
            if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday && !isTelework) availableDays.push(dayOfMonth);
        }
    }
    const events: any[] = [];
    let eventIdCounter = 1;

    // Time slots for a day (6 people max: avoiding 12:00-13:30, strictly 6 slots per user request)
    const allTimeSlots = ["10:00", "11:00", "13:30", "14:15", "15:00", "15:45"];

    // A map to track who is assigned to which day and which slots are free for the CM
    const calendar: { [day: number]: { assigned: Client[], cmFreeSlots: string[] } } = {};
    
    // CM events are personal events, conferences, routines, assessments, or monitorings
    const cmEvents = existingEvents.filter(e => 
        e.extendedProps?.isPersonal || 
        e.extendedProps?.type === 'conference' || 
        e.extendedProps?.type === 'routine' || 
        e.extendedProps?.type === 'assessment' || 
        e.extendedProps?.type === 'monitoring' || 
        e.title?.includes('担当者会議') || 
        e.title?.includes('認定調査') || 
        e.title?.includes('アセスメント') || 
        e.title?.includes('モニタリング')
    );

    availableDays.forEach(d => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const dayPrefix = `${year}-${pad(month)}-${pad(d)}T`;
        
        const dayCMEvents = cmEvents.filter(e => {
            const st = e.start?.toISOString ? e.start.toISOString() : String(e.start);
            return st.startsWith(dayPrefix);
        });

        let freeSlots = allTimeSlots.filter(slot => {
            return !dayCMEvents.some(e => {
                if (e.allDay) return false; // all day events don't block specific time slots
                const eStart = new Date(e.start);
                const eEnd = e.end ? new Date(e.end) : new Date(eStart.getTime() + 30*60*1000); // 30 mins duration for conflict check
                const slotStart = new Date(`${dayPrefix}${slot}:00+09:00`);
                const slotEnd = new Date(slotStart.getTime() + 30*60*1000);
                return eStart < slotEnd && eEnd > slotStart;
            });
        });

        calendar[d] = { assigned: [], cmFreeSlots: freeSlots };
    });

    // Function to get slots free for BOTH CM and specific Client(s)
    const getClientFreeSlots = (day: number, clientIds: string[]) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const dayPrefix = `${year}-${pad(month)}-${pad(day)}T`;
        
        const clientEvents = existingEvents.filter(e => {
            const st = e.start?.toISOString ? e.start.toISOString() : String(e.start);
            const cId = e.extendedProps?.clientId || e.clientId;
            return st.startsWith(dayPrefix) && clientIds.includes(cId);
        });

        return calendar[day].cmFreeSlots.filter(slot => {
            return !clientEvents.some(e => {
                const eStart = new Date(e.start);
                const eEnd = e.end ? new Date(e.end) : new Date(eStart.getTime() + 60*60*1000);
                const slotStart = new Date(`${dayPrefix}${slot}:00+09:00`);
                const slotEnd = new Date(slotStart.getTime() + 30*60*1000);
                return eStart < slotEnd && eEnd > slotStart;
            });
        });
    };

    // Helper to assign a client and create event
    const assignClient = (c: Client, day: number, startTimeStr: string) => {
        calendar[day].assigned.push(c);
        calendar[day].cmFreeSlots = calendar[day].cmFreeSlots.filter(s => s !== startTimeStr);
        
        const pad = (n: number) => String(n).padStart(2, '0');
        const [hStr, mStr] = startTimeStr.split(':');
        const startIso = `${year}-${pad(month)}-${pad(day)}T${pad(Number(hStr))}:${pad(Number(mStr))}:00+09:00`;
        const startObj = new Date(startIso);
        const endObj = new Date(startObj.getTime() + 30 * 60 * 1000); // 30 min duration
        const endIso = `${year}-${pad(month)}-${pad(day)}T${pad(endObj.getHours())}:${pad(endObj.getMinutes())}:00+09:00`;
        
        events.push({
            id: `auto-${Date.now()}-${eventIdCounter++}`,
            title: `モニタリング: ${c.name}`,
            start: startIso,
            end: endIso,
            allDay: false,
            backgroundColor: '#0ea5e9', // monitoring color
            extendedProps: {
                clientId: c.id,
                type: 'monitoring',
                status: 'scheduled'
            }
        });
    };

    // 2. Group Clients
    let remainingClients = [...clients];
    
    // Couples
    const couples: Client[][] = [];
    const hamamatsu = remainingClients.filter(c => c.name.includes('濱'));
    if (hamamatsu.length >= 2) {
        couples.push([hamamatsu[0], hamamatsu[1]]);
        remainingClients = remainingClients.filter(c => c.id !== hamamatsu[0].id && c.id !== hamamatsu[1].id);
    }
    
    const kimuraK = remainingClients.find(c => c.name.includes('木◯か'));
    const kimuraT = remainingClients.find(c => c.name.includes('木◯忠'));
    if (kimuraK && kimuraT) {
        couples.push([kimuraK, kimuraT]);
        remainingClients = remainingClients.filter(c => c.id !== kimuraK.id && c.id !== kimuraT.id);
    }

    const sameBldg: Client[] = []; // ●
    const home: Client[] = []; // ★
    const officeBldg: Client[] = []; // None

    remainingClients.forEach(c => {
        const { prefix } = extractPrefixAndName(c.name);
        if (prefix === '●') sameBldg.push(c);
        else if (prefix === '★') home.push(c);
        else officeBldg.push(c);
    });

    // 3. Assign
    const findBestDayAndSlot = (cList: Client[], isRenewal: boolean, groupType: 'office' | 'same' | 'home' | 'couple') => {
        const allowedDays = availableDays.filter(d => isRenewal ? d >= 7 : d >= 10);
        const candidateDays = allowedDays.length > 0 ? allowedDays : availableDays;

        if (candidateDays.length === 0) {
            return { day: 1, slots: [] };
        }

        const neededSlots = cList.length;
        const clientIds = cList.map(c => c.id);
        
        let validDays = candidateDays.filter(d => calendar[d] && getClientFreeSlots(d, clientIds).length >= neededSlots);

        if (validDays.length === 0) {
            // Pick from candidateDays the day with the most free slots or fewest assignments
            const sortedByAvailability = [...candidateDays].sort((a, b) => {
                const freeA = calendar[a] ? calendar[a].cmFreeSlots.length : 0;
                const freeB = calendar[b] ? calendar[b].cmFreeSlots.length : 0;
                return freeB - freeA;
            });
            const fallbackDay = sortedByAvailability[0];
            const slots = calendar[fallbackDay] ? calendar[fallbackDay].cmFreeSlots : [];
            return { day: fallbackDay, slots };
        }
        
        let chosenDay = validDays[0];
        
        if (groupType === 'same') {
             const daysWithSame = validDays.filter(d => calendar[d] && calendar[d].assigned.some(c => c.name.startsWith('●')));
             if (daysWithSame.length > 0) chosenDay = daysWithSame[0];
        }

        return { day: chosenDay, slots: getClientFreeSlots(chosenDay, clientIds) };
    };

    const scheduleList = (list: Client[], type: 'office' | 'same' | 'home') => {
        list.forEach(c => {
            const isRenewal = c.planRenewalDate === monthStr;
            const { day, slots } = findBestDayAndSlot([c], isRenewal, type);
            // Default to the earliest free slot available or fallback slot
            const slotStr = slots[0] || "17:30"; 
            assignClient(c, day, slotStr);
        });
    };

    // Priority 1: Couples
    couples.forEach(couple => {
        const isRenewal = couple.some(c => c.planRenewalDate === monthStr);
        const { day, slots } = findBestDayAndSlot(couple, isRenewal, 'couple');
        assignClient(couple[0], day, slots[0] || "16:30");
        assignClient(couple[1], day, slots[1] || "17:30");
    });

    // Priority 2: Office (max 5)
    scheduleList(officeBldg, 'office');

    // Priority 3: Same Bldg (●)
    scheduleList(sameBldg, 'same');
    
    // Priority 4: Home (★)
    scheduleList(home, 'home');
    
    return events;
}

export function generatePrepEvents(
    monthStr: string,
    shifts: Record<string, string>,
    telework: Record<string, boolean>,
    events: any[]
): any[] {
    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    
    const pad = (n: number) => String(n).padStart(2, '0');
    // JST日付文字列（YYYY-MM-DD）を取得するヘルパー
    const toJSTDateStr = (isoStr: string): string => {
        const d = new Date(isoStr);
        const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        return jst.toISOString().split('T')[0];
    };

    const hasShiftData = Object.keys(shifts).length > 0;

    const isWorkingDay = (day: number) => {
        if (day < 1) return false;
        const dIdx = day - 1;
        const shiftStatus = shifts[`0-${dIdx}`]; 
        
        const targetDateStr = `${year}-${pad(month)}-${pad(day)}`;

        // タイムゾーンを考慮してJST日付で比較する
        const hasTeleworkEvent = events.some(e => {
            const st = e.start?.toISOString ? e.start.toISOString() : String(e.start);
            const isTele = e.extendedProps?.type === 'telework' || e.extendedProps?.type === 'テレワーク' || e.title?.includes('テレワーク');
            return isTele && toJSTDateStr(st) === targetDateStr;
        });

        const isTele = telework[`0-${dIdx}`] === true || hasTeleworkEvent;
        
        if (isTele) return false; // Telework is not for office-based prep work

        const hasHolidayEvent = events.some(e => {
            const st = e.start?.toISOString ? e.start.toISOString() : String(e.start);
            const isHol = e.extendedProps?.type === 'holiday' || e.title?.includes('公休') || e.title?.includes('法定') || e.title?.includes('有休') || e.title?.includes('希望休');
            return isHol && toJSTDateStr(st) === targetDateStr;
        });
        if (hasHolidayEvent) return false;

        if (hasShiftData) {
            if (shiftStatus && ['hope_holiday', 'paid_leave', 'legal_holiday', 'legal_out_holiday', 'auto_holiday'].includes(shiftStatus)) {
                return false;
            }
            return true;
        } else {
            const dayOfWeek = new Date(year, month - 1, day).getDay();
            return dayOfWeek !== 0 && dayOfWeek !== 6;
        }
    };

    const getPreviousWorkingDay = (day: number) => {
        let prevDay = day - 1;
        while (prevDay >= 1 && !isWorkingDay(prevDay)) {
            prevDay--;
        }
        return prevDay >= 1 ? prevDay : null;
    };

    const prepEvents: any[] = [];
    let eventIdCounter = 1;

    // 事前準備が必要な往診クリニック（この4つのみが対象）
    const targetClinics = ['福永A', '福永B', '小竹', 'ふくしま'];

    // クリニック名を特定・正規化するヘルパー（対象4クリニックのみ抽出）
    const getClinicName = (evt: any): string | null => {
        const title = evt.title || '';
        const type = evt.extendedProps?.type || '';

        for (const clinic of targetClinics) {
            if (title.includes(clinic) || type.includes(clinic)) {
                return clinic;
            }
        }

        return null;
    };

    const currentMonthClinicEvents = events.filter(e => {
        return getClinicName(e) !== null;
    });

    // 前営業日とクリニック名をキーにして同一枠に集約（利用者ごとの重複を防ぐ）
    const prepMap = new Map<string, { clinicName: string, prevWorkDay: number, day: number }>();

    currentMonthClinicEvents.forEach(clinicEvt => {
        const stStr = clinicEvt.start?.toISOString ? clinicEvt.start.toISOString() : String(clinicEvt.start);
        const jstDateStr = toJSTDateStr(stStr);
        const [y, m, d] = jstDateStr.split('-').map(Number);
        if (y !== year || m !== month) return;

        const day = d;
        const prevWorkDay = getPreviousWorkingDay(day);
        if (prevWorkDay !== null) {
            const clinicName = getClinicName(clinicEvt)!;
            const key = `${prevWorkDay}-${clinicName}`;
            if (!prepMap.has(key)) {
                prepMap.set(key, { clinicName, prevWorkDay, day });
            }
        }
    });

    prepMap.forEach((data) => {
        const dayPrefix = `${year}-${pad(month)}-${pad(data.prevWorkDay)}T`;
        
        const startIso = `${dayPrefix}16:30:00+09:00`;
        const endIso = `${dayPrefix}17:30:00+09:00`;
        
        // 利用者個別の名前は付けず、「複数名」としてクリニック単位で1件だけ作成
        prepEvents.push({
            id: `auto-prep-${Date.now()}-${eventIdCounter++}`,
            title: `事前準備（${data.clinicName}）(複数名)`,
            start: startIso,
            end: endIso,
            allDay: false,
            backgroundColor: '#f43f5e',
            extendedProps: {
                type: 'office_work',
                status: 'scheduled',
                isPersonal: true,
                autoGeneratedPrep: true
            }
        });
    });

    return prepEvents;
}
