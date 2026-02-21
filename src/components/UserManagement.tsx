"use client";

import React from 'react';
import { Client } from '@/types';

interface UserManagementProps {
    clients: Client[];
    onAddClient: () => void;
    selectedClientId?: string | null;
    onSelectClient?: (id: string) => void;
}

const UserManagement = ({ clients, onAddClient, selectedClientId, onSelectClient }: UserManagementProps) => {

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-slate-500">{clients.length} 名</span>
                <button
                    onClick={onAddClient}
                    className="text-xs bg-[var(--primary-color)] text-white px-3 py-1.5 rounded-full hover:bg-sky-600 transition-colors"
                >
                    + 新規登録
                </button>
            </div>
            <div className="flex-grow overflow-auto pr-2 space-y-3">
                {clients.map((client) => (
                    <div
                        key={client.id}
                        onClick={() => {
                            if (onSelectClient) {
                                if (selectedClientId === client.id) {
                                    onSelectClient(''); // Deselect (or null if preferred, but usually empty string or null works)
                                } else {
                                    onSelectClient(client.id);
                                }
                            }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group
                            ${selectedClientId === client.id
                                ? 'border-[var(--primary-color)] bg-sky-50 ring-1 ring-[var(--primary-color)] shadow-sm'
                                : 'border-slate-100 bg-slate-50 hover:bg-white hover:shadow-md'}
                        `}
                    >
                        <div className="flex justify-between items-start">
                            <h3 className={`font-bold ${selectedClientId === client.id ? 'text-[var(--primary-color)]' : 'text-slate-700'}`}>{client.name}</h3>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{client.careLevel}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 truncate">{client.address}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default UserManagement;