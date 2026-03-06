import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'db.json');

export async function POST() {
    try {
        const emptyDb = {
            users: [],
            events: [],
            holidays: [],
            scheduleTypes: [
                { "id": "monitoring", "name": "モニタリング", "color": "#0ea5e9" },
                { "id": "assessment", "name": "アセスメント", "color": "#f43f5e" },
                { "id": "conference", "name": "担当者会議", "color": "#8b5cf6" },
                { "id": "offday", "name": "休み", "color": "#94a3b8" },
                { "id": "telework", "name": "テレワーク", "color": "#22c55e" },
                { "id": "meeting", "name": "事業所会議", "color": "#f97316" }
            ]
        };

        await fs.writeFile(dbPath, JSON.stringify(emptyDb, null, 2));
        return NextResponse.json({ message: 'Database reset successfully' });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error resetting database' }, { status: 500 });
    }
}
