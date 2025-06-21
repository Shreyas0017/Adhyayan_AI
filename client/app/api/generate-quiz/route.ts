import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { connectToDatabase } from '@/lib/mongodb';
import crypto from 'crypto';

// Use environment variable for API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  let subject: string | undefined;
  let difficulty: string | undefined;
  let duration: string | undefined;
  let questionCount: number | undefined;
  let userId: string | undefined;

  try {
    const body = await request.json();
    subject = body.subject;
    difficulty = body.difficulty;
    duration = body.duration;
    questionCount = body.questionCount;
    userId = body.userId;

    // Validate inputs
    if (!subject || !difficulty || !duration) {
      return NextResponse.json(
        { error: 'Missing required fields: subject, difficulty, duration' },
        { status: 400 }
      );
    }

    const validDifficulties = ['Easy', 'Medium', 'Hard'];
    if (!validDifficulties.includes(difficulty)) {
      return NextResponse.json(
        { error: 'Invalid difficulty level' },
        { status: 400 }
      );
    }

    const validQuestionCounts = [5, 10, 15, 20, 25];
    if (questionCount === undefined || !validQuestionCounts.includes(questionCount)) {
      return NextResponse.json(
        { error: 'Invalid question count. Must be 5, 10, 15, 20, or 25' },
        { status: 400 }
      );
    }

    console.log(`Generating quiz for: ${subject}, difficulty: ${difficulty}, duration: ${duration}, questions: ${questionCount}`);

    // Get previously generated questions to avoid duplicates
    const previousQuestions = await getPreviousQuestions(subject, difficulty, userId);
    const questionHashes: string[] = previousQuestions.map((q: any) => q.questionHash);

    // Generate unique session ID for this quiz with timestamp for uniqueness
    const sessionId = `${crypto.randomUUID()}_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const randomSeed = Math.floor(Math.random() * 1000000);
    const contextSeed = Math.floor(Math.random() * 10000);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Enhanced prompt with better randomization and variety
    const prompt = `GENERATE COMPLETELY UNIQUE QUIZ QUESTIONS - NEVER REPEAT PATTERNS

CRITICAL UNIQUENESS REQUIREMENTS:
- Session ID: ${sessionId}
- Context Seed: ${contextSeed}
- Random Seed: ${randomSeed}
- Timestamp: ${timestamp}
- Subject: "${subject}"
- Difficulty: "${difficulty}"
- Required Questions: ${questionCount}

ABSOLUTE UNIQUENESS RULES:
1. Every question MUST explore different subtopics within ${subject}
2. Use completely different question structures and formats
3. Vary cognitive levels: knowledge, comprehension, application, analysis, synthesis, evaluation
4. NO repetitive patterns or similar wording
5. Each question should test different skills and concepts
6. Use diverse question types:
   - Definition/Identification questions
   - Scenario-based application questions  
   - Comparison and contrast questions
   - Cause and effect questions
   - Problem-solving questions
   - Analysis and evaluation questions
   - Hypothetical situation questions
   - Best practice questions
   - Troubleshooting questions
   - Conceptual understanding questions

CONTENT VARIETY STRATEGY:
- Question 1: Basic concept identification
- Question 2: Real-world application scenario
- Question 3: Compare/contrast different approaches
- Question 4: Problem diagnosis and solution
- Question 5: Best practice evaluation
- Question 6: Advanced theoretical concept
- Question 7: Practical implementation challenge
- Question 8: Analytical reasoning
- Question 9: Future trends/innovations
- Question 10: Integration with other fields
- Continue this diverse pattern for remaining questions

QUESTION STEM VARIETY (use different beginnings):
- "Which of the following best describes..."
- "In a scenario where..."
- "What would be the most effective approach to..."
- "How does [concept A] differ from [concept B]..."
- "When implementing [process], the key consideration is..."
- "The primary advantage of [method] over [alternative] is..."
- "If you encountered [situation], you should..."
- "What is the relationship between [element 1] and [element 2]..."
- "Which factor most significantly impacts..."
- "The best way to evaluate [concept] is..."

RANDOMIZATION INSTRUCTIONS:
- Use the random seed ${randomSeed} to vary question selection
- Apply context seed ${contextSeed} to modify question complexity
- Incorporate timestamp ${timestamp} for temporal uniqueness
- Each question must be contextually different from any previous questions

FORMAT REQUIREMENTS:
Return ONLY a valid JSON array with exactly ${questionCount} questions:
[
  {
    "question": "Unique question about ${subject}?",
    "options": ["Specific Option A", "Specific Option B", "Specific Option C", "Specific Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation why this is correct",
    "questionHash": "unique-${sessionId}-${contextSeed}-q1"
  }
]

QUALITY CHECKS:
- Each question tests different knowledge areas
- Options are plausible but clearly distinguishable
- Explanations are informative and educational
- Questions progress from basic to advanced concepts
- No two questions have similar structure or content

GENERATE EXACTLY ${questionCount} COMPLETELY UNIQUE AND VARIED QUESTIONS NOW:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Raw AI Response length:', text.length);

    try {
      // Clean and parse JSON response
      let jsonText = text.trim();
      
      // Remove markdown formatting if present
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/```json\n?/, '').replace(/\n?```$/, '');
      }
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```\n?/, '').replace(/\n?```$/, '');
      }

      // Find JSON array boundaries
      const firstBracket = jsonText.indexOf('[');
      const lastBracket = jsonText.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1) {
        jsonText = jsonText.substring(firstBracket, lastBracket + 1);
      }

      const questions = JSON.parse(jsonText);
      
      if (!Array.isArray(questions)) {
        throw new Error('AI response is not an array');
      }

      // Validate and enhance questions with unique identifiers
      const validatedQuestions = questions.slice(0, questionCount).map((q, index) => {
        if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || 
            typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer > 3 ||
            !q.explanation) {
          console.warn(`Question ${index} has invalid structure, using enhanced fallback`);
          return generateEnhancedFallbackQuestion(subject || 'General', difficulty || 'Medium', index, sessionId, contextSeed, previousQuestions);
        }
        
        // Generate unique hash for this question
        const questionHash = crypto.createHash('md5')
          .update(`${q.question}-${q.options.join('-')}-${sessionId}-${contextSeed}-${index}-${randomSeed}`)
          .digest('hex');
        
        return {
          ...q,
          questionHash,
          sessionId,
          contextSeed,
          randomSeed,
          generatedAt: new Date(),
          subject,
          difficulty,
          questionIndex: index
        };
      });

      // Final uniqueness check against previous questions
      const finalQuestions = validatedQuestions.filter(q => 
        !questionHashes.includes(q.questionHash) && 
        !isDuplicateQuestion(q, previousQuestions)
      );

      // If we filtered out duplicates, generate more unique questions
      while (finalQuestions.length < questionCount) {
        const index = finalQuestions.length;
        const newQuestion = generateEnhancedFallbackQuestion(
          subject, 
          difficulty, 
          index, 
          sessionId, 
          contextSeed + index, // Vary context seed
          [...previousQuestions, ...finalQuestions]
        );
        
        if (!isDuplicateQuestion(newQuestion, [...previousQuestions, ...finalQuestions])) {
          finalQuestions.push(newQuestion);
        }
      }

      // Store generated questions to prevent future duplicates
      await storeGeneratedQuestions(finalQuestions, userId);

      console.log(`Successfully generated ${finalQuestions.length} unique questions`);

      return NextResponse.json({
        success: true,
        questions: finalQuestions.slice(0, questionCount),
        subject,
        difficulty,
        duration,
        questionCount: Math.min(finalQuestions.length, questionCount),
        sessionId,
        metadata: {
          randomSeed,
          contextSeed,
          timestamp,
          aiGenerated: true
        }
      });

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Generate enhanced fallback questions with variety
      const fallbackQuestions = generateVariedFallbackQuestions(
        subject, 
        difficulty, 
        questionCount ?? 5, 
        sessionId,
        contextSeed,
        previousQuestions
      );
      
      await storeGeneratedQuestions(fallbackQuestions, userId);
      
      return NextResponse.json({
        success: true,
        questions: fallbackQuestions,
        subject,
        difficulty,
        duration,
        questionCount: fallbackQuestions.length,
        fallback: true,
        sessionId,
        metadata: {
          randomSeed,
          contextSeed,
          timestamp,
          aiGenerated: false
        }
      });
    }

  } catch (error) {
    console.error('Error generating quiz:', error);
    
    const sessionId = `fallback_${crypto.randomUUID()}_${Date.now()}`;
    const contextSeed = Math.floor(Math.random() * 10000);
    const fallbackQuestions = generateVariedFallbackQuestions(
      subject || 'General', 
      difficulty || 'Medium', 
      questionCount ?? 5, 
      sessionId,
      contextSeed,
      []
    );
    
    return NextResponse.json({
      success: true,
      questions: fallbackQuestions,
      subject: subject || 'General',
      difficulty: difficulty || 'Medium',
      duration: duration || '15',
      questionCount: fallbackQuestions.length,
      fallback: true,
      error: 'AI service unavailable, using varied fallback questions',
      sessionId
    });
  }
}

