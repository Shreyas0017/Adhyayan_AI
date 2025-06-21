import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getMockDb } from '@/lib/mongodb';

/**
 * API route for getting user profile data including Gyan points
 */
export async function GET(request: NextRequest) {
  // Set up MongoDB connection - try real DB first, then mock as fallback
  let db;
  let usingMockDb = false;

  try {
    console.log('Attempting to connect to real MongoDB...');
    const { db: mongoDb } = await connectToDatabase();
    db = mongoDb;
    console.log('✅ Connected to real MongoDB database');
  } catch (error) {
    console.error('❌ Real database connection failed:', error);
    console.log('⚠️ Falling back to mock database for development');
    db = getMockDb();
    usingMockDb = true;
  }

  try {
    // Get user ID from query params or headers
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    
    // For now, we'll get userId from a header or return mock data
    const authHeader = request.headers.get('authorization');
    let currentUserId = userId;
    
    if (!currentUserId) {
      // Try to extract from auth header or use a default
      // In a real app, you'd parse the JWT token here
      currentUserId = 'b6f0e68d-153d-4acc-afb5-83c8b04c292f'; // Your test user ID
    }

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    // Get user data from database
    const userData = await db.collection('users').findOne({ uid: currentUserId });
    
    if (userData) {
      console.log(`✅ Found user data for ${currentUserId}:`, {
        gyanPoints: userData.gyanPoints || 0,
        subscription: userData.subscription || null
      });
      
      return NextResponse.json({
        uid: userData.uid,
        email: userData.email || 'test@example.com',
        displayName: userData.displayName || 'Test User',
        gyanPoints: userData.gyanPoints || 0,
        subscription: userData.subscription || null,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      });
    } else {
      console.log(`⚠️ User ${currentUserId} not found, creating with 0 points`);
      
      // Create user with 0 points if they don't exist
      const newUser = {
        uid: currentUserId,
        email: 'test@example.com',
        displayName: 'Test User',
        gyanPoints: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (!usingMockDb) {
        await db.collection('users').insertOne(newUser);
      }
      
      return NextResponse.json(newUser);
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    
    // Return a default user in case of errors
    return NextResponse.json({
      uid: 'b6f0e68d-153d-4acc-afb5-83c8b04c292f',
      email: 'test@example.com',
      displayName: 'Test User',
      gyanPoints: 0,
      subscription: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
}
