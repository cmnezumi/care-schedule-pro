"use client";

import React, { useState, useEffect } from 'react';
import { Client, VisitType, ScheduleType } from '@/types';
import DraggableModal from './DraggableModal';

interface VisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { clientId: string; type: VisitType; start: string; end: string; notes: string }) => void;
    initialDate?: Date;
    clients?: Client[];
    scheduleTypes?: ScheduleType[];
    defaultClientId?: string | null;
}

const VisitModal = ({ isOpen, onClose, onSave, initialDate, clients = [], scheduleTypes = [], defaultClientId }: VisitModalProps) => {
    const [clientId, setClientId] = useState('');
    const [type, setType] = useState<string>('monitoring'); // Changed to string
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('11:00');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen && initialDate) {
            // Reset fields when opening
            if (defaultClientId) {
                setClientId(defaultClientId);
            } else if (clients.length > 0) {
                setClientId(clients[0].id);
            } else {
                setClientId('');
            }
            // Default to first type if available
            if (scheduleTypes.length > 0) {
                setType(scheduleTypes[0].id);
            } else {
                setType('monitoring');
            }
            setStartTime('10:00');
            setEndTime('11:00');
            setNotes('');
        }
    }, [isOpen, initialDate, clients, scheduleTypes]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!initialDate) return;

        // Combine initialDate with time strings
        const dateStr = initialDate.toISOString().split('T')[0];
        const start = `${dateStr}T${startTime}:00`;
        const end = `${dateStr}T${endTime}:00`;

        onSave({ clientId, type: type as VisitType, start, end, notes }); // Cast type to VisitType
        onClose();
    };

    // If no scheduleTypes provided, fallback to default (though we expect them to be provided)
    const effectiveScheduleTypes: ScheduleType[] = scheduleTypes.length > 0 ? scheduleTypes : [
        { id: 'monitoring', name: 'モニタリング', color: '#0ea5e9' },
        { id: 'assessment', name: 'アセスメント', color: '#f43f5e' },
        { id: 'conference', name: '担当者会議', color: '#8b5cf6' },
        { id: 'other', name: 'その他', color: '#64748b' }
    ];

    const handleTypeSelect = (sType: ScheduleType) => {
        setType(sType.id);
        if (sType.defaultStartTime) {
            setStartTime(sType.defaultStartTime);
        }
        if (sType.defaultEndTime) {
            setEndTime(sType.defaultEndTime);
        }
    };

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title="訪問予定の登録"
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
                                onClick={() => handleTypeSelect(sType)}
                                className={`p-2 rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${type === sType.id
                                    ? `border-transparent text-white shadow-md transform scale-105`
                                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                style={{
                                    backgroundColor: type === sType.id ? sType.color : undefined,
                                    borderColor: type === sType.id ? sType.color : 'transparent',
                                }}
                            >
                                {sType.name}
                            </button>
                        ))}
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
