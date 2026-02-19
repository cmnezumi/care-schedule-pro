"use client";

import React, { useState } from 'react';
import { Client, ScheduleType } from '@/types';
import UserModal from './UserModal';

interface SettingsProps {
    clients: Client[];
    onAddClient: (data: Omit<Client, 'id'>) => void;
    onUpdateClient: (id: string, data: Omit<Client, 'id'>) => void;
    onDeleteClient: (id: string) => void;
    scheduleTypes: ScheduleType[];
    onAddScheduleType: (data: Omit<ScheduleType, 'id'>) => void;
    onDeleteScheduleType: (id: string) => void;
}

const Settings = ({
    clients, onAddClient, onUpdateClient, onDeleteClient,
    scheduleTypes, onAddScheduleType, onDeleteScheduleType
}: SettingsProps) => {
    const [activeTab, setActiveTab] = useState<'users' | 'scheduleTypes'>('users');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Schedule Type State
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeColor, setNewTypeColor] = useState('#cbd5e1');
    const [newTypeStartTime, setNewTypeStartTime] = useState('');
    const [newTypeEndTime, setNewTypeEndTime] = useState('');

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
            </div>

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

            {activeTab === 'scheduleTypes' && (
                <div className="p-6 flex flex-col h-full">
                    <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h3 className="font-bold text-slate-700 mb-3">新しい予定種別を追加</h3>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                            <div className="md:col-span-4">
                                <label className="block text-xs font-medium text-slate-500 mb-1">名称</label>
                                <input
                                    type="text"
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                    placeholder="例: 往診、デイサービス..."
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">色</label>
                                <input
                                    type="color"
                                    value={newTypeColor}
                                    onChange={(e) => setNewTypeColor(e.target.value)}
                                    className="h-9 w-full p-1 border border-slate-300 rounded-lg cursor-pointer"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">開始時間(任意)</label>
                                <input
                                    type="time"
                                    value={newTypeStartTime}
                                    onChange={(e) => setNewTypeStartTime(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-medium text-slate-500 mb-1">終了時間(任意)</label>
                                <input
                                    type="time"
                                    value={newTypeEndTime}
                                    onChange={(e) => setNewTypeEndTime(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <button
                                    onClick={handleAddType}
                                    disabled={!newTypeName}
                                    className="w-full px-4 py-2 bg-[var(--primary-color)] text-white rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                                >
                                    追加
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-grow overflow-auto">
                        <h3 className="font-bold text-slate-700 mb-3">登録済みの予定種別</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {scheduleTypes.map(type => (
                                <div key={type.id} className="p-3 border border-slate-200 rounded-lg flex items-center justify-between bg-white shadow-sm">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-4 h-4 rounded-full border border-slate-100 shadow-sm"
                                                style={{ backgroundColor: type.color }}
                                            />
                                            <span className="font-medium text-slate-700">{type.name}</span>
                                        </div>
                                        {(type.defaultStartTime || type.defaultEndTime) && (
                                            <div className="text-xs text-slate-400 pl-6">
                                                {type.defaultStartTime || '--:--'} 〜 {type.defaultEndTime || '--:--'}
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => onDeleteScheduleType(type.id)}
                                        className="text-slate-400 hover:text-rose-500 p-1"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
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
