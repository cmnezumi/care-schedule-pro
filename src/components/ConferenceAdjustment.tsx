"use client";

import React, { useState } from 'react';
import { Client, ScheduleType } from '@/types';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import VisitModal from './VisitModal'; // Assuming VisitModal is in the same directory

interface ConferenceAdjustmentProps {
    clients: Client[];
    selectedClientId: string | null;
    onSaveEvent: (event: any) => void;
    currentEvents: any[];
    scheduleTypes: ScheduleType[];
}

const ConferenceAdjustment = ({ clients, selectedClientId, onSaveEvent, currentEvents, scheduleTypes }: ConferenceAdjustmentProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

    const selectedClient = clients.find(c => c.id === selectedClientId);

    if (!selectedClientId || !selectedClient) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <p>左側のリストから利用者を選択してください</p>
            </div>
        );
    }

    const handleDateClick = (arg: DateClickArg) => {
        setSelectedDate(arg.date);
        setIsModalOpen(true);
    };

    const handleSaveVisit = (data: {
        id?: string;
        clientId: string | null;
        type: any;
        startTime: string;
        endTime: string;
        notes: string;
        isPersonal?: boolean;
        allDay?: boolean;
        recurring?: any;
        monthlyRecur?: any;
    }) => {
        if (data.isPersonal) return; // Should not happen in this context
        const client = clients.find(c => c.id === data.clientId);
        if (!client) return;

        let typeLabel = data.type;
        let color = '#64748b';

        // Check against scheduleTypes
        if (scheduleTypes.length > 0) {
            const typeDef = scheduleTypes.find(t => t.id === data.type || t.name === data.type);
            if (typeDef) {
                typeLabel = typeDef.name;
                color = typeDef.color;
            } else {
                const defaultTypeLabel: Record<string, string> = {
                    monitoring: 'モニタリング',
                    assessment: 'アセスメント',
                    conference: '担当者会議',
                    other: 'その他'
                };
                const defaultColor: Record<string, string> = {
                    monitoring: '#0ea5e9',
                    assessment: '#f43f5e',
                    conference: '#8b5cf6',
                    other: '#64748b'
                };
                typeLabel = defaultTypeLabel[data.type] || data.type;
                color = defaultColor[data.type] || '#64748b';
            }
        } else {
            const defaultTypeLabel: Record<string, string> = {
                monitoring: 'モニタリング',
                assessment: 'アセスメント',
                conference: '担当者会議',
                other: 'その他'
            };
            const defaultColor: Record<string, string> = {
                monitoring: '#0ea5e9',
                assessment: '#f43f5e',
                conference: '#8b5cf6',
                other: '#64748b'
            };
            typeLabel = defaultTypeLabel[data.type] || data.type;
            color = defaultColor[data.type] || '#64748b';
        }

        const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
        const newEvent = {
            id: Math.random().toString(36).substr(2, 9),
            title: `${client.name}: ${typeLabel}`,
            start: data.allDay ? dateStr : `${dateStr}T${data.startTime}:00`,
            end: data.allDay ? dateStr : `${dateStr}T${data.endTime}:00`,
            allDay: data.allDay,
            backgroundColor: color,
            extendedProps: {
                clientId: data.clientId,
                type: data.type,
                notes: data.notes,
                allDay: data.allDay
            }
        };

        onSaveEvent(newEvent);
    };

    // Filter events for the selected client to show availability
    const clientEvents = currentEvents.filter(e => e.extendedProps?.clientId === selectedClientId);

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-violet-50">
                <div>
                    <h2 className="font-bold text-violet-700 text-lg">担当者会議の調整</h2>
                    <p className="text-sm text-slate-600">対象者: <span className="font-semibold text-slate-800">{selectedClient.name}</span> 様</p>
                </div>
                <div className="text-xs text-slate-500">
                    カレンダーの日付をクリックして会議を設定してください
                </div>
            </div>

            <div className="flex-grow p-4 overflow-auto">
                <style jsx global>{`
                    .fc-event { cursor: pointer; }
                `}</style>
                <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: ''
                    }}
                    events={clientEvents}
                    dateClick={handleDateClick}
                    height="100%"
                    locale="ja"
                    buttonText={{ today: '今日' }}
                />
            </div>

            <VisitModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveVisit}
                initialDate={selectedDate}
                clients={[selectedClient]} // Only pass the selected client to restrict choice
                scheduleTypes={scheduleTypes}
            />
        </div>
    );
};

export default ConferenceAdjustment;
