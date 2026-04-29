import React from 'react';
import { Client } from '@/types';
import { X, Edit2, Calendar, User } from 'lucide-react';

interface EventPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  clients: Client[];
  onEdit: () => void;
  onToggleComplete?: (event: any, newStatus: string) => void;
}

export default function EventPreviewModal({ isOpen, onClose, event, clients, onEdit, onToggleComplete }: EventPreviewModalProps) {
  if (!isOpen || !event) return null;

  const isFCEvent = !!event.extendedProps;
  const props = isFCEvent ? event.extendedProps : event;
  const title = event.title || '';
  
  const clientId = props.clientId || event.clientId;
  const client = clients.find(c => c.id === clientId);

  const formatJSTDate = (isoStart: string, isoEnd: string, allDay: boolean) => {
      const d1 = new Date(isoStart);
      const dayStr = `${d1.getMonth() + 1}/${d1.getDate()}(${['日','月','火','水','木','金','土'][d1.getDay()]})`;
      if (allDay) return `${dayStr} (終日)`;
      
      const timeStr = `${String(d1.getHours()).padStart(2, '0')}:${String(d1.getMinutes()).padStart(2, '0')}`;
      let endStr = '';
      if (isoEnd && isoEnd !== isoStart) {
          const d2 = new Date(isoEnd);
          endStr = ` 〜 ${String(d2.getHours()).padStart(2, '0')}:${String(d2.getMinutes()).padStart(2, '0')}`;
      }
      return `${dayStr} ${timeStr}${endStr}`;
  };

  const isCompleted = props.status === 'completed';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-hidden" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-[fadeIn_0.2s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative p-5">
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
            >
                <X size={18} />
            </button>

            <div className="flex flex-col gap-4 mt-2">
                <div className="flex items-start gap-3 pr-8">
                    <div className={`w-3 h-3 rounded-full mt-[6px] flex-none`} style={{ backgroundColor: event.backgroundColor || '#0ea5e9' }} />
                    <h2 className={`text-lg font-bold leading-snug ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                        {title}
                    </h2>
                </div>

                <div className="flex flex-col gap-3 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-slate-400" />
                        <span className="font-medium">
                            {event.start ? formatJSTDate(event.startStr || event.start, event.endStr || event.end, event.allDay) : '-'}
                        </span>
                    </div>
                    {client && (
                        <div className="flex items-center gap-2">
                            <User size={16} className="text-slate-400" />
                            <span className="font-medium">{client.name} 様</span>
                        </div>
                    )}
                    {(props.notes || props.memo) && (
                        <div className="flex items-start gap-2 pt-2 border-t border-slate-200 mt-1">
                            <span className="text-slate-700 whitespace-pre-wrap">{props.notes || props.memo}</span>
                        </div>
                    )}
                    
                    {onToggleComplete && (
                        <div 
                            className="flex items-center gap-2 pt-2 border-t border-slate-200 mt-1 cursor-pointer select-none" 
                            onClick={() => onToggleComplete(event, isCompleted ? 'scheduled' : 'completed')}
                        >
                            <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isCompleted ? 'bg-emerald-500' : 'bg-white border-2 border-slate-300'}`}>
                                {isCompleted && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <span className={`font-bold ${isCompleted ? 'text-emerald-600' : 'text-slate-600'}`}>
                                {isCompleted ? '実績あり（完了済）' : '未完了'}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button 
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-bold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                    閉じる
                </button>
                <button 
                    onClick={onEdit}
                    className="flex items-center justify-center gap-2 px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md transition-colors"
                >
                    <Edit2 size={16} /> 編集する
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
