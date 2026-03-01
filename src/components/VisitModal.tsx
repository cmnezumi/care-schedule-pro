"use client";

import React, { useState, useEffect } from 'react';
import { Client, VisitType, ScheduleType } from '@/types';
import DraggableModal from './DraggableModal';

interface VisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        id?: string;
        clientId: string | null;
        type: VisitType;
        startTime: string;
        endTime: string;
        notes: string;
        isPersonal?: boolean;
        allDay?: boolean;
        isContinuous?: boolean;
        recurring?: {
            daysOfWeek: number[];
            startTime: string;
            endTime: string;
        };
        monthlyRecur?: {
            week: number;
            day: number;
            startTime: string;
            endTime: string;
        };
    }) => void;
    initialDate?: Date;
    initialData?: {
        id?: string;
        clientId?: string | null;
        type?: string;
        startTime?: string;
        endTime?: string;
        notes?: string;
        isPersonal?: boolean;
        allDay?: boolean;
        recurrenceType?: 'none' | 'weekly' | 'monthly';
        weeklyDays?: number[];
        monthlyWeek?: number;
        monthlyDay?: number;
    };
    clients?: Client[];
    scheduleTypes?: ScheduleType[];
    defaultClientId?: string | null;
    onDelete?: (event: any) => void;
    onDateChange?: (date: Date) => void;
}

