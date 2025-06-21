import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, runTransaction, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomCode: string }> }
) {
  try {
    const { roomCode } = await params;
    const { userId, questionIndex, answer, responseTime } = await request.json();

    if (!userId || typeof questionIndex !== 'number' || typeof answer !== 'number' || typeof responseTime !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: userId, questionIndex, answer, responseTime' },
        { status: 400 }
      );
    }

    // Use a transaction to ensure data consistency
    const result = await runTransaction(db, async (transaction) => {
      const roomRef = doc(db, 'quiz-rooms', roomCode);
      const roomSnap = await transaction.get(roomRef);

      if (!roomSnap.exists()) {
        throw new Error('Room not found');
      }

      const room = roomSnap.data();

      if (room.status !== 'active') {
        throw new Error('Quiz is not active');
      }

      // Find the participant
      const participantIndex = room.participants.findIndex((p: any) => p.userId === userId);
      if (participantIndex === -1) {
        throw new Error('Participant not found');
      }

      const participant = room.participants[participantIndex];
      
      // Check if this is the next expected question for this participant
      if (questionIndex !== participant.currentQuestionIndex) {
        throw new Error('Invalid question index for participant');
      }

      // Get the current question
      const currentQuestion = room.questions[questionIndex];
      if (!currentQuestion) {
        throw new Error('Question not found');
      }

      // Calculate score
      const isCorrect = answer === currentQuestion.correctAnswer;
      const baseScore = isCorrect ? 100 : 0;
      const timeBonus = isCorrect ? Math.max(0, (room.settings.timePerQuestion - responseTime) * 2) : 0;
      const totalScore = baseScore + timeBonus;

      // Update participant's progress immediately to next question
      const updatedParticipants = [...room.participants];
      const isLastQuestion = questionIndex + 1 >= room.questions.length;
      
      const updatedParticipant = {
        ...participant,
        score: participant.score + totalScore,
        correctAnswers: participant.correctAnswers + (isCorrect ? 1 : 0),
        averageResponseTime: participant.averageResponseTime 
          ? ((participant.averageResponseTime * (questionIndex + 1)) + responseTime) / (questionIndex + 2)
          : responseTime,
        currentQuestionIndex: isLastQuestion ? questionIndex : questionIndex + 1, // Move to next question immediately
        isFinished: isLastQuestion,
        lastAnsweredAt: new Date()
      };
      
      updatedParticipants[participantIndex] = updatedParticipant;

      // Record this answer
      const answerKey = `${userId}_${questionIndex}`;
      const updatedParticipantAnswers = {
        ...room.participantAnswers,
        [answerKey]: {
          userId,
          questionIndex,
          answer,
          responseTime,
          isCorrect,
          score: totalScore,
          timestamp: new Date()
        }
      };

      // Check if all participants have finished
      const allFinished = updatedParticipants.every((p: any) => p.isFinished);

      let updateData: any = {
        participants: updatedParticipants,
        participantAnswers: updatedParticipantAnswers
      };

      // If all participants finished, complete the quiz and calculate final results
      if (allFinished) {
        const sortedParticipants = updatedParticipants.sort((a: any, b: any) => {
          // First sort by score (descending)
          if (b.score !== a.score) {
            return b.score - a.score;
          }
          // If scores are equal, sort by average response time (ascending - faster is better)
          return a.averageResponseTime - b.averageResponseTime;
        });

        updateData.status = 'completed';
        updateData.results = {
          leaderboard: sortedParticipants,
          winner: sortedParticipants[0],
          totalPrize: room.prizePool,
          completedAt: new Date()
        };

        // Update the room first with results
        transaction.update(roomRef, updateData);

        // Schedule room deletion after 5 minutes to allow users to see results
        setTimeout(async () => {
          try {
            await deleteDoc(roomRef);
            console.log(`Room ${roomCode} deleted after quiz completion`);
          } catch (error) {
            console.error(`Failed to delete room ${roomCode}:`, error);
          }
        }, 5 * 60 * 1000); // 5 minutes
      } else {
        transaction.update(roomRef, updateData);
      }

      return {
        success: true,
        isCorrect,
        score: totalScore,
        explanation: currentQuestion.explanation,
        correctAnswer: currentQuestion.correctAnswer,
        isFinished: updatedParticipant.isFinished,
        nextQuestionIndex: updatedParticipant.currentQuestionIndex,
        totalQuestions: room.questions.length,
        allFinished,
        participantProgress: {
          currentScore: updatedParticipant.score,
          correctAnswers: updatedParticipant.correctAnswers,
          questionsAnswered: questionIndex + 1
        }
      };
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error submitting answer:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit answer' },
      { status: 500 }
    );
  }
}