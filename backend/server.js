require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Anthropic } = require('@anthropic-ai/sdk');
const { Translate } = require('@google-cloud/translate').v2;
const { pinyin, STYLE_TONE } = require('pinyin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Keys from environment variables
const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Initialize Google Translate client
const translate = new Translate({
  key: GOOGLE_TRANSLATE_API_KEY,
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: CLAUDE_API_KEY,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;

    // Validation
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!targetLanguage || !['EN', 'ZH'].includes(targetLanguage)) {
      return res.status(400).json({ error: 'Valid targetLanguage (EN or ZH) is required' });
    }

    if (!GOOGLE_TRANSLATE_API_KEY) {
      console.error('GOOGLE_TRANSLATE_API_KEY is not set');
      return res.status(500).json({ error: 'Translation service not configured' });
    }

    console.log(`Translating to ${targetLanguage}: ${text}`);

    // Map our language codes to Google Translate codes
    const languageMap = {
      'EN': 'en',
      'ZH': 'zh',
    };

    const [translatedText] = await translate.translate(text.trim(), languageMap[targetLanguage]);
    console.log(`Translation result: ${translatedText}`);

    res.json({
      translatedText,
      originalText: text,
      targetLanguage,
    });
  } catch (error) {
    console.error('Translation error:', error.message);
    res.status(500).json({
      error: 'Translation failed',
      details: error.message,
    });
  }
});

// Pinyin endpoint
app.post('/api/pinyin', (req, res) => {
  try {
    const { chinese } = req.body;

    // Validation
    if (!chinese || !chinese.trim()) {
      return res.status(400).json({ error: 'Chinese text is required' });
    }

    console.log(`Generating pinyin for: ${chinese}`);

    // Convert Chinese to pinyin with tone marks
    const pinyinResult = pinyin(chinese.trim(), {
      style: STYLE_TONE,
      heteronym: false,
    });

    // Join all pinyin syllables with spaces
    const pinyinString = pinyinResult.map(char => char[0]).join(' ');

    console.log(`Pinyin result: ${pinyinString}`);

    res.json({
      chinese: chinese.trim(),
      pinyin: pinyinString,
      pinyinArray: pinyinResult.map(char => char[0]),
    });
  } catch (error) {
    console.error('Pinyin error:', error.message);
    res.status(500).json({
      error: 'Pinyin generation failed',
      details: error.message,
    });
  }
});

// Etymology endpoint
app.post('/api/etymology', async (req, res) => {
  try {
    const { chinese } = req.body;

    // Validation
    if (!chinese || !chinese.trim()) {
      return res.status(400).json({ error: 'Chinese text is required' });
    }

    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is not set');
      return res.status(500).json({ error: 'Etymology service not configured' });
    }

    console.log(`Generating etymology for: ${chinese}`);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Analyze the Chinese character(s) or word: "${chinese}"

Extract the character components and explain what each component represents. Then provide the overall meaning.

Respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{
  "components": [
    {
      "character": "单字",
      "meaning": "short meaning",
      "explanation": "explanation of what this character/component represents and its significance"
    }
  ],
  "fullMeaning": "overall meaning and usage of the complete word"
}

If this is a single character, break it down into its radical and stroke components if possible.
If this is a multi-character word, break it down by individual characters.
Be concise but informative.`,
        },
      ],
    });

    const content = message.content[0];

    if (content.type === 'text') {
      try {
        // Parse the JSON response
        const etymologyData = JSON.parse(content.text);

        // Validate structure
        if (!etymologyData.components || !Array.isArray(etymologyData.components)) {
          throw new Error('Invalid response structure');
        }

        console.log(`Etymology generated successfully for: ${chinese}`);

        res.json(etymologyData);
      } catch (parseError) {
        console.error('Failed to parse etymology response:', parseError);
        res.status(500).json({
          error: 'Failed to parse etymology response',
          rawResponse: content.text,
        });
      }
    } else {
      res.status(500).json({ error: 'Invalid response type from AI model' });
    }
  } catch (error) {
    console.error('Etymology error:', error.message);
    res.status(500).json({
      error: 'Etymology generation failed',
      details: error.message,
    });
  }
});

// Part of Speech Detection endpoint
app.post('/api/pos-detection', async (req, res) => {
  try {
    const { chinese, english } = req.body;

    // Validation
    if (!chinese || !chinese.trim()) {
      return res.status(400).json({ error: 'Chinese text is required' });
    }

    if (!CLAUDE_API_KEY) {
      console.error('CLAUDE_API_KEY is not set');
      return res.status(500).json({ error: 'POS detection service not configured' });
    }

    console.log(`Detecting POS for: ${chinese} (${english})`);

    const message = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Determine the part of speech for the Chinese word: "${chinese}" (English: ${english || 'unknown'})

You must respond with ONLY ONE of these exact options, nothing else:
- 动词 (verb)
- 形容词 (adjective)
- 名词 (noun)
- 量词 (classifier/measure word)
- 副词 (adverb)
- 代词 (pronoun)
- 其他 (other - for idioms, expressions, etc.)`,
        },
      ],
    });

    const content = message.content[0];

    if (content.type === 'text') {
      const posText = content.text.trim();

      // Validate and extract the POS
      const validPOS = ['动词', '形容词', '名词', '量词', '副词', '代词', '其他'];
      const detectedPOS = validPOS.find(pos => posText.includes(pos));

      if (!detectedPOS) {
        console.error('Invalid POS response:', posText);
        return res.status(500).json({
          error: 'Failed to parse POS response',
          rawResponse: posText,
        });
      }

      console.log(`POS detected: ${detectedPOS} for ${chinese}`);

      res.json({
        chinese,
        english: english || '',
        partOfSpeech: detectedPOS,
      });
    } else {
      res.status(500).json({ error: 'Invalid response type from AI model' });
    }
  } catch (error) {
    console.error('POS detection error:', error.message);
    res.status(500).json({
      error: 'POS detection failed',
      details: error.message,
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Wrdbnk Backend Server running on port ${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Translation: POST http://localhost:${PORT}/api/translate`);
  console.log(`📚 Etymology: POST http://localhost:${PORT}/api/etymology`);
  console.log(`🏷️  POS Detection: POST http://localhost:${PORT}/api/pos-detection\n`);
});
