import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// db.jsonのパス
const dbPath = path.join(process.cwd(), 'data', 'db.json');

// GET: 全てのユーザーを取得
export async function GET() {
  try {
    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);
    return NextResponse.json(db.users);
  } catch (error) {
    return NextResponse.json({ message: 'Error reading database' }, { status: 500 });
  }
}

// POST: 新しいユーザーを追加
export async function POST(request: Request) {
  try {
    const newUser = await request.json();

    if (!newUser.name) {
      return NextResponse.json({ message: 'User name is required' }, { status: 400 });
    }

    const data = await fs.readFile(dbPath, 'utf-8');
    const db = JSON.parse(data);

    const newId = db.users.length > 0 ? Math.max(...db.users.map((u: { id: string }) => parseInt(u.id) || 0)) + 1 : 1;
    const userWithId = { id: newId.toString(), ...newUser };

    db.users.push(userWithId);

    await fs.writeFile(dbPath, JSON.stringify(db, null, 2));

    return NextResponse.json(userWithId, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error writing to database' }, { status: 500 });
  }
}
