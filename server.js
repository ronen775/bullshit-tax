const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- MongoDB Configuration ---
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://ronen_db_user:I31gbV2vnyOGpCT3@cluster0.gejik1g.mongodb.net/noexcuse?retryWrites=true&w=majority";

mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

const dbSchema = new mongoose.Schema({
    key: { type: String, default: 'main_data' },
    commitments: { type: Array, default: [] },
    excuses: { type: Array, default: [] },
    score: { type: Number, default: 100 },
    settings: {
        persona: { type: String, default: 'sarcastic' },
        voiceGender: { type: String, default: 'female' }
    }
});

const Data = mongoose.model('Data', dbSchema);

// Helper to get or create the single data document
async function getData() {
    let data = await Data.findOne({ key: 'main_data' });
    if (!data) {
        data = new Data({ key: 'main_data' });
        await data.save();
    }
    return data;
}

// --- TTS Proxy ---
app.get('/api/tts', async (req, res) => {
    const { text } = req.query;
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=iw&client=tw-ob`;
    try {
        const resp = await axios({ method: 'get', url, responseType: 'stream', headers: { 'Referer': 'http://translate.google.com/', 'User-Agent': 'Mozilla/5.0' } });
        res.set('Content-Type', 'audio/mpeg');
        resp.data.pipe(res);
    } catch (e) { res.status(500).send('Error'); }
});

const judgeExcuse = (task, excuse, persona = 'sarcastic') => {
    const hasHonesty = ["התעצלתי", "עצלן", "אמת"].some(w => excuse.includes(w));
    const verdict = hasHonesty || excuse.length > 25 ? "LEGIT" : "BULLSHIT";
    const roasts = {
        polish: {
            BULLSHIT: ["אוי ואי. ידעתי שלא תצליח. אני כבר אתאבל בחושך.", "זה בסדר, אל תרגיש רע שאני מאוכזבת.", "חבל, חבל מאוד. בדיוק מה שסבתא אמרה."],
            LEGIT: ["נו טוב, לפחות אתה אומר אמת לסבתא. קח הנחה."]
        },
        coach: {
            BULLSHIT: ["תירוצים לא שורפים קלוריות! תשלם!", "חלש מאוד! תתבייש! תשלם!"],
            LEGIT: ["בסדר, נשמע שהשתדלת. חצי קנס הפעם."]
        },
        sarcastic: {
            BULLSHIT: ["וואלה. איזה תירוץ מקורי. אולי תפתח סטרטאפ של בולשיט?", "נשמע אמין בערך כמו הבטחות של פוליטיקאי."],
            LEGIT: ["כנות? מרשים. הפעם זה עבר לך."]
        }
    };
    const pool = roasts[persona][verdict];
    return {
        verdict,
        fine: verdict === "BULLSHIT" ? 25 : 10,
        roast: pool[Math.floor(Math.random() * pool.length)],
        scoreChange: verdict === "BULLSHIT" ? -10 : 5,
        personaUsed: persona
    };
};

app.get('/api/data', async (req, res) => {
    const db = await getData();
    const stats = {
        bullshitRatio: db.excuses.length ? Math.round((db.excuses.filter(e => e.verdict === 'BULLSHIT').length / db.excuses.length) * 100) : 0,
        totalFines: db.excuses.reduce((sum, e) => sum + (e.fine || 0), 0)
    };
    res.json({
        commitments: db.commitments,
        excuses: db.excuses,
        score: db.score,
        settings: db.settings,
        stats
    });
});

app.post('/api/settings', async (req, res) => {
    const db = await getData();
    db.settings = { ...db.settings, ...req.body };
    db.markModified('settings');
    await db.save();
    res.json({ success: true });
});

app.post('/api/commitments', async (req, res) => {
    const db = await getData();
    const newC = { id: Date.now(), title: req.body.title, deadline: req.body.deadline };
    db.commitments.push(newC);
    db.markModified('commitments');
    await db.save();
    res.json(newC);
});

app.post('/api/commitments/done', async (req, res) => {
    const db = await getData();
    const persona = db.settings.persona || 'sarcastic';
    db.commitments = db.commitments.filter(c => c.id !== req.body.id);
    db.score = Math.min(100, (db.score || 100) + 10);
    db.markModified('commitments');
    await db.save();

    const cheers = {
        polish: ["נו שויין, לפחות פעם אחת עשית משהו כמו שצריך.", "הצלחת! אולי עוד יצא ממך משהו.", "בסדר, בסדר, אל תשתחצן."],
        coach: ["עבודה מעולה חייל! ככה אני רוצה לראות אותך!", "ביצוע מושלם! הלאה למשימה הבאה!", "כל הכבוד! אתה אלוף!"],
        sarcastic: ["וואו, אני בשוק. אשכרה סיימת משימה.", "נרשם פלוס ביומן. אל תתרגל לזה.", "יפה מאוד. רוצה מדליה?"]
    };

    const pool = cheers[persona] || cheers.sarcastic;
    const cheer = pool[Math.floor(Math.random() * pool.length)];
    res.json({ success: true, newScore: db.score, cheer, persona });
});

app.post('/api/commitments/delete', async (req, res) => {
    const db = await getData();
    db.commitments = db.commitments.filter(c => c.id !== req.body.id);
    db.markModified('commitments');
    await db.save();
    res.json({ success: true });
});

app.post('/api/commitments/clear', async (req, res) => {
    const db = await getData();
    db.commitments = [];
    db.markModified('commitments');
    await db.save();
    res.json({ success: true });
});

app.post('/api/history/clear', async (req, res) => {
    const db = await getData();
    db.excuses = [];
    db.markModified('excuses');
    await db.save();
    res.json({ success: true });
});

app.post('/api/judge', async (req, res) => {
    const db = await getData();
    const result = judgeExcuse(req.body.task, req.body.excuse, db.settings.persona);
    if (req.body.id) db.commitments = db.commitments.filter(c => c.id !== req.body.id);
    db.score = Math.max(0, Math.min(100, (db.score || 100) + result.scoreChange));
    db.excuses.unshift({ ...result, task: req.body.task, excuse: req.body.excuse, date: new Date(), id: Date.now() });
    db.markModified('commitments');
    db.markModified('excuses');
    await db.save();
    res.json(result);
});

// --- Production Serving ---
const clientDist = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
            res.sendFile(path.join(clientDist, 'index.html'));
        }
    });
}

const server = app.listen(PORT, '0.0.0.0', () => console.log(`🚀 NOEXCUSE SERVER on port ${PORT}`));

module.exports = app;
