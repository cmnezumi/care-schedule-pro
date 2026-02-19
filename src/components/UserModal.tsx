"use client";

import React, { useState, useEffect } from 'react';
import { Client } from '@/types';
import DraggableModal from './DraggableModal';

interface UserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<Client, 'id'>) => void;
    initialData?: Client | null;
}

const UserModal = ({ isOpen, onClose, onSave, initialData }: UserModalProps) => {
    const [name, setName] = useState('');
    const [careLevel, setCareLevel] = useState('要介護1');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setCareLevel(initialData.careLevel);
                setAddress(initialData.address || '');
                setNotes(initialData.notes || ''); // Assuming Client has notes, if not, check type
            } else {
                setName('');
                setCareLevel('要介護1');
                setAddress('');
                setNotes('');
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSave = () => {
        if (!name) {
            alert('利用者名を入力してください');
            return;
        }

        onSave({ name, careLevel, address, notes });
        onClose();
    };

    const careLevels = [
        '要支援1', '要支援2',
        '要介護1', '要介護2', '要介護3', '要介護4', '要介護5'
    ];

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title={initialData ? '利用者情報の編集' : '利用者新規登録'}
        >
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">利用者名</label>
                    <input
                        type="text"
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="例: 山田 太郎"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">要介護度</label>
                    <select
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                        value={careLevel}
                        onChange={(e) => setCareLevel(e.target.value)}
                    >
                        {careLevels.map(level => (
                            <option key={level} value={level}>{level}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">住所</label>
                    <input
                        type="text"
                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="住所を入力..."
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">メモ</label>
                    <textarea
                        className="w-full p-2 border border-slate-300 rounded-lg h-24 resize-none focus:ring-2 focus:ring-sky-500 outline-none"
                        placeholder="特記事項があれば入力..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
                <button
                    onClick={onClose}
                    className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    キャンセル
                </button>
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 shadow-sm transition-colors"
                >
                    {initialData ? '保存' : '登録'}
                </button>
            </div>
        </DraggableModal>
    );
};

export default UserModal;
