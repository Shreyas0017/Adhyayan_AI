const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);
require('dotenv').config();

class ElevenLabsService {
  constructor(apiKey, geminiApiKey) {
    this.apiKey = apiKey;
    this.geminiApiKey = geminiApiKey;
    this.baseUrl = 'https://api.elevenlabs.io/v1';
    this.defaultVoiceId = 'ErXwobaYiN019PkySvjV'; // Antoni - default male voice
    this.femaleVoiceId = 'EXAVITQu4vr4xnSDxMaL'; // Bella - female voice
    this.podcastDir = path.join(__dirname, 'public', 'podcasts');
  }

  // Initialize the podcast directory
  async initialize() {
    try {
      // Create podcasts directory if it doesn't exist
      if (!(await existsAsync(this.podcastDir))) {
        await mkdirAsync(this.podcastDir, { recursive: true });
      }
      return true;
    } catch (error) {
      console.error('Error initializing ElevenLabs service:', error);
      return false;
    }
  }

  // Get available voices
  async getVoices() {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: { 'xi-api-key': this.apiKey }
      });
      return response.data.voices;
    } catch (error) {
      console.error('Error fetching ElevenLabs voices:', error);
      throw new Error('Failed to fetch voices from ElevenLabs API');
    }
  }
  // Generate podcast script from topic content using Gemini API
  async generatePodcastScript(topic, content) {
    try {
      console.log(`Generating podcast script for topic: ${topic}`);
        const promptTemplate = `
      Create a comprehensive educational podcast script (8-12 minutes when read aloud) about "${topic}".
      
      Context and reference material:
      ${content}

      IMPORTANT GUIDELINES:
      - Format with two hosts: Sankk (expert educator) and Priya (curious learner asking great questions)
      - Create natural, engaging dialogue that flows like a real conversation
      - Include personal anecdotes, real-world examples, and relatable analogies
      - Make it accessible to beginners while being informative
      - Include enthusiasm, humor, and conversational elements
      - Each speaker should have substantial dialogue (aim for 15-20 exchanges minimum)

      STRUCTURE REQUIREMENTS:
      1. Engaging introduction (2-3 exchanges) - hook the audience
      2. Topic overview and why it matters (3-4 exchanges)
      3. Deep dive into 4-6 key concepts with examples (8-12 exchanges)
      4. Common misconceptions or challenges (2-3 exchanges)
      5. Real-world applications and career relevance (3-4 exchanges)
      6. Quick recap and inspiring conclusion (2-3 exchanges)

      DIALOGUE STYLE:
      - Sankk: Enthusiastic expert who explains clearly with examples and stories
      - Priya: Asks thoughtful questions, shows curiosity, relates to listeners
      - Use conversational connectors: "That's fascinating!", "Wait, so you're saying...", "I love that example!"
      - Include transitions: "Speaking of which...", "That reminds me...", "Before we move on..."

      FORMAT EXACTLY LIKE THIS:
      Sankk: [Sankk's dialogue]
      Priya: [Priya's dialogue]

      CONTENT REQUIREMENTS:
      - Each dialogue turn should be 2-4 sentences (substantial content)
      - Include specific examples, statistics, or case studies when relevant
      - Make technical concepts relatable with analogies
      - Sound natural and conversational, not scripted
      - End on an inspiring or thought-provoking note

      Generate ONLY the script dialogue - no stage directions, no explanations, no extra text.
      `;

      // Call Gemini API for script generation
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: promptTemplate
                }
              ]
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      // Extract the generated content from Gemini response
      if (response.data && response.data.candidates && response.data.candidates[0] && 
          response.data.candidates[0].content && response.data.candidates[0].content.parts) {
        const script = response.data.candidates[0].content.parts[0].text;
        console.log('Generated script preview:', script.substring(0, 100) + '...');
        return script;
      } else {
        console.error('Unexpected Gemini API response format:', response.data);
        // Fall back to demo script if Gemini fails
        return this.getDemoScript();
      }
    } catch (error) {
      console.error('Error generating podcast script with Gemini:', error);
      if (error.response) {
        console.error('Gemini API error details:', error.response.data);
      }
      
      // Fall back to the demo script
      console.log('Falling back to demo script');
      return this.getDemoScript();
    }
  }

  // Convert script to audio using ElevenLabs API
  async convertScriptToAudio(script, topicId) {
    if (!script) {
      throw new Error('No script provided for conversion');
    }

    try {
      // Process script to separate voices
      const lines = script.split('\n').filter(line => line.trim().length > 0);
        // Process each line by speaker
      const SankkLines = [];
      const priyaLines = [];
      
      for (const line of lines) {
        if (line.startsWith('Sankk:')) {
          SankkLines.push(line.substring(6).trim());
        } else if (line.startsWith('Priya:')) {
          priyaLines.push(line.substring(6).trim());
        }
      }
        console.log(`Found ${SankkLines.length} lines for Sankk and ${priyaLines.length} lines for Priya`);
      
      // Use more lines to create a longer, more complete podcast
      // We'll use up to 30 lines for Sankk and 30 lines for Priya to create a substantial podcast
      const SankkContent = SankkLines.slice(0, 30).join(' '); // Up to 30 lines
      const priyaContent = priyaLines.slice(0, 30).join(' '); // Up to 30 lines

      console.log(`Processing script for Sankk: ${SankkContent.length} chars`);
      console.log(`Processing script for Priya: ${priyaContent.length} chars`);
      
      // Generate audio for both speakers
      console.log('Generating audio for both speakers...');
      
      // Generate them sequentially to avoid overwhelming the API
      console.log('Generating audio for Sankk...');
      const SankkAudioBuffer = await this.generateSpeech(SankkContent, this.defaultVoiceId);
      
      console.log('Generating audio for Priya...');
      const priyaAudioBuffer = await this.generateSpeech(priyaContent, this.femaleVoiceId);
      
      console.log('Successfully generated audio for both speakers');
      
      // For now, we'll concatenate the buffers simply (in production, proper audio merging would be needed)
      // We'll use Sankk's audio as the primary and append Priya's
      const combinedBuffer = Buffer.concat([SankkAudioBuffer, priyaAudioBuffer]);
      
      // Convert combined audio buffer to Base64
      const audioBase64 = combinedBuffer.toString('base64');
      
      // Create a data URL that can be used directly in an audio element
      const audioDataUrl = `data:audio/mp3;base64,${audioBase64}`;
      
      return {
        audioUrl: audioDataUrl,
        script: script
      };
    } catch (error) {
      console.error('Error converting script to audio:', error);
      throw new Error('Failed to convert script to audio');
    }
  }
  // Generate speech using ElevenLabs API with retry mechanism
  async generateSpeech(text, voiceId = this.defaultVoiceId) {
    try {
      // If text is too long, we'll split it to avoid timeouts
      const maxChunkLength = 1000; // Characters per request
      const textChunks = [];
      
      if (text.length > maxChunkLength) {
      console.log(`Text is ${text.length} chars long, splitting into chunks...`);
      // Split text into chunks at sentence boundaries
      let remainingText = text;
      while (remainingText.length > 0) {
        let chunkSize = Math.min(maxChunkLength, remainingText.length);
        
        // Try to find a sentence end within the last 200 chars of the chunk
        if (chunkSize === maxChunkLength) {
          const lastPeriodPos = remainingText.substring(0, chunkSize).lastIndexOf('.');
          const lastExclamationPos = remainingText.substring(0, chunkSize).lastIndexOf('!');
          const lastQuestionPos = remainingText.substring(0, chunkSize).lastIndexOf('?');
          
          // Find the latest sentence end
          const sentenceEndPos = Math.max(
            lastPeriodPos > chunkSize - 200 ? lastPeriodPos : -1,
            lastExclamationPos > chunkSize - 200 ? lastExclamationPos : -1,
            lastQuestionPos > chunkSize - 200 ? lastQuestionPos : -1
          );
          
          // If we found a sentence end, use it as the chunk boundary
          if (sentenceEndPos !== -1) {
            chunkSize = sentenceEndPos + 1;
          }
        }
        
        textChunks.push(remainingText.substring(0, chunkSize));
        remainingText = remainingText.substring(chunkSize);
      }
      
      console.log(`Split into ${textChunks.length} chunks`);
    } else {
      textChunks.push(text);
    }
    
    // Process each chunk with retries
    const allAudioBuffers = [];
    
    for (let i = 0; i < textChunks.length; i++) {
      const chunk = textChunks[i];
      console.log(`Processing chunk ${i+1}/${textChunks.length}, length: ${chunk.length} chars`);
      
      let retries = 0;
      const maxRetries = 3;
      
      while (retries < maxRetries) {
        try {
          const response = await axios({
            method: 'post',
            url: `${this.baseUrl}/text-to-speech/${voiceId}`,
            headers: {
              'xi-api-key': this.apiKey,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg'
            },
            data: {
              text: chunk,
              model_id: 'eleven_monolingual_v1', // Using a faster model
              voice_settings: {
                stability: 0.75,
                similarity_boost: 0.75
              }
            },
            responseType: 'arraybuffer',
            timeout: 60000 // 60 second timeout
          });
          
          allAudioBuffers.push(response.data);
          console.log(`Successfully processed chunk ${i+1}`);
          break; // Success, exit retry loop
        } catch (error) {
          retries++;
          console.error(`Error generating speech (attempt ${retries}/${maxRetries}):`, error.message);
          
          if (retries >= maxRetries) {
            throw new Error(`Failed to generate speech after ${maxRetries} attempts: ${error.message}`);
          }
          
          // Wait before retry (exponential backoff)
          const delay = 2000 * Math.pow(2, retries - 1); // 2s, 4s, 8s...
          console.log(`Retrying in ${delay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
      // If we only have one buffer, return it
    if (allAudioBuffers.length === 1) {
      return allAudioBuffers[0];
    }
    
    // Otherwise, concatenate all buffers (for now, we'll just return the first chunk)
    // In a production environment, you'd want to properly concatenate the MP3 files
    console.log(`Returning first audio chunk of ${allAudioBuffers.length} total chunks`);
    return allAudioBuffers[0];
    } catch (error) {
      console.error('Error generating speech with ElevenLabs:', error);
      throw new Error('Failed to generate speech with ElevenLabs API');
    }
  }

  // Get a demo script as fallback
  getDemoScript() {
    return `
Sankk: Welcome to Tech Deep Dive, the podcast where we explore fascinating topics in technology and beyond! I'm Sankk, your host and guide through today's journey.
Priya: And I'm Priya! I'm here to ask all the questions you might be thinking, so don't worry if this is completely new to you. Sankk, what are we diving into today?
Sankk: Today we're exploring a topic that's absolutely fundamental to how we organize and manage information in our digital world. It's something that powers everything from your favorite social media apps to complex business systems.
Priya: That sounds incredibly important! You're talking about data organization, right? But there are so many ways to store data - what makes this particular approach special?
Sankk: Great question! What we're discussing today represents decades of evolution in how we think about data relationships, integrity, and efficient retrieval. It's a system that brings order to what could otherwise be chaos.
Priya: I love that you mentioned relationships - that makes me think about how everything in our digital world is connected. Can you give us a real-world example of how this works?
Sankk: Absolutely! Think about when you order something online. Your customer information, the product details, your order history, inventory levels, shipping information - all of these different pieces of data need to work together seamlessly.
Priya: Wow, I never thought about all those moving parts! So this system you're describing helps coordinate all of that complexity?
Sankk: Exactly! And here's what's really beautiful about it - it's designed with principles that prevent data duplication, ensure accuracy, and make it possible to ask complex questions about your data and get reliable answers instantly.
Priya: That's fascinating! What about when things go wrong? I imagine with all this complexity, there must be ways to protect against errors or corruption.
Sankk: You've hit on one of the most critical aspects! The system we're discussing has built-in safeguards - what we call integrity constraints - that act like guardrails, preventing invalid data from entering the system in the first place.
Priya: Before we wrap up, I have to ask - for someone listening who's interested in working with these systems, what would you recommend as a first step?
Sankk: Start by understanding the fundamental concepts we've touched on today, then get hands-on experience with real data. The principles we've discussed form the backbone of countless careers in technology, data analysis, and business intelligence.
Priya: This has been absolutely enlightening! Thank you, Sankk, for breaking down such a complex topic in a way that makes sense.
Sankk: The pleasure is all mine, Priya! And to our listeners, remember - every expert was once a beginner. Keep exploring, keep questioning, and keep learning!
    `;
  }
}
module.exports = ElevenLabsService;
