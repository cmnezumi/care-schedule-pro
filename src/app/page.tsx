"use client";

import React, { useState, useEffect } from 'react';
import ScheduleCalendar from "@/components/ScheduleCalendar";
import ShiftAutomation from "@/components/ShiftAutomation";
import MemoBoard from "@/components/MemoBoard";
import EditChoiceModal from "@/components/EditChoiceModal";
import Settings from "@/components/Settings";
import VisitModal from "@/components/VisitModal";
import DeletionChoiceModal from "@/components/DeletionChoiceModal";
import MonitoringView from "@/components/MonitoringView";
import EventPreviewModal from "@/components/EventPreviewModal";
import CaseloadDashboard from "@/components/CaseloadDashboard";
import { supabase } from "@/lib/supabase";
import { Client, ScheduleType, CareManager, Clinic, Routine } from "@/types";
import { generatePrepEvents } from "@/lib/scheduling";
import { Loader2, Calendar as CalendarIcon, Users, Repeat, Settings as SettingsIcon, CheckSquare, TrendingUp, FileText } from "lucide-react";

type TabType = 'settings' | 'schedule' | 'memo' | 'shift' | 'monitoring' | 'caseload';

const sortClients50On = (clientList: any[]) => {
  return [...clientList].sort((a, b) => {
    const textA = a.kana || a.name || '';
    const textB = b.kana || b.name || '';
    return textA.localeCompare(textB, 'ja');
  });
};

