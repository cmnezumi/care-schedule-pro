"use client";

import React, { useState, useEffect } from 'react';
import ScheduleCalendar from "@/components/ScheduleCalendar";
import UserManagement from "@/components/UserManagement";

import UserModal from "@/components/UserModal";
import ShiftAutomation from "@/components/ShiftAutomation";
import ConferenceAdjustment from '@/components/ConferenceAdjustment';
import EditChoiceModal from "@/components/EditChoiceModal";
import Settings from "@/components/Settings";
import VisitModal from "@/components/VisitModal";
import DeletionChoiceModal from "@/components/DeletionChoiceModal";
import { Client, Visit, ScheduleType, CareManager, VisitType } from "@/types";

type TabType = 'settings' | 'schedule' | 'conference' | 'shift';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

  // Care Managers State
  const [careManagers] = useState<CareManager[]>([
    { id: 'cm1', name: 'ねずみ' },
    { id: 'cm2', name: 'ケアマネ A' },
    { id: 'cm3', name: 'ケアマネ B' },
  ]);
  const [selectedCareManagerId, setSelectedCareManagerId] = useState<string>('cm1');

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditChoiceModalOpen, setIsEditChoiceModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editTargetChoice, setEditTargetChoice] = useState<'single' | 'all'>('single');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<any>(null);

  const [dataLoaded, setDataLoaded] = useState(false);

  // Lifted state
  const [clients, setClients] = useState<Client[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([
    { id: 'monitoring', name: 'モニタリング', color: '#0ea5e9' },
    { id: 'assessment', name: 'アセスメント', color: '#f43f5e' },
    { id: 'conference', name: '担当者会議', color: '#f97316' }, // Orange
    { id: 'offday', name: '休み', color: '#eab308' },          // Yellow
    { id: 'offday_extra', name: '法外', color: '#eab308' },    // Yellow
    { id: 'offday_intra', name: '法内', color: '#eab308' },    // Yellow
    { id: 'paid_leave', name: '有休', color: '#eab308' },      // Yellow
    { id: 'telework', name: 'テレワーク', color: '#22c55e' },    // Green (Emerald-500)
    { id: 'other', name: 'その他', color: '#64748b' },
  ]);
  const [events, setEvents] = useState<any[]>([]);

  // Load from localStorage on mount
  React.useEffect(() => {
    const savedClients = localStorage.getItem('cp_clients');
    const savedTypes = localStorage.getItem('cp_scheduleTypes');
    const savedEvents = localStorage.getItem('cp_events');

    if (savedClients) setClients(JSON.parse(savedClients));
    else {
      // Default initial data if none exists
      setClients([
        { id: '1', name: '田中 太郎', address: '東京都渋谷区...', careLevel: '要介護1', careManagerId: 'cm1' },
        { id: '2', name: '佐藤 花子', address: '東京都新宿区...', careLevel: '要支援2', careManagerId: 'cm1' },
        { id: '3', name: '鈴木 一郎', address: '東京都港区...', careLevel: '要介護3', careManagerId: 'cm2' },
      ]);
    }

    if (savedTypes) {
      const parsed = JSON.parse(savedTypes) as ScheduleType[];
      // FORCE colors for consistency as requested by user
      const migrated = parsed.map(t => {
        if (['offday', 'offday_extra', 'offday_intra', 'paid_leave'].includes(t.id) ||
          ['休み', '法外', '法内', '有休'].includes(t.name)) {
          return { ...t, color: '#eab308' };
        }
        if (t.id === 'telework' || t.name === 'テレワーク') return { ...t, color: '#22c55e' };
        if (t.id === 'conference' || t.name === '担当者会議' || t.name === '事業所会議') return { ...t, color: '#f97316' };
        return t;
      });
      setScheduleTypes(migrated);
    }
    if (savedEvents) {
      const parsedEvents = JSON.parse(savedEvents) as any[];
      // Force migrate all event colors in the calendar
      const migratedEvents = parsedEvents.map(e => {
        const type = e.extendedProps?.type;
        const typeName = (e.title || '').split(':').pop()?.trim();

        let newColor = e.backgroundColor;
        const yellowTypes = ['offday', 'offday_extra', 'offday_intra', 'paid_leave', '休み', '法外', '法内', '有休'];
        if (yellowTypes.includes(type) || yellowTypes.includes(typeName)) newColor = '#eab308';
        if (type === 'telework' || type === 'テレワーク' || typeName === 'テレワーク') newColor = '#22c55e';
        if (type === 'conference' || type === '担当者会議' || typeName === '担当者会議' || typeName === '事業所会議') newColor = '#f97316';

        return {
          ...e,
          backgroundColor: newColor,
          borderColor: newColor
        };
      });
      setEvents(migratedEvents);
    }

    setDataLoaded(true);
  }, []);

  // Save to localStorage on changes
  React.useEffect(() => {
    if (dataLoaded) {
      localStorage.setItem('cp_clients', JSON.stringify(clients));
      localStorage.setItem('cp_scheduleTypes', JSON.stringify(scheduleTypes));
      localStorage.setItem('cp_events', JSON.stringify(events));
    }
  }, [clients, scheduleTypes, events, dataLoaded]);

  const [isSaving, setIsSaving] = useState(false);
  React.useEffect(() => {
    if (dataLoaded) {
      setIsSaving(true);
      const timer = setTimeout(() => setIsSaving(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [clients, scheduleTypes, events]);

  const handleAddClient = (clientData: Omit<Client, 'id' | 'careManagerId'>) => {
    const newClient: Client = {
      ...clientData,
      id: Math.random().toString(36).substr(2, 9),
      careManagerId: selectedCareManagerId,
    };
    setClients([...clients, newClient]);
  };

  const handleUpdateClient = (id: string, clientData: Omit<Client, 'id'>) => {
    setClients(clients.map(c => c.id === id ? { ...c, ...clientData } : c));
  };

  const handleDeleteClient = (id: string) => {
    setClients(clients.filter(c => c.id !== id));
    if (selectedClientId === id) {
      setSelectedClientId(null);
    }
  };

  const handleAddScheduleType = (typeData: Omit<ScheduleType, 'id'>) => {
    const newType: ScheduleType = {
      ...typeData,
      id: Math.random().toString(36).substr(2, 9)
    };
    setScheduleTypes([...scheduleTypes, newType]);
  };

  const handleDeleteScheduleType = (id: string) => {
    setScheduleTypes(scheduleTypes.filter(t => t.id !== id));
  };

  const handleDateClick = (date: Date) => {
    setEditingEvent(null);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleEditEvent = (event: any) => {
    const isRecurring = event.extendedProps?.isRecurring || event._def?.recurringDef;
    setEditingEvent(event);
    setSelectedDate(new Date(event.start));

    if (isRecurring) {
      setIsEditChoiceModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleEditChoice = (choice: 'single' | 'all') => {
    setEditTargetChoice(choice);
    setIsEditChoiceModalOpen(false);
    setIsModalOpen(true);
  };

  const handleAddEvent = (newEvent: any) => {
    setEvents([...events, newEvent]);
  };

  // Helper to format Date object to YYYY-MM-DD string without timezone shift
  const formatLocalDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Helper to calculate the Nth weekday of a month
  const calculateNthWeekday = (year: number, month: number, week: number, day: number) => {
    // month is 0-indexed
    const firstDayOfMonth = new Date(year, month, 1);
    let firstOccurrence = (day - firstDayOfMonth.getDay() + 7) % 7;
    let date = 1 + firstOccurrence + (week - 1) * 7;

    // Ensure the date is still within the same month (some months might not have 5 occurrences)
    const resultDate = new Date(year, month, date);
    if (resultDate.getMonth() !== month) {
      // Fallback to the 4th occurrence if 5th doesn't exist
      date -= 7;
      return new Date(year, month, date);
    }
    return resultDate;
  };

  const handleSaveVisit = (data: any) => {
    const client = data.isPersonal ? null : clients.find(c => c.id === data.clientId);
    if (!data.isPersonal && !client) return;

    const typeLabel = scheduleTypes.find(t => t.id === data.type || t.name === data.type)?.name || data.type;
    const color = scheduleTypes.find(t => t.id === data.type || t.name === data.type)?.color || '#94a3b8';

    // Helper to format title
    const eventTitle = data.isPersonal ? typeLabel : `${client?.name}: ${typeLabel}`;

    if (editingEvent) {
      const isRecurring = editingEvent.extendedProps?.isRecurring || editingEvent._def?.recurringDef;

      if (isRecurring && editTargetChoice === 'single') {
        // Exception logic for recurring event
        const dateStr = formatLocalDate(new Date(editingEvent.start));

        if (!dateStr) return; // Safety

        // 1. Add this date to excludedDates of the original recurring event
        const masterId = editingEvent.id || editingEvent.publicId;
        const eventTitleToMatch = editingEvent.title;
        const updatedEvents = events.map(e => {
          if ((masterId && e.id === masterId) || (!masterId && e.title === eventTitleToMatch)) {
            const excluded = e.extendedProps?.excludedDates || [];
            return {
              ...e,
              extendedProps: {
                ...e.extendedProps,
                excludedDates: [...new Set([...excluded, dateStr])]
              }
            };
          }
          return e;
        });

        // 2. Create a one-time event for this specific day
        const singleEvent = {
          id: Math.random().toString(36).substr(2, 9),
          title: eventTitle,
          start: data.allDay ? dateStr : `${dateStr}T${data.startTime}`,
          end: data.allDay ? dateStr : `${dateStr}T${data.endTime}`,
          allDay: data.allDay,
          backgroundColor: color,
          extendedProps: {
            clientId: data.clientId,
            careManagerId: editingEvent.extendedProps?.careManagerId || selectedCareManagerId,
            type: data.type,
            notes: data.notes,
            isPersonal: data.isPersonal,
            allDay: data.allDay
          }
        };

        setEvents([...updatedEvents, singleEvent]);
      } else {
        // Regular update or Global Recurring update
        const isMonthlyGroup = editingEvent.extendedProps?.isRecurInstance && editingEvent.extendedProps?.groupId;

        if (isMonthlyGroup && editTargetChoice === 'all') {
          // Re-expand monthly series: delete old group and create new one
          const oldGroupId = editingEvent.extendedProps.groupId;
          const eventTitle = editingEvent.title;
          const eventCM = editingEvent.extendedProps.careManagerId;

          // Fuzzy match for deletion if groupId is likely unique per instance (bug in older versions)
          const filteredEvents = events.filter(e => {
            if (e.extendedProps?.groupId === oldGroupId) return false;
            if (oldGroupId?.startsWith('monthly-') && e.title === eventTitle && e.extendedProps?.careManagerId === eventCM && e.extendedProps?.isRecurInstance) return false;
            return true;
          });

          const instances = [];
          const now = new Date(); // Re-expand 12 months from TODAY to ensure future is correct
          let year = now.getFullYear();
          let month = now.getMonth();
          const newGroupId = `monthly-${Date.now()}`;

          for (let i = 0; i < 12; i++) {
            const targetDate = calculateNthWeekday(year, month, data.monthlyRecur.week, data.monthlyRecur.day);
            const dayStr = formatLocalDate(targetDate);
            instances.push({
              title: eventTitle,
              backgroundColor: color,
              allDay: data.allDay,
              id: Math.random().toString(36).substr(2, 9),
              start: data.allDay ? dayStr : `${dayStr}T${data.monthlyRecur.startTime}`,
              end: data.allDay ? dayStr : `${dayStr}T${data.monthlyRecur.endTime}`,
              extendedProps: {
                clientId: data.clientId,
                careManagerId: editingEvent.extendedProps?.careManagerId || selectedCareManagerId,
                type: data.type,
                notes: data.notes,
                isPersonal: data.isPersonal,
                allDay: data.allDay,
                isRecurInstance: true,
                groupId: newGroupId,
                monthlyRecur: data.monthlyRecur
              }
            });
            month++; if (month > 11) { month = 0; year++; }
          }
          setEvents([...filteredEvents, ...instances]);
        } else {
          // Regular update (Single Instance)
          const updatedEvents = events.map(e => {
            if (e.id === editingEvent.id) {
              const isWeekly = !!e.daysOfWeek;

              if (isWeekly && editTargetChoice === 'all' && data.recurring) {
                // Update weekly recurrence parameters
                return {
                  ...e,
                  title: eventTitle,
                  backgroundColor: color,
                  daysOfWeek: data.recurring.daysOfWeek,
                  startTime: data.recurring.startTime,
                  endTime: data.recurring.endTime,
                  extendedProps: {
                    ...e.extendedProps,
                    clientId: data.clientId,
                    type: data.type,
                    notes: data.notes,
                    isPersonal: data.isPersonal,
                    allDay: data.allDay,
                    recurring: data.recurring
                  }
                };
              }

              // Default update for single or other types
              const newDateStr = e.start.split('T')[0];
              return {
                ...e,
                title: eventTitle,
                backgroundColor: color,
                start: data.allDay ? newDateStr : `${newDateStr}T${data.startTime}`,
                end: data.allDay ? newDateStr : `${newDateStr}T${data.endTime}`,
                allDay: data.allDay,
                extendedProps: {
                  ...e.extendedProps,
                  clientId: data.clientId,
                  type: data.type,
                  notes: data.notes,
                  isPersonal: data.isPersonal,
                  allDay: data.allDay,
                  ...(data.monthlyRecur && { monthlyRecur: data.monthlyRecur })
                }
              };
            }
            return e;
          });
          setEvents(updatedEvents);
        }
      }
      setIsModalOpen(data.isContinuous || false);
      setEditingEvent(null);
      return;
    }

    // NEW EVENT CREATION LOGIC
    const dateStr = selectedDate ? formatLocalDate(selectedDate) : '';
    const eventBase = {
      title: eventTitle,
      backgroundColor: color,
      allDay: data.allDay,
      extendedProps: {
        clientId: data.clientId,
        careManagerId: selectedCareManagerId,
        type: data.type,
        notes: data.notes,
        isPersonal: data.isPersonal,
        allDay: data.allDay
      }
    };

    if (data.recurring) {
      const newEvent = {
        ...eventBase,
        id: Math.random().toString(36).substr(2, 9),
        daysOfWeek: data.recurring.daysOfWeek,
        startTime: data.recurring.startTime,
        endTime: data.recurring.endTime,
        extendedProps: {
          ...eventBase.extendedProps,
          isRecurring: true,
          recurring: data.recurring
        }
      };
      setEvents([...events, newEvent]);
    } else if (data.monthlyRecur) {
      // Manual Expansion for Monthly Recurrence
      const instances = [];
      const now = new Date();
      let year = now.getFullYear();
      let month = now.getMonth();
      const groupId = `monthly-${Date.now()}`;

      for (let i = 0; i < 12; i++) {
        const targetDate = calculateNthWeekday(year, month, data.monthlyRecur.week, data.monthlyRecur.day);
        const dayStr = formatLocalDate(targetDate);
        instances.push({
          ...eventBase,
          id: Math.random().toString(36).substr(2, 9),
          start: data.allDay ? dayStr : `${dayStr}T${data.monthlyRecur.startTime}`,
          end: data.allDay ? dayStr : `${dayStr}T${data.monthlyRecur.endTime}`,
          extendedProps: {
            ...eventBase.extendedProps,
            isRecurInstance: true,
            groupId,
            monthlyRecur: data.monthlyRecur
          }
        });
        month++; if (month > 11) { month = 0; year++; }
      }
      setEvents([...events, ...instances]);
    } else {
      const newEvent = {
        ...eventBase,
        id: Math.random().toString(36).substr(2, 9),
        start: data.allDay ? dateStr : `${dateStr}T${data.startTime}`,
        end: data.allDay ? dateStr : `${dateStr}T${data.endTime}`,
      };
      setEvents([...events, newEvent]);
    }

    if (!data.isContinuous) {
      setIsModalOpen(false);
    }
  };

  // Migration Effect: Clean up "every day" monthly events
  useEffect(() => {
    if (events.length > 0) {
      const needsCleanup = events.some(e => (e as any).rrule && (e as any).rrule.freq === 'monthly');
      if (needsCleanup) {
        console.log("Cleaning up invalid monthly rrule events...");
        setEvents(prev => prev.filter(e => !(e as any).rrule));
      }
    }
  }, [events]);

  const handleDeleteEvent = (eventInfo: any) => {
    // Determine if it's recurring from either FullCalendar object or VisitModal initialData
    const isRecurring = eventInfo.extendedProps?.isRecurring ||
      eventInfo.extendedProps?.isRecurInstance ||
      eventInfo.recurrenceType === 'weekly' ||
      eventInfo.recurrenceType === 'monthly';

    if (isRecurring) {
      setEventToDelete(eventInfo);
      setIsDeletionModalOpen(true);
      return;
    }

    // Otherwise standard deletion
    const id = eventInfo.id;
    const title = eventInfo.title;

    setEvents(prev => prev.filter(e => {
      if (id && e.id) return e.id !== id;
      return !(e.title === title);
    }));
  };

  const handleConfirmDelete = (choice: 'all' | 'following' | 'this') => {
    if (!eventToDelete) return;

    const eventId = eventToDelete.id;
    const eventSeriesId = eventToDelete.extendedProps?.seriesId;
    const eventTitle = eventToDelete.title;
    const eventDate = eventToDelete.startStr?.split('T')[0] || eventToDelete.start.toISOString().split('T')[0];

    setEvents(prev => {
      if (choice === 'all') {
        const eventGroupId = eventToDelete.extendedProps?.groupId;
        const isMonthly = eventToDelete.extendedProps?.isRecurInstance;
        return prev.filter(e => {
          if (eventSeriesId && e.extendedProps?.seriesId === eventSeriesId) return false;
          // Exact group match
          if (eventGroupId && e.extendedProps?.groupId === eventGroupId) return false;
          // Fuzzy match for orphaned monthly instances (same title, same CM, same clientId)
          if (isMonthly && !eventSeriesId && e.extendedProps?.isRecurInstance &&
            e.title === eventTitle &&
            e.extendedProps?.careManagerId === eventToDelete.extendedProps?.careManagerId &&
            e.extendedProps?.clientId === eventToDelete.extendedProps?.clientId) return false;

          if (eventId && e.id === eventId) return false;
          if (!eventId && !eventSeriesId && !eventGroupId && e.title === eventTitle) return false;
          return true;
        });
      }

      if (choice === 'following') {
        const targetDate = new Date(eventDate);
        targetDate.setDate(targetDate.getDate() - 1);
        const endDateStr = targetDate.toISOString().split('T')[0];

        // For monthly series (generated individual events)
        if (eventSeriesId) {
          return prev.filter(e => {
            if (e.extendedProps?.seriesId === eventSeriesId) {
              const eDate = e.start?.split('T')[0];
              return eDate <= endDateStr;
            }
            return true;
          });
        }

        // For weekly (recurring property)
        return prev.map(e => {
          if ((eventId && e.id === eventId) || (!eventId && e.title === eventTitle)) {
            return { ...e, endRecur: endDateStr, end: endDateStr };
          }
          return e;
        });
      }

      if (choice === 'this') {
        const masterId = eventToDelete.id || eventToDelete.publicId;
        const eventTitleToMatch = eventToDelete.title;
        // Use timezone-safe formatting
        const dateToDelete = formatLocalDate(new Date(eventToDelete.start));

        // Add to excluded dates
        return prev.map(e => {
          if ((masterId && e.id === masterId) || (!masterId && e.title === eventTitleToMatch)) {
            const excluded = e.extendedProps?.excludedDates || [];
            return {
              ...e,
              extendedProps: {
                ...e.extendedProps,
                excludedDates: [...new Set([...excluded, dateToDelete])]
              }
            };
          }
          return e;
        });
      }

      return prev;
    });

    setIsDeletionModalOpen(false);
    setEventToDelete(null);
  };

  const navigateToConference = (clientId: string) => {
    setSelectedClientId(clientId);
    setActiveTab('conference');
  };

  // Filtered lists
  const filteredClients = clients.filter(c =>
    selectedCareManagerId === 'all' ||
    c.careManagerId === selectedCareManagerId ||
    (!c.careManagerId && selectedCareManagerId === 'cm1')
  );
  const clientIdsOfSelectedCM = new Set(filteredClients.map(c => c.id));
  const filteredEvents = events.filter(e => {
    // If 'all' is selected, show everything
    if (selectedCareManagerId === 'all') return true;

    // If it's a personal event, show if it belongs to this CM or is legacy and cm1 is selected
    if (e.extendedProps?.isPersonal) {
      if (e.extendedProps?.careManagerId === selectedCareManagerId) return true;
      if (!e.extendedProps?.careManagerId && selectedCareManagerId === 'cm1') return true;
      return false;
    }

    // Otherwise show if it's for a client belonging to this filtered list
    return clientIdsOfSelectedCM.has(e.extendedProps?.clientId);
  });

  return (
    <div className="min-h-screen bg-[var(--background-soft)] flex flex-col">
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-[var(--secondary-color)] flex items-center gap-2">
              <span className="w-8 h-8 bg-[var(--primary-color)] rounded-lg flex items-center justify-center text-white font-bold">CP</span>
              CareSchedule Pro
            </h1>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500">
            <button className="flex items-center gap-1 hover:text-slate-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" /></svg>
              ローカル保存
            </button>
            <button className="flex items-center gap-1 hover:text-slate-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              バックアップ
            </button>
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold transition-all ${isSaving ? 'text-sky-500 animate-pulse' : 'text-slate-300'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${isSaving ? 'bg-sky-500' : 'bg-slate-300'}`} />
                {isSaving ? '保存中...' : '自動保存済み'}
              </div>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-400">v0.1.53</span>
              {/* v0.1.42: 連続入力機能と繰り返し予定の改善 */}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 flex gap-6 text-sm font-medium text-slate-600 overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'schedule' ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-transparent hover:text-slate-800'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            個別スケジュール確認
          </button>
          <button
            onClick={() => setActiveTab('conference')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'conference' ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-transparent hover:text-slate-800'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            担当者会議 調整場
          </button>
          <button
            onClick={() => setActiveTab('shift')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'shift' ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-transparent hover:text-slate-800'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            シフト自動作成
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'settings' ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-transparent hover:text-slate-800'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            設定・マスター
          </button>
        </div>
      </header>

      <main className="flex-grow p-6 flex gap-6 overflow-hidden h-[calc(100vh-125px)]">
        {activeTab === 'schedule' && (
          <>
            <div className="flex-grow min-h-0 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-semibold text-slate-700">
                  {selectedClientId ? `${clients.find(c => c.id === selectedClientId)?.name} 様のスケジュール` : `ねずみ 担当のスケジュール一覧`}
                </h2>
                <div className="flex gap-2">
                  {selectedClientId && (
                    <button
                      onClick={() => navigateToConference(selectedClientId)}
                      className="text-xs bg-violet-100 text-violet-700 px-3 py-1.5 rounded hover:bg-violet-200 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      担当者会議を調整する
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-grow min-h-0 p-4 overflow-auto">
                <ScheduleCalendar
                  events={filteredEvents}
                  clients={clients}
                  selectedClientId={selectedClientId}
                  scheduleTypes={scheduleTypes}
                  onDateClick={handleDateClick}
                  onEditEvent={handleEditEvent}
                  onDeleteEvent={handleDeleteEvent}
                />
              </div>
            </div>

            <div className="w-80 h-full flex flex-col min-h-0">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 h-full flex flex-col overflow-hidden">
                <h2 className="font-semibold text-slate-700 mb-4 text-sm">利用者一覧 ({filteredClients.length}名)</h2>
                <div className="flex-grow overflow-auto">
                  <UserManagement
                    clients={filteredClients}
                    onAddClient={() => setIsUserModalOpen(true)}
                    selectedClientId={selectedClientId}
                    onSelectClient={setSelectedClientId}
                  />
                </div>
              </div>
            </div>

            <UserModal
              isOpen={isUserModalOpen}
              onClose={() => setIsUserModalOpen(false)}
              onSave={handleAddClient}
            />

            <VisitModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setEditingEvent(null);
              }}
              onSave={handleSaveVisit}
              onDelete={handleDeleteEvent} // Pass the delete handler
              initialDate={selectedDate || undefined}
              initialData={editingEvent ? {
                id: editingEvent.id,
                clientId: editingEvent.extendedProps?.clientId,
                type: editingEvent.extendedProps?.type,
                startTime: editingEvent.allDay ? '10:00' : (editingEvent.extendedProps?.recurring?.startTime || editingEvent.extendedProps?.monthlyRecur?.startTime || (editingEvent.startStr.includes('T') ? editingEvent.startStr.split('T')[1].substring(0, 5) : '10:00')),
                endTime: editingEvent.allDay ? '11:00' : (editingEvent.extendedProps?.recurring?.endTime || editingEvent.extendedProps?.monthlyRecur?.endTime || (editingEvent.endStr.includes('T') ? editingEvent.endStr.split('T')[1].substring(0, 5) : '11:00')),
                notes: editingEvent.extendedProps?.notes,
                isPersonal: editingEvent.extendedProps?.isPersonal,
                allDay: editingEvent.allDay,
                recurrenceType: editingEvent.extendedProps?.recurring ? 'weekly' : (editingEvent.extendedProps?.monthlyRecur ? 'monthly' : 'none'),
                weeklyDays: editingEvent.extendedProps?.recurring?.daysOfWeek,
                monthlyWeek: editingEvent.extendedProps?.monthlyRecur?.week || Math.ceil(new Date(editingEvent.start).getDate() / 7),
                monthlyDay: editingEvent.extendedProps?.monthlyRecur?.day ?? new Date(editingEvent.start).getDay()
              } : undefined}
              clients={filteredClients}
              scheduleTypes={scheduleTypes}
              defaultClientId={selectedClientId}
            />

            <EditChoiceModal
              isOpen={isEditChoiceModalOpen}
              onClose={() => {
                setIsEditChoiceModalOpen(false);
                setEditingEvent(null);
              }}
              onSelect={handleEditChoice}
              eventTitle={editingEvent?.title || ''}
            />

            <DeletionChoiceModal
              isOpen={isDeletionModalOpen}
              onClose={() => setIsDeletionModalOpen(false)}
              onConfirm={handleConfirmDelete}
              eventTitle={eventToDelete?.title || ''}
            />
          </>
        )}

        {activeTab === 'conference' && (
          <div className="w-full h-full">
            <ConferenceAdjustment
              clients={filteredClients}
              selectedClientId={selectedClientId}
              onSaveEvent={handleAddEvent}
              currentEvents={filteredEvents}
              scheduleTypes={scheduleTypes}
            />
          </div>
        )}

        {activeTab === 'shift' && (
          <div className="w-full h-full">
            <ShiftAutomation />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="w-full h-full">
            <Settings
              clients={clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              scheduleTypes={scheduleTypes}
              onAddScheduleType={handleAddScheduleType}
              onDeleteScheduleType={handleDeleteScheduleType}
            />
          </div>
        )}
      </main>
    </div >
  );
}
