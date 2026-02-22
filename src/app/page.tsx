"use client";

import React, { useState } from 'react';
import ScheduleCalendar from "@/components/ScheduleCalendar";
import UserManagement from "@/components/UserManagement";

import UserModal from "@/components/UserModal";
import ShiftAutomation from "@/components/ShiftAutomation";
import ConferenceAdjustment from "@/components/ConferenceAdjustment";
import Settings from "@/components/Settings";
import { Client, ScheduleType, CareManager } from "@/types";

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

  const [clients, setClients] = useState<Client[]>([
    { id: '1', name: '田中 太郎', address: '東京都渋谷区...', careLevel: '要介護1', careManagerId: 'cm1' },
    { id: '2', name: '佐藤 花子', address: '東京都新宿区...', careLevel: '要支援2', careManagerId: 'cm1' },
    { id: '3', name: '鈴木 一郎', address: '東京都港区...', careLevel: '要介護3', careManagerId: 'cm2' },
  ]);

  const [scheduleTypes, setScheduleTypes] = useState<ScheduleType[]>([
    { id: 'monitoring', name: 'モニタリング', color: '#0ea5e9' }, // sky-500
    { id: 'assessment', name: 'アセスメント', color: '#f43f5e' }, // rose-500
    { id: 'conference', name: '担当者会議', color: '#8b5cf6' },   // violet-500
    { id: 'other', name: 'その他', color: '#64748b' },           // slate-500
  ]);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  // Lifted event state
  const [events, setEvents] = useState<any[]>([
    { title: '田中 太郎: モニタリング', start: new Date().toISOString().split('T')[0] + 'T10:00:00', end: new Date().toISOString().split('T')[0] + 'T11:00:00', backgroundColor: '#0ea5e9', extendedProps: { clientId: '1', type: 'monitoring' } },
    { title: '佐藤 花子: アセスメント', start: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0] + 'T14:00:00', backgroundColor: '#f43f5e', extendedProps: { clientId: '2', type: 'assessment' } }
  ]);

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

  const handleAddEvent = (newEvent: any) => {
    setEvents([...events, newEvent]);
  };

  const navigateToConference = (clientId: string) => {
    setSelectedClientId(clientId);
    setActiveTab('conference');
  };

  // Filtered lists
  const filteredClients = clients.filter(c => c.careManagerId === selectedCareManagerId);
  const clientIdsOfSelectedCM = new Set(filteredClients.map(c => c.id));
  const filteredEvents = events.filter(e => clientIdsOfSelectedCM.has(e.extendedProps?.clientId));

  return (
    <div className="min-h-screen bg-[var(--background-soft)] flex flex-col">
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-bold text-[var(--secondary-color)] flex items-center gap-2">
              <span className="w-8 h-8 bg-[var(--primary-color)] rounded-lg flex items-center justify-center text-white font-bold">CP</span>
              CareSchedule Pro
            </h1>

            {/* Care Manager Selector */}
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-400 px-2 uppercase tracking-wider">Manager</span>
              <div className="flex gap-1">
                {careManagers.map(cm => (
                  <button
                    key={cm.id}
                    onClick={() => {
                      setSelectedCareManagerId(cm.id);
                      setSelectedClientId(null); // Reset selected client when switching managers
                    }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedCareManagerId === cm.id
                      ? 'bg-white text-[var(--primary-color)] shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                  >
                    {cm.name}
                  </button>
                ))}
              </div>
            </div>
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
            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-400">v0.1.14</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 flex gap-6 text-sm font-medium text-slate-600">
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
            <div className="flex-grow bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-semibold text-slate-700">
                  {selectedClientId ? `${clients.find(c => c.id === selectedClientId)?.name} 様のスケジュール` : `${careManagers.find(cm => cm.id === selectedCareManagerId)?.name} 担当のスケジュール一覧`}
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
              <div className="flex-grow p-4 overflow-auto">
                <ScheduleCalendar
                  clients={filteredClients}
                  events={filteredEvents}
                  setEvents={setEvents}
                  selectedClientId={selectedClientId}
                  scheduleTypes={scheduleTypes}
                  onDateClick={(date) => {
                    setSelectedVisitDate(date);
                    setIsVisitModalOpen(true);
                  }}
                />
              </div>
            </div>

            <div className="w-80 h-full flex flex-col">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 h-full flex flex-col">
                <h2 className="font-semibold text-slate-700 mb-4">利用者一覧 ({filteredClients.length}名)</h2>
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
              isOpen={isVisitModalOpen}
              onClose={() => setIsVisitModalOpen(false)}
              onSave={handleSaveVisit}
              initialDate={selectedVisitDate}
              clients={filteredClients}
              scheduleTypes={scheduleTypes}
              defaultClientId={selectedClientId}
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
    </div>
  );
}
