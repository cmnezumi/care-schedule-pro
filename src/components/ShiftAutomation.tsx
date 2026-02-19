"use client";

import React, { useState, useEffect } from 'react';

const ShiftAutomation = () => {
    const [year, setYear] = useState(2026);
    const [month, setMonth] = useState(2);
    const [legalInCount, setLegalInCount] = useState(4);
    const [legalOutCount, setLegalOutCount] = useState(5);
    const [inputMode, setInputMode] = useState<'standard' | 'telework' | 'oncall'>('standard');
    const [isLoading, setIsLoading] = useState(false);

    const staffList = ['スタッフA', 'スタッフB', 'スタッフC'];
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

    const getDaysInMonth = (y: number, m: number) => {
        const date = new Date(y, m - 1, 1);
        const result = [];
        while (date.getMonth() === m - 1) {
            result.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return result;
    };

    const days = getDaysInMonth(year, month);
    const [shiftState, setShiftState] = useState<Record<string, string>>({});
    const [onCallState, setOnCallState] = useState<Record<string, string>>({});
    const [teleworkState, setTeleworkState] = useState<Record<string, boolean>>({});

    const yearMonth = `${year}-${month.toString().padStart(2, '0')}`;

    // Load data
    useEffect(() => {
        const loadShifts = async () => {
            setIsLoading(true);
            try {
                const res = await fetch('/api/shifts');
                const allShifts = await res.json();
                const data = allShifts[yearMonth];
                if (data) {
                    setShiftState(data.shifts || {});
                    setOnCallState(data.onCall || {});
                    setTeleworkState(data.telework || {});
                } else {
                    setShiftState({});
                    setOnCallState({});
                    setTeleworkState({});
                }
            } catch (e) {
                console.error("Failed to load shifts", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadShifts();
    }, [yearMonth]);

    const handleSave = async () => {
        try {
            const res = await fetch('/api/shifts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    yearMonth,
                    shifts: shiftState,
                    onCall: onCallState,
                    telework: teleworkState
                })
            });
            if (res.ok) {
                alert("保存しました");
            }
        } catch (e) {
            alert("保存に失敗しました");
        }
    };

    const handleCellClick = (staffIdx: number, dayIdx: number) => {
        const key = `${staffIdx}-${dayIdx}`;

        if (inputMode === 'oncall') {
            setOnCallState(prev => {
                const newState = { ...prev };
                if (newState[dayIdx] === staffIdx.toString()) {
                    delete newState[dayIdx];
                } else {
                    newState[dayIdx] = staffIdx.toString();
                }
                return newState;
            });
            return;
        }

        if (inputMode === 'telework') {
            setTeleworkState(prev => ({ ...prev, [key]: !prev[key] }));
            return;
        }

        const current = shiftState[key];
        let next = '';
        if (!current) next = 'hope_holiday';
        else if (current === 'hope_holiday') next = 'fixed_work';
        else if (current === 'fixed_work') next = 'paid_leave';
        else if (current === 'paid_leave') next = '';

        setShiftState(prev => {
            const newState = { ...prev };
            if (next) newState[key] = next;
            else delete newState[key];
            return newState;
        });
    };

    const toggleTelework = (staffIdx: number, dayIdx: number, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const key = `${staffIdx}-${dayIdx}`;
        setTeleworkState(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleAutoCreate = () => {
        const newShiftState = { ...shiftState };
        const newOnCallState: Record<string, string> = {};

        const dailyOffCount = days.map(() => 0);
        const getIsHol = (sIdx: number, dIdx: number, state: Record<string, string>) => {
            const type = state[`${sIdx}-${dIdx}`];
            return type && (type.includes('holiday') || type === 'paid_leave' || type === 'hope_holiday');
        };

        staffList.forEach((_, sIdx) => {
            days.forEach((_, dIdx) => {
                const key = `${sIdx}-${dIdx}`;
                if (['hope_holiday', 'paid_leave', 'legal_holiday', 'legal_out_holiday'].includes(newShiftState[key])) {
                    if (newShiftState[key] === 'hope_holiday' || newShiftState[key] === 'paid_leave') {
                        dailyOffCount[dIdx]++;
                    } else {
                        delete newShiftState[key];
                    }
                } else if (newShiftState[key] !== 'fixed_work' && newShiftState[key] !== 'work') {
                    delete newShiftState[key];
                } else if (newShiftState[key] === 'work') {
                    delete newShiftState[key];
                }
            });
        });

        staffList.forEach((_, sIdx) => {
            const targetLegal = legalInCount;
            const targetOut = legalOutCount;
            const totalHolidaysNeeded = targetLegal + targetOut;

            let assignedCount = 0;
            days.forEach((_, dIdx) => {
                const type = newShiftState[`${sIdx}-${dIdx}`];
                if (type === 'hope_holiday' || type === 'paid_leave') {
                    assignedCount++;
                }
            });

            let consecutiveHolidaysCount = 0;
            const availableIndices = days.map((_, i) => i).filter(i => !newShiftState[`${sIdx}-${i}`]);
            for (let i = availableIndices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [availableIndices[i], availableIndices[j]] = [availableIndices[j], availableIndices[i]];
            }

            const totalToAssign = totalHolidaysNeeded - assignedCount;
            let currentAssigned = 0;

            for (let d = 0; d < days.length && currentAssigned < totalToAssign; d++) {
                if (newShiftState[`${sIdx}-${d}`]) continue;
                let workStreak = 0;
                for (let k = d - 1; k >= 0; k--) {
                    if (!getIsHol(sIdx, k, newShiftState)) workStreak++; else break;
                }
                if (workStreak >= 3) {
                    const isWeekend = days[d].getDay() === 0 || days[d].getDay() === 6;
                    const maxOff = isWeekend ? 2 : 1;
                    if (dailyOffCount[d] < maxOff) {
                        newShiftState[`${sIdx}-${d}`] = 'auto_holiday';
                        currentAssigned++;
                        dailyOffCount[d]++;
                    }
                }
            }

            availableIndices.forEach(dIdx => {
                if (newShiftState[`${sIdx}-${dIdx}`] || currentAssigned >= totalToAssign) return;
                const isWeekend = days[dIdx].getDay() === 0 || days[dIdx].getDay() === 6;
                const maxOff = isWeekend ? 2 : 1;
                if (dailyOffCount[dIdx] >= maxOff) return;
                const prevIsHol = dIdx > 0 && getIsHol(sIdx, dIdx - 1, newShiftState);
                const nextIsHol = dIdx < days.length - 1 && getIsHol(sIdx, dIdx + 1, newShiftState);
                if (prevIsHol || nextIsHol) {
                    if (consecutiveHolidaysCount < 1) {
                        const prevPrevIsHol = dIdx > 1 && getIsHol(sIdx, dIdx - 2, newShiftState);
                        const nextNextIsHol = dIdx < days.length - 2 && getIsHol(sIdx, dIdx + 2, newShiftState);
                        if (prevPrevIsHol || nextNextIsHol) return;
                        consecutiveHolidaysCount++;
                    } else {
                        return;
                    }
                }
                newShiftState[`${sIdx}-${dIdx}`] = 'auto_holiday';
                currentAssigned++;
                dailyOffCount[dIdx]++;
            });

            availableIndices.forEach(dIdx => {
                if (newShiftState[`${sIdx}-${dIdx}`] || currentAssigned >= totalToAssign) return;
                newShiftState[`${sIdx}-${dIdx}`] = 'auto_holiday';
                currentAssigned++;
                dailyOffCount[dIdx]++;
            });

            let legalRemaining = targetLegal;
            days.forEach((_, dIdx) => {
                const type = newShiftState[`${sIdx}-${dIdx}`];
                if (type === 'hope_holiday' || type === 'paid_leave') {
                    if (legalRemaining > 0) legalRemaining--;
                }
            });

            days.forEach((_, dIdx) => {
                const key = `${sIdx}-${dIdx}`;
                if (newShiftState[key] === 'auto_holiday') {
                    if (legalRemaining > 0) {
                        newShiftState[key] = 'legal_holiday';
                        legalRemaining--;
                    } else {
                        newShiftState[key] = 'legal_out_holiday';
                    }
                }
            });

            days.forEach((_, dIdx) => {
                const key = `${sIdx}-${dIdx}`;
                if (!newShiftState[key]) newShiftState[key] = 'work';
            });
        });

        // 4. Refined On-Call Assignment
        const onCallCount = staffList.map(() => 0);
        const getIsWorking = (sIdx: number, dIdx: number, state: Record<string, string>) => {
            const type = state[`${sIdx}-${dIdx}`];
            return type === 'work' || type === 'fixed_work';
        };

        days.forEach((_, dIdx) => {
            // Find eligible staff (work both today and tomorrow)
            let eligible = staffList.map((_, i) => i).filter(sIdx => {
                const worksToday = getIsWorking(sIdx, dIdx, newShiftState);
                const worksTomorrow = dIdx < days.length - 1 ? getIsWorking(sIdx, dIdx + 1, newShiftState) : worksToday; // month-end fallback
                return worksToday && worksTomorrow;
            });

            // Fallback: just work today if no one works both
            if (eligible.length === 0) {
                eligible = staffList.map((_, i) => i).filter(sIdx => getIsWorking(sIdx, dIdx, newShiftState));
            }

            if (eligible.length > 0) {
                // Pick the one with the lowest monthly on-call count for fairness
                const chosenStaffIdx = eligible.reduce((prev, curr) =>
                    onCallCount[curr] < onCallCount[prev] ? curr : prev
                );
                newOnCallState[dIdx] = chosenStaffIdx.toString();
                onCallCount[chosenStaffIdx]++;
            }
        });

        setShiftState(newShiftState);
        setOnCallState(newOnCallState);
    };

    const getShiftLabel = (type: string) => {
        switch (type) {
            case 'work': return '日';
            case 'fixed_work': return '◎';
            case 'hope_holiday': return '✕';
            case 'paid_leave': return '有';
            case 'legal_holiday': return '法内';
            case 'legal_out_holiday': return '法外';
            default: return '';
        }
    };

    const getShiftColor = (type: string) => {
        if (type === 'hope_holiday') return 'text-rose-500 font-bold';
        if (type === 'paid_leave') return 'text-pink-500 font-bold';
        if (type === 'fixed_work') return 'text-emerald-600 font-bold';
        if (type === 'legal_holiday') return 'text-slate-700';
        if (type === 'legal_out_holiday') return 'text-slate-400';
        return 'text-slate-600';
    };

    return (
        <div className="flex flex-col h-full bg-white text-slate-800 relative">
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 z-50 flex items-center justify-center text-sm text-slate-500">
                    読み込み中...
                </div>
            )}

            <div className="p-3 border-b flex flex-wrap gap-2 items-center justify-between text-sm">
                <div className="flex flex-wrap gap-4 items-center">
                    <input type="month" value={yearMonth}
                        onChange={e => {
                            const [y, m] = e.target.value.split('-');
                            setYear(parseInt(y)); setMonth(parseInt(m));
                        }}
                        className="border p-1 bg-slate-50 rounded text-xs" />
                    <div className="flex gap-2 text-xs">
                        <div className="flex items-center gap-1"><span>法内:</span><input type="number" value={legalInCount} onChange={e => setLegalInCount(parseInt(e.target.value))} className="w-8 border-b text-center" /></div>
                        <div className="flex items-center gap-1"><span>法外:</span><input type="number" value={legalOutCount} onChange={e => setLegalOutCount(parseInt(e.target.value))} className="w-8 border-b text-center" /></div>
                    </div>
                </div>

                <div className="flex gap-1.5 overflow-x-auto">
                    <button
                        onClick={() => setInputMode(inputMode === 'telework' ? 'standard' : 'telework')}
                        className={`flex-shrink-0 border px-3 py-1.5 rounded text-[10px] font-bold transition-all shadow-sm ${inputMode === 'telework' ? 'bg-indigo-600 border-indigo-700 text-white ring-2 ring-indigo-200' : 'bg-white text-slate-700'}`}
                    >
                        {inputMode === 'telework' ? 'テレ入力ON' : 'テレ入力'}
                    </button>
                    <button
                        onClick={() => setInputMode(inputMode === 'oncall' ? 'standard' : 'oncall')}
                        className={`flex-shrink-0 border px-3 py-1.5 rounded text-[10px] font-bold transition-all shadow-sm ${inputMode === 'oncall' ? 'bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-200' : 'bg-white text-slate-700'}`}
                    >
                        {inputMode === 'oncall' ? 'オン入力ON' : 'オン入力'}
                    </button>
                    <button onClick={handleAutoCreate} className="flex-shrink-0 border px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded text-[10px] text-slate-600">自動作成</button>
                    <button onClick={handleSave} className="flex-shrink-0 px-4 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded text-[10px] font-bold shadow-sm">保存</button>
                </div>
            </div>

            {/* Helper Message for Modes */}
            {(inputMode === 'telework' || inputMode === 'oncall') && (
                <div className={`text-center py-1 text-[10px] font-bold text-white ${inputMode === 'telework' ? 'bg-indigo-500' : 'bg-emerald-500'}`}>
                    {inputMode === 'telework' ? '現在はテレワーク入力モードです。セルをタップして設定/解除してください。' : '現在はオンコール入力モードです。セルをタップして担当者を設定してください。'}
                </div>
            )}

            <div className="flex-grow overflow-auto relative touch-auto">
                <table className="w-full border-collapse border-t min-w-[800px] md:min-w-full leading-normal">
                    <thead>
                        <tr className="bg-slate-50">
                            <th className="sticky left-0 z-30 bg-slate-50 border-b border-r p-2 w-24 text-sm font-medium shadow-[1px_0_0_0_#e2e8f0]">スタッフ</th>
                            {days.map((day, dIdx) => (
                                <th key={dIdx} className={`sticky top-0 z-20 bg-slate-50 border-b border-r p-1 text-center min-w-[36px] ${day.getDay() === 0 ? 'text-rose-500' : day.getDay() === 6 ? 'text-blue-500' : ''}`}>
                                    <div className="text-xs font-bold">{day.getDate()}</div>
                                    <div className="text-[10px] text-slate-500">{weekDays[day.getDay()]}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {staffList.map((staff, sIdx) => (
                            <tr key={sIdx}>
                                <td className="sticky left-0 z-10 bg-white border-b border-r p-2 text-sm font-bold text-slate-700 shadow-[1px_0_0_0_#e2e8f0]">
                                    {staff.replace('スタッフ', '')}
                                </td>
                                {days.map((_, dIdx) => {
                                    const key = `${sIdx}-${dIdx}`;
                                    const type = shiftState[key];
                                    const isOnCall = onCallState[dIdx] === sIdx.toString();
                                    const isTele = teleworkState[key];
                                    const isHoliday = ['hope_holiday', 'paid_leave', 'legal_holiday', 'legal_out_holiday', 'auto_holiday'].includes(type);

                                    return (
                                        <td key={dIdx}
                                            onClick={() => handleCellClick(sIdx, dIdx)}
                                            onContextMenu={e => toggleTelework(sIdx, dIdx, e)}
                                            className={`border-b border-r p-0 text-center h-11 cursor-pointer transition-colors relative 
                          ${isOnCall ? 'bg-emerald-50' : isHoliday ? 'bg-yellow-50' : 'hover:bg-slate-50'} 
                          ${inputMode === 'telework' ? 'bg-indigo-50/10' : ''}
                          ${inputMode === 'oncall' ? 'bg-emerald-50/10' : ''}
                        `}>
                                            <div className={`text-xs font-medium ${getShiftColor(type)}`}>{getShiftLabel(type)}</div>
                                            {isTele && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full border border-white shadow-sm" />}
                                            {isOnCall && <div className="absolute bottom-0 inset-x-0 h-1.5 bg-emerald-400" />}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-3 text-[11px] text-slate-500 bg-slate-50 border-t flex flex-wrap gap-x-4 gap-y-2 items-center">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-500 rounded-full border border-white shadow-sm" />テレワーク</span>
                <span className="flex items-center gap-1.5"><span className="w-5 h-1.5 bg-emerald-400 rounded-sm" />オンコール</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-100 border border-slate-200 rounded-sm" />休日</span>
                <span className="ml-auto text-indigo-600 font-medium">※スマホは横画面推奨</span>
            </div>
        </div>
    );
};

export default ShiftAutomation;
