# Complete Setup Guide - Wrdbnk with Backend

Everything you need to get the enhanced Add Words screen working with real-time translation and AI etymology!

## 📋 What Was Created

### Frontend (React Native)
- ✅ Enhanced Add Word screen with UI from your sketch
- ✅ Real-time translation using DeepL
- ✅ AI-powered etymology generation using Claude
- ✅ Required field indicator (*)
- ✅ Loading indicators for async operations
- ✅ Etymology display with component breakdown

### Backend (Node.js/Express)
- ✅ Translation endpoint (`/api/translate`)
- ✅ Etymology generation endpoint (`/api/etymology`)
- ✅ Error handling and validation
- ✅ CORS enabled for mobile app
- ✅ Secure API key management

## 🚀 Getting Started - 3 Simple Steps

### Step 1: Start the Backend Server

Open a terminal and navigate to the backend directory:

```bash
cd /Users/jwtoh/Documents/AppDevelopment/wrdbnk/backend
```

Install dependencies:
```bash
npm install
```

Start the server:
```bash
npm run dev
```

You should see:
```
🚀 Wrdbnk Backend Server running on port 3000
📝 Health check: http://localhost:3000/health
🌐 Translation: POST http://localhost:3000/api/translate
📚 Etymology: POST http://localhost:3000/api/etymology
```

### Step 2: Update Mobile App Backend URL

The mobile app needs to know where the backend is running.

**Option A: For Local Development (Recommended)**

1. Find your Mac's local IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   You'll see something like: `inet 192.168.x.x`

2. Create a `.env` file in the mobile app root directory:
   ```bash
   touch /Users/jwtoh/Documents/AppDevelopment/wrdbnk/.env
   ```

3. Add your backend URL:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:3000
   ```

**Option B: For Simulator (If on Same Mac)**
```
EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
```

### Step 3: Test Everything

Open another terminal and test the backend:

```bash
# Health check
curl http://localhost:3000/health

# Translation test
curl -X POST http://localhost:3000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"你好","targetLanguage":"EN"}'

# Etymology test
curl -X POST http://localhost:3000/api/etymology \
  -H "Content-Type: application/json" \
  -d '{"chinese":"生"}'
```

All should return JSON responses. ✅

## 📱 Using the Enhanced Add Words Screen

Once everything is connected:

1. Open the app
2. Navigate to "Add Word"
3. **Type Chinese characters** in the first field
4. Watch as:
   - ✨ English translation appears automatically (500ms after you stop typing)
   - 📚 Etymology breakdown appears below (1000ms after you stop typing)
   - Each character's meaning and explanation is shown
5. Fill in Pinyin manually
6. Click Save

## 🔧 Configuration

### Backend Configuration

**File:** `/backend/.env`

```
PORT=3000                                              # Server port
DEEPL_API_KEY=ff547ff3-ea43-4c42-871a-75c3e64970fa:fx # Your DeepL key
CLAUDE_API_KEY=sk-ant-api03-...                       # Your Claude key
```

### Mobile App Configuration

**File:** `/app/.env` (create if doesn't exist)

```
EXPO_PUBLIC_BACKEND_URL=http://192.168.x.x:3000  # Your backend URL
```

## 🐛 Troubleshooting

### Backend Won't Start
```bash
# Make sure you're in the backend directory
cd backend

# Clear npm cache if having issues
npm cache clean --force

# Try installing again
npm install

# Start the server
npm run dev
```

### Translation/Etymology Not Working from App
1. Check backend is running: `curl http://localhost:3000/health`
2. Verify `EXPO_PUBLIC_BACKEND_URL` in mobile app `.env`
3. Ensure phone/simulator is on same network (if not using localhost)
4. Check mobile app console for error messages

### "Connection refused" Error
- Backend is not running
- Wrong IP address in `.env`
- Firewall blocking port 3000
- Using `localhost` when should use IP address for physical device

### Etymology Takes 2-3 Seconds
- This is normal! Claude needs time to analyze the characters
- First request may be slower
- Subsequent requests cache in your app

### API Keys Not Working
- Check `.env` file exists in `/backend`
- Verify API key format is exactly correct
- Restart backend server after changing `.env`

## 📚 File Structure

```
wrdbnk/
├── backend/                    # ← Backend server
│   ├── server.js              # Main server file
│   ├── package.json           # Dependencies
│   ├── .env                   # API keys
│   ├── .gitignore             # Prevent key commits
│   ├── README.md              # Detailed backend docs
│   ├── QUICK_START.md         # Quick start guide
│   └── BACKEND_SETUP.md       # Setup guide
├── app/
│   └── add-word.tsx           # Enhanced Add Word screen
├── utils/
│   ├── deepl.ts               # Translation API calls
│   ├── etymology.ts           # Etymology API calls
│   └── translations.ts        # Bilingual text
├── .env                       # Mobile app config (create this)
└── SETUP_COMPLETE.md          # This file
```

## 🌐 Network Connectivity Guide

### On Same Wi-Fi (Physical Device)

1. **Get Mac's IP:**
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1
   ```
   Example: `192.168.1.100`

2. **Update .env in mobile app:**
   ```
   EXPO_PUBLIC_BACKEND_URL=http://192.168.1.100:3000
   ```

3. **Make sure phone is on same Wi-Fi as Mac**

4. **Start Expo on phone:**
   - Run app normally
   - It will connect to backend

### Using Simulator (Same Mac)

1. **Use localhost:**
   ```
   EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
   ```

2. **Make sure backend is running**

3. **Run Expo on simulator**

## 📝 API Documentation

### POST /api/translate

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

### POST /api/etymology

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
      "explanation": "The character depicts a sprout growing from the earth..."
    }
  ],
  "fullMeaning": "Life, birth, living things, to produce..."
}
```

## ✅ Verification Checklist

- [ ] Backend installed (`npm install` completed)
- [ ] Backend running (`npm run dev` showing server message)
- [ ] Backend health check passes (`curl http://localhost:3000/health`)
- [ ] Translation test passes (curl test returns JSON)
- [ ] Etymology test passes (curl test returns JSON)
- [ ] Mobile app `.env` created with correct IP
- [ ] Mobile app can connect to backend
- [ ] Add Word screen shows loading indicators
- [ ] Real-time translation works
- [ ] Etymology generation works

## 🎉 You're All Set!

Everything is now configured and ready to use:

✨ **Translation** - Real-time DeepL translation
📚 **Etymology** - AI-powered character analysis
🔐 **Security** - API keys safely in backend
📱 **Mobile** - App connects to backend securely

Start adding words with instant translation and etymology!

## 📞 Support

If something isn't working:

1. **Check logs:**
   - Backend logs show request/response details
   - Mobile app console shows errors

2. **Verify connectivity:**
   - Test backend with curl commands
   - Check IP address is correct
   - Ensure same Wi-Fi network

3. **Restart everything:**
   - Stop backend: `Ctrl+C`
   - Start again: `npm run dev`
   - Refresh mobile app

4. **Check API keys:**
   - Verify `.env` has correct keys
   - Restart backend after changes

---

**Enjoy using Wrdbnk with real-time translation and AI etymology! 🚀**