const VisitModal = ({ isOpen, onClose, onSave, onDelete, onDateChange, initialDate, initialData, clients = [], scheduleTypes = [], defaultClientId }: VisitModalProps) => {
    const [clientId, setClientId] = useState('');
    const [type, setType] = useState<string>('');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('11:00');
    const [notes, setNotes] = useState('');
    const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'monthly'>('none');
    const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
    const [monthlyWeek, setMonthlyWeek] = useState(1);
    const [monthlyDay, setMonthlyDay] = useState(1);
    const [isPersonal, setIsPersonal] = useState(false);
    const [allDay, setAllDay] = useState(false);
    const [isContinuous, setIsContinuous] = useState(false);
    const isFirstOpen = React.useRef(true);

    useEffect(() => {
        if (!isOpen) {
            isFirstOpen.current = true;
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Editing mode (Always reset based on the event being edited)
                setClientId(initialData.clientId || '');
                setType(initialData.type || '');
                setStartTime(initialData.startTime || '10:00');
                setEndTime(initialData.endTime || '11:00');
                setNotes(initialData.notes || '');
                setIsPersonal(initialData.isPersonal || false);
                setAllDay(initialData.allDay || false);
                setRecurrenceType(initialData.recurrenceType || 'none');
                setWeeklyDays(initialData.weeklyDays || []);
                setMonthlyWeek(initialData.monthlyWeek || 1);
                setMonthlyDay(initialData.monthlyDay ?? 1);
            } else if (initialDate) {
                // New event mode
                if (isFirstOpen.current) {
                    // Only set initial boilerplate if this is the FIRST time the modal is opening
                    if (defaultClientId) {
                        setClientId(defaultClientId);
                    } else if (clients.length > 0) {
                        setClientId(clients[0].id);
                    } else {
                        setClientId('');
                    }

                    if (scheduleTypes.length > 0) {
                        setType(scheduleTypes[0].id);
                    } else {
                        setType('');
                    }
                    setStartTime('10:00');
                    setEndTime('11:00');
                    setNotes('');
                    setAllDay(false);
                    setRecurrenceType('none');
                    setIsPersonal(false);
                    isFirstOpen.current = false;
                }

                // Always update these based on the date, but don't reset type/notes if already open
                setWeeklyDays([initialDate.getDay()]);
                const weekNumber = Math.ceil(initialDate.getDate() / 7);
                setMonthlyWeek(weekNumber > 4 ? 4 : weekNumber);
                setMonthlyDay(initialDate.getDay());
            }
        }
    }, [isOpen, initialDate, initialData, clients, scheduleTypes, defaultClientId]);

    const handleSave = () => {
        if (!initialDate) return;

        const baseData = {
            id: initialData?.id,
            clientId: isPersonal ? null : clientId,
            type: type as VisitType,
            notes,
            isPersonal,
            allDay,
        };

        if (recurrenceType === 'weekly') {
            onSave({
                ...baseData,
                startTime: allDay ? '00:00' : startTime,
                endTime: allDay ? '23:59' : endTime,
                recurring: {
                    daysOfWeek: weeklyDays,
                    startTime: allDay ? '00:00' : startTime,
                    endTime: allDay ? '23:59' : endTime
                },
                isContinuous
            });
        } else if (recurrenceType === 'monthly') {
            onSave({
                ...baseData,
                startTime: allDay ? '00:00' : startTime,
                endTime: allDay ? '23:59' : endTime,
                monthlyRecur: {
                    week: monthlyWeek,
                    day: monthlyDay,
                    startTime: allDay ? '00:00' : startTime,
                    endTime: allDay ? '23:59' : endTime
                },
                isContinuous
            });
        } else {
            const year = initialDate.getFullYear();
            const month = String(initialDate.getMonth() + 1).padStart(2, '0');
            const day = String(initialDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            onSave({
                ...baseData,
                startTime: allDay ? '00:00' : startTime,
                endTime: allDay ? '23:59' : endTime,
                isContinuous
            });
        }

        if (!isContinuous) {
            onClose();
        }
    };

    const toggleWeeklyDay = (day: number) => {
        setWeeklyDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const weekDays = [
        { label: '日', value: 0 },
        { label: '月', value: 1 },
        { label: '火', value: 2 },
        { label: '水', value: 3 },
        { label: '木', value: 4 },
        { label: '金', value: 5 },
        { label: '土', value: 6 }
    ];

    const effectiveScheduleTypes: ScheduleType[] = scheduleTypes.length > 0 ? scheduleTypes : [
        { id: 'monitoring', name: 'モニタリング', color: '#0ea5e9' },
        { id: 'assessment', name: 'アセスメント', color: '#f43f5e' },
        { id: 'conference', name: '担当者会議', color: '#8b5cf6' },
        { id: 'other', name: 'その他', color: '#64748b' }
    ];

    const handleTypeSelect = (sType: ScheduleType) => {
        setType(sType.name);
        if (sType.defaultStartTime) {
            setStartTime(sType.defaultStartTime);
        }
        if (sType.defaultEndTime) {
            setEndTime(sType.defaultEndTime);
        }
    };

    const displayDate = initialDate ? initialDate.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short'
    }) : '';
    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? '予定を編集' : `${displayDate} の予定登録`}
            width="w-[380px]"
            isModeless={isContinuous}
        >
            <div className="flex flex-col gap-6">
                {!initialData && (
                    <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-sky-600 uppercase">日付の選択</div>
                                <div className="text-sm font-bold text-slate-700">{displayDate}</div>
                            </div>
                        </div>
                        <input
                            type="date"
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
                            value={initialDate ? initialDate.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                                const newDate = new Date(e.target.value);
                                if (!isNaN(newDate.getTime()) && onDateChange) {
                                    onDateChange(newDate);
                                }
                            }}
                        />
                        {isContinuous && (
                            <div className="bg-sky-500 text-white text-[10px] font-bold px-2 py-1 rounded-full animate-pulse">
                                連続モード有効：カレンダーをクリックして日付変更可
                            </div>
                        )}
                    </div>
                )}
                <div className="flex flex-col gap-4">
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-500"
                                        checked={isPersonal}
                                        onChange={(e) => {
                                            setIsPersonal(e.target.checked);
                                            if (e.target.checked) {
                                                const personalType = scheduleTypes.find(t => t.id === 'offday' || t.name === '休み');
                                                if (personalType) setType(personalType.name);
                                            } else {
                                                const defaultType = scheduleTypes.find(t => t.id === 'monitoring' || t.name === 'モニタリング');
                                                if (defaultType) setType(defaultType.name);
                                            }
                                        }}
                                    />
                                    自分の予定
                                </label>
                            </div>

                            <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-500"
                                        checked={allDay}
                                        onChange={(e) => setAllDay(e.target.checked)}
                                    />
                                    終日 (時間指定なし)
                                </label>
                            </div>
                        </div>

                        {!isPersonal && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5 ml-1">
                                    利用者
                                </label>
                                <select
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none transition-all font-medium text-slate-700 text-sm"
                                    value={clientId}
                                    onChange={(e) => setClientId(e.target.value)}
                                >
                                    {clients.map(client => (
                                        <option key={client.id} value={client.id}>{client.name} 様</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1.5 ml-1">
                                予定の種類
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {effectiveScheduleTypes.map((sType) => (
                                    <button
                                        key={sType.id}
                                        type="button"
                                        onClick={() => handleTypeSelect(sType)}
                                        className={`px-2 py-1.5 rounded-lg border text-[12px] font-bold transition-all focus:outline-none ${type === sType.name || type === sType.id
                                            ? `border-transparent text-white shadow-md shadow-${sType.id}/10 scale-[1.01]`
                                            : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-white hover:border-slate-200'
                                            }`}
                                        style={{
                                            backgroundColor: (type === sType.name || type === sType.id) ? sType.color : undefined,
                                        }}
                                    >
                                        {sType.name}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-2 text-right">
                                <input
                                    type="text"
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 outline-none text-xs font-medium"
                                    placeholder="または自由に入力..."
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {!allDay && (
                            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">開始時間</label>
                                    <input
                                        type="time"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-sm font-bold text-slate-700"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">終了時間</label>
                                    <input
                                        type="time"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 outline-none text-sm font-bold text-slate-700"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 ml-1">メモ</label>
                            <textarea
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl h-[92px] resize-none focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 outline-none text-sm"
                                placeholder="訪問の目的や特記事項..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap ml-1 uppercase tracking-wider">繰り返しの設定</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-56">
                            <button
                                type="button"
                                onClick={() => setRecurrenceType('none')}
                                className={`flex-1 py-1 text-[11px] font-bold rounded transition-all ${recurrenceType === 'none' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                なし
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecurrenceType('weekly')}
                                className={`flex-1 py-1 text-[11px] font-bold rounded transition-all ${recurrenceType === 'weekly' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                毎週
                            </button>
                            <button
                                type="button"
                                onClick={() => setRecurrenceType('monthly')}
                                className={`flex-1 py-1 text-[11px] font-bold rounded transition-all ${recurrenceType === 'monthly' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                毎月
                            </button>
                        </div>
                    </div>

                    <div className="mt-3">
                        {recurrenceType === 'weekly' && (
                            <div className="bg-sky-50/20 p-3 rounded-xl border border-sky-100/50 animate-in fade-in zoom-in-95 duration-200">
                                <label className="block text-[10px] font-bold text-sky-600/70 uppercase tracking-tighter mb-2 ml-1">繰り返す曜日</label>
                                <div className="flex gap-1.5">
                                    {weekDays.map(day => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleWeeklyDay(day.value)}
                                            className={`w-10 h-10 rounded-xl text-sm font-bold transition-all flex items-center justify-center border-2 ${weeklyDays.includes(day.value)
                                                ? 'bg-sky-500 text-white border-sky-400 shadow-lg shadow-sky-200 scale-110 z-10'
                                                : 'bg-white text-slate-400 border-slate-100 hover:border-sky-200 hover:bg-sky-50/30'
                                                }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {recurrenceType === 'monthly' && (
                            <div className="bg-sky-50/20 p-3 rounded-xl border border-sky-100/50 animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-slate-500">毎月</span>
                                    <select
                                        value={monthlyWeek}
                                        onChange={(e) => setMonthlyWeek(Number(e.target.value))}
                                        className="bg-white border border-sky-100 rounded-lg px-2 py-1 text-xs font-bold text-sky-600 outline-none shadow-sm focus:ring-1 focus:ring-sky-500"
                                    >
                                        <option value={1}>第1</option>
                                        <option value={2}>第2</option>
                                        <option value={3}>第3</option>
                                        <option value={4}>第4</option>
                                    </select>
                                    <select
                                        value={monthlyDay}
                                        onChange={(e) => setMonthlyDay(Number(e.target.value))}
                                        className="bg-white border border-sky-100 rounded-lg px-2 py-1 text-xs font-bold text-sky-600 outline-none shadow-sm focus:ring-1 focus:ring-sky-500"
                                    >
                                        {weekDays.map(day => (
                                            <option key={day.value} value={day.value}>{day.label}曜日</option>
                                        ))}
                                    </select>
                                    <span className="text-[11px] font-bold text-slate-400 ml-1">に自動入力</span>
                                </div>
                                <p className="text-[9px] font-medium text-slate-400 mt-1.5 flex items-center gap-1 opacity-70">
                                    <svg className="w-3 h-3 flex-shrink-0" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    毎月 第{monthlyWeek} {weekDays.find(d => d.value === monthlyDay)?.label}曜日に予定が入ります
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            {initialData && onDelete && (
                                <button
                                    onClick={() => {
                                        if (confirm('この予定を削除してもよろしいですか？')) {
                                            onDelete(initialData);
                                            onClose();
                                        }
                                    }}
                                    className="px-3 py-2 text-sm font-bold text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    削除
                                </button>
                            )}
                        </div>
                        {!initialData && (
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-sky-500 rounded border-slate-300 focus:ring-sky-500 transition-all group-hover:scale-110"
                                    checked={isContinuous}
                                    onChange={(e) => setIsContinuous(e.target.checked)}
                                />
                                <span className="text-[11px] font-bold text-slate-500 group-hover:text-sky-600 transition-colors">連続登録モード</span>
                            </label>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={handleSave}
                            className="flex-[2] py-2.5 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-md shadow-sky-100 hover:shadow-sky-200 hover:scale-[1.01] active:scale-98 transition-all"
                        >
                            {initialData ? '保存' : '登録'}
                        </button>
                    </div>
                </div>
            </div>
        </DraggableModal>
    );
};

export default VisitModal;
