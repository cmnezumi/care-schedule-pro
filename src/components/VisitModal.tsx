"use client";

import React, { useState, useEffect } from 'react';
import { Client, VisitType, ScheduleType } from '@/types';
import DraggableModal from './DraggableModal';
import { Calendar as CalendarIcon } from 'lucide-react';

interface VisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    selectedDate?: Date | null;
    editingEvent?: any;
    clients?: Client[];
    scheduleTypes?: ScheduleType[];
    defaultClientId?: string | null;
    onDelete?: (event: any) => void;
    onDateChange?: (date: Date) => void;
    editTargetChoice?: 'single' | 'all';
}

const VisitModal = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    onDateChange,
    selectedDate,
    editingEvent,
    clients = [],
    scheduleTypes = [],
    defaultClientId,
    editTargetChoice = 'single'
}: VisitModalProps) => {
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
            if (editingEvent) {
                // Editing mode
                setClientId(editingEvent.clientId || '');
                setType(editingEvent.type || '');
                setStartTime(editingEvent.startTime || '10:00');
                setEndTime(editingEvent.endTime || '11:00');
                setNotes(editingEvent.notes || '');
                setIsPersonal(editingEvent.isPersonal || false);
                setAllDay(editingEvent.allDay || false);

                if (editingEvent.recurrenceType) {
                    setRecurrenceType(editingEvent.recurrenceType);
                } else {
                    setRecurrenceType('none');
                }
                setWeeklyDays(editingEvent.weeklyDays || []);
                setMonthlyWeek(editingEvent.monthlyRecur?.week || 1);
                setMonthlyDay(editingEvent.monthlyRecur?.day ?? 1);
            } else if (selectedDate) {
                // New event mode
                if (isFirstOpen.current) {
                    if (defaultClientId) {
                        setClientId(defaultClientId);
                    } else if (clients.length > 0) {
                        setClientId(clients[0].id);
                    }
                    setType('');
                    setStartTime('10:00');
                    setEndTime('11:00');
                    setNotes('');
                    setAllDay(false);
                    setRecurrenceType('none');
                    setIsPersonal(false);
                    isFirstOpen.current = false;
                }
                setWeeklyDays([selectedDate.getDay()]);
                const weekNumber = Math.ceil(selectedDate.getDate() / 7);
                setMonthlyWeek(weekNumber > 4 ? 4 : weekNumber);
                setMonthlyDay(selectedDate.getDay());
            }
        }
    }, [isOpen, selectedDate, editingEvent, clients, scheduleTypes, defaultClientId]);

    const handleSave = () => {
        if (!selectedDate) return;

        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const startIso = allDay ? dateStr : `${dateStr}T${startTime}:00`;
        const endIso = allDay ? dateStr : `${dateStr}T${endTime}:00`;

        const effectiveScheduleTypes = scheduleTypes.length > 0 ? scheduleTypes : [
            { id: 'monitoring', name: 'モニタリング', color: '#0ea5e9' },
            { id: 'assessment', name: 'アセスメント', color: '#f43f5e' },
            { id: 'conference', name: '担当者会議', color: '#8b5cf6' },
            { id: 'other', name: 'その他', color: '#64748b' }
        ];

        const selectedType = effectiveScheduleTypes.find(t => t.name === type || t.id === type);
        const backgroundColor = selectedType?.color || '#3b82f6';

        const finalData = {
            id: editingEvent?.id,
            title: isPersonal ? type : `${clients.find(c => c.id === clientId)?.name || ''}: ${type}`,
            start: startIso,
            end: endIso,
            allDay,
            backgroundColor,
            extendedProps: {
                clientId: isPersonal ? null : clientId,
                type,
                notes,
                isPersonal,
                startTime,
                endTime,
                recurrenceType,
                weeklyDays: recurrenceType === 'weekly' ? weeklyDays : undefined,
                monthlyRecur: recurrenceType === 'monthly' ? { week: monthlyWeek, day: monthlyDay } : undefined
            }
        };

        onSave(finalData);

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
        { label: '日', value: 0 }, { label: '月', value: 1 }, { label: '火', value: 2 },
        { label: '水', value: 3 }, { label: '木', value: 4 }, { label: '金', value: 5 }, { label: '土', value: 6 }
    ];

    const handleTypeSelect = (sType: ScheduleType | 'free') => {
        if (sType === 'free') {
            setType('');
            // Optional: focus notes or show an input if we want a separate 'custom type' field
            // For now, setting type to empty allows the user to see it's custom
            return;
        }
        setType(sType.name);
        if (sType.defaultStartTime) setStartTime(sType.defaultStartTime);
        if (sType.defaultEndTime) setEndTime(sType.defaultEndTime);
    };

    const displayDate = selectedDate ? selectedDate.toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
    }) : '';

    const effectiveScheduleTypes = scheduleTypes.length > 0 ? scheduleTypes : [
        { id: 'monitoring', name: 'モニタリング', color: '#0ea5e9' },
        { id: 'assessment', name: 'アセスメント', color: '#f43f5e' },
        { id: 'conference', name: '担当者会議', color: '#8b5cf6' },
        { id: 'other', name: 'その他', color: '#64748b' }
    ];

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title={editingEvent ? `予定を編集` : `${displayDate} の予定登録`}
            width="w-[380px]"
            isModeless={isContinuous}
        >
            <div className="flex flex-col gap-6 max-h-[75vh] overflow-y-auto pr-1 custom-scrollbar">
                {!editingEvent && (
                    <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white">
                                <CalendarIcon size={16} />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-sky-600 uppercase">日付の選択</div>
                                <div className="text-sm font-bold text-slate-700">{displayDate}</div>
                            </div>
                        </div>
                        <input
                            type="date"
                            className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-sky-500/20"
                            value={selectedDate ? selectedDate.toISOString().split('T')[0] : ''}
                            onChange={(e) => {
                                const newDate = new Date(e.target.value);
                                if (!isNaN(newDate.getTime()) && onDateChange) onDateChange(newDate);
                            }}
                        />
                    </div>
                )}
                <div className="flex flex-col gap-4">
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                                    <input type="checkbox" className="w-4 h-4 text-sky-500 rounded border-slate-300" checked={isPersonal} onChange={(e) => setIsPersonal(e.target.checked)} />
                                    自分の予定
                                </label>
                            </div>
                            <div className="flex-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                                <label className="text-sm font-bold text-slate-700 cursor-pointer flex items-center gap-2">
                                    <input type="checkbox" className="w-4 h-4 text-sky-500 rounded border-slate-300" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
                                    終日
                                </label>
                            </div>
                        </div>

                        {!isPersonal && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1 ml-1">利用者</label>
                                <select
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm"
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
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 ml-1">予定の種類</label>
                            <div className="grid grid-cols-2 gap-1.5">
                                {effectiveScheduleTypes.map((sType) => (
                                    <button
                                        key={sType.id} type="button" onClick={() => handleTypeSelect(sType)}
                                        className={`px-2 py-1.5 rounded-lg border text-[12px] font-bold transition-all ${type === sType.name || type === sType.id ? 'text-white shadow-md' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                                        style={{ backgroundColor: (type === sType.name || type === sType.id) ? sType.color : undefined }}
                                    >
                                        {sType.name}
                                    </button>
                                ))}
                                <button
                                    type="button" onClick={() => handleTypeSelect('free')}
                                    className={`px-2 py-1.5 rounded-lg border text-[12px] font-bold transition-all ${type === '' || !effectiveScheduleTypes.some(t => t.name === type) ? 'bg-slate-700 text-white shadow-md' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                                >
                                    自由記載
                                </button>
                            </div>
                        </div>

                        {(type === '' || !effectiveScheduleTypes.some(t => t.name === type)) && (
                            <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                                <label className="block text-[11px] font-bold text-slate-500 mb-1 ml-1">カスタム予定名</label>
                                <input
                                    type="text"
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 text-sm"
                                    placeholder="予定名を入力..."
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        {!allDay && (
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">開始時間</label>
                                    <input type="time" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">終了時間</label>
                                    <input type="time" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 mb-1 ml-1">メモ</label>
                            <textarea className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl h-[80px] resize-none text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                    <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-bold text-slate-500 ml-1 uppercase">繰り返しの設定</label>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                            <button onClick={() => setRecurrenceType('none')} className={`flex-1 py-1 text-[11px] font-bold rounded ${recurrenceType === 'none' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>なし</button>
                            <button onClick={() => setRecurrenceType('weekly')} className={`flex-1 py-1 text-[11px] font-bold rounded ${recurrenceType === 'weekly' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>毎週</button>
                            <button onClick={() => setRecurrenceType('monthly')} className={`flex-1 py-1 text-[11px] font-bold rounded ${recurrenceType === 'monthly' ? 'bg-sky-500 text-white' : 'text-slate-400'}`}>毎月</button>
                        </div>
                    </div>
                    {recurrenceType === 'weekly' && (
                        <div className="mt-3 flex gap-1.5">
                            {weekDays.map(day => (
                                <button key={day.value} onClick={() => toggleWeeklyDay(day.value)} className={`w-8 h-8 rounded-lg text-xs font-bold ${weeklyDays.includes(day.value) ? 'bg-sky-500 text-white' : 'bg-slate-50 text-slate-400'}`}>{day.label}</button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        {editingEvent && onDelete && (
                            <button onClick={() => { if (confirm('削除しますか？')) { onDelete(editingEvent); onClose(); } }} className="text-sm font-bold text-rose-500">削除</button>
                        )}
                        {!editingEvent && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 text-sky-500" checked={isContinuous} onChange={(e) => setIsContinuous(e.target.checked)} />
                                <span className="text-[11px] font-bold text-slate-500">連続登録</span>
                            </label>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-2 text-sm font-bold text-slate-400">閉じる</button>
                        <button onClick={handleSave} className="flex-[2] py-2 bg-sky-500 text-white rounded-xl font-bold">保存</button>
                    </div>
                </div>
            </div>
        </DraggableModal>
    );
};

export default VisitModal;