export default function Home() {
  const [hasMounted, setHasMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('schedule');

  // Care Managers State
  const [careManagers] = useState<CareManager[]>([
    { id: 'cm1', name: 'ケアマネ A' },
    { id: 'cm2', name: 'ケアマネ B' },
    { id: 'cm3', name: 'ケアマネ C' },
  ]);
  const [selectedCareManagerId, setSelectedCareManagerId] = useState<string>('cm1');
  const isHandlingEventRef = React.useRef(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditChoiceModalOpen, setIsEditChoiceModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [showOnlyMySchedule, setShowOnlyMySchedule] = useState(false);
  const [editTargetChoice, setEditTargetChoice] = useState<'single' | 'all' | 'following'>('single');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Lifted state
  const [clients, setClients] = useState<Client[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Reset modals on tab change
  useEffect(() => {
    setIsModalOpen(false);
    setIsPreviewModalOpen(false);
    setIsEditChoiceModalOpen(false);
    setIsDeletionModalOpen(false);
    setEditingEvent(null);

    // Reload events when switching to schedule tab to reflect shift changes
    if (activeTab === 'schedule' && hasMounted) {
      fetch('/api/events')
        .then(res => res.json())
        .then(data => setEvents(Array.isArray(data) ? data : []))
        .catch(err => console.error("Failed to reload events on tab change", err));
    }
  }, [activeTab, hasMounted]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, typesRes, eventsRes, clinicsRes, routinesRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/schedule-types'),
          fetch('/api/events'),
          fetch('/api/clinics'),
          fetch('/api/routines')
        ]);

        const usersData = await usersRes.json();
        const typesData = await typesRes.json();
        const eventsData = await eventsRes.json();

        let clinicsData = [];
        try {
          if (clinicsRes.ok) {
            clinicsData = await clinicsRes.json();
          }
        } catch (e) {
          console.error("Failed to parse clinics data", e);
        }

        let routinesData = [];
        try {
          if (routinesRes.ok) {
            routinesData = await routinesRes.json();
          }
        } catch (e) {
          console.error("Failed to parse routines data", e);
        }

        setClients(Array.isArray(usersData) ? sortClients50On(usersData) : []);
        setClinics(Array.isArray(clinicsData) ? clinicsData : []);
        setRoutines(Array.isArray(routinesData) ? routinesData : []);

        let loadedTypes = Array.isArray(typesData) ? typesData : [];
        if (loadedTypes.length === 0) {
          loadedTypes = [
            { id: 'monitoring', name: 'モニタリング', color: '#0ea5e9' },
            { id: 'assessment', name: 'アセスメント', color: '#f43f5e' },
            { id: 'conference', name: '担当者会議', color: '#f97316' },
            { id: 'offday', name: '休み', color: '#eab308' },
            { id: 'office_mtg', name: '事業所会議', color: '#f97316' },
            { id: 'telework', name: 'テレワーク', color: '#22c55e' },
            { id: 'other', name: 'その他', color: '#64748b' },
          ];
        }
        setScheduleTypes(loadedTypes);
        setEvents(Array.isArray(eventsData) ? eventsData : []);
      } catch (e) {
        console.error("Failed to load data", e);
      } finally {
        setIsLoading(false);
      }
    };
    if (hasMounted) loadData();
  }, [hasMounted]);

  // Event handlers
  const handleDateClick = (date: Date) => {
    if (isHandlingEventRef.current) return;
    setEditingEvent(null);
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleEditEvent = (info: any) => {
    const raw = info.event || info;
    const isFC = !!info.jsEvent;

    const planeObject = isFC ? raw.toJSON() : raw;
    const extended = planeObject.extendedProps || planeObject;
    
    const prepared = {
      ...planeObject,
      ...extended,
      extendedProps: extended // Ensure it's available both ways
    };

    isHandlingEventRef.current = true;
    setTimeout(() => { isHandlingEventRef.current = false; }, 100);

    setEditingEvent(prepared);
    setSelectedDate(new Date(prepared.start));

    setIsPreviewModalOpen(true);
  };

  const handleEditFromPreview = () => {
    setIsPreviewModalOpen(false);
    if (editingEvent?.baseEventId && editingEvent?.recurrenceType && editingEvent?.recurrenceType !== 'none') {
      setIsEditChoiceModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleEditChoice = (choice: 'single' | 'all' | 'following') => {
    setEditTargetChoice(choice);
    setIsEditChoiceModalOpen(false);
    setIsModalOpen(true);
  };

  // Helper to map DB event to FullCalendar event format
  const mapDbEventToFc = (e: any) => ({
    id: e.id,
    title: e.title,
    allDay: e.all_day,
    start: e.start_time,
    end: e.end_time,
    backgroundColor: e.background_color,
    extendedProps: e.extended_props
  });

  const handleSaveVisit = async (data: any) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/events', {
        method: (data.id || editingEvent?.id) ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to save event');
      const responseData = await response.json();
      
      const isEdit = !!(data.id || editingEvent?.id);
      
      if (isEdit) {
        const baseEventId = data.extendedProps?.baseEventId || editingEvent?.extendedProps?.baseEventId;
        const choice = data.editTargetChoice;
        
        if (choice === 'all' && baseEventId) {
          // すべて更新: 同シリーズを全部入れ替え
          const updatedEvents = Array.isArray(responseData) ? responseData.map(mapDbEventToFc) : [];
          setEvents(prev => [
            ...prev.filter(e => e.extendedProps?.baseEventId !== baseEventId),
            ...updatedEvents
          ]);
        } else if (choice === 'following' && baseEventId) {
          // 以降更新: 選択日以降のイベントを入れ替え
          const fromDate = data.start ? data.start.split('T')[0] : '';
          const updatedEvents = Array.isArray(responseData) ? responseData.map(mapDbEventToFc) : [];
          setEvents(prev => [
            ...prev.filter(e => {
              if (e.extendedProps?.baseEventId !== baseEventId) return true;
              const evDate = (e.start as string)?.split('T')[0] ?? '';
              return fromDate ? evDate < fromDate : false;
            }),
            ...updatedEvents
          ]);
        } else {
          // この日のみ更新
          const updatedEvent = Array.isArray(responseData) ? responseData[0] : responseData;
          if (updatedEvent) {
            const mapped = mapDbEventToFc(updatedEvent);
            setEvents(prev => prev.map(e => e.id === mapped.id ? mapped : e));
          }
        }
      } else {
        const newEvents = Array.isArray(responseData) ? responseData.map(mapDbEventToFc) : [mapDbEventToFc(responseData)];
        setEvents(prev => [...prev, ...newEvents]);
      }

      if (!data.isContinuous) {
        setIsModalOpen(false);
        setEditingEvent(null);
      } else {
        setEditingEvent(null);
        setSelectedDate(null); // Prevent date carry-over for subsequent continuous entries
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyEvent = (copyData: any) => {
    // Prep the copied data as a new 'editingEvent' so the modal displays it but saves as new
    setEditingEvent({
      ...copyData.extendedProps,
      ...copyData,
      id: undefined,
      baseEventId: undefined
    });
    // Modal stays open, the user can adjust date/time and click save
  };

  const handleDeleteEvent = async (eventInfo: any) => {
    if (eventInfo.baseEventId && eventInfo.recurrenceType && eventInfo.recurrenceType !== 'none') {
      setEventToDelete(eventInfo);
      setIsDeletionModalOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      const realId = eventInfo.baseEventId || eventInfo.id;
      const response = await fetch(`/api/events?id=${realId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete event');
      
      setEvents(prev => prev.filter(e => e.id !== realId));
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async (choice: 'all' | 'following' | 'this') => {
    if (!eventToDelete) return;
    setIsSaving(true);
    try {
      const queryParams = new URLSearchParams();

      if (choice === 'this') {
          queryParams.append('id', eventToDelete.id);
      } else {
          const baseId = eventToDelete.baseEventId || eventToDelete.id;
          queryParams.append('id', baseId);
          queryParams.append('choice', choice);
          if (choice === 'following') {
              queryParams.append('date', eventToDelete.start);
          }
      }

      const response = await fetch(`/api/events?${queryParams.toString()}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete events');

      const realId = eventToDelete.baseEventId || eventToDelete.id;

      if (choice === 'this') {
        setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      } else if (choice === 'all') {
        setEvents(prev => prev.filter(e => e.extendedProps?.baseEventId !== realId && e.id !== realId));
      } else if (choice === 'following') {
        const dateStr = eventToDelete.start.split('T')[0];
        setEvents(prev => prev.filter(e => {
          const isTargetSeries = e.extendedProps?.baseEventId === realId || e.id === realId;
          if (isTargetSeries) {
            const eStart = e.start?.toISOString ? e.start.toISOString() : String(e.start);
            return eStart.split('T')[0] < dateStr;
          }
          return true;
        }));
      }

      setIsDeletionModalOpen(false);
      setEventToDelete(null);
      setIsModalOpen(false);
      setEditingEvent(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEventDrop = async (event: any) => {
    setIsSaving(true);
    const updatedPayload = {
      id: event.id,
      title: event.title,
      allDay: event.allDay,
      start: event.startStr,
      end: event.endStr || event.startStr,
      backgroundColor: event.backgroundColor,
      extendedProps: event.extendedProps
    };

    try {
      const response = await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      if (!response.ok) throw new Error('Failed to move event');
      const responseData = await response.json();
      const updatedEvent = Array.isArray(responseData) ? responseData[0] : responseData;
      if (updatedEvent) {
        const mapped = mapDbEventToFc(updatedEvent);
        setEvents(prev => prev.map(e => e.id === mapped.id ? mapped : e));
      }
    } catch (e) {
      console.error(e);
      alert('予定の移動に失敗しました。');
      if (typeof event.revert === 'function') event.revert();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleComplete = async (event: any, newStatus: string) => {
    const isFCEvent = !!event.extendedProps;
    const props = isFCEvent ? event.extendedProps : event;
    const realId = event.id;

    const updatedEvents = events.map(e => {
        if (e.id === realId) {
            return {
                ...e,
                extendedProps: { ...e.extendedProps, status: newStatus },
                status: newStatus
            };
        }
        return e;
    });
    setEvents(updatedEvents);
    
    setEditingEvent((prev: any) => prev ? { ...prev, extendedProps: { ...prev.extendedProps, status: newStatus }, status: newStatus } : prev);

    try {
        const updatedPayload = {
            id: realId,
            title: event.title,
            allDay: event.allDay,
            start: event.startStr || event.start,
            end: event.endStr || event.end || event.startStr || event.start,
            backgroundColor: event.backgroundColor,
            extendedProps: {
                ...props,
                status: newStatus
            }
        };

        await fetch('/api/events', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPayload)
        });
    } catch(err) {
        console.error("Failed to update status", err);
        const res = await fetch('/api/events');
        setEvents(await res.json());
    }
  };

  const handleAddClient = async (data: any) => {
    await fetch('/api/users', { method: 'POST', body: JSON.stringify(data) });
    const res = await fetch('/api/users');
    setClients(sortClients50On(await res.json()));
  };
  const handleUpdateClient = async (id: string, data: any) => {
    await fetch('/api/users', { method: 'PUT', body: JSON.stringify({ ...data, id }) });
    const res = await fetch('/api/users');
    setClients(sortClients50On(await res.json()));
  };
  const handleDeleteClient = async (id: string) => {
    await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
    const res = await fetch('/api/users');
    setClients(sortClients50On(await res.json()));
  };

  const handleAddScheduleType = async (data: any) => {
    await fetch('/api/schedule-types', { method: 'POST', body: JSON.stringify(data) });
    const res = await fetch('/api/schedule-types');
    setScheduleTypes(await res.json());
  };
  const handleDeleteScheduleType = async (id: string) => {
    await fetch(`/api/schedule-types?id=${id}`, { method: 'DELETE' });
    const res = await fetch('/api/schedule-types');
    setScheduleTypes(await res.json());
  };

  const handleAddClinic = async (data: any) => {
    try {
      const res = await fetch('/api/clinics', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Save failed');

      const refreshRes = await fetch('/api/clinics');
      if (refreshRes.ok) {
        setClinics(await refreshRes.json());
      }
    } catch (e) {
      console.error(e);
      alert("登録に失敗しました。SQLの実行（テーブル作成）が完了しているか確認してください。");
    }
  };
  const handleUpdateClinic = async (id: string, data: any) => {
    try {
      const res = await fetch('/api/clinics', {
        method: 'PUT',
        body: JSON.stringify({ ...data, id }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Update failed');

      const refreshRes = await fetch('/api/clinics');
      if (refreshRes.ok) {
        setClinics(await refreshRes.json());
      }
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました。");
    }
  };
  const handleDeleteClinic = async (id: string) => {
    try {
      const res = await fetch(`/api/clinics?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');

      const refreshRes = await fetch('/api/clinics');
      if (refreshRes.ok) {
        setClinics(await refreshRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddRoutine = async (data: any) => {
    try {
      const newRoutine = { ...data, id: Date.now().toString() };
      const updatedRoutines = [...routines, newRoutine];
      const res = await fetch('/api/routines', {
        method: 'POST',
        body: JSON.stringify(updatedRoutines),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Save failed');
      setRoutines(updatedRoutines);
    } catch (e) {
      console.error(e);
      alert("登録に失敗しました。");
    }
  };

  const handleUpdateRoutine = async (id: string, data: any) => {
    try {
      const updatedRoutines = routines.map(r => r.id === id ? { ...data, id } : r);
      const res = await fetch('/api/routines', {
        method: 'POST',
        body: JSON.stringify(updatedRoutines),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Update failed');
      setRoutines(updatedRoutines);
    } catch (e) {
      console.error(e);
      alert("更新に失敗しました。");
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    try {
      const updatedRoutines = routines.filter(r => r.id !== id);
      const res = await fetch('/api/routines', {
        method: 'POST',
        body: JSON.stringify(updatedRoutines),
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Delete failed');
      setRoutines(updatedRoutines);
    } catch (e) {
      console.error(e);
      alert("削除に失敗しました。");
    }
  };

  const handleDeployRoutines = async () => {
    if (routines.length === 0) {
       alert("先に「設定」画面の「ルーティン業務マスタ」からルーティンを登録してください。");
       return;
    }
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const confirmDeploy = confirm(`${year}年${month + 1}月のカレンダーに、登録済みのルーティン業務（${routines.length}件）を一括展開しますか？\n（※カレンダーに「事業所会議」がある場合、休みを避けた直前の稼働日に【事前準備（事業所会議）】も自動配置されます）`);
    if (!confirmDeploy) return;

    setIsSaving(true);
    try {
        const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        const currentMonthNum = month + 1;
        
        // 既存の当月のルーティン予定（事前準備含む）を一括削除
        const deleteRes = await fetch(`/api/events?type=routine&month=${targetMonthStr}`, { method: 'DELETE' });
        if (!deleteRes.ok) {
            throw new Error(`ルーティン削除に失敗しました (status: ${deleteRes.status})`);
        }

        // 1. ルーティンマスタのイベント生成
        const newRoutineEvents: any[] = [];
        
        for (const routine of routines) {
            if (routine.targetMonths && routine.targetMonths.length > 0) {
                if (!routine.targetMonths.includes(currentMonthNum)) {
                    continue;
                }
            }

            let date = routine.targetDay;
            if (date === 99) {
                const nextMonth = new Date(year, month + 1, 1);
                nextMonth.setDate(0);
                date = nextMonth.getDate();
            } else {
                const lastDay = new Date(year, month + 1, 0).getDate();
                if (date > lastDay) date = lastDay;
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
            const routineEventId = `routine-${routine.id}-${targetMonthStr}`;
            
            newRoutineEvents.push({
                id: routineEventId,
                title: routine.name,
                type: 'routine',
                start: `${dateStr}T10:00:00+09:00`,
                end: `${dateStr}T11:00:00+09:00`,
                allDay: false,
                clientId: 'personal',
                clientName: '個人の予定',
                backgroundColor: routine.color,
                notes: routine.memo,
                extendedProps: {
                    isPersonal: true,
                    type: 'routine',
                    careManagerId: selectedCareManagerId,
                    status: 'scheduled',
                    baseEventId: routineEventId
                }
            });
        }

        // 2. シフトデータ（休み情報）を取得
        let monthShifts: Record<string, string> = {};
        try {
            const shiftsRes = await fetch('/api/shifts');
            if (shiftsRes.ok) {
                const allShifts = await shiftsRes.json();
                const monthData = allShifts[targetMonthStr];
                if (monthData) {
                    monthShifts = monthData.shifts || {};
                }
            }
        } catch (shiftErr) {
            console.error("Failed to fetch shifts for routine prep:", shiftErr);
        }

        // 休み判定ヘルパー（テレワークはOK！休み（公休・有休・希望休など）だけを避ける）
        const isNotHoliday = (day: number) => {
            if (day < 1) return false;
            const dIdx = day - 1;
            const shiftStatus = monthShifts[`0-${dIdx}`];

            if (!shiftStatus) {
                // シフト未設定時は土日を休みとみなす
                const dayOfWeek = new Date(year, month, day).getDay();
                return dayOfWeek !== 0 && dayOfWeek !== 6;
            }
            // 公休・有休・希望休・法定休日などの休みを除外（テレワークは出勤扱いなのでOK）
            return !['hope_holiday', 'paid_leave', 'legal_holiday', 'legal_out_holiday', 'auto_holiday'].includes(shiftStatus);
        };

        // 3. 当月のカレンダーから「事業所会議」の予定を探す
        const toJST = (dateInput: any): string => {
            if (!dateInput) return '';
            const d = new Date(dateInput);
            const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
            return jst.toISOString().split('T')[0];
        };

        const meetingEvents = events.filter(e => {
            const jstDate = toJST(e.start);
            if (!jstDate.startsWith(targetMonthStr)) return false;

            const title = e.title || '';
            const type = e.extendedProps?.type || '';
            const isMeeting = title.includes('事業所会議') || type === 'office_mtg' || type === 'meeting';
            const isPrep = title.includes('事前準備');
            return isMeeting && !isPrep;
        });

        // 4. 事業所会議の事前準備タスクを生成
        const newMeetingPreps: any[] = [];

        meetingEvents.forEach((mEvt) => {
            const jstDate = toJST(mEvt.start);
            const [, , d] = jstDate.split('-').map(Number);

            // 前日から遡って「休みではない日（テレワークまたは出勤）」を探す
            let prevDay = d - 1;
            while (prevDay >= 1 && !isNotHoliday(prevDay)) {
                prevDay--;
            }

            if (prevDay >= 1) {
                const prepDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;
                const prepEventId = `routine-meeting-prep-${targetMonthStr}-${prevDay}`;

                // 16:30〜17:30 が他の予定（往診事前準備等）と被っているか確認
                const is1630Busy = events.some(e => {
                    const eJst = toJST(e.start);
                    if (eJst !== prepDateStr) return false;
                    const st = typeof e.start === 'string' ? e.start : (e.start?.toISOString ? e.start.toISOString() : '');
                    return st.includes('16:30');
                });

                const startTime = is1630Busy ? '15:30:00' : '16:30:00';
                const endTime = is1630Busy ? '16:30:00' : '17:30:00';

                newMeetingPreps.push({
                    id: prepEventId,
                    title: '事前準備（事業所会議）',
                    type: 'routine',
                    start: `${prepDateStr}T${startTime}+09:00`,
                    end: `${prepDateStr}T${endTime}+09:00`,
                    allDay: false,
                    clientId: 'personal',
                    clientName: '個人の予定',
                    backgroundColor: '#f97316',
                    notes: '事業所会議の事前準備（ルーティン展開により自動配置）',
                    extendedProps: {
                        isPersonal: true,
                        type: 'routine',
                        isMeetingPrep: true,
                        careManagerId: selectedCareManagerId,
                        status: 'scheduled',
                        baseEventId: prepEventId
                    }
                });
            }
        });

        // 5. ルーティンと事前準備を一括保存
        const allToInsert = [...newRoutineEvents, ...newMeetingPreps];

        if (allToInsert.length > 0) {
            await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allToInsert)
            });
        }

        const res = await fetch('/api/events');
        setEvents(await res.json());

        const meetingMsg = newMeetingPreps.length > 0 
            ? `、事業所会議の事前準備（${newMeetingPreps.length}件）` 
            : (meetingEvents.length > 0 ? '（※事業所会議の直前稼働日が見つかりませんでした）' : '');
            
        alert(`${newRoutineEvents.length}件のルーティン予定${meetingMsg}を展開しました。`);
    } catch (e) {
        console.error(e);
        alert('ルーティン展開中にエラーが発生しました。');
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeployClinics = async () => {
    if (clinics.length === 0) {
       alert("先に「設定」画面の「往診マスタ」から往診を登録してください。");
       return;
    }
    
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const confirmDeploy = confirm(`${year}年${month + 1}月のカレンダーに、登録済みの往診予定（${clinics.length}件のクリニック）と前営業日の【事前準備タスク】を一括展開しますか？\n（既に展開済みの当月の往診予定・事前準備タスクは一度削除されて再配置されます）`);
    if (!confirmDeploy) return;

    setIsSaving(true);
    try {
        const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
        
        // JST日付判定ヘルパー
        const toJST = (dateInput: any): string => {
            if (!dateInput) return '';
            const d = new Date(dateInput);
            const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
            return jst.toISOString().split('T')[0];
        };

        // 既存の往診イベント、および未完了の自動生成事前準備イベントを抽出して削除
        const oldEventsToDelete = events.filter(e => {
            const jstDate = toJST(e.start);
            if (!jstDate.startsWith(targetMonthStr)) return false;

            const isClinic = e.extendedProps?.type === 'master_clinic';
            const isPrep = e.extendedProps?.autoGeneratedPrep || (e.title && e.title.startsWith('事前準備（'));
            return isClinic || (isPrep && e.extendedProps?.status !== 'completed');
        });

        if (oldEventsToDelete.length > 0) {
            await Promise.all(oldEventsToDelete.map(evt => 
                fetch(`/api/events?id=${evt.id}`, { method: 'DELETE' })
            ));
        }

        // 1. 新しい往診イベントの作成
        const newClinicEvents: any[] = [];
        
        for (const clinic of clinics) {
            const firstDay = new Date(year, month, 1);
            let firstDayOffset = clinic.dayOfWeek - firstDay.getDay();
            if (firstDayOffset < 0) firstDayOffset += 7;
            
            for (const week of clinic.monthlyWeeks) {
                const dateNum = 1 + firstDayOffset + (week - 1) * 7;
                const lastDay = new Date(year, month + 1, 0).getDate();
                
                if (dateNum <= lastDay) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
                    
                    newClinicEvents.push({
                        title: `${clinic.name} (往診)`,
                        type: 'master_clinic',
                        start: `${dateStr}T${clinic.startTime}:00`,
                        end: `${dateStr}T${clinic.endTime}:00`,
                        allDay: false,
                        clientId: 'personal',
                        clientName: '個人の予定',
                        backgroundColor: '#14b8a6',
                        notes: '往診マスターから一括展開',
                        extendedProps: {
                            isPersonal: true,
                            type: 'master_clinic',
                            clinicId: clinic.id,
                            careManagerId: selectedCareManagerId,
                            status: 'scheduled'
                        }
                    });
                }
            }
        }

        // 2. シフトデータ（休み・テレワーク）を取得
        let monthShifts: Record<string, string> = {};
        let monthTelework: Record<string, boolean> = {};
        try {
            const shiftsRes = await fetch('/api/shifts');
            if (shiftsRes.ok) {
                const allShifts = await shiftsRes.json();
                const monthData = allShifts[targetMonthStr];
                if (monthData) {
                    monthShifts = monthData.shifts || {};
                    monthTelework = monthData.telework || {};
                }
            }
        } catch (shiftErr) {
            console.error("Failed to fetch shifts for prep generation:", shiftErr);
        }

        // 3. 往診イベントとシフト情報から「前営業日 16:30〜17:30 の事前準備タスク」を自動計算
        const remainingEvents = events.filter(e => !oldEventsToDelete.some(del => del.id === e.id));
        const combinedEventsForPrep = [...remainingEvents, ...newClinicEvents];
        const newPreps = generatePrepEvents(targetMonthStr, monthShifts, monthTelework, combinedEventsForPrep);

        const allToInsert = [...newClinicEvents, ...newPreps];

        if (allToInsert.length > 0) {
            await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(allToInsert)
            });
        }

        const res = await fetch('/api/events');
        setEvents(await res.json());
        alert(`${newClinicEvents.length}件の往診予定と、${newPreps.length}件の事前準備タスクを展開しました。`);
    } catch (e) {
        console.error(e);
        alert('往診展開中にエラーが発生しました。');
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeployShifts = async () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const targetMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    const confirmDeploy = confirm(`${year}年${month + 1}月のシフト情報から、休みとテレワーク予定をカレンダーに反映しますか？`);
    if (!confirmDeploy) return;

    setIsSaving(true);
    try {
        const shiftsRes = await fetch('/api/shifts');
        if (!shiftsRes.ok) throw new Error('Failed to fetch shifts');
        const allShifts = await shiftsRes.json();
        const monthData = allShifts[targetMonthStr];

        if (!monthData) {
            alert(`${year}年${month + 1}月のシフトデータがありません。「シフト」タブで作成・保存してください。`);
            return;
        }

        const syncRes = await fetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                yearMonth: targetMonthStr,
                shifts: monthData.shifts || {},
                onCall: monthData.onCall || {},
                telework: monthData.telework || {}
            })
        });

        if (!syncRes.ok) throw new Error('Failed to sync shifts');

        const eventsRes = await fetch('/api/events');
        setEvents(await eventsRes.json());
        alert(`${year}年${month + 1}月のシフト（休み・テレワーク）を反映しました。`);
    } catch (e) {
        console.error(e);
        alert('シフト反映中にエラーが発生しました。');
    } finally {
        setIsSaving(false);
    }
  };


  // Filtered lists
  const filteredClients = clients.filter(c =>
    selectedCareManagerId === 'all' ||
    c.careManagerId === selectedCareManagerId ||
    (!c.careManagerId && selectedCareManagerId === 'cm1')
  );
  const clientIdsOfSelectedCM = new Set(filteredClients.map(c => c.id));
  const filteredEvents = events.filter(e => {
    // If it's a shift event, only show it if it belongs to careManagerId 'cm1' (or if careManagerId is not specified, default to cm1)
    if (e.extendedProps?.fromShift === 'true' || e.extendedProps?.fromShift === true) {
      const cmId = e.extendedProps?.careManagerId;
      if (cmId && cmId !== 'cm1') {
        return false;
      }
    }

    // If "My Schedule Only" is ON, filter out routine client events
    if (showOnlyMySchedule) {
       const isPersonal = e.extendedProps?.isPersonal || e.isPersonal;
       const type = e.extendedProps?.type || '';
       const title = e.title || '';
       const isEngagingEvent = isPersonal || 
          type === 'monitoring' || title.includes('モニタリング') ||
          type === 'assessment' || title.includes('アセスメント') || title.includes('認定調査') ||
          type === 'office_work' ||
          type === 'conference' || title.includes('担当者会議') ||
          type === 'office_meeting' || title.includes('会議');
       
       if (!isEngagingEvent) return false;
     }

     if (selectedCareManagerId === 'all') return true;
     
     const eventCMId = e.extendedProps?.careManagerId;
     if (eventCMId) {
       return eventCMId === selectedCareManagerId;
     }
     
     if (e.extendedProps?.isPersonal) {
       return !e.extendedProps?.careManagerId && selectedCareManagerId === 'cm1';
     }
     return clientIdsOfSelectedCM.has(e.extendedProps?.clientId);
  });

  if (!hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-[#f8fafc] text-[#1e293b] overflow-x-hidden">
        <style jsx global>{`
          .custom-scrollbar::-webkit-scrollbar { width: 6px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
          body { overflow-x: hidden; width: 100%; position: relative; }
        `}</style>

        <header className="sticky top-0 z-40 w-full border-b border-white/20 bg-white/70 backdrop-blur-xl transition-all landscape:max-h-0 landscape:overflow-hidden landscape:border-none md:landscape:max-h-none md:landscape:overflow-visible md:landscape:border-b">
          <div className="mx-auto flex h-14 md:h-16 max-w-[1600px] items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#2563eb] shadow-lg shadow-blue-500/20">
                <CalendarIcon className="text-white" size={18} />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base md:text-lg font-bold tracking-tight text-slate-900 leading-tight">Care Schedule Pro</h1>
                <p className="text-[8px] md:text-[10px] text-slate-500 leading-none">EFFICIENCY & CARE</p>
              </div>
            </div>

            <nav className="hidden md:flex items-center gap-1 rounded-2xl bg-slate-100 p-1">
              <button onClick={() => setActiveTab('schedule')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'schedule' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><CalendarIcon size={18} /><span>予定</span></button>
              <button onClick={() => setActiveTab('monitoring')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'monitoring' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}><CheckSquare size={18} /><span>モニタリング</span></button>
              <button onClick={() => setActiveTab('memo')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'memo' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}><FileText size={18} /><span>メモ</span></button>
              <button onClick={() => setActiveTab('shift')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'shift' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Repeat size={18} /><span>シフト</span></button>
              <button onClick={() => setActiveTab('caseload')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'caseload' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-500'}`}><TrendingUp size={18} /><span>担当件数</span></button>
              <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'settings' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><SettingsIcon size={18} /><span>設定</span></button>
            </nav>

            <div className="flex items-center gap-2 md:gap-4">
              {(isSaving || isLoading) && <Loader2 className="animate-spin text-blue-500" size={16} />}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] p-2 md:p-6 pb-20 md:pb-12 landscape:pt-1 md:landscape:pt-6">
          {activeTab === 'schedule' && (
            <div className="flex flex-col gap-2 md:gap-4">
              <div className="flex items-center justify-between px-1 landscape:hidden md:landscape:flex overflow-x-auto scrollbar-hide py-0.5">
                <div className="flex items-center gap-2 md:gap-4 flex-nowrap min-w-max">
                  <div className="flex items-center gap-2 md:gap-3">
                    {/* スマホでもすぐ押せるよう「自分の予定のみ」を一番左に配置 */}
                    <div 
                      onClick={() => setShowOnlyMySchedule(!showOnlyMySchedule)}
                      className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 md:px-3 md:py-1.5 rounded-full transition-all border shadow-sm ${
                        showOnlyMySchedule 
                          ? 'bg-sky-50 border-sky-300 text-sky-800 ring-2 ring-sky-200' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                       <span className="text-xs md:text-sm font-bold whitespace-nowrap">👤 自分の予定のみ</span>
                       <div 
                          className={`w-7 h-3.5 md:w-8 md:h-4 rounded-full relative transition-colors border shadow-inner ${showOnlyMySchedule ? 'bg-sky-500 border-sky-600' : 'bg-slate-300 border-slate-400'}`}
                       >
                          <div className={`w-2.5 h-2.5 md:w-3 md:h-3 bg-white rounded-full absolute top-[1px] left-[1px] transition-transform shadow-sm ${showOnlyMySchedule ? 'translate-x-[14px] md:translate-x-[16px]' : ''}`} />
                       </div>
                    </div>

                    <button
                        onClick={handleDeployClinics}
                        className="bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Repeat size={13} />
                        往診展開
                    </button>
                    <button
                        onClick={handleDeployRoutines}
                        className="bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Repeat size={13} />
                        ルーティン展開
                    </button>
                    <button
                        onClick={handleDeployShifts}
                        className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-2.5 py-1 md:px-3 md:py-1.5 rounded-full text-xs md:text-sm font-bold transition-colors shadow-sm flex items-center gap-1.5 whitespace-nowrap"
                    >
                        <Repeat size={13} />
                        シフト反映
                    </button>
                  </div>
                </div>
              </div>
              <div className="h-[calc(100dvh-130px)] md:h-[calc(100dvh-200px)] min-h-[350px] w-full rounded-2xl md:rounded-3xl border border-slate-200 bg-white p-1.5 md:p-4 shadow-xl overflow-hidden">
                <ScheduleCalendar
                  clients={filteredClients}
                  events={filteredEvents}
                  setEvents={setEvents}
                  selectedClientId={null}
                  scheduleTypes={scheduleTypes}
                  onDateClick={handleDateClick}
                  onEventClick={handleEditEvent}
                  onEventDrop={handleEventDrop}
                  onDatesSet={setCurrentMonth}
                  showOnlyMySchedule={showOnlyMySchedule}
                  onToggleShowOnlyMySchedule={() => setShowOnlyMySchedule(!showOnlyMySchedule)}
                />
              </div>
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="h-[calc(100dvh-160px)] md:h-[calc(100dvh-200px)] min-h-[300px] w-full">
               <MonitoringView 
                  clients={filteredClients}
                  events={filteredEvents}
                  setEvents={setEvents}
                  careManagers={careManagers}
                  selectedCareManagerId={selectedCareManagerId}
               />
            </div>
          )}

          {activeTab === 'memo' && (
            <div className="w-full">
              <MemoBoard />
            </div>
          )}

          {activeTab === 'shift' && (
            <div className="w-full">
              <ShiftAutomation 
                initialYear={currentMonth.getFullYear()}
                initialMonth={currentMonth.getMonth() + 1}
                onSaveSuccess={async () => {
                  try {
                    const res = await fetch('/api/events');
                    if (res.ok) {
                      const data = await res.json();
                      setEvents(Array.isArray(data) ? data : []);
                    }
                  } catch (e) {
                    console.error("Failed to sync events on shift save", e);
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'caseload' && (
            <div className="h-[calc(100dvh-130px)] md:h-[calc(100dvh-200px)] min-h-[400px] w-full rounded-2xl md:rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
              <CaseloadDashboard 
                careManagers={careManagers}
                selectedCareManagerId={selectedCareManagerId}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <Settings
              clients={clients}
              onAddClient={handleAddClient}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
              scheduleTypes={scheduleTypes}
              onAddScheduleType={handleAddScheduleType}
              onDeleteScheduleType={handleDeleteScheduleType}
              clinics={clinics}
              onAddClinic={handleAddClinic}
              onUpdateClinic={handleUpdateClinic}
              onDeleteClinic={handleDeleteClinic}
              routines={routines}
              onAddRoutine={handleAddRoutine}
              onUpdateRoutine={handleUpdateRoutine}
              onDeleteRoutine={handleDeleteRoutine}
              careManagerId={selectedCareManagerId}
            />
          )}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-white/95 backdrop-blur-md p-1.5 pb-safe shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.1)]">
        <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'schedule' ? 'text-blue-600 font-bold' : 'text-slate-400'}`}><CalendarIcon size={18} /><span className="text-[9px] font-bold">予定</span></button>
        <button onClick={() => setActiveTab('monitoring')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'monitoring' ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}><CheckSquare size={18} /><span className="text-[9px] font-bold">モニタ</span></button>
        <button onClick={() => setActiveTab('memo')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'memo' ? 'text-amber-600 font-bold' : 'text-slate-400'}`}><FileText size={18} /><span className="text-[9px] font-bold">メモ</span></button>
        <button onClick={() => setActiveTab('shift')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'shift' ? 'text-blue-600 font-bold' : 'text-slate-400'}`}><Repeat size={18} /><span className="text-[9px] font-bold">シフト</span></button>
        <button onClick={() => setActiveTab('caseload')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'caseload' ? 'text-sky-600 font-bold' : 'text-slate-400'}`}><TrendingUp size={18} /><span className="text-[9px] font-bold">担当</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'settings' ? 'text-blue-600 font-bold' : 'text-slate-400'}`}><SettingsIcon size={18} /><span className="text-[9px] font-bold">設定</span></button>
      </nav>

      <VisitModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
        onSave={handleSaveVisit}
        onDelete={handleDeleteEvent}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        editingEvent={editingEvent}
        clients={clients}
        scheduleTypes={scheduleTypes}
        clinics={clinics}
        editTargetChoice={editTargetChoice}
        isSaving={isSaving}
        onCopy={handleCopyEvent}
        currentCareManagerId={selectedCareManagerId === 'all' ? 'cm1' : selectedCareManagerId}
      />

      <EventPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => { setIsPreviewModalOpen(false); setEditingEvent(null); }}
        event={editingEvent}
        clients={clients}
        onEdit={handleEditFromPreview}
        onToggleComplete={handleToggleComplete}
      />

      <EditChoiceModal
        isOpen={isEditChoiceModalOpen}
        onClose={() => setIsEditChoiceModalOpen(false)}
        onConfirm={handleEditChoice}
      />

      <DeletionChoiceModal
        isOpen={isDeletionModalOpen}
        onClose={() => { setIsDeletionModalOpen(false); setEventToDelete(null); }}
        onConfirm={handleConfirmDelete}
        eventTitle={eventToDelete?.title}
      />
    </>
  );
}
