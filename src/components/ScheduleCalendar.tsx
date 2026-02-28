"use client";

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { Visit, Client, VisitType, ScheduleType } from '@/types';

interface ScheduleCalendarProps {
  clients?: Client[];
  events?: any[];
  setEvents?: (events: any[]) => void;
  selectedClientId?: string | null;
  scheduleTypes?: ScheduleType[];
  onDateClick?: (date: Date) => void;
  onEditEvent?: (event: any) => void;
  onDeleteEvent?: (eventInfo: any) => void;
}

const ScheduleCalendar = ({
  clients = [],
  events: propEvents,
  setEvents,
  selectedClientId,
  scheduleTypes = [],
  onDateClick,
  onEditEvent,
  onDeleteEvent
}: ScheduleCalendarProps) => {
  const [mounted, setMounted] = useState(false);
  // Allow local state fallback if props aren't provided (though they will be)
  const [localEvents, setLocalEvents] = useState<any[]>([]);

  const displayEvents = propEvents || localEvents;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDateClick = (arg: DateClickArg) => {
    console.log("Date clicked:", arg.dateStr);
    if (onDateClick) {
      onDateClick(arg.date);
    }
  };

  const handleEventClick = (info: any) => {
    if (onEditEvent) {
      onEditEvent(info.event);
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
        eventContent={(arg) => {
          const excludedDates = arg.event.extendedProps?.excludedDates || [];
          const currentDate = arg.event.startStr.split('T')[0];
          if (excludedDates.includes(currentDate)) {
            return null; // Don't render
          }
          return (
            <div className="fc-event-main-frame flex items-center px-1 overflow-hidden">
              <div className="fc-event-title-container overflow-hidden">
                <div className="fc-event-title fc-sticky text-[10px] leading-tight truncate">{arg.event.title}</div>
              </div>
            </div>
          );
        }}
        eventClick={handleEventClick}
      />
    </div>
  );
};

export default ScheduleCalendar;