// Enhanced fallback question generator with real variety
function generateEnhancedFallbackQuestion(
  subject: string, 
  difficulty: string, 
  index: number, 
  sessionId: string, 
  contextSeed: number,
  previousQuestions: any[]
): any {
  // Define varied question templates based on different cognitive levels
  const questionTemplates = [
    // Knowledge Level
    {
      template: `What is the fundamental principle behind {concept} in ${subject}?`,
      options: [
        `It establishes the foundational understanding needed for {concept}`,
        `It has no relevance to practical applications`,
        `It contradicts established theories in the field`,
        `It only applies to theoretical scenarios`
      ],
      explanation: `Understanding the fundamental principle of {concept} is essential in ${subject}.`
    },
    // Comprehension Level
    {
      template: `How would you explain the relationship between {concept1} and {concept2} in ${subject}?`,
      options: [
        `They work together to enhance overall understanding and application`,
        `They are completely unrelated concepts`,
        `One always contradicts the other`,
        `They can never be used simultaneously`
      ],
      explanation: `{concept1} and {concept2} complement each other in ${subject} applications.`
    },
    // Application Level
    {
      template: `In which scenario would you most effectively apply {concept} principles in ${subject}?`,
      options: [
        `When systematic analysis and structured implementation are required`,
        `Only in theoretical discussions without practical outcomes`,
        `When avoiding established methodologies`,
        `In situations where precision is not important`
      ],
      explanation: `{concept} principles are most effective when applied systematically in ${subject}.`
    },
    // Analysis Level
    {
      template: `What factors should be considered when analyzing {concept} effectiveness in ${subject}?`,
      options: [
        `Performance metrics, context suitability, and long-term sustainability`,
        `Only immediate results without considering consequences`,
        `Personal preferences over objective criteria`,
        `Random selection without systematic evaluation`
      ],
      explanation: `Effective analysis of {concept} requires considering multiple objective factors.`
    },
    // Synthesis Level
    {
      template: `How can different {concept} approaches be integrated to create innovative solutions in ${subject}?`,
      options: [
        `By combining complementary strengths while addressing individual limitations`,
        `By using only traditional methods without innovation`,
        `By avoiding any integration of different approaches`,
        `By randomly mixing approaches without consideration`
      ],
      explanation: `Integration of different approaches leverages their strengths for better outcomes.`
    },
    // Evaluation Level
    {
      template: `What criteria would you use to evaluate the success of {concept} implementation in ${subject}?`,
      options: [
        `Measurable outcomes, stakeholder satisfaction, and long-term impact`,
        `Only subjective opinions without objective measures`,
        `Single metrics without comprehensive assessment`,
        `No evaluation criteria needed`
      ],
      explanation: `Comprehensive evaluation requires multiple criteria to assess true success.`
    }
  ];

  // Generate dynamic concepts based on subject and index
  const concepts = generateDynamicConcepts(subject, index, contextSeed);
  
  // Select template based on index and context seed for variety
  const templateIndex = (index + contextSeed) % questionTemplates.length;
  const selectedTemplate = questionTemplates[templateIndex];
  
  // Replace placeholders with dynamic concepts
  const question = selectedTemplate.template
    .replace(/{concept1}/g, concepts.concept1)
    .replace(/{concept2}/g, concepts.concept2)
    .replace(/{concept}/g, concepts.primary);
  
  const options = selectedTemplate.options.map(option =>
    option
      .replace(/{concept1}/g, concepts.concept1)
      .replace(/{concept2}/g, concepts.concept2)
      .replace(/{concept}/g, concepts.primary)
  );
  
  const explanation = selectedTemplate.explanation
    .replace(/{concept1}/g, concepts.concept1)
    .replace(/{concept2}/g, concepts.concept2)
    .replace(/{concept}/g, concepts.primary);

  const questionHash = crypto.createHash('md5')
    .update(`${question}-${options.join('-')}-${sessionId}-${contextSeed}-${index}-enhanced`)
    .digest('hex');

  return {
    question,
    options,
    correctAnswer: 0,
    explanation,
    questionHash,
    sessionId,
    contextSeed,
    generatedAt: new Date(),
    subject,
    difficulty,
    questionIndex: index,
    isEnhancedFallback: true
  };
}

