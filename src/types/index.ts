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

export interface Routine {
    id: string;
    name: string;      // Abbreviated name for the calendar
    memo: string;      // Detailed description
    targetDay: number; // 1-31, or 99 for end of month
    color: string;     // Color code for the badge
    targetMonths?: number[]; // [1, 2, ..., 12], if undefined or empty, means every month
}

export interface CareManagerBaseline {
    care1to5: number;   // 要介護件数
    support1to2: number; // 要支援件数
    tenouda: number;     // 天王田
    suwa: number;        // 諏訪
    home: number;        // 在宅
}

export interface CaseloadEvent {
    id: string;
    careManagerId: string; // 'cm1' | 'cm2' | 'cm3'
    type: 'new' | 'end' | 'change_applied' | 'change_resolved';
    date: string; // YYYY-MM-DD
    clientName: string;
    location: 'tenouda' | 'suwa' | 'home'; // 天王田, 諏訪, 在宅
    careLevelType: 'care' | 'support'; // 要介護, 要支援
    // 区分変更用
    targetCareLevelType?: 'care' | 'support'; // 変更後の介護度
    resolvedDate?: string; // 結果が出た日
    status?: 'pending' | 'resolved'; // 区分変更中か確定済みか
    notes?: string;
    createdAt?: string;
}

export interface CaseloadData {
    baseline202609: {
        cm1: CareManagerBaseline;
        cm2: CareManagerBaseline;
        cm3: CareManagerBaseline;
        [key: string]: CareManagerBaseline;
    };
    events: CaseloadEvent[];
}

export interface Memo {
    id: string;
    title: string;
    content: string;
    careManagerId?: string; // 'cm1' | 'cm2' | 'cm3' | 'all'
    category?: string;
    isPinned?: boolean;
    updatedAt: string;
    createdAt: string;
}

