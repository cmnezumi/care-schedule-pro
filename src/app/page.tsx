"use client";

import React, { useState, useEffect } from 'react';
import ScheduleCalendar from "@/components/ScheduleCalendar";
import ShiftAutomation from "@/components/ShiftAutomation";
import ConferenceAdjustment from '@/components/ConferenceAdjustment';
import EditChoiceModal from "@/components/EditChoiceModal";
import Settings from "@/components/Settings";
import VisitModal from "@/components/VisitModal";
import DeletionChoiceModal from "@/components/DeletionChoiceModal";
import MonitoringView from "@/components/MonitoringView";
import EventPreviewModal from "@/components/EventPreviewModal";
import { supabase } from "@/lib/supabase";
import { Client, ScheduleType, CareManager, Clinic } from "@/types";
import { Loader2, Calendar as CalendarIcon, Users, Repeat, Settings as SettingsIcon, CheckSquare } from "lucide-react";

type TabType = 'settings' | 'schedule' | 'conference' | 'shift' | 'monitoring';

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
    { id: 'cm1', name: 'ねずみ' },
    { id: 'cm2', name: 'ケアマネ A' },
    { id: 'cm3', name: 'ケアマネ B' },
  ]);
  const [selectedCareManagerId, setSelectedCareManagerId] = useState<string>('cm1');
  const isHandlingEventRef = React.useRef(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditChoiceModalOpen, setIsEditChoiceModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [showOnlyMySchedule, setShowOnlyMySchedule] = useState(false);
  const [editTargetChoice, setEditTargetChoice] = useState<'single' | 'all'>('single');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const [isDeletionModalOpen, setIsDeletionModalOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Lifted state
  const [clients, setClients] = useState<Client[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [usersRes, typesRes, eventsRes, clinicsRes] = await Promise.all([
          fetch('/api/users'),
          fetch('/api/schedule-types'),
          fetch('/api/events'),
          fetch('/api/clinics')
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

        setClients(Array.isArray(usersData) ? sortClients50On(usersData) : []);
        setClinics(Array.isArray(clinicsData) ? clinicsData : []);

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

  const handleEditChoice = (choice: 'single' | 'all') => {
    setEditTargetChoice(choice);
    setIsEditChoiceModalOpen(false);
    setIsModalOpen(true);
  };

  const handleSaveVisit = async (data: any) => {
    setIsSaving(true);
    try {
      await fetch('/api/events', {
        method: (data.id || editingEvent?.id) ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const res = await fetch('/api/events');
      setEvents(await res.json());
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
      await fetch(`/api/events?id=${realId}`, { method: 'DELETE' });
      const res = await fetch('/api/events');
      setEvents(await res.json());
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
      const realId = eventToDelete.baseEventId || eventToDelete.id;
      const queryParams = new URLSearchParams();
      queryParams.append('id', realId);

      if (choice !== 'this') {
          queryParams.append('choice', choice);
          if (choice === 'following') queryParams.append('date', eventToDelete.start);
      } else if (eventToDelete.baseEventId) {
          queryParams.append('choice', 'this_instance');
          queryParams.append('date', eventToDelete.start);
      }

      await fetch(`/api/events?${queryParams.toString()}`, {
        method: 'DELETE'
      });
      const res = await fetch('/api/events');
      setEvents(await res.json());
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
      await fetch('/api/events', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedPayload)
      });
      const res = await fetch('/api/events');
      setEvents(await res.json());
    } catch (e) {
      console.error(e);
      alert('予定の移動に失敗しました。');
      if (typeof event.revert === 'function') event.revert();
    } finally {
      setIsSaving(false);
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

  // Filtered lists
  const filteredClients = clients.filter(c =>
    selectedCareManagerId === 'all' ||
    c.careManagerId === selectedCareManagerId ||
    (!c.careManagerId && selectedCareManagerId === 'cm1')
  );
  const clientIdsOfSelectedCM = new Set(filteredClients.map(c => c.id));
  const filteredEvents = events.filter(e => {
    // If "My Schedule Only" is ON, filter out routine client events
    if (showOnlyMySchedule) {
       const isPersonal = e.extendedProps?.isPersonal || e.isPersonal;
       const type = e.extendedProps?.type || '';
       const title = e.title || '';
       const isEngagingEvent = isPersonal || 
          type === 'monitoring' || title.includes('モニタリング') ||
          type === 'office_work' ||
          type === 'conference' || title.includes('担当者会議') ||
          type === 'office_meeting' || title.includes('会議') ||
          type === 'clinic' || title.includes('往診');
       
       if (!isEngagingEvent) return false;
    }

    if (selectedCareManagerId === 'all') return true;
    if (e.extendedProps?.isPersonal) {
      return e.extendedProps?.careManagerId === selectedCareManagerId || (!e.extendedProps?.careManagerId && selectedCareManagerId === 'cm1');
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
              <button onClick={() => setActiveTab('conference')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'conference' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Users size={18} /><span>会議</span></button>
              <button onClick={() => setActiveTab('shift')} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === 'shift' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}><Repeat size={18} /><span>シフト</span></button>
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
              <div className="flex items-center justify-between px-2 landscape:hidden md:landscape:flex">
                <div className="flex items-center gap-4">
                  <h2 className="text-base md:text-lg font-bold text-slate-800">月間スケジュール</h2>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition-colors">
                     <span className="text-xs md:text-sm font-bold text-slate-600">自分の予定のみ</span>
                     <div className={`w-8 h-4 rounded-full relative transition-colors border shadow-inner ${showOnlyMySchedule ? 'bg-sky-500 border-sky-600' : 'bg-slate-300 border-slate-400'}`}>
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-[1px] left-[1px] transition-transform shadow-sm ${showOnlyMySchedule ? 'translate-x-[16px]' : ''}`} />
                     </div>
                     <input 
                         type="checkbox" 
                         className="hidden" 
                         checked={showOnlyMySchedule} 
                         onChange={(e) => setShowOnlyMySchedule(e.target.checked)} 
                     />
                  </label>
                </div>
              </div>
              <div className="h-[calc(100dvh-160px)] md:h-[calc(100dvh-200px)] min-h-[300px] w-full rounded-2xl md:rounded-3xl border border-slate-200 bg-white p-2 md:p-4 shadow-xl overflow-hidden">
                <ScheduleCalendar
                  clients={filteredClients}
                  events={filteredEvents}
                  setEvents={setEvents}
                  selectedClientId={null}
                  scheduleTypes={scheduleTypes}
                  onDateClick={handleDateClick}
                  onEventClick={handleEditEvent}
                  onEventDrop={handleEventDrop}
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

          {activeTab === 'conference' && (
            <div className="h-[calc(100dvh-160px)] md:h-[calc(100dvh-200px)] min-h-[250px] w-full">
              <ConferenceAdjustment
                clients={filteredClients}
                events={filteredEvents}
                onAddEvent={handleSaveVisit}
                onUpdateEvent={handleSaveVisit}
                scheduleTypes={scheduleTypes}
              />
            </div>
          )}

          {activeTab === 'shift' && (
            <div className="w-full">
              <ShiftAutomation />
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
              careManagerId={selectedCareManagerId}
            />
          )}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t bg-white/95 backdrop-blur-md p-2 pb-safe shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.1)]">
        <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'schedule' ? 'text-blue-600' : 'text-slate-400'}`}><CalendarIcon size={20} /><span className="text-[10px] font-bold">予定</span></button>
        <button onClick={() => setActiveTab('monitoring')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'monitoring' ? 'text-emerald-600' : 'text-slate-400'}`}><CheckSquare size={20} /><span className="text-[10px] font-bold">モニタ</span></button>
        <button onClick={() => setActiveTab('conference')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'conference' ? 'text-blue-600' : 'text-slate-400'}`}><Users size={20} /><span className="text-[10px] font-bold">会議</span></button>
        <button onClick={() => setActiveTab('shift')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'shift' ? 'text-blue-600' : 'text-slate-400'}`}><Repeat size={20} /><span className="text-[10px] font-bold">シフト</span></button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-0.5 ${activeTab === 'settings' ? 'text-blue-600' : 'text-slate-400'}`}><SettingsIcon size={20} /><span className="text-[10px] font-bold">設定</span></button>
      </nav>

      <VisitModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingEvent(null); }}
        onSave={handleSaveVisit}
        onDelete={handleDeleteEvent}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        editingEvent={editingEvent}
        clients={clients.filter(c => c.careManagerId === selectedCareManagerId)}
        scheduleTypes={scheduleTypes}
        clinics={clinics}
        editTargetChoice={editTargetChoice}
        isSaving={isSaving}
        onCopy={handleCopyEvent}
      />

      <EventPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => { setIsPreviewModalOpen(false); setEditingEvent(null); }}
        event={editingEvent}
        clients={clients}
        onEdit={handleEditFromPreview}
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
