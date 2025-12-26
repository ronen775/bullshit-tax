const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DB_FILE = path.join(__dirname, 'db.json');
const getInitialDB = () => ({
    commitments: [],
    excuses: [],
    score: 100,
    settings: { persona: 'sarcastic', voiceGender: 'female' }
});

const readDB = () => {
    try {
        if (!fs.existsSync(DB_FILE)) return getInitialDB();
        const content = fs.readFileSync(DB_FILE, 'utf8');
        const data = JSON.parse(content);
        if (!data.settings) data.settings = { persona: 'sarcastic', voiceGender: 'female' };
        if (!data.commitments) data.commitments = [];
        if (!data.excuses) data.excuses = [];
        if (data.score === undefined) data.score = 100;
        return data;
    } catch (e) { return getInitialDB(); }
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

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

app.get('/api/data', (req, res) => {
    const db = readDB();
    const stats = {
        bullshitRatio: db.excuses.length ? Math.round((db.excuses.filter(e => e.verdict === 'BULLSHIT').length / db.excuses.length) * 100) : 0,
        totalFines: db.excuses.reduce((sum, e) => sum + (e.fine || 0), 0)
    };
    res.json({ ...db, stats });
});

app.post('/api/settings', (req, res) => {
    const db = readDB();
    db.settings = { ...db.settings, ...req.body };
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/commitments', (req, res) => {
    const db = readDB();
    const newC = { id: Date.now(), title: req.body.title, deadline: req.body.deadline };
    db.commitments.push(newC);
    writeDB(db);
    res.json(newC);
});

app.post('/api/commitments/done', (req, res) => {
    const db = readDB();
    const persona = db.settings.persona || 'sarcastic';
    db.commitments = db.commitments.filter(c => c.id !== req.body.id);
    db.score = Math.min(100, (db.score || 100) + 10);
    writeDB(db);

    const cheers = {
        polish: ["נו שויין, לפחות פעם אחת עשית משהו כמו שצריך.", "הצלחת! אולי עוד יצא ממך משהו.", "בסדר, בסדר, אל תשתחצן."],
        coach: ["עבודה מעולה חייל! ככה אני רוצה לראות אותך!", "ביצוע מושלם! הלאה למשימה הבאה!", "כל הכבוד! אתה אלוף!"],
        sarcastic: ["וואו, אני בשוק. אשכרה סיימת משימה.", "נרשם פלוס ביומן. אל תתרגל לזה.", "יפה מאוד. רוצה מדליה?"]
    };

    const pool = cheers[persona] || cheers.sarcastic;
    const cheer = pool[Math.floor(Math.random() * pool.length)];
    res.json({ success: true, newScore: db.score, cheer, persona });
});

// מחיקת משימה בודדת
app.post('/api/commitments/delete', (req, res) => {
    const db = readDB();
    db.commitments = db.commitments.filter(c => c.id !== req.body.id);
    writeDB(db);
    res.json({ success: true });
});

// מחיקת כל המשימות
app.post('/api/commitments/clear', (req, res) => {
    const db = readDB();
    db.commitments = [];
    writeDB(db);
    res.json({ success: true });
});

// מחיקת היסטוריה
app.post('/api/history/clear', (req, res) => {
    console.log("🧹 Clearing history (keeping score)...");
    const db = readDB();
    db.excuses = [];
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/judge', (req, res) => {
    const db = readDB();
    const result = judgeExcuse(req.body.task, req.body.excuse, db.settings.persona);
    if (req.body.id) db.commitments = db.commitments.filter(c => c.id !== req.body.id);
    db.score = Math.max(0, Math.min(100, (db.score || 100) + result.scoreChange));
    db.excuses.unshift({ ...result, task: req.body.task, excuse: req.body.excuse, date: new Date(), id: Date.now() });
    writeDB(db);
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

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 NOEXCUSE SERVER on port ${PORT}`));

module.exports = app;
