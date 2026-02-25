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
            width="max-w-xl"
        >
            <div className="space-y-6">
                <p className="text-base text-slate-600 leading-relaxed">
                    「<span className="font-bold text-slate-900 underline decoration-sky-500 underline-offset-4">{eventTitle}</span>」は繰り返し予定です。<br />
                    どのように削除しますか？
                </p>

                <div className="grid grid-cols-1 gap-3">
                    <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-sky-200 hover:bg-sky-50/30 transition-all group">
                        <input
                            type="radio"
                            name="deletionChoice"
                            value="this"
                            checked={choice === 'this'}
                            onChange={() => setChoice('this')}
                            className="w-5 h-5 text-sky-500 focus:ring-sky-500 border-slate-300"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800 group-hover:text-sky-700">この日だけ削除</div>
                            <div className="text-xs text-slate-500 mt-0.5">選択した日の予定のみを削除し、他の週は残します。</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-sky-200 hover:bg-sky-50/30 transition-all group">
                        <input
                            type="radio"
                            name="deletionChoice"
                            value="following"
                            checked={choice === 'following'}
                            onChange={() => setChoice('following')}
                            className="w-5 h-5 text-sky-500 focus:ring-sky-500 border-slate-300"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800 group-hover:text-sky-700">この日以降をすべて削除</div>
                            <div className="text-xs text-slate-500 mt-0.5">選択した日以降の予定をすべて削除します（終了させます）。</div>
                        </div>
                    </label>

                    <label className="flex items-center gap-4 p-4 border-2 border-slate-100 rounded-xl cursor-pointer hover:border-rose-200 hover:bg-rose-50/30 transition-all group">
                        <input
                            type="radio"
                            name="deletionChoice"
                            value="all"
                            checked={choice === 'all'}
                            onChange={() => setChoice('all')}
                            className="w-5 h-5 text-rose-500 focus:ring-rose-500 border-slate-300"
                        />
                        <div className="flex-1">
                            <div className="text-sm font-bold text-slate-800 group-hover:text-rose-700">シリーズ全体を削除</div>
                            <div className="text-xs text-slate-500 mt-0.5">予定の開始日から過去分も含め、すべてを削除します。</div>
                        </div>
                    </label>
                </div>

                <div className="flex justify-end items-center gap-4 pt-4 border-t border-slate-100 mt-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={() => onConfirm(choice)}
                        className="px-8 py-2.5 bg-rose-500 text-white text-sm font-bold rounded-lg hover:bg-rose-600 shadow-lg shadow-rose-200 active:transform active:scale-95 transition-all"
                    >
                        削除を実行する
                    </button>
                </div>
            </div>
        </DraggableModal>
    );
};

export default DeletionChoiceModal;
