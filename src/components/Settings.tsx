"use client";

import React, { useState } from 'react';
import { Client, ScheduleType, Clinic } from '@/types';
import UserModal from './UserModal';

interface SettingsProps {
    clients: Client[];
    onAddClient: (data: any) => void;
    onUpdateClient: (id: string, data: any) => void;
    onDeleteClient: (id: string) => void;
    scheduleTypes: ScheduleType[];
    onAddScheduleType: (data: Omit<ScheduleType, 'id'>) => void;
    onDeleteScheduleType: (id: string) => void;
    clinics: Clinic[];
    onAddClinic: (data: any) => void;
    onUpdateClinic: (id: string, data: any) => void;
    onDeleteClinic: (id: string) => void;
    careManagerId: string;
}

const Settings = ({
    clients: allClients, onAddClient, onUpdateClient, onDeleteClient,
    scheduleTypes, onAddScheduleType, onDeleteScheduleType,
    clinics, onAddClinic, onUpdateClinic, onDeleteClinic,
    careManagerId
}: SettingsProps) => {
    const clients = allClients.filter(c => c.careManagerId === careManagerId);
    const [activeTab, setActiveTab] = useState<'users' | 'scheduleTypes' | 'clinics'>('users');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Schedule Type State
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeColor, setNewTypeColor] = useState('#cbd5e1');
    const [newTypeStartTime, setNewTypeStartTime] = useState('');
    const [newTypeEndTime, setNewTypeEndTime] = useState('');

    // Clinic Master State
    const [editingClinicId, setEditingClinicId] = useState<string | null>(null);
    const [newClinicName, setNewClinicName] = useState('');
    const [newClinicWeeks, setNewClinicWeeks] = useState<number[]>([]);
    const [newClinicDay, setNewClinicDay] = useState<number>(1); // Monday default
    const [newClinicStartTime, setNewClinicStartTime] = useState('10:00');
    const [newClinicEndTime, setNewClinicEndTime] = useState('11:00');

    const handleEditClinic = (clinic: Clinic) => {
        setNewClinicName(clinic.name);
        setNewClinicWeeks([...clinic.monthlyWeeks]);
        setNewClinicDay(clinic.dayOfWeek);
        setNewClinicStartTime(clinic.startTime);
        setNewClinicEndTime(clinic.endTime);
        setEditingClinicId(clinic.id);
        setActiveTab('clinics');
    };

    const handleCancelEditClinic = () => {
        setEditingClinicId(null);
        setNewClinicName('');
        setNewClinicWeeks([]);
        setNewClinicDay(1);
        setNewClinicStartTime('10:00');
        setNewClinicEndTime('11:00');
    };

    const handleEditClient = (client: Client) => {
        setEditingClient(client);
        setIsUserModalOpen(true);
    };

    const handleDeleteClient = (client: Client) => {
        if (confirm(`${client.name} 様を削除してもよろしいですか？`)) {
            onDeleteClient(client.id);
        }
    };

    const handleSaveClient = (data: Omit<Client, 'id'>) => {
        if (editingClient) {
            onUpdateClient(editingClient.id, data);
        } else {
            onAddClient(data);
        }
    };

    const handleCloseUserModal = () => {
        setIsUserModalOpen(false);
        setEditingClient(null);
    };

    const handleAddType = () => {
        if (!newTypeName) return;
        onAddScheduleType({
            name: newTypeName,
            color: newTypeColor,
            defaultStartTime: newTypeStartTime || undefined,
            defaultEndTime: newTypeEndTime || undefined
        });
        setNewTypeName('');
        setNewTypeColor('#cbd5e1'); // Reset to default slate-300
        setNewTypeStartTime('');
        setNewTypeEndTime('');
    };

    const handleAddClinic = () => {
        if (!newClinicName) return;
        const clinicData = {
            name: newClinicName,
            monthlyWeeks: newClinicWeeks,
            dayOfWeek: newClinicDay,
            startTime: newClinicStartTime,
            endTime: newClinicEndTime
        };

        if (editingClinicId) {
            onUpdateClinic(editingClinicId, clinicData);
            setEditingClinicId(null);
        } else {
            onAddClinic(clinicData);
        }

        setNewClinicName('');
        setNewClinicWeeks([]);
        setNewClinicDay(1);
        setNewClinicStartTime('10:00');
        setNewClinicEndTime('11:00');
    };

    const toggleClinicWeek = (week: number) => {
        setNewClinicWeeks(prev =>
            prev.includes(week) ? prev.filter(w => w !== week) : [...prev, week].sort()
        );
    };

    return (
        <div className="h-full bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
            <div className="flex border-b border-slate-100">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'users' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    利用者マスタ
                </button>
                <button
                    onClick={() => setActiveTab('scheduleTypes')}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'scheduleTypes' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    予定種別マスタ
                </button>
                <button
                    onClick={() => setActiveTab('clinics')}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'clinics' ? 'text-[var(--primary-color)] border-b-2 border-[var(--primary-color)]' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    往診クリニックマスタ
                </button>
                <button
                    onClick={() => setActiveTab('danger' as any)}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'danger' as any ? 'text-rose-600 border-b-2 border-rose-600' : 'text-slate-500 hover:text-rose-400'}`}
                >
                    データ管理
                </button>
            </div>

            {activeTab === 'danger' as any && (
                <div className="p-8 flex flex-col items-center justify-center gap-6 h-full">
                    <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 max-w-md text-center">
                        <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">データの全消去</h3>
                        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                            登録されている全ての利用者情報とスケジュールを消去します。<br />
                            <span className="font-bold text-rose-600">この操作は取り消せません。</span>
                        </p>
                        <button
                            onClick={() => {
                                if (confirm("本当に全てのデータを消去してもよろしいですか？利用者名も予定もすべて消え、最初の状態に戻ります。")) {
                                    // We will add onResetData to props later
                                    (window as any)._resetData();
                                }
                            }}
                            className="w-full py-3 bg-rose-500 text-white rounded-xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-600 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            データをリセットする
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'users' && (
                <>
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div>
                            <h2 className="font-bold text-slate-700 text-lg">利用者一覧</h2>
                            <p className="text-sm text-slate-500">利用者の登録・編集・削除が行えます</p>
                        </div>
                        <button
                            onClick={() => setIsUserModalOpen(true)}
                            className="bg-[var(--primary-color)] text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors shadow-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            新規登録
                        </button>
                    </div>

                    <div className="flex-grow overflow-auto p-4">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="p-3 text-sm font-semibold text-slate-600 border-b">名前</th>
                                    <th className="p-3 text-sm font-semibold text-slate-600 border-b">要介護度</th>
                                    <th className="p-3 text-sm font-semibold text-slate-600 border-b">住所</th>
                                    <th className="p-3 text-sm font-semibold text-slate-600 border-b w-32">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {clients.map(client => (
                                    <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 text-slate-700 font-medium">{client.name}</td>
                                        <td className="p-3 text-slate-600 text-sm">
                                            <span className="px-2 py-1 bg-slate-100 rounded text-xs">
                                                {client.careLevel}
                                            </span>
                                        </td>
                                        <td className="p-3 text-slate-600 text-sm truncate max-w-xs">{client.address}</td>
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEditClient(client)}
                                                    className="p-1 text-slate-400 hover:text-[var(--primary-color)] transition-colors"
                                                    title="編集"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClient(client)}
                                                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                                                    title="削除"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {clients.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-400">
                                            利用者が登録されていません
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {activeTab === 'clinics' && (
                <div className="p-6 flex flex-col h-full bg-slate-50/30">
                    <div className="mb-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${editingClinicId ? 'bg-amber-500' : 'bg-sky-500'}`} />
                            {editingClinicId ? '往診クリニックの編集' : '新しい往診クリニックを追加'}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            <div className="md:col-span-4">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">クリニック名</label>
                                <input
                                    type="text"
                                    value={newClinicName}
                                    onChange={(e) => setNewClinicName(e.target.value)}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-sky-500/20 outline-none transition-all"
                                    placeholder="例: あおぞらクリニック..."
                                />
                            </div>
                            <div className="md:col-span-8 flex flex-col">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">訪問週</label>
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4, 5].map(w => (
                                        <button
                                            key={w}
                                            onClick={() => toggleClinicWeek(w)}
                                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${newClinicWeeks.includes(w) ? 'bg-sky-500 text-white border-sky-400 shadow-sm shadow-sky-100' : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300'}`}
                                        >
                                            第{w}週
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="md:col-span-4">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">曜日</label>
                                <select
                                    value={newClinicDay}
                                    onChange={(e) => setNewClinicDay(parseInt(e.target.value))}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none bg-white"
                                >
                                    {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                                        <option key={i} value={i}>{d}曜日</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">開始時間</label>
                                <input
                                    type="time"
                                    value={newClinicStartTime}
                                    onChange={(e) => setNewClinicStartTime(e.target.value)}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none"
                                />
                            </div>
                            <div className="md:col-span-3">
                                <label className="block text-[11px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider">終了時間</label>
                                <input
                                    type="time"
                                    value={newClinicEndTime}
                                    onChange={(e) => setNewClinicEndTime(e.target.value)}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl text-sm outline-none"
                                />
                            </div>
                            <div className="md:col-span-2 flex items-end gap-2">
                                {editingClinicId && (
                                    <button
                                        onClick={handleCancelEditClinic}
                                        className="w-1/3 p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all font-bold text-sm"
                                    >
                                        取消
                                    </button>
                                )}
                                <button
                                    onClick={handleAddClinic}
                                    disabled={!newClinicName || newClinicWeeks.length === 0}
                                    className={`${editingClinicId ? 'w-2/3 bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'w-full bg-slate-800 hover:bg-slate-900 shadow-slate-100'} text-white rounded-xl disabled:opacity-30 transition-all font-bold text-sm shadow-lg active:scale-95 p-3`}
                                >
                                    {editingClinicId ? '更新' : '登録'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow overflow-auto">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            登録済みのクリニック一覧
                        </h3>
                        {clinics.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                                まだクリニックが登録されていません
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {clinics.map(clinic => (
                                    <div key={clinic.id} className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all relative">
                                        <div className="absolute top-3 right-3 flex gap-1">
                                            <button
                                                onClick={() => handleEditClinic(clinic)}
                                                className="p-1.5 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                                                title="編集"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => onDeleteClinic(clinic.id)}
                                                className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                title="削除"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                        <div className="font-bold text-slate-800 mb-3">{clinic.name}</div>
                                        <div className="flex flex-wrap gap-1.5 mb-3">
                                            {clinic.monthlyWeeks.sort().map(w => (
                                                <span key={w} className="px-2 py-0.5 bg-sky-50 text-sky-600 rounded-md text-[10px] font-bold">第{w}週</span>
                                            ))}
                                        </div>
                                        <div className="flex items-center justify-between text-xs font-bold text-slate-400 mt-auto pt-3 border-t border-slate-50">
                                            <span>{['日', '月', '火', '水', '木', '金', '土'][clinic.dayOfWeek]}曜日</span>
                                            <span className="bg-slate-50 px-2 py-0.5 rounded text-slate-500">{clinic.startTime} 〜 {clinic.endTime}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <UserModal
                isOpen={isUserModalOpen}
                onClose={handleCloseUserModal}
                onSave={handleSaveClient}
                initialData={editingClient}
            />
        </div>
    );
};

export default Settings;
