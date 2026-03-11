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
  onEventClick?: (event: any) => void;
  onEventDrop?: (event: any) => void;
  onEventResize?: (event: any) => void;
}

const ScheduleCalendar = ({
  clients = [],
  events: propEvents,
  setEvents,
  selectedClientId,
  scheduleTypes = [],
  onDateClick,
  onEventClick,
  onEventDrop,
  onEventResize
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
    if (onEventClick) {
      // Pass both the event and the full info object just in case
      onEventClick(info);
    }
  };

  const handleEventDrop = (info: any) => {
    if (onEventDrop) {
      onEventDrop(info.event);
    }
  };

  const handleEventResize = (info: any) => {
    if (onEventResize) {
      onEventResize(info.event);
    }
  };

  // Filter events if a client is selected
  const filteredEvents = selectedClientId
    ? displayEvents.filter(e => e.extendedProps?.clientId === selectedClientId || e.extendedProps?.isPersonal)
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
        @media (max-width: 768px) {
          .fc-toolbar {
            flex-direction: column;
            gap: 5px;
            margin-bottom: 0.5em !important;
          }
          .fc-toolbar-chunk {
            display: flex;
            justify-content: center;
            width: 100%;
          }
          .fc-toolbar-title {
            font-size: 1rem !important;
          }
          .fc-button {
            padding: 2px 4px !important;
            font-size: 10px !important;
          }
        }
        @media (max-height: 450px) and (orientation: landscape) {
          .fc-toolbar {
            display: flex !important;
            padding: 0 4px !important;
            margin-bottom: 2px !important;
          }
          .fc-toolbar-chunk:empty { display: none; }
        }
        @media (max-height: 500px) and (orientation: landscape) {
          .fc-toolbar {
            flex-direction: row !important;
            margin-bottom: 0.1em !important;
            padding: 0 4px !important;
          }
          .fc-toolbar-title {
            font-size: 0.8rem !important;
          }
          .fc-button {
            padding: 1px 3px !important;
            font-size: 9px !important;
          }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .fc-event { cursor: pointer; }
        .fc-daygrid-day:hover { background-color: #f8fafc; cursor: pointer; }
        
        /* Personal Status Badges in Day Cell */
        .status-badge {
          display: inline-block;
          font-size: 8px;
          padding: 0px 2px;
          border-radius: 2px;
          color: white;
          font-weight: bold;
          line-height: normal;
          white-space: nowrap;
          vertical-align: middle;
        }
        .status-badge-yellow { background-color: #fef08a; color: #854d0e; border: 1px solid #eab308; }
        .status-badge-orange { background-color: #f97316; }
        .status-badge-green { background-color: #22c55e; }
        
        /* Hide original event bars for personal events */
        .hidden-personal-event { display: none !important; }
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
          today: '今',
          month: '月',
          week: '週',
          day: '日'
        }}
        timeZone="local"
        dayCellContent={(arg) => {
          // Find personal status events for this day (including recurring and exceptions)
          const dateStr = arg.date.toLocaleDateString('sv-SE'); // YYYY-MM-DD
          const currentDay = arg.date.getDay();

          const dayEvents = filteredEvents.filter(e => {
            const isPersonal = e.extendedProps?.isPersonal || e.isPersonal;
            if (!isPersonal) return false;

            // Check if this date is excluded
            const excludedDates = e.extendedProps?.excludedDates || e.excludedDates || [];
            if (excludedDates.includes(dateStr)) return false;

            // Check single instance or monthly manually-created instances
            if (e.start) {
              const startStr = typeof e.start === 'string' ? e.start.split('T')[0] : e.start.toLocaleDateString('sv-SE');
              if (startStr === dateStr) return true;
            }

            // Check weekly recurring (using daysOfWeek)
            const daysOfWeek = e.daysOfWeek || e.extendedProps?.recurring?.daysOfWeek;
            if (daysOfWeek && Array.isArray(daysOfWeek) && daysOfWeek.includes(currentDay)) {
              // Check recur limits if they exist
              if (e.startRecur && dateStr < e.startRecur) return false;
              if (e.endRecur && dateStr > e.endRecur) return false;
              return true;
            }

            return false;
          });

          return (
            <div className="flex items-start justify-between w-full px-1 pt-0.5 pb-0 h-full">
              <div className="flex flex-wrap gap-0.5 max-w-[75%] mt-0.5">
                {dayEvents.map((e, idx) => {
                  const typeName = (e.title || '').split(':').pop()?.trim();
                  const yellowNames = ['休み', '法外', '法内', '有休', '有給'];

                  const handleBadgeClick = (event: React.MouseEvent) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (onEventClick) onEventClick({ event: e, isManual: true });
                  };

                  if (yellowNames.includes(typeName)) {
                    return <span key={idx} onClick={handleBadgeClick} className="status-badge status-badge-yellow">{typeName}</span>;
                  }
                  if (typeName === '事業所会議' || typeName === '担当者会議') {
                    return <span key={idx} onClick={handleBadgeClick} className="status-badge status-badge-orange">会議</span>;
                  }
                  if (typeName === 'テレワーク') {
                    return <span key={idx} onClick={handleBadgeClick} className="status-badge status-badge-green">テレ</span>;
                  }

                  // Fallback: Show as a generic badge using its color for any other personal types
                  return (
                    <span
                      key={idx}
                      onClick={handleBadgeClick}
                      className="status-badge"
                      style={{
                        backgroundColor: (e as any).backgroundColor || '#94a3b8',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      {typeName.length > 2 ? typeName.substring(0, 2) : typeName}
                    </span>
                  );
                })}
              </div>
              <div className="fc-daygrid-day-number !p-0 !m-0 leading-none">{arg.dayNumberText}</div>
            </div>
          );
        }}
        eventClassNames={(arg) => {
          const isPersonal = arg.event.extendedProps?.isPersonal;
          const excludedDates = arg.event.extendedProps?.excludedDates || [];
          const currentDate = arg.event.startStr.split('T')[0];

          const classes = [];
          if (excludedDates.includes(currentDate)) classes.push('hidden');
          // Hide personal events from main list in Month view
          if (isPersonal && arg.view.type === 'dayGridMonth') classes.push('hidden-personal-event');

          return classes;
        }}
        eventContent={(arg) => {
          const excludedDates = arg.event.extendedProps?.excludedDates || [];
          const currentDate = arg.event.startStr.split('T')[0];
          if (excludedDates.includes(currentDate)) return null;

          const isPersonal = arg.event.extendedProps?.isPersonal;
          if (isPersonal && arg.view.type === 'dayGridMonth') return null; // Handled by dayCellContent

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