"use client";

import React, { useState, useEffect } from 'react';

interface ShiftAutomationProps {
    initialYear?: number;
    initialMonth?: number;
}

const ShiftAutomation = ({
    initialYear = new Date().getFullYear(),
    initialMonth = new Date().getMonth() + 1
}: ShiftAutomationProps) => {
    const [year, setYear] = useState(initialYear);
    const [month, setMonth] = useState(initialMonth);
    const [legalInCount, setLegalInCount] = useState(4);
    const [legalOutCount, setLegalOutCount] = useState(5);
    const [paidLeaveCount, setPaidLeaveCount] = useState(0);
    const [inputMode, setInputMode] = useState<'standard' | 'telework' | 'oncall'>('standard');
    const [isLoading, setIsLoading] = useState(false);

    // スタッフリスト（3名体制。sIdx=0 がケアマネA＝ユーザー本人）
    const staffList = ['ケアマネ A', 'ケアマネ B', 'ケアマネ C'];
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

    // We keep a track of manual presets by storing them when clicked, or we can check which cells are manually set.
    // To distinguish manual versus automatic, we can store a separate set of keys that are manually set,
    // or just assume any shiftState that exists *before* clicking "Auto Create" is manual.
    // Let's store a state: manualKeys as a Record<string, boolean> to know which cells are manually set.
    const [manualKeys, setManualKeys] = useState<Record<string, boolean>>({});

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
                    // If shifts loaded from DB, we treat them as manual (since they were saved)
                    const loadedManuals: Record<string, boolean> = {};
                    if (data.shifts) {
                        Object.keys(data.shifts).forEach(k => {
                            if (data.shifts[k]) {
                                loadedManuals[k] = true;
                            }
                        });
                    }
                    setManualKeys(loadedManuals);
                } else {
                    setShiftState({});
                    setOnCallState({});
                    setTeleworkState({});
                    setManualKeys({});
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
        // Cycle: '' -> 'work' (日) -> 'legal_holiday' (法内) -> 'legal_out_holiday' (法外) -> 'paid_leave' (有休) -> 'am_paid_leave' (AM休) -> 'pm_paid_leave' (PM休)
        if (!current) next = 'work';
        else if (current === 'work') next = 'legal_holiday';
        else if (current === 'legal_holiday') next = 'legal_out_holiday';
        else if (current === 'legal_out_holiday') next = 'paid_leave';
        else if (current === 'paid_leave') next = 'am_paid_leave';
        else if (current === 'am_paid_leave') next = 'pm_paid_leave';
        else if (current === 'pm_paid_leave') next = '';

        setShiftState(prev => {
            const newState = { ...prev };
            if (next) {
                newState[key] = next;
            } else {
                delete newState[key];
            }
            return newState;
        });

        setManualKeys(prev => {
            const newState = { ...prev };
            if (next) {
                newState[key] = true;
            } else {
                delete newState[key];
            }
            return newState;
        });
    };

    const toggleTelework = (staffIdx: number, dayIdx: number, e: React.MouseEvent) => {
        e.preventDefault(); e.stopPropagation();
        const key = `${staffIdx}-${dayIdx}`;
        setTeleworkState(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // ---- 自動作成ロジック ----
    const handleAutoCreate = () => {
        const newShiftState = { ...shiftState };
        const newOnCallState: Record<string, string> = {};

        // 全スタッフ・全日の日別休み人数を追跡
        const dailyOffCount = days.map(() => 0);

        // 休日判定ヘルパー (AM休、PM休も公休や休みの扱いとしてカウント)
        const isHoliday = (sIdx: number, dIdx: number, state: Record<string, string>): boolean => {
            const type = state[`${sIdx}-${dIdx}`];
            return !!type && (
                type === 'legal_holiday' || type === 'legal_out_holiday' ||
                type === 'paid_leave' || type === 'am_paid_leave' || type === 'pm_paid_leave' ||
                type === 'hope_holiday' || type === 'auto_holiday'
            );
        };

        // 連勤数カウント（dIdx の日時点での連続連勤数）
        const getWorkStreak = (sIdx: number, dIdx: number, state: Record<string, string>): number => {
            let streak = 0;
            for (let d = dIdx; d >= 0; d--) {
                if (!isHoliday(sIdx, d, state)) streak++;
                else break;
            }
            return streak;
        };

        // ── ステップ0: 自動配置されたセルのみリセット（手動設定 manualKeys は完全に保持）
        staffList.forEach((_, sIdx) => {
            days.forEach((_, dIdx) => {
                const key = `${sIdx}-${dIdx}`;
                if (!manualKeys[key]) {
                    // 手動設定ではないセルはすべてクリアして自動作成の対象に
                    delete newShiftState[key];
                }
            });
        });

        // ── ステップ1: 手動設定された休みを dailyOffCount へ反映
        staffList.forEach((_, sIdx) => {
            days.forEach((_, dIdx) => {
                const key = `${sIdx}-${dIdx}`;
                if (manualKeys[key] && isHoliday(sIdx, dIdx, newShiftState)) {
                    dailyOffCount[dIdx]++;
                }
            });
        });

        // ── ステップ2: 各スタッフの有給（一日有休、AM休、PM休）を自動配置（paidLeaveCount 分）
        staffList.forEach((_, sIdx) => {
            // 手動設定ですでに存在する有給（一日、AM休、PM休）の数
            const existingPaid = days.filter((_, dIdx) => {
                const key = `${sIdx}-${dIdx}`;
                if (!manualKeys[key]) return false;
                const type = newShiftState[key];
                return type === 'paid_leave' || type === 'am_paid_leave' || type === 'pm_paid_leave';
            }).length;
            
            let paidToAssign = Math.max(0, paidLeaveCount - existingPaid);

            // シャッフルした日付インデックスで配置
            const indices = days.map((_, i) => i).filter(i => !newShiftState[`${sIdx}-${i}`]).sort(() => Math.random() - 0.5);

            for (const dIdx of indices) {
                if (paidToAssign <= 0) break;
                const dayOfMonth = dIdx + 1;
                const isWeekend = days[dIdx].getDay() === 0 || days[dIdx].getDay() === 6;
                const maxOff = isWeekend ? 2 : 1;
                if (dailyOffCount[dIdx] >= maxOff) continue;

                // 連休制限チェック（連休は7〜20日のみ）
                const prevIsHol = dIdx > 0 && isHoliday(sIdx, dIdx - 1, newShiftState);
                const nextIsHol = dIdx < days.length - 1 && isHoliday(sIdx, dIdx + 1, newShiftState);
                const wouldBeConsecutive = prevIsHol || nextIsHol;
                if (wouldBeConsecutive && (dayOfMonth < 7 || dayOfMonth > 20)) continue;

                newShiftState[`${sIdx}-${dIdx}`] = 'paid_leave';
                dailyOffCount[dIdx]++;
                paidToAssign--;
            }
        });

        // ── ステップ3: 各スタッフに公休（法内＋法外）を自動配置
        staffList.forEach((_, sIdx) => {
            // 手動設定の「法内」「法外」も公休としてカウント
            const existingHolidays = days.filter((_, dIdx) => {
                const key = `${sIdx}-${dIdx}`;
                if (!manualKeys[key]) return false;
                const t = newShiftState[key];
                return t === 'legal_holiday' || t === 'legal_out_holiday' || t === 'paid_leave' || t === 'am_paid_leave' || t === 'pm_paid_leave';
            }).length;

            const targetTotal = legalInCount + legalOutCount; // 公休の目標合計
            let toAssign = Math.max(0, targetTotal - existingHolidays);
            let assigned = 0;

            // ---- Pass A: 基本配置（3連勤制限＋連休7〜20日制限＋平日1人制限）----
            const indices = days.map((_, i) => i).filter(i => !newShiftState[`${sIdx}-${i}`]).sort(() => Math.random() - 0.5);

            for (const dIdx of indices) {
                if (assigned >= toAssign) break;
                const dayOfMonth = dIdx + 1;
                const dayOfWeek = days[dIdx].getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const maxOff = isWeekend ? 2 : 1;
                if (dailyOffCount[dIdx] >= maxOff) continue;

                // 連休制限：月初（1〜6日）・月末（21日以降）は連休禁止
                const prevIsHol = dIdx > 0 && isHoliday(sIdx, dIdx - 1, newShiftState);
                const nextIsHol = dIdx < days.length - 1 && isHoliday(sIdx, dIdx + 1, newShiftState);
                const wouldBeConsecutive = prevIsHol || nextIsHol;
                if (wouldBeConsecutive && (dayOfMonth < 7 || dayOfMonth > 20)) continue;

                // 3連休以上にならないかチェック
                const prevPrevIsHol = dIdx > 1 && isHoliday(sIdx, dIdx - 2, newShiftState);
                const nextNextIsHol = dIdx < days.length - 2 && isHoliday(sIdx, dIdx + 2, newShiftState);
                if ((prevIsHol && prevPrevIsHol) || (nextIsHol && nextNextIsHol) || (prevIsHol && nextIsHol)) continue;

                newShiftState[`${sIdx}-${dIdx}`] = 'auto_holiday';
                dailyOffCount[dIdx]++;
                assigned++;
            }

            // ---- Pass B: 4連勤以上が発生していたら強制的に休みを挿入 ----
            for (let d = 0; d < days.length; d++) {
                const streak = getWorkStreak(sIdx, d, newShiftState);
                if (streak >= 5) {
                    for (let step = 1; step <= 4; step++) {
                        const targetD = d - step;
                        if (targetD < 0) break;
                        if (isHoliday(sIdx, targetD, newShiftState)) break;
                        const key = `${sIdx}-${targetD}`;
                        if (!newShiftState[key] || newShiftState[key] === 'work') {
                            newShiftState[key] = 'auto_holiday';
                            dailyOffCount[targetD]++;
                            assigned++;
                            break;
                        }
                    }
                } else if (streak === 4 && assigned < toAssign) {
                    for (let step = 1; step <= 3; step++) {
                        const targetD = d - step;
                        if (targetD < 0) break;
                        if (isHoliday(sIdx, targetD, newShiftState)) break;
                        const dayOfMonth = targetD + 1;
                        const isWeekend = days[targetD].getDay() === 0 || days[targetD].getDay() === 6;
                        const maxOff = isWeekend ? 2 : 1;
                        if (dailyOffCount[targetD] >= maxOff) continue;
                        const prevIsHol = targetD > 0 && isHoliday(sIdx, targetD - 1, newShiftState);
                        const nextIsHol = targetD < days.length - 1 && isHoliday(sIdx, targetD + 1, newShiftState);
                        if ((prevIsHol || nextIsHol) && (dayOfMonth < 7 || dayOfMonth > 20)) continue;
                        const key = `${sIdx}-${targetD}`;
                        newShiftState[key] = 'auto_holiday';
                        dailyOffCount[targetD]++;
                        assigned++;
                        break;
                    }
                }
            }

            // ---- Pass C: まだ不足しているならフォールバック（制限緩和） ----
            if (assigned < toAssign) {
                const remaining = days.map((_, i) => i).filter(i => !newShiftState[`${sIdx}-${i}`]).sort(() => Math.random() - 0.5);
                for (const dIdx of remaining) {
                    if (assigned >= toAssign) break;
                    const isWeekend = days[dIdx].getDay() === 0 || days[dIdx].getDay() === 6;
                    const maxOff = isWeekend ? 2 : 1;
                    if (dailyOffCount[dIdx] >= maxOff) continue;
                    const prevIsHol = dIdx > 0 && isHoliday(sIdx, dIdx - 1, newShiftState);
                    const nextIsHol = dIdx < days.length - 1 && isHoliday(sIdx, dIdx + 1, newShiftState);
                    const prevPrevIsHol = dIdx > 1 && isHoliday(sIdx, dIdx - 2, newShiftState);
                    const nextNextIsHol = dIdx < days.length - 2 && isHoliday(sIdx, dIdx + 2, newShiftState);
                    if ((prevIsHol && prevPrevIsHol) || (nextIsHol && nextNextIsHol) || (prevIsHol && nextIsHol)) continue;
                    newShiftState[`${sIdx}-${dIdx}`] = 'auto_holiday';
                    dailyOffCount[dIdx]++;
                    assigned++;
                }
            }

            // ---- Pass D: 最終フォールバック（すべてのルール無視） ----
            if (assigned < toAssign) {
                const remaining = days.map((_, i) => i).filter(i => !newShiftState[`${sIdx}-${i}`]);
                for (const dIdx of remaining) {
                    if (assigned >= toAssign) break;
                    newShiftState[`${sIdx}-${dIdx}`] = 'auto_holiday';
                    dailyOffCount[dIdx]++;
                    assigned++;
                }
            }

            // ── ステップ4: auto_holiday を「法内」と「法外」に変換
            // 手動設定の「法内」の数を正しくカウントする
            const manualLegalInCount = days.filter((_, dIdx) => {
                const key = `${sIdx}-${dIdx}`;
                return manualKeys[key] && newShiftState[key] === 'legal_holiday';
            }).length;

            // 自動割り当てが必要な法内公休数
            let legalRemaining = Math.max(0, legalInCount - manualLegalInCount);

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

            // ── ステップ5: 残りは出勤（work）で埋める
            days.forEach((_, dIdx) => {
                const key = `${sIdx}-${dIdx}`;
                if (!newShiftState[key]) {
                    newShiftState[key] = 'work';
                }
            });
        });

        // ── ステップ6: オンコール自動割り当て（出勤者の中から公平に）
        const onCallCount = staffList.map(() => 0);
        const getIsWorking = (sIdx: number, dIdx: number, state: Record<string, string>): boolean => {
            const type = state[`${sIdx}-${dIdx}`];
            // 'work' のほか、AM休やPM休も半分は稼働日なのでオンコール可能
            return type === 'work' || type === 'fixed_work' || type === 'am_paid_leave' || type === 'pm_paid_leave';
        };

        days.forEach((_, dIdx) => {
            let eligible = staffList.map((_, i) => i).filter(sIdx => {
                const worksToday = getIsWorking(sIdx, dIdx, newShiftState);
                const worksTomorrow = dIdx < days.length - 1 ? getIsWorking(sIdx, dIdx + 1, newShiftState) : worksToday;
                return worksToday && worksTomorrow;
            });

            if (eligible.length === 0) {
                eligible = staffList.map((_, i) => i).filter(sIdx => getIsWorking(sIdx, dIdx, newShiftState));
            }

            if (eligible.length > 0) {
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
            case 'legal_holiday': return '法内';
            case 'legal_out_holiday': return '法外';
            case 'paid_leave': return '有';
            case 'am_paid_leave': return 'AM休';
            case 'pm_paid_leave': return 'PM休';
            default: return '';
        }
    };

    const getShiftColor = (type: string, isManual: boolean) => {
        // 手動設定されたセルはすべて赤字にする
        if (isManual) return 'text-rose-600 font-bold';

        if (type === 'paid_leave') return 'text-pink-500 font-bold';
        if (type === 'am_paid_leave' || type === 'pm_paid_leave') return 'text-orange-500 font-bold';
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
                    <div className="flex gap-3 text-xs">
                        <div className="flex items-center gap-1"><span>法内:</span><input type="number" min={0} value={legalInCount} onChange={e => setLegalInCount(parseInt(e.target.value) || 0)} className="w-8 border-b text-center" /></div>
                        <div className="flex items-center gap-1"><span>法外:</span><input type="number" min={0} value={legalOutCount} onChange={e => setLegalOutCount(parseInt(e.target.value) || 0)} className="w-8 border-b text-center" /></div>
                        <div className="flex items-center gap-1"><span>有給:</span><input type="number" min={0} value={paidLeaveCount} onChange={e => setPaidLeaveCount(parseInt(e.target.value) || 0)} className="w-8 border-b text-center" /></div>
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
                            <th className="sticky left-0 z-30 bg-slate-50 border-b border-r p-2 w-28 text-sm font-medium shadow-[1px_0_0_0_#e2e8f0]">ケアマネ</th>
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
                                <td className="sticky left-0 z-10 bg-white border-b border-r p-2 text-xs font-bold text-slate-700 shadow-[1px_0_0_0_#e2e8f0]">
                                    {staff}
                                </td>
                                {days.map((_, dIdx) => {
                                    const key = `${sIdx}-${dIdx}`;
                                    const type = shiftState[key];
                                    const isOnCall = onCallState[dIdx] === sIdx.toString();
                                    const isTele = teleworkState[key];
                                    const isHol = ['legal_holiday', 'legal_out_holiday', 'paid_leave', 'am_paid_leave', 'pm_paid_leave', 'hope_holiday', 'auto_holiday'].includes(type);
                                    const isManual = !!manualKeys[key];

                                    return (
                                        <td key={dIdx}
                                            onClick={() => handleCellClick(sIdx, dIdx)}
                                            onContextMenu={e => toggleTelework(sIdx, dIdx, e)}
                                            className={`border-b border-r p-0 text-center h-11 cursor-pointer transition-colors relative 
                                              ${isOnCall ? 'bg-emerald-50' : isHol ? 'bg-yellow-50/70' : 'hover:bg-slate-50'} 
                                              ${inputMode === 'telework' ? 'bg-indigo-50/10' : ''}
                                              ${inputMode === 'oncall' ? 'bg-emerald-50/10' : ''}
                                            `}>
                                            <div className={`text-xs font-medium ${getShiftColor(type, isManual)}`}>{getShiftLabel(type)}</div>
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
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-yellow-100/70 border border-slate-200 rounded-sm" />休み・有休・半休</span>
                <span className="ml-auto text-slate-400">赤文字:手動固定値 (自動作成で変化しません) | 選択順: 未設定 → 日 → 法内 → 法外 → 有休 → AM休 → PM休</span>
            </div>
        </div>
    );
};

export default ShiftAutomation;
