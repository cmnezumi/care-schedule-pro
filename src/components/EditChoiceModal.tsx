"use client";

import React from 'react';
import DraggableModal from './DraggableModal';

interface EditChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (choice: 'single' | 'all') => void;
    eventTitle: string;
}

const EditChoiceModal = ({ isOpen, onClose, onSelect, eventTitle }: EditChoiceModalProps) => {
    return (
        <DraggableModal
            isOpen={isOpen}
            onClose={onClose}
            title="繰り返し予定の変更"
            width="max-w-md"
        >
            <div className="flex flex-col gap-6">
                <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 italic text-sm text-sky-800">
                    「{eventTitle}」は繰り返し予定です。
                </div>

                <p className="text-slate-600 text-sm leading-relaxed">
                    この日の予定だけを変更しますか？それとも、元となる繰り返し予定すべてを変更しますか？
                </p>

                <div className="grid grid-cols-1 gap-3">
                    <button
                        onClick={() => onSelect('single')}
                        className="w-full py-4 px-4 bg-white border-2 border-slate-100 hover:border-sky-500 hover:bg-sky-50 rounded-2xl text-left transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                                <div className="font-bold text-slate-700">この予定のみ変更</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">選択した日付の予定だけが変更されます</div>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => onSelect('all')}
                        className="w-full py-4 px-4 bg-white border-2 border-slate-100 hover:border-violet-500 hover:bg-violet-50 rounded-2xl text-left transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shrink-0 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            </div>
                            <div>
                                <div className="font-bold text-slate-700">すべての予定を変更</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">今後（もしくはずっと）の予定すべてが変更されます</div>
                            </div>
                        </div>
                    </button>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        キャンセル
                    </button>
                </div>
            </div>
        </DraggableModal>
    );
};

export default EditChoiceModal;