// Generate dynamic concepts based on subject
function generateDynamicConcepts(subject: string, index: number, contextSeed: number) {
  const subjectConcepts: { [key: string]: string[] } = {
    'Science': ['methodology', 'hypothesis', 'experimentation', 'analysis', 'theory', 'observation', 'research', 'validation'],
    'Mathematics': ['algorithm', 'calculation', 'proof', 'theorem', 'function', 'equation', 'formula', 'logic'],
    'Technology': ['innovation', 'implementation', 'optimization', 'integration', 'automation', 'efficiency', 'security', 'scalability'],
    'Business': ['strategy', 'management', 'leadership', 'planning', 'execution', 'analysis', 'optimization', 'growth'],
    'History': ['analysis', 'interpretation', 'evidence', 'context', 'chronology', 'causation', 'significance', 'perspective'],
    'Literature': ['analysis', 'interpretation', 'theme', 'narrative', 'style', 'context', 'symbolism', 'structure'],
    'Default': ['concept', 'principle', 'methodology', 'approach', 'strategy', 'technique', 'process', 'system']
  };

  const concepts = subjectConcepts[subject] || subjectConcepts['Default'];
  const primaryIndex = (index + contextSeed) % concepts.length;
  const secondaryIndex = (index + contextSeed + 1) % concepts.length;
  const tertiaryIndex = (index + contextSeed + 2) % concepts.length;

  return {
    primary: concepts[primaryIndex],
    concept1: concepts[secondaryIndex],
    concept2: concepts[tertiaryIndex]
  };
}

