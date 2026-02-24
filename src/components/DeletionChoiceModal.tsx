"use client";

import React, { useState } from 'react';
import DraggableModal from './DraggableModal';

interface DeletionChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (choice: 'all' | 'following' | 'this') => void;
    eventTitle: string;
}

const DeletionChoiceModal = ({ isOpen, onClose, onConfirm, eventTitle }: DeletionChoiceModalProps) => {
    const [choice, setChoice] = useState<'all' | 'following' | 'this'>('all');

    if (!isOpen) return null;

    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title="予定の削除"
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    「<span className="font-semibold text-slate-800">{eventTitle}</span>」は繰り返し予定です。どのように削除しますか？
                </p>

                <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                            type="radio"
                            name="deletionChoice"
                            value="this"
                            checked={choice === 'this'}
                            onChange={() => setChoice('this')}
                            className="w-4 h-4 text-sky-500 focus:ring-sky-500"
                        />
                        <div>
                            <div className="text-sm font-medium text-slate-700">この日だけ削除</div>
                            <div className="text-xs text-slate-400">選択した日の予定のみを削除します。</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                            type="radio"
                            name="deletionChoice"
                            value="following"
                            checked={choice === 'following'}
                            onChange={() => setChoice('following')}
                            className="w-4 h-4 text-sky-500 focus:ring-sky-500"
                        />
                        <div>
                            <div className="text-sm font-medium text-slate-700">この日以降をすべて削除</div>
                            <div className="text-xs text-slate-400">今日以降の繰り返される全ての予定を削除します。</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                            type="radio"
                            name="deletionChoice"
                            value="all"
                            checked={choice === 'all'}
                            onChange={() => setChoice('all')}
                            className="w-4 h-4 text-sky-500 focus:ring-sky-500"
                        />
                        <div>
                            <div className="text-sm font-medium text-slate-700">シリーズ全体を削除</div>
                            <div className="text-xs text-slate-400">過去分も含め、この繰り返しの全ての予定を削除します。</div>
                        </div>
                    </label>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => onConfirm(choice)}
                        className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 shadow-sm transition-colors"
                    >
                        削除する
                    </button>
                </div>
            </div>
        </DraggableModal>
    );
};

export default DeletionChoiceModal;
