"use client";

import React, { useState, useEffect } from 'react';
import { Client, VisitType, ScheduleType } from '@/types';
import DraggableModal from './DraggableModal';

interface VisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        clientId: string;
        type: VisitType;
        start: string;
        end: string;
        notes: string;
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
    clients?: Client[];
    scheduleTypes?: ScheduleType[];
    defaultClientId?: string | null;
}

const VisitModal = ({ isOpen, onClose, onSave, initialDate, clients = [], scheduleTypes = [], defaultClientId }: VisitModalProps) => {
    const [clientId, setClientId] = useState('');
    const [type, setType] = useState<string>('monitoring');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('11:00');
    const [notes, setNotes] = useState('');
    const [recurrenceType, setRecurrenceType] = useState<'none' | 'weekly' | 'monthly'>('none');
    const [weeklyDays, setWeeklyDays] = useState<number[]>([]);
    const [monthlyWeek, setMonthlyWeek] = useState(1);
    const [monthlyDay, setMonthlyDay] = useState(1);

    useEffect(() => {
        if (isOpen && initialDate) {
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
                setType('monitoring');
            }
            setStartTime('10:00');
            setEndTime('11:00');
            setNotes('');

            setRecurrenceType('none');
            setWeeklyDays([initialDate.getDay()]);

            // Set default monthly to "This week-number and this day-of-week"
            const weekNumber = Math.ceil(initialDate.getDate() / 7);
            setMonthlyWeek(weekNumber > 4 ? 4 : weekNumber); // Caps at 4 or maybe provide "last"
            setMonthlyDay(initialDate.getDay());
        }
    }, [isOpen, initialDate, clients, scheduleTypes, defaultClientId]);

    const handleSave = () => {
        if (!initialDate) return;

        const baseData = {
            clientId,
            type: type as VisitType,
            notes,
        };

        if (recurrenceType === 'weekly') {
            onSave({
                ...baseData,
                start: '',
                end: '',
                recurring: {
                    daysOfWeek: weeklyDays,
                    startTime,
                    endTime
                }
            });
        } else if (recurrenceType === 'monthly') {
            onSave({
                ...baseData,
                start: '',
                end: '',
                monthlyRecur: {
                    week: monthlyWeek,
                    day: monthlyDay,
                    startTime,
                    endTime
                }
            });
        } else {
            const year = initialDate.getFullYear();
            const month = String(initialDate.getMonth() + 1).padStart(2, '0');
            const day = String(initialDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            const start = `${dateStr}T${startTime}:00`;
            const end = `${dateStr}T${endTime}:00`;

            onSave({ ...baseData, start, end });
        }
        onClose();
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

    // If no scheduleTypes provided, fallback to default (though we expect them to be provided)
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

    // Format date for display
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
            title={`${displayDate} の予定登録`}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">利用者</label>
                    <select
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                    >
                        {clients.map(client => (
                            <option key={client.id} value={client.id}>{client.name} 様</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">予定の種類</label>
                    <div className="grid grid-cols-2 gap-2">
                        {effectiveScheduleTypes.map((sType) => (
                            <button
                                key={sType.id}
                                type="button"
                                onClick={() => handleTypeSelect(sType)}
                                className={`p-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${type === sType.name || type === sType.id
                                    ? `border-transparent text-white shadow-md transform scale-105`
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                style={{
                                    backgroundColor: (type === sType.name || type === sType.id) ? sType.color : undefined,
                                    borderColor: (type === sType.name || type === sType.id) ? sType.color : 'transparent',
                                }}
                            >
                                {sType.name}
                            </button>
                        ))}
                    </div>
                    <div className="mt-2">
                        <input
                            type="text"
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none text-sm"
                            placeholder="または自由に入力..."
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">開始時間</label>
                        <input
                            type="time"
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">終了時間</label>
                        <input
                            type="time"
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">メモ</label>
                    <textarea
                        className="w-full p-2 border border-slate-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="訪問の目的や特記事項..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>

                <div className="pt-2 border-t border-slate-100">
                    <label className="block text-sm font-medium text-slate-600 mb-2">繰り返しの設定</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-3">
                        <button
                            type="button"
                            onClick={() => setRecurrenceType('none')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${recurrenceType === 'none' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            なし
                        </button>
                        <button
                            type="button"
                            onClick={() => setRecurrenceType('weekly')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${recurrenceType === 'weekly' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            毎週
                        </button>
                        <button
                            type="button"
                            onClick={() => setRecurrenceType('monthly')}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${recurrenceType === 'monthly' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            毎月
                        </button>
                    </div>

                    {recurrenceType === 'weekly' && (
                        <div className="bg-sky-50/50 p-3 rounded-lg border border-sky-100 animate-in fade-in slide-in-from-top-1 duration-200">
                            <label className="block text-[10px] font-bold text-sky-600 uppercase tracking-wider mb-2">繰り返す曜日</label>
                            <div className="flex gap-1.5">
                                {weekDays.map(day => (
                                    <button
                                        key={day.value}
                                        type="button"
                                        onClick={() => toggleWeeklyDay(day.value)}
                                        className={`w-9 h-9 rounded-full text-sm font-bold transition-all flex items-center justify-center ${weeklyDays.includes(day.value)
                                            ? 'bg-sky-500 text-white shadow-md ring-4 ring-sky-100'
                                            : 'bg-white text-slate-400 border border-slate-200 hover:border-sky-200'
                                            }`}
                                    >
                                        {day.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {recurrenceType === 'monthly' && (
                        <div className="bg-sky-50/50 p-4 rounded-lg border border-sky-100 animate-in fade-in slide-in-from-top-1 duration-200">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-600">毎月</span>
                                <select
                                    value={monthlyWeek}
                                    onChange={(e) => setMonthlyWeek(Number(e.target.value))}
                                    className="bg-white border border-sky-200 rounded-lg px-2 py-1 text-sm font-bold text-sky-700 outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    <option value={1}>第1</option>
                                    <option value={2}>第2</option>
                                    <option value={3}>第3</option>
                                    <option value={4}>第4</option>
                                </select>
                                <select
                                    value={monthlyDay}
                                    onChange={(e) => setMonthlyDay(Number(e.target.value))}
                                    className="bg-white border border-sky-200 rounded-lg px-2 py-1 text-sm font-bold text-sky-700 outline-none focus:ring-2 focus:ring-sky-500"
                                >
                                    {weekDays.map(day => (
                                        <option key={day.value} value={day.value}>{day.label}曜日</option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-3">※ 例：「毎月 第1 火曜日」に自動で予定が入ります</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    キャンセル
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 shadow-sm transition-colors"
                >
                    登録
                </button>
            </div>
        </DraggableModal>
    );
};

export default VisitModal;
