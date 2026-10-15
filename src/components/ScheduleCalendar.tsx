"use client";

import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin, { DateClickArg } from '@fullcalendar/interaction';
import { Visit, Client, VisitType, ScheduleType } from '@/types';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';

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
  onDatesSet?: (date: Date) => void;
  showOnlyMySchedule?: boolean;
  onToggleShowOnlyMySchedule?: () => void;
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
  onEventResize,
  onDatesSet,
  showOnlyMySchedule = false,
  onToggleShowOnlyMySchedule
}: ScheduleCalendarProps) => {
  const [mounted, setMounted] = useState(false);
  const [currentView, setCurrentView] = useState('dayGridMonth');
  const [weekViewClientId, setWeekViewClientId] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [selectedDateState, setSelectedDateState] = useState<Date>(new Date());
  const [isListExpanded, setIsListExpanded] = useState<boolean>(false);
  // Allow local state fallback if props aren't provided (though they will be)
  const [localEvents, setLocalEvents] = useState<any[]>([]);

  const displayEvents = propEvents || localEvents;

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDateClick = (arg: DateClickArg) => {
    console.log("Date clicked:", arg.dateStr);
    setSelectedDateState(arg.date);
    if (isMobile) {
      // スマホでは日付マスをタップした時にその日の予定リストをスムーズに展開
      setIsListExpanded(true);
    } else if (onDateClick) {
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

  const toggleEventStatus = async (eventId: string, currentStatus: string, eventObj: any) => {
    const isCompleted = currentStatus === 'completed';
    const newStatus = isCompleted ? 'scheduled' : 'completed';
    
    // Construct the updated event payload
    const updatedPayload = {
        id: eventId,
        title: eventObj.title,
        allDay: eventObj.allDay,
        start: eventObj.startStr || eventObj.start,
        end: eventObj.endStr || eventObj.end || eventObj.start,
        backgroundColor: eventObj.backgroundColor,
        extendedProps: {
            ...(eventObj.extendedProps || {}),
            status: newStatus
        }
    };

    // Optimistic UI Update for instant feedback
    if (setEvents) {
        const optimisticEvents = filteredEvents.map(e => e.id === eventId ? {
            ...e,
            extendedProps: { ...e.extendedProps, status: newStatus }
        } : e);
        setEvents(optimisticEvents);
    }

    try {
        await fetch('/api/events', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPayload)
        });
        
        if (setEvents) {
            fetch('/api/events').then(res => res.json()).then(data => setEvents(data));
        }
    } catch(err) {
        console.error("Failed to update status", err);
        if (setEvents) setEvents(filteredEvents); // Revert on fail
    }
  };

  const getSelectedDayEvents = () => {
    const dateStr = selectedDateState.toLocaleDateString('sv-SE');
    const currentDay = selectedDateState.getDay();

    return filteredEvents.filter(e => {
      // Check if this date is excluded
      const excludedDates = e.extendedProps?.excludedDates || e.excludedDates || [];
      if (excludedDates.includes(dateStr)) return false;

      // Check single instance or monthly manually-created instances
      if (e.start) {
        const startStr = getJSTDateStr(e.start);
        if (startStr === dateStr) return true;
      }

      // Check weekly recurring
      const daysOfWeek = e.daysOfWeek || e.extendedProps?.recurring?.daysOfWeek;
      if (daysOfWeek && Array.isArray(daysOfWeek) && daysOfWeek.includes(currentDay)) {
        if (e.startRecur && dateStr < e.startRecur) return false;
        if (e.endRecur && dateStr > e.endRecur) return false;
        return true;
      }

      return false;
    }).sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      if (a.start && b.start) {
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      }
      return 0;
    });
  };

  // Filter and normalize events for display
  const ensureJst = (iso: string) => {
    if (!iso || typeof iso !== 'string') return iso;
    return iso.includes('+') || iso.endsWith('Z') ? iso : `${iso}+09:00`;
  };

  const getJSTDateStr = (iso: string | Date) => {
    if (!iso) return '';
    const date = typeof iso === 'string' ? new Date(ensureJst(iso)) : iso;
    return date.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' });
  };

  const isWeekOrDayView = currentView === 'timeGridWeek' || currentView === 'timeGridDay';

  const filteredEvents = (selectedClientId
    ? displayEvents.filter(e => e.extendedProps?.clientId === selectedClientId || e.extendedProps?.isPersonal)
    : displayEvents).filter(e => {
      if (isWeekOrDayView && weekViewClientId !== 'all') {
        return e.extendedProps?.clientId === weekViewClientId || e.extendedProps?.isPersonal;
      }
      return true;
    }).map(e => ({
      ...e,
      start: ensureJst(e.start),
      end: ensureJst(e.end)
    }));

  if (!mounted) return <div className="h-full w-full bg-slate-50 animate-pulse rounded-lg"></div>;

  return (
    <div className="h-full w-full flex flex-col calendar-wrapper relative bg-white rounded-xl overflow-hidden">
      {isWeekOrDayView && (
        <div className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-200 z-10 gap-2 flex-wrap">
          {onToggleShowOnlyMySchedule && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onToggleShowOnlyMySchedule();
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-colors border shadow-sm ${
                showOnlyMySchedule
                  ? 'bg-sky-500 text-white border-sky-600 shadow-sky-200'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <span>👤 自分の予定のみ</span>
              <span className={`w-2 h-2 rounded-full ${showOnlyMySchedule ? 'bg-white' : 'bg-slate-300'}`} />
            </button>
          )}

          {clients.length > 0 && !showOnlyMySchedule && (
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-xs shadow-2xs">
              <span className="text-[11px] font-bold text-slate-500">利用者:</span>
              <select
                className="bg-transparent font-bold text-sky-700 outline-none cursor-pointer text-xs"
                value={weekViewClientId}
                onChange={(e) => setWeekViewClientId(e.target.value)}
              >
                <option value="all">全員を表示</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} 様のみ</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
      <div className={`w-full min-h-0 relative ${isMobile ? (!isWeekOrDayView && isListExpanded ? 'h-[58%] flex-1' : 'flex-1') : 'flex-1'}`}>
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
            display: flex !important;
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
            gap: 2px !important;
            margin-bottom: 4px !important;
            padding: 0 2px !important;
          }
          .fc-toolbar-chunk {
            display: flex !important;
            align-items: center !important;
            gap: 2px !important;
          }
          .fc-toolbar-title {
            font-size: 0.9rem !important;
            font-weight: 700 !important;
            white-space: nowrap !important;
          }
          .fc-button {
            padding: 2px 6px !important;
            font-size: 11px !important;
            font-weight: 600 !important;
            border-radius: 6px !important;
            min-height: 26px !important;
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
        
        /* Custom scroll for day cells */
        .fc-daygrid-day-events {
          max-height: 120px !important;
          overflow-y: auto !important;
          margin-bottom: 2px !important;
        }
        /* Only apply to dayGridMonth view to avoid messing up timeGrid */
        .fc-dayGridMonth-view .fc-daygrid-day-events {
          max-height: calc(100vh / 6 - 40px) !important;
        }
        .fc-daygrid-day-events::-webkit-scrollbar {
          width: 4px;
        }
        .fc-daygrid-day-events::-webkit-scrollbar-track {
          background: transparent;
        }
        .fc-daygrid-day-events::-webkit-scrollbar-thumb {
          background-color: #cbd5e1;
          border-radius: 4px;
        }
        .fc-daygrid-day-events::-webkit-scrollbar-thumb:hover {
          background-color: #94a3b8;
        }
      `}</style>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          datesSet={(arg) => {
            setCurrentView(arg.view.type);
            if (onDatesSet) {
              onDatesSet(arg.view.currentStart);
            }
          }}
          headerToolbar={isMobile ? {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek'
          } : {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
          }}
          events={filteredEvents}
          dateClick={handleDateClick}
          height="100%"
          editable={true}
          selectMirror={true}
          dayMaxEvents={false}
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          locale="ja"
          buttonText={{
            today: '今',
            month: '月',
            week: '週',
            day: '日'
          }}
          timeZone="local"
          eventOrder="start,allDay,title"
          dayCellContent={(arg) => {
            // Find personal status events for this day (including recurring and exceptions)
            const dateStr = arg.date.toLocaleDateString('sv-SE'); // YYYY-MM-DD
            const currentDay = arg.date.getDay();

            const dayEvents = filteredEvents.filter(e => {
              const isPersonal = e.extendedProps?.isPersonal || e.isPersonal;
              const hasClient = !!(e.extendedProps?.clientId || e.clientId);
              if (!isPersonal || hasClient) return false;

              // Check if this date is excluded
              const excludedDates = e.extendedProps?.excludedDates || e.excludedDates || [];
              if (excludedDates.includes(dateStr)) return false;

              // Check single instance or monthly manually-created instances
              if (e.start) {
                const startStr = getJSTDateStr(e.start);
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

            const isSelected = dateStr === selectedDateState.toLocaleDateString('sv-SE');

            return (
              <div className={`flex items-start justify-between w-full px-1 pt-0.5 pb-0 h-full transition-colors ${isMobile && isSelected ? 'bg-sky-50 border border-sky-300 rounded-lg shadow-inner ring-1 ring-sky-200' : ''}`}>
                <div className="flex flex-wrap gap-0.5 max-w-[75%] mt-0.5">
                  {dayEvents.map((e, idx) => {
                    const typeName = (e.title || '').split(':').pop()?.trim();
                    const yellowNames = ['休み', '法外', '法内', '有休', '有給'];

                    const handleBadgeClick = (event: React.MouseEvent) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (onEventClick) onEventClick({ event: e, isManual: true });
                    };

                    const isCompleted = e.extendedProps?.status === 'completed' || e.status === 'completed';

                    if (yellowNames.includes(typeName)) {
                      return <span key={idx} onClick={handleBadgeClick} className={`status-badge status-badge-yellow ${isCompleted ? 'opacity-50 line-through' : ''}`}>{typeName}</span>;
                    }
                    if (typeName === '事業所会議' || typeName === '担当者会議') {
                      return <span key={idx} onClick={handleBadgeClick} className={`status-badge status-badge-orange ${isCompleted ? 'opacity-50 line-through' : ''}`}>会議</span>;
                    }
                    if (typeName === 'テレワーク') {
                      return <span key={idx} onClick={handleBadgeClick} className={`status-badge status-badge-green ${isCompleted ? 'opacity-50 line-through' : ''}`}>テレ</span>;
                    }

                    // Fallback: Show as a generic badge using its color for any other personal types
                    return (
                      <span
                        key={idx}
                        onClick={handleBadgeClick}
                        className={`status-badge ${isCompleted ? 'opacity-50' : ''}`}
                        style={{
                          backgroundColor: (e as any).backgroundColor || '#94a3b8',
                          color: 'white',
                          border: 'none',
                          textDecoration: isCompleted ? 'line-through' : 'none'
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
            const hasClient = !!arg.event.extendedProps?.clientId;
            const excludedDates = arg.event.extendedProps?.excludedDates || [];
            const currentDate = arg.event.startStr.split('T')[0];

            const classes = [];
            if (excludedDates.includes(currentDate)) classes.push('hidden');
            // Hide personal events from main list in Month view only if they do not have a client
            if (isPersonal && !hasClient && arg.view.type === 'dayGridMonth') classes.push('hidden-personal-event');

            return classes;
          }}
          eventContent={(arg) => {
            const excludedDates = arg.event.extendedProps?.excludedDates || [];
            const currentDate = arg.event.startStr.split('T')[0];
            if (excludedDates.includes(currentDate)) return null;

            const isPersonal = arg.event.extendedProps?.isPersonal;
            const hasClient = !!arg.event.extendedProps?.clientId;
            if (isPersonal && !hasClient && arg.view.type === 'dayGridMonth') return null; // Handled by dayCellContent

            const isCompleted = arg.event.extendedProps?.status === 'completed';

            const handleToggleComplete = async (e: React.MouseEvent) => {
                e.preventDefault();
                e.stopPropagation();
                toggleEventStatus(arg.event.id, arg.event.extendedProps?.status || 'scheduled', arg.event);
            };

            return (
              <div className={`fc-event-main-frame flex items-center px-1 overflow-hidden gap-1 transition-opacity ${isCompleted ? 'opacity-50' : ''}`}>
                {(!isPersonal || hasClient) && (
                    <div 
                       onClick={handleToggleComplete}
                       className={`flex-none w-[10px] h-[10px] mt-[1px] rounded flex items-center justify-center cursor-pointer transition-colors ${isCompleted ? 'bg-emerald-500 border-none' : 'bg-transparent border border-white/70 hover:bg-white/30'}`}
                       title={isCompleted ? "実績あり (クリックで解除)" : "実績なし (クリックで実績に変更)"}
                    >
                       {isCompleted && <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                )}
                <div className={`fc-event-title-container overflow-hidden ${isCompleted ? 'line-through' : ''}`}>
                  <div className="fc-event-title fc-sticky text-[10px] leading-tight truncate">{arg.event.title}</div>
                </div>
              </div>
            );
          }}
          eventClick={handleEventClick}
        />
      </div>
      
      {isMobile && !isWeekOrDayView && (
        <div className={`border-t border-slate-200 bg-slate-50/95 flex flex-col ${
          isListExpanded ? 'h-[44%] min-h-[160px] max-h-[260px]' : 'h-11 flex-none'
        }`}>
          {/* Header & Accordion Toggle */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200 flex-none select-none">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsListExpanded(!isListExpanded);
              }}
              className="flex items-center gap-1.5 min-w-0 text-left outline-none cursor-pointer active:opacity-70"
            >
              <span className="text-xs font-bold text-slate-800 whitespace-nowrap">
                {selectedDateState.getMonth() + 1}月{selectedDateState.getDate()}日({(() => {
                  const days = ['日', '月', '火', '水', '木', '金', '土'];
                  return days[selectedDateState.getDay()];
                })()})
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 whitespace-nowrap">
                {getSelectedDayEvents().length}件
              </span>
              <span className="text-[10px] text-sky-700 font-bold flex items-center gap-0.5 ml-1 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                {isListExpanded ? (
                  <>閉じる <ChevronDown size={13} /></>
                ) : (
                  <>一覧を見る <ChevronUp size={13} /></>
                )}
              </span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (onDateClick) {
                  onDateClick(selectedDateState);
                }
              }}
              className="bg-sky-500 hover:bg-sky-600 active:scale-95 text-white font-bold px-2.5 py-1 rounded-full text-[11px] shadow-sm flex items-center gap-1 whitespace-nowrap"
            >
              <Plus size={12} strokeWidth={3} /> 追加
            </button>
          </div>
          
          {/* Event List (only visible when expanded) */}
          {isListExpanded && (
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {getSelectedDayEvents().length === 0 ? (
                <div className="text-center text-xs text-slate-400 py-6 font-bold">この日の予定はありません</div>
              ) : (
                getSelectedDayEvents().map((e, idx) => {
                  const isCompleted = e.extendedProps?.status === 'completed';
                  const hasClient = !!(e.extendedProps?.clientId || e.clientId);
                  const isPersonal = e.extendedProps?.isPersonal || e.isPersonal;
                  
                  // Format time range
                  let timeStr = '終日';
                  if (!e.allDay && e.start) {
                    const s = new Date(e.start);
                    const sh = String(s.getHours()).padStart(2, '0');
                    const sm = String(s.getMinutes()).padStart(2, '0');
                    let eh = '';
                    let em = '';
                    if (e.end) {
                      const endObj = new Date(e.end);
                      eh = String(endObj.getHours()).padStart(2, '0');
                      em = String(endObj.getMinutes()).padStart(2, '0');
                    } else {
                      const endObj = new Date(s.getTime() + 30 * 60 * 1000);
                      eh = String(endObj.getHours()).padStart(2, '0');
                      em = String(endObj.getMinutes()).padStart(2, '0');
                    }
                    timeStr = `${sh}:${sm}〜${eh}:${em}`;
                  }

                  // Color mapping
                  const bgColor = e.backgroundColor || '#94a3b8';
                  
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (onEventClick) {
                          onEventClick({ event: e });
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer ${
                        isCompleted ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Completion Toggle */}
                        {hasClient && (
                          <div
                            onClick={(evt) => {
                              evt.preventDefault();
                              evt.stopPropagation();
                              toggleEventStatus(e.id, e.extendedProps?.status || 'scheduled', e);
                            }}
                            className={`flex-none w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              isCompleted
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-slate-300 text-transparent hover:border-emerald-400'
                            }`}
                          >
                            {isCompleted && (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                        
                        {/* Time & Title */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              {timeStr}
                            </span>
                            {isPersonal && !hasClient && (
                              <span className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded">
                                自分の予定
                              </span>
                            )}
                          </div>
                          <div className={`text-xs font-bold ${isCompleted ? 'line-through text-slate-400 font-normal' : 'text-slate-700'} truncate`}>
                            {e.title}
                          </div>
                        </div>
                      </div>

                      {/* Indicator Color Tag */}
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-none ml-2"
                        style={{ backgroundColor: bgColor }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleCalendar;