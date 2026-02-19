"use client";

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { Visit, Client, VisitType, ScheduleType } from '@/types';
import VisitModal from './VisitModal';

interface ScheduleCalendarProps {
  clients?: Client[];
  events?: any[];
  setEvents?: (events: any[]) => void;
  selectedClientId?: string | null;
  scheduleTypes?: ScheduleType[];
}

const ScheduleCalendar = ({ clients = [], events: propEvents, setEvents, selectedClientId, scheduleTypes = [] }: ScheduleCalendarProps) => {
  const [mounted, setMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // Allow local state fallback if props aren't provided (though they will be)
  const [localEvents, setLocalEvents] = useState<any[]>([]);

  const displayEvents = propEvents || localEvents;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDateClick = (arg: DateClickArg) => {
    setSelectedDate(arg.date);
    setIsModalOpen(true);
  };

  const handleSaveVisit = (data: { clientId: string; type: VisitType; start: string; end: string; notes: string }) => {
    const client = clients.find(c => c.id === data.clientId);
    if (!client) return;

    // Determine label and color
    let typeLabel = data.type;
    let color = '#64748b'; // default

    // Check if it's a known schedule type
    if (scheduleTypes.length > 0) {
      const typeDef = scheduleTypes.find(t => t.id === data.type || t.name === data.type);
      if (typeDef) {
        typeLabel = typeDef.name;
        color = typeDef.color;
      } else {
        // Fallback for default hardcoded types if not in scheduleTypes (though we initialized scheduleTypes with defaults)
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
        typeLabel = defaultTypeLabel[data.type as string] || data.type;
        color = defaultColor[data.type as string] || '#64748b';
      }
    } else {
      // Original hardcoded logic if scheduleTypes are not provided
      const defaultTypeLabel: Record<string, string> = {
        monitoring: 'モニタリング',
        assessment: 'アセスメント',
        conference: '担当者会議',
        other: 'その他'
      };
      const defaultColor: Record<string, string> = {
        monitoring: '#0ea5e9', // Sky
        assessment: '#f43f5e', // Rose
        conference: '#8b5cf6', // Violet
        other: '#64748b'       // Slate
      };
      typeLabel = defaultTypeLabel[data.type as string] || data.type;
      color = defaultColor[data.type as string] || '#64748b';
    }

    const newEvent = {
      title: `${client.name}: ${typeLabel}`,
      start: data.start,
      end: data.end,
      backgroundColor: color,
      extendedProps: {
        clientId: data.clientId,
        type: data.type,
        notes: data.notes
      }
    };

    if (setEvents) {
      setEvents([...displayEvents, newEvent]);
    } else {
      setLocalEvents([...localEvents, newEvent]);
    }
  };

  // Filter events if a client is selected
  const filteredEvents = selectedClientId
    ? displayEvents.filter(e => e.extendedProps?.clientId === selectedClientId)
    : displayEvents;

  if (!mounted) return <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg"></div>;

  return (
    <div className="h-full w-full calendar-wrapper">
      <style jsx global>{`
        .fc-toolbar-title {
          font-size: 1.25rem !important;
          font-weight: 600;
          color: #334155;
        }
        .fc-button-primary {
          background-color: var(--primary-color) !important;
          border-color: var(--primary-color) !important;
        }
        .fc-button-primary:hover {
          background-color: #0284c7 !important;
          border-color: #0284c7 !important;
        }
        .fc-daygrid-day.fc-day-today {
          background-color: #f0f9ff !important;
        }
        .fc-event { cursor: pointer; }
        .fc-daygrid-day:hover { background-color: #f8fafc; cursor: pointer; }
      `}</style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        events={filteredEvents}
        dateClick={handleDateClick}
        height="100%"
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        locale="ja"
        buttonText={{
          today: '今日',
          month: '月',
          week: '週',
          day: '日'
        }}
      />
      <VisitModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveVisit}
        initialDate={selectedDate}
        clients={clients}
        scheduleTypes={scheduleTypes}
      />
    </div>
  );
};

export default ScheduleCalendar;