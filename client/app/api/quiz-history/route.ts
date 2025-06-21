import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface QuizHistory {
  _id?: ObjectId;
  userId: string;
  subject: string;
  topic: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  difficulty: string;
  duration: string;
  completedAt: Date;
  timeTaken: number;
}

export async function POST(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const body = await request.json();

    const quizHistory: Omit<QuizHistory, '_id'> = {
      userId: body.userId,
      subject: body.subject,
      topic: body.topic,
      score: body.score,
      totalQuestions: body.totalQuestions,
      percentage: body.percentage,
      difficulty: body.difficulty,
      duration: body.duration,
      completedAt: new Date(body.completedAt),
      timeTaken: body.timeTaken
    };

    const result = await db.collection('quizHistory').insertOne(quizHistory);

    if (result.insertedId) {
      return NextResponse.json({ 
        success: true, 
        id: result.insertedId 
      });
    } else {
      throw new Error('Failed to insert quiz history');
    }

  } catch (error) {
    console.error('Error saving quiz history:', error);
    return NextResponse.json(
      { error: 'Failed to save quiz history' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    
    const quizHistory = await db
      .collection('quizHistory')
      .find({ userId })
      .sort({ completedAt: -1 })
      .limit(50) // Limit to last 50 quizzes for performance
      .toArray();

    return NextResponse.json(quizHistory);

  } catch (error) {
    console.error('Error fetching quiz history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quiz history' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const quizId = searchParams.get('quizId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    if (quizId) {
      // Delete specific quiz
      const result = await db.collection('quizHistory').deleteOne({
        _id: new ObjectId(quizId),
        userId: userId
      });

      if (result.deletedCount === 0) {
        return NextResponse.json(
          { error: 'Quiz not found or unauthorized' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, message: 'Quiz deleted' });
    } else {
      // Delete all quizzes for user
      const result = await db.collection('quizHistory').deleteMany({ userId });
      
      return NextResponse.json({ 
        success: true, 
        message: `${result.deletedCount} quizzes deleted` 
      });
    }

  } catch (error) {
    console.error('Error deleting quiz history:', error);
    return NextResponse.json(
      { error: 'Failed to delete quiz history' },
      { status: 500 }
    );
  }
}