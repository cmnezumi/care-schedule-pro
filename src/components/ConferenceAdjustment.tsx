"use client";

import React, { useState } from 'react';
import { Client, ScheduleType } from '@/types';
import { Users } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import VisitModal from './VisitModal'; // Assuming VisitModal is in the same directory

interface ConferenceAdjustmentProps {
    clients: Client[];
    events: any[];
    onAddEvent: (event: any) => void;
    onUpdateEvent: (event: any) => void;
    scheduleTypes: ScheduleType[];
}

const ConferenceAdjustment = ({ clients, events, onAddEvent, onUpdateEvent, scheduleTypes }: ConferenceAdjustmentProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
    const [editingEvent, setEditingEvent] = useState<any>(null);

    const handleDateClick = (arg: DateClickArg) => {
        setSelectedDate(arg.date);
        setEditingEvent(null);
        setIsModalOpen(true);
    };

    const handleEventClick = (info: any) => {
        setEditingEvent(info.event);
        setSelectedDate(info.event.start);
        setIsModalOpen(true);
    };

    const handleSaveVisit = (data: any) => {
        const client = clients.find(c => c.id === (data.clientId || selectedClientId));
        if (!client) return;

        const conferenceType = scheduleTypes.find(t => t.name.includes('会議')) || scheduleTypes[0];

        const dateStr = selectedDate ? selectedDate.toISOString().split('T')[0] : '';
        const startTime = data.startTime || '10:00';
        const endTime = data.endTime || '11:00';

        const eventData = {
            id: data.id || Math.random().toString(36).substr(2, 9),
            title: `${client.name}: ${data.type || conferenceType.name}`,
            start: data.allDay ? dateStr : `${dateStr}T${startTime}:00`,
            end: data.allDay ? dateStr : `${dateStr}T${endTime}:00`,
            allDay: data.allDay,
            backgroundColor: scheduleTypes.find(t => t.name === data.type)?.color || conferenceType.color,
            extendedProps: {
                clientId: client.id,
                careManagerId: client.careManagerId, // Preserving CM relation
                type: data.type || conferenceType.name,
                notes: data.notes,
                allDay: data.allDay
            }
        };

        if (data.id) {
            onUpdateEvent(eventData);
        } else {
            onAddEvent(eventData);
        }
    };

    // Filter events for the selected client ONLY
    const filteredEvents = events.filter(e => e.extendedProps?.clientId === selectedClientId);

    return (
        <div className="h-full flex flex-col bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-xl border border-slate-200">
            <div className="p-3 md:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4 bg-white">
                <div className="flex items-center justify-between md:block">
                    <h2 className="font-bold text-slate-800 text-base md:text-xl flex items-center gap-2">
                        <Users className="text-violet-500" size={20} />
                        担当者会議の調整
                    </h2>
                    <p className="hidden md:block text-xs md:text-sm text-slate-500">空き状況を確認しながら日程を選べます</p>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                    <label className="text-[10px] md:text-sm font-bold text-slate-600">利用者:</label>
                    <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="flex-1 md:flex-none rounded-lg md:rounded-xl border border-slate-200 bg-slate-50 px-2 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                    >
                        {clients.map(c => <option key={c.id} value={c.id}>{c.name} 様</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-grow p-2 md:p-6">
                <style jsx global>{`
                    .fc-event { cursor: pointer; border-radius: 6px !important; border: none !important; padding: 2px 4px !important; }
                    .fc-toolbar-title { font-size: 1rem !important; font-weight: 800 !important; color: #1e293b !important; }
                    .fc-button-primary { background-color: #f1f5f9 !important; border: none !important; color: #475569 !important; font-weight: 700 !important; text-transform: uppercase !important; font-size: 0.75rem !important; padding: 4px 8px !important; }
                    .fc-button-active { background-color: #8b5cf6 !important; color: white !important; }
                    
                    @media (max-height: 500px) and (orientation: landscape) {
                        .fc-toolbar { 
                            margin-bottom: 4px !important;
                            display: flex !important;
                            align-items: center !important;
                        }
                        .fc-toolbar-title { font-size: 0.8rem !important; }
                        .fc-button { padding: 1px 4px !important; font-size: 9px !important; }
                    }
                `}</style>
                <FullCalendar
                    plugins={[dayGridPlugin, interactionPlugin]}
                    initialView="dayGridMonth"
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: ''
                    }}
                    events={filteredEvents}
                    dateClick={handleDateClick}
                    eventClick={handleEventClick}
                    height="100%"
                    locale="ja"
                    buttonText={{ today: '今日' }}
                    dayMaxEvents={true}
                />
            </div>

            <VisitModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveVisit}
                selectedDate={selectedDate}
                editingEvent={editingEvent}
                clients={clients}
                scheduleTypes={scheduleTypes}
                defaultClientId={selectedClientId}
            />
        </div>
    );
};

export default ConferenceAdjustment;
