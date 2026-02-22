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
    const dragOffset = useRef({ x: 0, y: 0 }); // Use ref for synchronous updates during drag
    const modalRef = useRef<HTMLDivElement>(null);

    // Reset position when opened
    useEffect(() => {
        if (isOpen && modalRef.current) {
            // Only center if position is not set yet (or we want to reset every open? User might want it remembered?)
            // For now reset every open as per previous logic, but ensure it's calculated after render
            const initialX = window.innerWidth / 2 - modalRef.current.offsetWidth / 2;
            const initialY = window.innerHeight / 2 - modalRef.current.offsetHeight / 2;
            setPosition({
                x: Math.max(0, initialX),
                y: Math.max(0, initialY)
            });
        }
    }, [isOpen]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (modalRef.current && position) {
            setIsDragging(true);
            // Calculate offset from the top-left of the modal
            // Offset = Mouse Position - Modal Position
            dragOffset.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y
            };
        }
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                // New Position = Mouse Position - Offset
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

    console.log("DraggableModal: isOpen =", isOpen, "title =", title);
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center">
            {/* Overlay - Optional: make it transparent/clickable through or completely removed? 
                User wants "separate window", so maybe no blocking overlay, or a light one.
                If we want a true "window" feel, we might remove the background blocking overlay 
                so they can interact with the background? 
                But for now, to ensure focus, let's keep a transparent overlay that catches clicks?
                Actually, user said "while inputting schedule, want to check behind".
                So we should NOT block pointer events on the background if possible, OR just rely on dragging.
                Standard complex modals usually block interaction.
                Let's make the background click CLOSING the modal optional or removed.
                Current requirement: "can move it aside".
            */}

            {/* Semi-transparent background for focus, but let's keep it minimal or remove it to feel like a window. 
                If we remove the background overlay, we need to handle "clicking outside" logic differently if we want auto-close.
                For "window" feel, usually you have to click "Close" or "Cancel".
            */}
            <div className="fixed inset-0 bg-black/20 pointer-events-auto" onClick={onClose} />

            <div
                ref={modalRef}
                className={`pointer-events-auto absolute bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col ${width} overflow-hidden`}
                style={{
                    left: position ? position.x : '50%',
                    top: position ? position.y : '50%',
                    transform: position ? 'none' : 'translate(-50%, -50%)',
                    width: 'auto' // Allow width to be determined by content or prop
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
                <div className="p-6 overflow-auto max-h-[80vh]">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default DraggableModal;
