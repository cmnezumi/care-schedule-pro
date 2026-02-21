export type VisitType = 'monitoring' | 'assessment' | 'conference' | 'other' | string; // Allow string for custom types

export interface ScheduleType {
    id: string;
    name: string;
    color: string;
    defaultStartTime?: string; // HH:mm
    defaultEndTime?: string;   // HH:mm
}

export interface CareManager {
    id: string;
    name: string;
    avatar?: string;
}

export interface Client {
    id: string;
    name: string;
    address: string;
    careLevel: string; // e.g., "要介護1"
    careManagerId?: string; // Assigned caretaker (optional for backward compatibility)
    notes?: string;
}

export interface Visit {
    id: string;
    clientId: string;
    clientName: string;
    start: Date;
    end: Date;
    title: string; // e.g., "Monthly Visit"
    type: VisitType;
    notes?: string;
    status: 'scheduled' | 'completed' | 'cancelled';
}
