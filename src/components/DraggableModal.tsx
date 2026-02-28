"use client";

import React, { useState, useEffect, useRef } from 'react';

interface DraggableModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    width?: string;
}

const DraggableModal = ({ isOpen, onClose, title, children, width = 'max-w-md' }: DraggableModalProps) => {
    const [position, setPosition] = useState<{ x: number, y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);

    // Reset position when closed to ensure it re-centers next time
    useEffect(() => {
        if (!isOpen) {
            setPosition(null);
        }
    }, [isOpen]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (modalRef.current) {
            setIsDragging(true);

            // If it's the first drag, we need to calculate the current position from the CSS center
            const currentPos = position || {
                x: window.innerWidth / 2 - modalRef.current.offsetWidth / 2,
                y: window.innerHeight / 2 - modalRef.current.offsetHeight / 2
            };

            dragOffset.current = {
                x: e.clientX - currentPos.x,
                y: e.clientY - currentPos.y
            };

            if (!position) {
                setPosition(currentPos);
            }
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
            <div className="fixed inset-0 bg-black/5 pointer-events-auto" onClick={onClose} />

            <div
                ref={modalRef}
                className={`pointer-events-auto bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-slate-300 flex flex-col ${width} overflow-hidden`}
                style={position ? {
                    position: 'absolute',
                    left: `${position.x}px`,
                    top: `${position.y}px`,
                    width: 'auto',
                    backgroundColor: 'white',
                    opacity: 1
                } : {
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 'auto',
                    backgroundColor: 'white',
                    opacity: 1
                }}
            >
                {/* Header / Drag Handle */}
                <div
                    className="bg-[var(--primary-color)] px-4 py-3 cursor-move flex justify-between items-center select-none"
                    onMouseDown={handleMouseDown}
                >
                    <h2 className="font-bold text-white text-base truncate pr-4">{title}</h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-auto max-h-[85vh]">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default DraggableModal;
