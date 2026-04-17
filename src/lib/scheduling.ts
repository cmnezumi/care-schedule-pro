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
    existingEvents: any[] = []
): any[] {
    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();

    // 1. Extract valid working days for the month
    const availableDays: number[] = [];
    for (let i = 0; i < lastDay; i++) {
        // Shift format assumes '0-{dayIndex}' where 0 is the care manager
        const shiftStatus = shifts[`0-${i}`]; 
        const isHoliday = ['hope_holiday', 'paid_leave', 'legal_holiday', 'legal_out_holiday', 'auto_holiday'].includes(shiftStatus || '');
        
        const dateObj = new Date(year, month - 1, i + 1);
        const dayOfWeek = dateObj.getDay();
        
        if (shiftStatus) {
            if (!isHoliday) availableDays.push(i + 1);
        } else {
            // fallback: not weekend
            if (dayOfWeek !== 0 && dayOfWeek !== 6) availableDays.push(i + 1);
        }
    }
    const events: any[] = [];
    let eventIdCounter = 1;

    // Time slots for a day (5 people max: avoiding 12:00-13:30, strictly 5 slots per user request)
    const allTimeSlots = ["10:00", "11:00", "13:30", "14:30", "15:30"];

    // A map to track who is assigned to which day and which slots are free for the CM
    const calendar: { [day: number]: { assigned: Client[], cmFreeSlots: string[] } } = {};
    
    // CM events are personal events or conferences
    const cmEvents = existingEvents.filter(e => e.extendedProps?.isPersonal || e.extendedProps?.type === 'conference' || e.title?.includes('担当者会議'));

    availableDays.forEach(d => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const dayPrefix = `${year}-${pad(month)}-${pad(d)}T`;
        
        const dayCMEvents = cmEvents.filter(e => {
            const st = e.start?.toISOString ? e.start.toISOString() : String(e.start);
            return st.startsWith(dayPrefix);
        });

        let freeSlots = allTimeSlots.filter(slot => {
            return !dayCMEvents.some(e => {
                const eStart = new Date(e.start);
                const eEnd = e.end ? new Date(e.end) : new Date(eStart.getTime() + 45*60*1000); // 45 mins duration for conflict check
                const slotStart = new Date(`${dayPrefix}${slot}:00+09:00`);
                const slotEnd = new Date(slotStart.getTime() + 45*60*1000);
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
                const slotEnd = new Date(slotStart.getTime() + 60*60*1000);
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
        const endObj = new Date(startObj.getTime() + 45 * 60 * 1000); // 45 min duration
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
        const neededSlots = cList.length;
        const clientIds = cList.map(c => c.id);
        
        let validDays = allowedDays.filter(d => getClientFreeSlots(d, clientIds).length >= neededSlots);

        if (validDays.length === 0) {
            const fallbackDay = allowedDays[allowedDays.length - 1] || 1; 
            return { day: fallbackDay, slots: calendar[fallbackDay].cmFreeSlots };
        }
        
        let chosenDay = validDays[0];
        
        if (groupType === 'same') {
             const daysWithSame = validDays.filter(d => calendar[d].assigned.some(c => c.name.startsWith('●')));
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
    events: any[]
): any[] {
    const [year, month] = monthStr.split('-').map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    
    const isWorkingDay = (day: number) => {
        if (day < 1) return false;
        const dIdx = day - 1;
        const shiftStatus = shifts[`0-${dIdx}`]; 
        if (!shiftStatus) {
            const dayOfWeek = new Date(year, month - 1, day).getDay();
            return dayOfWeek !== 0 && dayOfWeek !== 6;
        }
        return !['hope_holiday', 'paid_leave', 'legal_holiday', 'legal_out_holiday', 'auto_holiday'].includes(shiftStatus);
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

    const targetClinics = ['福永A', '福永B', '小竹', 'ふくしま'];

    const currentMonthClinicEvents = events.filter(e => {
        const title = e.title || '';
        const type = e.extendedProps?.type || '';
        return targetClinics.some(c => title.includes(c) || type.includes(c));
    });

    const prepMap = new Map<string, { baseName: string, prevWorkDay: number, day: number, clients: string[] }>();

    currentMonthClinicEvents.forEach(clinicEvt => {
        const startDateObj = new Date(clinicEvt.start);
        const day = startDateObj.getDate();
        
        const prevWorkDay = getPreviousWorkingDay(day);
        if (prevWorkDay !== null) {
            const baseName = clinicEvt.title ? clinicEvt.title.replace(/.*:\s*/, '') : (clinicEvt.extendedProps?.type || '往診');
            const clientName = clinicEvt.title && clinicEvt.title.includes(':') 
                ? clinicEvt.title.split(':')[0].trim() 
                : '複数名';
                
            const key = `${prevWorkDay}-${baseName}`;
            if (!prepMap.has(key)) {
                prepMap.set(key, { baseName, prevWorkDay, day, clients: [] });
            }
            const entry = prepMap.get(key)!;
            if (!entry.clients.includes(clientName)) {
                entry.clients.push(clientName);
            }
        }
    });

    prepMap.forEach((data) => {
        const pad = (n: number) => String(n).padStart(2, '0');
        const dayPrefix = `${year}-${pad(month)}-${pad(data.prevWorkDay)}T`;
        
        const startIso = `${dayPrefix}16:30:00+09:00`;
        const endIso = `${dayPrefix}17:30:00+09:00`;
        
        const titleSuffix = data.clients.length > 0 ? `(${data.clients.join('、')})` : '';
        
        prepEvents.push({
            id: `auto-prep-${Date.now()}-${eventIdCounter++}`,
            title: `事前準備（${data.baseName}）${titleSuffix}`,
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