// Generate completely varied fallback questions
function generateVariedFallbackQuestions(
  subject: string, 
  difficulty: string, 
  questionCount: number, 
  sessionId: string,
  contextSeed: number,
  previousQuestions: any[] = []
): any[] {
  const questions = [];
  
  for (let i = 0; i < questionCount; i++) {
    const question = generateEnhancedFallbackQuestion(
      subject, 
      difficulty, 
      i, 
      sessionId, 
      contextSeed + i, // Vary context seed for each question
      [...previousQuestions, ...questions]
    );
    
    questions.push(question);
  }

  return questions;
}

// Helper function to get previously generated questions
async function getPreviousQuestions(subject: string, difficulty: string, userId?: string) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('generatedQuestions');
    
    const query: any = { subject, difficulty };
    if (userId) {
      query.userId = userId;
    }
    
    const questions = await collection
      .find(query)
      .sort({ generatedAt: -1 })
      .limit(50) // Reduced limit for better performance
      .toArray();
    
    return questions;
  } catch (error) {
    console.error('Error fetching previous questions:', error);
    return [];
  }
}

// Helper function to store generated questions
async function storeGeneratedQuestions(questions: any[], userId?: string) {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection('generatedQuestions');
    
    const questionsToStore = questions.map(q => ({
      ...q,
      userId: userId || 'anonymous',
      storedAt: new Date()
    }));
    
    await collection.insertMany(questionsToStore);
    console.log(`Stored ${questionsToStore.length} questions to prevent duplicates`);
  } catch (error) {
    console.error('Error storing questions:', error);
  }
}

// Enhanced duplicate detection
function isDuplicateQuestion(newQuestion: any, existingQuestions: any[]) {
  return existingQuestions.some(existing => {
    // Check for similar question text
    const similarity = calculateSimilarity(newQuestion.question, existing.question);
    if (similarity > 0.7) return true; // 70% similarity threshold
    
    // Check for similar option patterns
    const optionSimilarity = calculateOptionSimilarity(newQuestion.options, existing.options);
    if (optionSimilarity > 0.8) return true; // 80% option similarity threshold
    
    return false;
  });
}

// Enhanced similarity calculation
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

// Calculate option similarity
function calculateOptionSimilarity(options1: string[], options2: string[]): number {
  if (!options1 || !options2 || options1.length !== options2.length) return 0;
  
  let totalSimilarity = 0;
  for (let i = 0; i < options1.length; i++) {
    totalSimilarity += calculateSimilarity(options1[i], options2[i]);
  }
  
  return totalSimilarity / options1.length;
}

// Levenshtein distance calculation
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  return matrix[str2.length][str1.length];
}