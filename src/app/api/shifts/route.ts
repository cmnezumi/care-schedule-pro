import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'db.json');

export async function GET() {
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        const db = JSON.parse(data);
        return NextResponse.json(db.shifts || {});
    } catch (error) {
        return NextResponse.json({ message: 'Error reading database' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const payload = await request.json(); // Expected: { yearMonth: "2026-02", shifts: {...}, onCall: {...}, telework: {...} }
        const { yearMonth, shifts, onCall, telework } = payload;

        if (!yearMonth) {
            return NextResponse.json({ message: 'Missing yearMonth' }, { status: 400 });
        }

        const data = await fs.readFile(dbPath, 'utf-8');
        const db = JSON.parse(data);

        if (!db.shifts) db.shifts = {};

        db.shifts[yearMonth] = {
            shifts,
            onCall,
            telework,
            updatedAt: new Date().toISOString()
        };

        await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

        return NextResponse.json({ message: 'Saved successfully' }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ message: 'Error writing to database' }, { status: 500 });
    }
}
