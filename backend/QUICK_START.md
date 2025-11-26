# Quick Start Guide - Backend Server

Get the Wrdbnk backend running in 3 steps!

## Step 1: Install Dependencies

Open terminal in the `backend` directory and run:

```bash
npm install
```

This will install all required packages:
- Express.js (web framework)
- CORS (cross-origin support for mobile app)
- Dotenv (environment variable management)
- Axios (HTTP client for DeepL)
- Anthropic SDK (Claude AI)

## Step 2: Start the Server

Run the development server:

```bash
npm run dev
```

Or for production:

```bash
npm start
```

You should see output like:
```
🚀 Wrdbnk Backend Server running on port 3000
📝 Health check: http://localhost:3000/health
🌐 Translation: POST http://localhost:3000/api/translate
📚 Etymology: POST http://localhost:3000/api/etymology
```

## Step 3: Test the Server

Open a new terminal and test the endpoints:

### Test 1: Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{ "status": "Server is running" }
```

### Test 2: Translation
```bash
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"你好","targetLanguage":"EN"}'
```

Expected response:
```json
{
  "translatedText": "Hello",
  "originalText": "你好",
  "targetLanguage": "EN"
}
```

### Test 3: Etymology
```bash
curl -X POST http://localhost:3000/api/etymology \
  -H "Content-Type: application/json" \
  -d '{"chinese":"生"}'
```

Expected response with character components and meanings.

## Connecting Your Mobile App

### For Local Development (Mac)

1. Find your local IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   You'll see something like: `inet 192.168.x.x`

2. Update the API URLs in:
   - `/utils/deepl.ts`
   - `/utils/etymology.ts`

   Change from:
   ```javascript
   fetch('http://localhost:3000/api/translate', {
   ```

   To:
   ```javascript
   fetch('http://192.168.x.x:3000/api/translate', {
   ```

3. Make sure your phone is on the same WiFi network as your Mac

4. Run the mobile app - it should now communicate with the backend!

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, change it in `.env`:
```
PORT=3001
```

### API Key Not Working
1. Verify keys in `.env` file
2. Restart the server: `Ctrl+C` then `npm run dev`
3. Check console logs for error messages

### Mobile App Can't Connect
1. Verify both devices are on same WiFi
2. Check your IP address is correct
3. Test with curl first to confirm server works
4. Check firewall settings

### Translation Returns Error
- Ensure `DEEPL_API_KEY` is correct
- Verify API key format
- Check internet connection

### Etymology Takes Too Long
- First request is slower (Claude model loading)
- Subsequent requests are faster
- Normal response time: 1-2 seconds

## Next Steps

✅ Server is running
✅ Tests passing

Now:
1. Update mobile app API URLs with your local IP
2. Run the mobile app
3. Add a word and test real-time translation + etymology!

## Production Deployment

When ready to deploy:
1. Choose a hosting service (Heroku, AWS, Google Cloud, etc.)
2. Update API URLs in mobile app to your production domain
3. Configure HTTPS/SSL
4. Set environment variables on production server
5. Monitor server logs and performance

See `README.md` for detailed production setup.
