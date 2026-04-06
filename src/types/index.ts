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
    kana?: string;
    address: string;
    careLevel: string; // e.g., "要介護1"
    careManagerId?: string; // Assigned caretaker (optional for backward compatibility)
    notes?: string;
    locationType?: 'same_bldg' | 'home' | 'attached_bldg'; // 丸, 星, その他
    planUpdateMonth?: number; // 1-12 (Legacy, keeping for backward compatibility if any)
    planRenewalDate?: string; // YYYY-MM
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

export interface Clinic {
    id: string;
    name: string;
    monthlyWeeks: number[]; // [1, 3]
    dayOfWeek: number;      // 0-6
    startTime: string;      // HH:mm
    endTime: string;        // HH:mm
}
