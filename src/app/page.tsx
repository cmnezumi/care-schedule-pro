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
import SuggestionFinder from "@/components/SuggestionFinder";
import { Client, Visit, ScheduleType, CareManager, VisitType } from "@/types";
import { Check, Loader2, Sparkles, Settings as SettingsIcon, Calendar as CalendarIcon, Users, Repeat } from "lucide-react";

type TabType = 'settings' | 'schedule' | 'conference' | 'shift';

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Care Managers State
  const [careManagers] = useState<CareManager[]>([
    { id: 'cm1', name: 'ねずみ' },
    { id: 'cm2', name: 'ケアマネ A' },
    { id: 'cm3', name: 'ケアマネ B' },
  ]);
  const [selectedCareManagerId, setSelectedCareManagerId] = useState<string>('cm1');
  const isHandlingEventRef = React.useRef(false);

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
  const [isLoading, setIsLoading] = useState(true);

  // Lifted state
  const [clients, setClients] = useState<Client[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Load from APIs (and migrate if necessary)
  React.useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch from APIs
        const [usersRes, typesRes, eventsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/schedule-types'),
          fetch('/api/events')
        ]);

        const dbUsers = Array.isArray(await usersRes.json()) ? await usersRes.json() : [];
        const dbTypes = Array.isArray(await typesRes.json()) ? await typesRes.json() : [];
        const dbEvents = Array.isArray(await eventsRes.json()) ? await eventsRes.json() : [];

        setClients(dbUsers);
        setScheduleTypes(dbTypes);
        if (dbTypes.length === 0) {
          setScheduleTypes([
            { id: 'monitoring', name: 'モニタリング', color: '#0ea5e9' },
            { id: 'assessment', name: 'アセスメント', color: '#f43f5e' },
            { id: 'conference', name: '担当者会議', color: '#f97316' },
            { id: 'offday', name: '休み', color: '#eab308' },
            { id: 'office_mtg', name: '事業所会議', color: '#f97316' },
            { id: 'telework', name: 'テレワーク', color: '#22c55e' },
            { id: 'other', name: 'その他', color: '#64748b' },
          ]);
        }
        setEvents(dbEvents || []);
      } catch (e) {
        console.error("Failed to load data from backend", e);
      } finally {
        setIsLoading(false);
        setDataLoaded(true);
      }
    };
    loadData();
  }, []);

  const [isSaving, setIsSaving] = useState(false);

  const handleAddClient = async (clientData: Omit<Client, 'id' | 'careLevel' | 'careManagerId'>) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...clientData, careManagerId: selectedCareManagerId })
      });
      const newClient = await res.json();
      setClients([...clients, newClient]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateClient = async (id: string, clientData: Omit<Client, 'id'>) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...clientData, id })
      });
      const updated = await res.json();
      setClients(clients.map(c => c.id === id ? updated : c));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    (window as any)._resetData = async () => {
      setIsSaving(true);
      try {
        await fetch('/api/reset', { method: 'POST' });
        window.location.reload();
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    };
  }, []);

  const handleDeleteClient = async (id: string) => {
    setIsSaving(true);
    try {
      await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
      setClients(clients.filter(c => c.id !== id));
      if (selectedClientId === id) {
        setSelectedClientId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddScheduleType = async (typeData: Omit<ScheduleType, 'id'>) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/schedule-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeData)
      });
      const newType = await res.json();
      setScheduleTypes([...scheduleTypes, newType]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScheduleType = async (id: string) => {
    setIsSaving(true);
    try {
      await fetch(`/api/schedule-types?id=${id}`, { method: 'DELETE' });
      setScheduleTypes(scheduleTypes.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDateClick = (date: Date) => {
    if (isHandlingEventRef.current) {
      console.log("Date click ignored due to recent event click (v3.2)");
      return;
    }
    console.log("handleDateClick triggering New Event mode (v3.2)");
    setEditingEvent(null);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleEditEvent = (info: any) => {
    const raw = info.event || (info.isManual ? info.event : info);
    const isFC = !!info.jsEvent;

    // Normalization: Look for ID everywhere
    let id = raw.id || raw.publicId || (isFC ? raw._def?.publicId : null);

    // Fallback: If no ID but we have a title and start, find it in our state
    if (!id && raw.title && raw.start) {
      const startStr = typeof raw.start === 'string' ? raw.start.split('T')[0] : (raw.start.toISOString ? raw.start.toISOString().split('T')[0] : '');
      if (startStr) {
        const match = events.find(e =>
          e.title === raw.title &&
          (e.start === startStr || (typeof e.start === 'string' && e.start.startsWith(startStr)))
        );
        if (match) id = match.id;
      }
    }

    const extended = isFC ? raw.extendedProps : (raw.extendedProps || raw);

    const prepared = {
      id: id || raw.id || raw.publicId,
      title: raw.title,
      start: isFC ? (raw.startStr || (raw.start?.toISOString ? raw.start.toISOString() : raw.start)) : raw.start,
      end: isFC ? (raw.endStr || (raw.end?.toISOString ? raw.end.toISOString() : raw.end)) : raw.end,
      allDay: raw.allDay,
      backgroundColor: raw.backgroundColor,
      ...extended,
      clientId: extended.clientId || null,
      type: extended.type || raw.title?.split(':').pop()?.trim() || "",
      isPersonal: !!extended.isPersonal,
      isRecurring: !!(extended.isRecurring || (isFC && raw._def?.recurringDef) || extended.daysOfWeek),
      isRecurInstance: !!extended.isRecurInstance,
      groupId: extended.groupId || null,
      // ID passed successfully
    };

    isHandlingEventRef.current = true;
    setTimeout(() => { isHandlingEventRef.current = false; }, 100);

    setEditingEvent(prepared);
    setSelectedDate(new Date(prepared.start));

    if (prepared.isRecurring && !prepared.isRecurInstance) {
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

  // Handle saving/updating visits
  const handleSaveVisit = async (data: any) => {
    setIsSaving(true);
    try {
      // Check if data is a FullCalendar event object (from drag/drop)
      const isFCEvent = data.id && data.extendedProps && typeof data.id === 'string';

      let client = null;
      let typeLabel = '';
      let color = '#94a3b8';
      let isPersonal = false;
      let notes = '';
      let startTime = '10:00';
      let endTime = '11:00';
      let allDay = false;

      if (isFCEvent) {
        client = clients.find(c => c.id === data.extendedProps.clientId);
        typeLabel = data.extendedProps.type || '予定';
        color = data.backgroundColor;
        isPersonal = data.extendedProps.isPersonal;
        notes = data.extendedProps.notes;
        allDay = data.allDay;
      } else {
        client = data.isPersonal ? null : clients.find(c => c.id === data.clientId);
        const typeDef = scheduleTypes.find(t => t.id === data.type || t.name === data.type);
        typeLabel = typeDef ? typeDef.name : (data.type || '予定');
        color = typeDef ? typeDef.color : '#94a3b8';
        isPersonal = data.isPersonal;
        notes = data.notes;
        startTime = data.startTime;
        endTime = data.endTime;
        allDay = data.allDay;
      }

      const personalNames = ['休み', '法外', '法内', '有休', '有給', '事業所会議', '担当者会議', 'テレワーク'];
      const forcePersonal = isPersonal || personalNames.includes(typeLabel);
      const eventTitle = forcePersonal ? typeLabel : `${client?.name}: ${typeLabel}`;

      if (editingEvent || isFCEvent) {
        const targetEventId = isFCEvent ? data.id : editingEvent.id;
        const targetEvent = events.find(e => e.id === targetEventId);

        if (!targetEvent) return;

        const isRecurringMaster = targetEvent.extendedProps?.isRecurring || targetEvent._def?.recurringDef;

        if (isRecurringMaster && !isFCEvent) {
          if (editTargetChoice === 'single') {
            // Exception logic for recurring event
            const dateStr = formatLocalDate(new Date(editingEvent.start));
            if (!dateStr) return;

            // 1. Update master event with excluded date
            const masterId = editingEvent.id || editingEvent.publicId;
            const masterEvent = events.find(e => e.id === masterId);
            if (masterEvent) {
              const excluded = masterEvent.extendedProps?.excludedDates || [];
              const updatedMaster = {
                ...masterEvent,
                extendedProps: {
                  ...masterEvent.extendedProps,
                  excludedDates: [...new Set([...excluded, dateStr])]
                }
              };
              await fetch('/api/events', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedMaster)
              });
            }

            // 2. Create a one-time event
            const singleEvent = {
              id: Math.random().toString(36).substr(2, 9),
              title: eventTitle,
              start: allDay ? dateStr : `${dateStr}T${startTime}`,
              end: allDay ? dateStr : `${dateStr}T${endTime}`,
              allDay: allDay,
              backgroundColor: color,
              extendedProps: {
                clientId: data.clientId,
                careManagerId: editingEvent.extendedProps?.careManagerId || selectedCareManagerId,
                type: data.type,
                notes: notes,
                isPersonal: forcePersonal,
                allDay: allDay
              }
            };
            await fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(singleEvent)
            });
          } else {
            // Edit all recurring instances
            const updatedMaster = {
              ...targetEvent,
              title: eventTitle,
              backgroundColor: color,
              startTime: allDay ? '00:00' : startTime,
              endTime: allDay ? '23:59' : endTime,
              allDay: allDay,
              extendedProps: {
                ...targetEvent.extendedProps,
                clientId: data.clientId,
                type: data.type,
                notes: notes,
                isPersonal: forcePersonal,
                allDay: allDay
              }
            };
            await fetch('/api/events', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updatedMaster)
            });
          }
        } else {
          // Regular update or Global Recurring instance group update
          const isMonthlyGroup = targetEvent.extendedProps?.isRecurInstance && targetEvent.extendedProps?.groupId;

          if (isMonthlyGroup && editTargetChoice === 'all' && !isFCEvent) {
            // Re-expand monthly series
            const oldGroupId = targetEvent.extendedProps.groupId;

            // Delete old group
            const toDelete = events.filter(e => e.extendedProps?.groupId === oldGroupId);
            await Promise.all(toDelete.map(e => fetch(`/api/events?id=${e.id}`, { method: 'DELETE' })));

            const instances = [];
            const now = new Date();
            let year = now.getFullYear();
            let month = now.getMonth();
            const newGroupId = `monthly-${Date.now()}`;

            for (let i = 0; i < 12; i++) {
              const targetDate = calculateNthWeekday(year, month, data.monthlyRecur.week, data.monthlyRecur.day);
              const dayStr = formatLocalDate(targetDate);
              instances.push({
                title: eventTitle,
                backgroundColor: color,
                allDay: allDay,
                id: Math.random().toString(36).substr(2, 9),
                start: allDay ? dayStr : `${dayStr}T${data.monthlyRecur.startTime}`,
                end: allDay ? dayStr : `${dayStr}T${data.monthlyRecur.endTime}`,
                extendedProps: {
                  clientId: data.clientId,
                  careManagerId: targetEvent.extendedProps?.careManagerId || selectedCareManagerId,
                  type: data.type,
                  notes: notes,
                  isPersonal: forcePersonal,
                  allDay: allDay,
                  isRecurInstance: true,
                  groupId: newGroupId,
                  monthlyRecur: data.monthlyRecur
                }
              });
              month++; if (month > 11) { month = 0; year++; }
            }
            // Use batch POST
            await fetch('/api/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(instances)
            });
          } else {
            // Regular update (Single Instance) or FC Drag/Drop
            const formatFCDate = (date: Date) => {
              const y = date.getFullYear();
              const m = String(date.getMonth() + 1).padStart(2, '0');
              const d = String(date.getDate()).padStart(2, '0');
              const hh = String(date.getHours()).padStart(2, '0');
              const mm = String(date.getMinutes()).padStart(2, '0');
              return `${y}-${m}-${d}T${hh}:${mm}:00`;
            };

            const updated = {
              ...targetEvent,
              title: eventTitle,
              backgroundColor: color,
              start: isFCEvent ? formatFCDate(data.start) : (allDay ? targetEvent.start.split('T')[0] : `${targetEvent.start.split('T')[0]}T${startTime}`),
              end: isFCEvent ? (data.end ? formatFCDate(data.end) : formatFCDate(data.start)) : (allDay ? targetEvent.start.split('T')[0] : `${targetEvent.start.split('T')[0]}T${endTime}`),
              allDay: allDay,
              extendedProps: {
                ...targetEvent.extendedProps,
                clientId: data.clientId,
                type: data.type,
                notes: notes,
                isPersonal: forcePersonal,
                allDay: allDay
              }
            };
            await fetch('/api/events', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated)
            });
          }
        }
      } else {
        // NEW EVENT CREATION LOGIC
        const eventDateStr = selectedDate ? formatLocalDate(selectedDate) : '';
        if (data.recurring) {
          const eventDateStr = selectedDate ? formatLocalDate(selectedDate) : '';
          const newEvent = {
            id: Math.random().toString(36).substr(2, 9),
            title: eventTitle,
            backgroundColor: color,
            allDay: allDay,
            start: eventDateStr, // Crucial: Set start for recurrence matching
            daysOfWeek: data.recurring.daysOfWeek,
            startTime: allDay ? '00:00:00' : `${data.recurring.startTime}:00`,
            endTime: allDay ? '23:59:59' : `${data.recurring.endTime}:00`,
            extendedProps: {
              clientId: data.clientId,
              careManagerId: selectedCareManagerId,
              type: data.type,
              notes: notes,
              isPersonal: forcePersonal,
              allDay: allDay,
              isRecurring: true,
              recurring: {
                ...data.recurring,
                startTime: allDay ? '00:00' : data.recurring.startTime,
                endTime: allDay ? '23:59' : data.recurring.endTime
              }
            }
          };
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEvent)
          });
        } else if (data.monthlyRecur) {
          const instances = [];
          const now = new Date();
          let currentYear = now.getFullYear();
          let currentMonth = now.getMonth();
          const groupId = `monthly-${Date.now()}`;
          for (let i = 0; i < 12; i++) {
            const targetDate = calculateNthWeekday(currentYear, currentMonth, data.monthlyRecur.week, data.monthlyRecur.day);
            const dayStr = formatLocalDate(targetDate);
            instances.push({
              title: eventTitle,
              backgroundColor: color,
              allDay: allDay,
              id: Math.random().toString(36).substr(2, 9),
              start: allDay ? dayStr : `${dayStr}T${data.monthlyRecur.startTime}`,
              end: allDay ? dayStr : `${dayStr}T${data.monthlyRecur.endTime}`,
              extendedProps: {
                clientId: data.clientId,
                careManagerId: selectedCareManagerId,
                type: data.type,
                notes: notes,
                isPersonal: forcePersonal,
                allDay: allDay,
                isRecurInstance: true,
                groupId,
                monthlyRecur: data.monthlyRecur
              }
            });
            currentMonth++; if (currentMonth > 11) { currentMonth = 0; currentYear++; }
          }
          // Batch registration for all 12 months at once
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(instances)
          });
        } else {
          const newEvent = {
            id: Math.random().toString(36).substr(2, 9),
            title: eventTitle,
            backgroundColor: color,
            allDay: allDay,
            start: allDay ? eventDateStr : `${eventDateStr}T${startTime}`,
            end: allDay ? eventDateStr : `${eventDateStr}T${endTime}`,
            extendedProps: {
              clientId: data.clientId,
              careManagerId: selectedCareManagerId,
              type: data.type,
              notes: notes,
              isPersonal: forcePersonal,
              allDay: allDay
            }
          };
          await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEvent)
          });
        }
      }

      // Final cleanup and refresh
      const res = await fetch('/api/events');
      setEvents(await res.json());
      setIsModalOpen(data.isContinuous || false);
      setEditingEvent(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
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

  const handleDeleteEvent = async (eventInfo: any) => {
    if (!eventInfo) return;

    // Detect recurring based on our normalized properties
    const isRecurring = eventInfo.isRecurring ||
      eventInfo.isRecurInstance ||
      eventInfo.recurrenceType === 'weekly' ||
      eventInfo.recurrenceType === 'monthly';

    if (isRecurring) {
      setEventToDelete(eventInfo);
      setIsDeletionModalOpen(true);
      return;
    }

    // Standard deletion
    setIsSaving(true);
    try {
      const id = eventInfo.id;
      if (id) {
        await fetch(`/api/events?id=${id}`, { method: 'DELETE' });
        const res = await fetch('/api/events');
        setEvents(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      setIsModalOpen(false);
      setEditingEvent(null);
    }
  };

  const handleConfirmDelete = async (choice: 'all' | 'following' | 'this') => {
    if (!eventToDelete) return;
    setIsSaving(true);

    try {
      const eventId = eventToDelete.id;
      const eventSeriesId = eventToDelete.seriesId || eventToDelete.extendedProps?.seriesId;
      const eventTitle = eventToDelete.title;
      const eventDate = eventToDelete.startStr?.split('T')[0] || (typeof eventToDelete.start === 'string' ? eventToDelete.start.split('T')[0] : eventToDelete.start.toISOString().split('T')[0]);

      if (choice === 'all') {
        const eventGroupId = eventToDelete.groupId || eventToDelete.extendedProps?.groupId;
        const isMonthly = eventToDelete.isRecurInstance || eventToDelete.extendedProps?.isRecurInstance;

        const toDeleteIds = events
          .filter(e => {
            if (eventSeriesId && (e.extendedProps?.seriesId === eventSeriesId || e.seriesId === eventSeriesId)) return true;
            if (eventGroupId && (e.extendedProps?.groupId === eventGroupId || e.groupId === eventGroupId)) return true;
            if (isMonthly && !eventSeriesId && (e.extendedProps?.isRecurInstance || e.isRecurInstance) &&
              e.title === eventTitle &&
              (e.extendedProps?.clientId === eventToDelete.clientId || e.clientId === eventToDelete.clientId)) return true;
            if (eventId && e.id === eventId) return true;
            return false;
          })
          .map(e => e.id);

        if (toDeleteIds.length > 0) {
          await fetch('/api/events', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: toDeleteIds })
          });
        }
      }

      if (choice === 'following') {
        const targetDate = new Date(eventDate);
        // Exclusive end date for the series before this one
        targetDate.setDate(targetDate.getDate() - 1);
        const endDateStr = targetDate.toISOString().split('T')[0];

        if (eventSeriesId || eventToDelete.groupId || eventToDelete.extendedProps?.groupId) {
          const groupId = eventToDelete.groupId || eventToDelete.extendedProps?.groupId || eventSeriesId;
          const toDeleteIds = events
            .filter(e => {
              const eStart = new Date(e.start);
              const eGroupId = e.groupId || e.extendedProps?.groupId || e.seriesId || e.extendedProps?.seriesId;
              return eGroupId === groupId && eStart >= new Date(eventDate);
            })
            .map(e => e.id);

          if (toDeleteIds.length > 0) {
            await fetch('/api/events', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: toDeleteIds })
            });
          }
        } else {
          // Weekly master
          const masterId = eventId || eventToDelete.id;
          const master = events.find(e => e.id === masterId);
          if (master) {
            const updated = {
              ...master,
              end: endDateStr,
              endRecur: endDateStr,
              extendedProps: {
                ...(master.extendedProps || {}),
                endRecur: endDateStr
              }
            };
            await fetch('/api/events', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated)
            });
          }
        }
      }

      if (choice === 'this') {
        const isMonthlyInstance = (eventToDelete.isRecurInstance || eventToDelete.extendedProps?.isRecurInstance) && !eventToDelete.isRecurring;

        if (isMonthlyInstance) {
          await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' });
        } else {
          const dateToDelete = eventDate;
          // Robust master lookup: try ID first, then seriesId
          const master = events.find(e =>
            e.id === eventId ||
            (eventSeriesId && (e.id === eventSeriesId || e.extendedProps?.seriesId === eventSeriesId))
          );
          if (master) {
            const excluded = master.extendedProps?.excludedDates || master.excludedDates || [];
            const updated = {
              ...master,
              extendedProps: {
                ...(master.extendedProps || {}),
                excludedDates: [...new Set([...excluded, dateToDelete])]
              }
            };
            await fetch('/api/events', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(updated)
            });
          } else {
            await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' });
          }
        }
      }

      // Refresh events
      const res = await fetch('/api/events');
      setEvents(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
      setIsDeletionModalOpen(false);
      setEventToDelete(null);
    }
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

  if (!hasMounted) return null;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#1e293b]">
      {/* Premium Header */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
      <header className="sticky top-0 z-40 w-full border-b border-white/20 bg-white/70 backdrop-blur-xl transition-all duration-300">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-between rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#2563eb] p-2 shadow-lg shadow-blue-500/20">
              <CalendarIcon className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">Care Schedule Pro</h1>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">Efficiency & Care</p>
            </div>
          </div>

          {/* Premium Tab Navigation */}
          <nav className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
            <button
              onClick={() => setActiveTab('schedule')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === 'schedule' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <CalendarIcon size={18} />
              <span>スケジュール</span>
            </button>
            <button
              onClick={() => setActiveTab('conference')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === 'conference' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Users size={18} />
              <span>会議調整</span>
            </button>
            <button
              onClick={() => setActiveTab('shift')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === 'shift' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Repeat size={18} />
              <span>シフト作成</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <SettingsIcon size={18} />
              <span>設定</span>
            </button>
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 transition-colors hover:bg-slate-50">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-semibold text-slate-600">{careManagers.find(cm => cm.id === selectedCareManagerId)?.name}</span>
            </div>
            {(isSaving || isLoading) && <Loader2 className="animate-spin text-blue-500" size={20} />}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] p-6 pb-12">
        {activeTab === 'schedule' && (
          <div className="flex flex-col h-[calc(100vh-150px)]">
            {/* Main Calendar Area */}
            <div className="flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 overflow-hidden">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">月間スケジュール</h2>
                <div className="flex gap-2">
                  <select
                    value={selectedCareManagerId}
                    onChange={(e) => setSelectedCareManagerId(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    {careManagers.map(cm => <option key={cm.id} value={cm.id}>{cm.name}</option>)}
                    <option value="all">すべて表示</option>
                  </select>
                </div>
              </div>
              <ScheduleCalendar
                events={events.filter(e => {
                  const cmId = e.extendedProps?.careManagerId;
                  return !cmId || cmId === selectedCareManagerId || selectedCareManagerId === 'all';
                })}
                onDateClick={handleDateClick}
                onEventClick={handleEditEvent}
                onEventDrop={handleSaveVisit}
                onEventResize={handleSaveVisit}
                clients={clients}
                scheduleTypes={scheduleTypes}
              />
            </div>
          </div>
        )}

        {activeTab === 'conference' && (
          <div className="h-[calc(100vh-150px)]">
            <ConferenceAdjustment
              clients={clients.filter(c => c.careManagerId === selectedCareManagerId)}
              events={events}
              onAddEvent={handleSaveVisit}
              onUpdateEvent={handleSaveVisit}
              scheduleTypes={scheduleTypes}
            />
          </div>
        )}

        {activeTab === 'shift' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <ShiftAutomation />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <Settings
              clients={clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              scheduleTypes={scheduleTypes}
              onAddScheduleType={handleAddScheduleType}
              onDeleteScheduleType={handleDeleteScheduleType}
              careManagerId={selectedCareManagerId}
            />
          </div>
        )}
      </div>

      {/* Modals and Overlays */}
      <VisitModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
        onSave={handleSaveVisit}
        onDelete={handleDeleteEvent}
        selectedDate={selectedDate}
        editingEvent={editingEvent}
        clients={clients.filter(c => c.careManagerId === selectedCareManagerId)}
        scheduleTypes={scheduleTypes}
        editTargetChoice={editTargetChoice}
      />

      <DeletionChoiceModal
        isOpen={isDeletionModalOpen}
        onClose={() => { setIsDeletionModalOpen(false); setEventToDelete(null); }}
        onConfirm={handleConfirmDelete}
      />

      <EditChoiceModal
        isOpen={isEditChoiceModalOpen}
        onClose={() => setIsEditChoiceModalOpen(false)}
        onConfirm={handleEditChoice}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 backdrop-blur-sm transition-all">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin border-4 border-blue-500 border-t-transparent rounded-full"></div>
            <p className="font-bold text-blue-600 animate-pulse">データを読み込み中...</p>
          </div>
        </div>
      )}
    </main>
  );
}
