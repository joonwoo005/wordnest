# Wrdbnk Backend Server

Backend API server for the Wrdbnk Chinese vocabulary learning app. Provides secure endpoints for real-time translation and AI-powered etymology generation.

## Features

- ✅ Real-time translation using DeepL API
- ✅ Etymology generation using Claude 3 Haiku AI
- ✅ CORS enabled for mobile app access
- ✅ Input validation and error handling
- ✅ Detailed logging for debugging

## Prerequisites

- Node.js 14+ installed
- DeepL API key
- Claude API key (Anthropic)

## Installation

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Environment Configuration**

   The `.env` file is already configured with your API keys. If you need to update them:

   ```bash
   # Edit .env file
   DEEPL_API_KEY=your_key_here
   CLAUDE_API_KEY=your_key_here
   PORT=3000
   ```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /health
```
Returns server status.

**Response:**
```json
{ "status": "Server is running" }
```

### Translation Endpoint
```
POST /api/translate
```

**Request:**
```json
{
  "text": "你好",
  "targetLanguage": "EN"
}
```

**Response:**
```json
{
  "translatedText": "Hello",
  "originalText": "你好",
  "targetLanguage": "EN"
}
```

**Parameters:**
- `text` (string, required): Text to translate
- `targetLanguage` (string, required): Target language ("EN" or "ZH")

### Etymology Endpoint
```
POST /api/etymology
```

**Request:**
```json
{
  "chinese": "生"
}
```

**Response:**
```json
{
  "components": [
    {
      "character": "生",
      "meaning": "to live, life",
      "explanation": "The character depicts a sprout growing from the earth, representing life and growth"
    }
  ],
  "fullMeaning": "Life, birth, living things, to produce"
}
```

**Parameters:**
- `chinese` (string, required): Chinese character(s) to analyze

## Testing with cURL

### Test Translation
```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"你好","targetLanguage":"EN"}'
```

### Test Etymology
```bash
curl -X POST http://localhost:3000/api/etymology \
  -H "Content-Type: application/json" \
  -d '{"chinese":"生"}'
```

### Test Health Check
```bash
curl http://localhost:3000/health
```

## Mobile App Configuration

To connect the mobile app to this backend:

### Local Development (Same Machine)
Update the API URLs in `/utils/deepl.ts` and `/utils/etymology.ts`:
```javascript
const response = await fetch('http://localhost:3000/api/translate', {
  // ...
});
```

### Local Development (Different Machine)
Get your machine's local IP:
```bash
# macOS/Linux
ifconfig | grep "inet "

# Windows
ipconfig
```

Update URLs to use your IP (e.g., `http://192.168.x.x:3000`)

### Production Deployment
1. Deploy to a cloud service (Heroku, AWS, Google Cloud, etc.)
2. Update the mobile app URLs to use your production domain
3. Use HTTPS for secure communication

## Environment Variables

```
PORT                 - Server port (default: 3000)
DEEPL_API_KEY       - DeepL API key for translations
CLAUDE_API_KEY      - Anthropic Claude API key for etymology
```

## Error Handling

The server provides detailed error responses:

```json
{
  "error": "Error message",
  "details": "Additional details if available"
}
```

## Logging

The server logs important events to the console:
- Server startup information
- API requests and responses
- Errors and exceptions

Example logs:
```
🚀 Wrdbnk Backend Server running on port 3000
📝 Health check: http://localhost:3000/health
Translating to EN: 你好
Translation result: Hello
```

## Troubleshooting

### DeepL Translation Fails
- Check if `DEEPL_API_KEY` is correct in `.env`
- Verify the API key format: `xxxx-xxxx-xxxx-xxxx:fx`
- Ensure the text is not empty

### Etymology Generation is Slow
- Claude Haiku typically responds in 1-2 seconds
- First request may take longer due to model initialization
- Consider implementing client-side timeout handling

### CORS Errors
- Verify CORS is enabled in `server.js`
- Check the origin of the request matches allowed origins
- In production, consider restricting CORS to specific domains

### API Keys Not Found
- Verify `.env` file exists in the `/backend` directory
- Check file permissions
- Restart the server after updating `.env`

## Production Checklist

- [ ] Update API keys in production environment
- [ ] Change to production mode
- [ ] Configure CORS for your production domain
- [ ] Set up HTTPS/SSL certificate
- [ ] Configure rate limiting
- [ ] Set up logging/monitoring
- [ ] Add authentication if needed
- [ ] Configure database backups
- [ ] Set up uptime monitoring

## Support

For issues or questions:
1. Check the logs: `npm run dev` shows detailed debugging info
2. Test endpoints with cURL before trying from the mobile app
3. Verify API keys are valid
4. Check network connectivity

## License

ISC
