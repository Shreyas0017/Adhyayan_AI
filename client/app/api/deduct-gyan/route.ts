import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userId, amount } = await request.json();

    if (!userId || !amount) {
      return NextResponse.json(
        { error: 'User ID and amount are required' },
        { status: 400 }
      );
    }

    // For now, let's use a simple check since we don't have the full auth setup
    // In production, you'd verify the user's authentication token
    const { db } = await connectToDatabase();
    
    // Get current user points
    const user = await db.collection('users').findOne({ uid: userId });
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const currentPoints = user.gyanPoints || 0;
    
    if (currentPoints < amount) {
      return NextResponse.json(
        { error: 'Insufficient Gyan Points' },
        { status: 400 }
      );
    }

    // Deduct points
    await db.collection('users').updateOne(
      { uid: userId },
      { $inc: { gyanPoints: -amount } }
    );

    return NextResponse.json({
      success: true,
      newBalance: currentPoints - amount
    });

  } catch (error) {
    console.error('Error deducting Gyan Points:', error);
    return NextResponse.json(
      { error: 'Failed to deduct Gyan Points' },
      { status: 500 }
    );
  }
}