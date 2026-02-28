"use client";

import React, { useState, useEffect } from 'react';
import { Client, VisitType, ScheduleType } from '@/types';
import DraggableModal from './DraggableModal';

interface VisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        clientId: string | null;
        type: VisitType;
        start: string;
        end: string;
        notes: string;
        isPersonal?: boolean;
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
    const [isPersonal, setIsPersonal] = useState(false);

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

            setIsPersonal(false);
        }
    }, [isOpen, initialDate, clients, scheduleTypes, defaultClientId]);

    const handleSave = () => {
        if (!initialDate) return;

        const baseData = {
            clientId: isPersonal ? null : clientId,
            type: type as VisitType,
            notes,
            isPersonal,
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
            width="max-w-3xl"
        >
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {/* Left Column: Basic Info */}
                    <div className="space-y-3">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
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
                                自分の予定として登録
                            </label>
                            <span className="text-[10px] text-slate-400 font-medium">※利用者は選ばない</span>
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

                    {/* Right Column: Time & Notes */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1 ml-1">開始時間</label>
                                <input
                                    type="time"
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 outline-none text-sm font-bold text-slate-700"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1 ml-1">終了時間</label>
                                <input
                                    type="time"
                                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/10 focus:border-sky-500 outline-none text-sm font-bold text-slate-700"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
                        </div>

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

                {/* Recurrence Settings: Full Width */}
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
                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${weeklyDays.includes(day.value)
                                                ? 'bg-sky-500 text-white shadow shadow-sky-200'
                                                : 'bg-white text-slate-400 border border-slate-100 hover:border-sky-100'
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
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    毎月 第{monthlyWeek} {weekDays.find(d => d.value === monthlyDay)?.label}曜日に予定が入ります
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end items-center gap-4 pt-3 mt-1">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-8 py-2.5 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-md shadow-sky-100 hover:shadow-sky-200 hover:scale-[1.01] active:scale-98 transition-all"
                    >
                        予定を登録する
                    </button>
                </div>
            </div>
        </DraggableModal>
    );
};

export default VisitModal;
