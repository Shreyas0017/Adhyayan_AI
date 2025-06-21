import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase, getMockDb } from '@/lib/mongodb';

/**
 * API route for recording payment transactions in MongoDB
 */
export async function POST(request: NextRequest) {  // Set up MongoDB connection - try real DB first, then mock as fallback
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
    // Get the request body
    const body = await request.json();
    const { 
      userId,
      walletAddress, 
      transactionHash, 
      planId, 
      amount,
      paymentMethod,
      status
    } = body;

    if (!userId || !transactionHash || !planId || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }    // We don't need Firebase Auth verification anymore
    // Simply record the payment in MongoDB
    const timestamp = new Date();
    
    // 1. Record the payment in MongoDB
    const paymentRecord = {
      userId,
      walletAddress: walletAddress || null,
      transactionHash,
      planId,
      amount,
      paymentMethod: paymentMethod || 'aptos',
      status: status || 'completed',
      timestamp: timestamp.toISOString(),
      createdAt: timestamp
    };
      try {
      await db.collection('payments').insertOne(paymentRecord);
      console.log('✅ Payment recorded successfully in', usingMockDb ? 'mock database' : 'real MongoDB');
    } catch (error) {
      console.error('❌ Error saving payment to database:', error);
      if (!usingMockDb) {
        throw error; // Re-throw in production
      }
    }
      // 2. Update user subscription in MongoDB
    try {
      console.log(`🔍 Looking for user with uid: ${userId}`);
      
      // Get the current user record if it exists
      const userDoc = await db.collection('users').findOne({ uid: userId });
      console.log(`📄 Found user document:`, userDoc ? 'Yes' : 'No');
      
      if (userDoc) {
        console.log(`💰 Current Gyan Points: ${userDoc.gyanPoints || 0}`);
        console.log(`➕ Adding Points: ${getGyanPointsForPlan(planId)}`);
      }
      
      // Define subscription end date based on plan
      const now = new Date();
      const endDate = new Date();
      endDate.setDate(now.getDate() + getPlanDurationDays(planId));
      
      // Update user subscription data
      const updateResult = await db.collection('users').updateOne(
        { uid: userId },
        {
          $set: {
            subscription: {
              planId,
              startDate: now.toISOString(),
              endDate: endDate.toISOString(),
              active: true,
              paymentReference: transactionHash,
            },
            updatedAt: now.toISOString()
          },
          // Use $inc to increment gyan points atomically
          $inc: {
            gyanPoints: getGyanPointsForPlan(planId)
          },          // If the user doesn't exist, create it
          $setOnInsert: {
            uid: userId,
            createdAt: now.toISOString()
          }
        },
        { upsert: true } // Create if doesn't exist
      );
      
      console.log(`✅ Update operation result:`, {
        matchedCount: updateResult.matchedCount,
        modifiedCount: updateResult.modifiedCount,
        upsertedCount: updateResult.upsertedCount,
        upsertedId: updateResult.upsertedId
      });
      
      console.log('✅ User subscription updated successfully in', usingMockDb ? 'mock database' : 'real MongoDB');
      
      if (!usingMockDb) {
        console.log(`💰 Added ${getGyanPointsForPlan(planId)} Gyan points to user ${userId}`);
      }
    } catch (error) {
      console.error('Error updating user subscription in MongoDB:', error);
      // Continue despite errors - payment is still valid
    }    // Return success response
    return NextResponse.json({
      success: true,
      paymentId: transactionHash,
      message: 'Payment recorded successfully in MongoDB',
    });  } catch (error) {
    console.error('Error recording payment:', error);
    
    // Even in case of errors, send a success response in development mode
    // This prevents breaking the payment flow in the frontend during development
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Returning success response despite error');
      // Generate a mock transaction hash - don't rely on body which might be undefined
      const mockTransactionHash = 'mock-txn-' + Date.now();
      
      return NextResponse.json({
        success: true,
        paymentId: mockTransactionHash,
        message: 'Payment simulated successfully (development mode)',
        note: 'This is a mock response - actual payment recording failed'
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    );
  }
}

// Helper function to get plan duration in days
function getPlanDurationDays(planId: string): number {
  if (planId.includes('monthly')) return 30;
  if (planId.includes('yearly')) return 365;
  
  // Default durations based on plan tier
  const durationMap: Record<string, number> = {
    'basic': 7,
    'student': 30,        // Student: 1 month
    'scholar': 30,        // Scholar: 1 month
    'premium': 365,       // Premium: 1 year
    'institution': 365,   // Institution: 1 year
    'basic-plan': 30,
    'pro-plan': 30,
    'premium-plan': 30,
    // Top-up packs - these add points but no subscription duration (both versions)
    'quick-boost': 30,    // Points valid for 30 days
    'quick_boost': 30,    // Frontend sends this version
    'power-pack': 30,     // Points valid for 30 days
    'power_pack': 30,     // Frontend sends this version
    'mega-bundle': 30,    // Points valid for 30 days
    'mega_bundle': 30,    // Frontend sends this version
  };
  
  return durationMap[planId] || 30;
}

// Helper function to get Gyan points based on plan ID
function getGyanPointsForPlan(planId: string): number {
  const pointsMap: Record<string, number> = {
    'basic': 500,
    'student': 300,      // Student plan: 300 Gyan Points per month
    'scholar': 750,      // Scholar plan: 750 Gyan Points per month  
    'premium': 2000,     // Institution plan: 2000 Gyan Points per month
    'institution': 2000, // Alternative name for premium
    'basic-plan': 1000,
    'pro-plan': 3000,
    'premium-plan': 10000,
    'small-pack': 1000,
    'medium-pack': 3000,
    'large-pack': 5000,
    'mega-pack': 10000,
    // Top-up packs (both hyphen and underscore versions)
    'quick-boost': 100,  // ₹99 → 100 Points
    'quick_boost': 100,  // Frontend sends this version
    'power-pack': 250,   // ₹199 → 250 Points
    'power_pack': 250,   // Frontend sends this version
    'mega-bundle': 600,  // ₹399 → 600 Points
    'mega_bundle': 600   // Frontend sends this version
  };
  
  return pointsMap[planId] || 0;
}
