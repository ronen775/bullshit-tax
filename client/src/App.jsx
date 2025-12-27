import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Natural Audio Engine ---
const API_BASE = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';

const playNaturalVoice = (text, persona, gender = 'female') => {
    if (window.currentAudio) {
        window.currentAudio.pause();
        window.currentAudio = null;
    }
    const url = `${API_BASE}/api/tts?text=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    window.currentAudio = audio;

    // Voice Characteristic Simulation
    if (gender === 'male') {
        audio.playbackRate = 0.92;
        if ('preservesPitch' in audio) audio.preservesPitch = false;
    } else {
        if (persona === 'polish') audio.playbackRate = 0.85;
        else if (persona === 'coach') audio.playbackRate = 1.35;
        else audio.playbackRate = 1.05;
        if ('preservesPitch' in audio) audio.preservesPitch = true;
    }

    audio.play().catch(e => console.error("Voice Playback Failed", e));
};

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const playSoundEffect = (type) => {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        if (type === 'success') {
            osc.frequency.setValueAtTime(600, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.2);
        } else if (type === 'cash') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            osc.start(); osc.stop(audioCtx.currentTime + 0.1);
        }
    } catch (e) { }
};

// --- UI Components ---
const Button = ({ onClick, children, variant = 'primary', style }) => (
    <motion.button
        whileTap={{ scale: 0.96 }}
        whileHover={{ scale: 1.02 }}
        className={`btn ${variant === 'outline' ? 'btn-outline' : ''}`}
        onClick={onClick}
        style={style}
    >
        {children}
    </motion.button>
);

const Screen = ({ children }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.02 }}
        className="screen"
    >
        {children}
    </motion.div>
);

const CommitmentCard = ({ item, onFail, onSuccess, onDelete }) => {
    const [timeLeft, setTimeLeft] = useState("");
    const [isOverdue, setIsOverdue] = useState(false);

    useEffect(() => {
        const update = () => {
            const diff = new Date(item.deadline) - new Date();
            if (diff <= 0) { setIsOverdue(true); setTimeLeft("00:00:00"); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`);
        };
        update(); const int = setInterval(update, 1000); return () => clearInterval(int);
    }, [item.deadline]);

    return (
        <motion.div layout className={`card ${isOverdue ? 'card-overdue' : ''}`} style={{ direction: 'rtl', textAlign: 'right', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, margin: '0 0 4px 0' }}>{item.title}</h3>
                    <p style={{ fontSize: 11, opacity: 0.5, margin: 0 }}>עד: {new Date(item.deadline).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div className="timer-display" style={{ fontSize: 16, fontWeight: 700, color: isOverdue ? 'var(--accent)' : 'var(--success)' }}>{timeLeft}</div>
                    <button onClick={() => onDelete(item.id)} style={{ background: 'none', border: 'none', padding: 5, fontSize: 16, cursor: 'pointer', opacity: 0.3 }}>🗑️</button>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
                <Button onClick={() => onSuccess(item.id)} variant="outline" style={{ flex: 1.5, color: 'var(--success)', borderColor: 'rgba(52, 199, 89, 0.2)', padding: '12px' }}>בוצע ✓</Button>
                <Button onClick={() => onFail(item)} variant="outline" style={{ flex: 1, color: isOverdue ? 'var(--accent)' : 'white', padding: '12px', fontSize: 14 }}>נכשלתי ✕</Button>
            </div>
        </motion.div>
    );
};

export default function App() {
    const [step, setStep] = useState(1);
    const [data, setData] = useState({ score: 100, commitments: [], excuses: [], settings: { persona: 'sarcastic', voiceGender: 'female' }, stats: {} });
    const [newTask, setNewTask] = useState("");
    const [minInput, setMinInput] = useState("");
    const [dtInput, setDtInput] = useState("");
    const [mode, setMode] = useState("min"); // 'min' or 'date'
    const [activeTask, setActiveTask] = useState(null);
    const [excuse, setExcuse] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const Sidebar = () => (
        <AnimatePresence>
            {isMenuOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="sidebar-overlay"
                        onClick={() => setIsMenuOpen(false)}
                    />
                    <motion.div
                        initial={{ x: 300 }}
                        animate={{ x: 0 }}
                        exit={{ x: 300 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="sidebar"
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40, direction: 'rtl' }}>
                            <h2 style={{ fontSize: 14, color: 'var(--accent)', fontWeight: 900, letterSpacing: 2, margin: 0 }}>תפריט</h2>
                            <div className="card" style={{ padding: '6px 12px', margin: 0, textAlign: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 12 }}>
                                <div style={{ fontSize: 7, opacity: 0.5 }}>SCORE</div>
                                <div style={{ fontSize: 16, fontWeight: 900, color: data.score > 70 ? 'var(--success)' : 'var(--accent)' }}>{data.score}</div>
                            </div>
                        </div>
                        <div className={`menu-item ${step === 1 ? 'active' : ''}`} onClick={() => { setStep(1); setIsMenuOpen(false); }}>🏠 לוח בקרה</div>
                        <div className={`menu-item ${step === 10 ? 'active' : ''}`} onClick={() => { setStep(10); setIsMenuOpen(false); }}>📜 היסטוריה</div>
                        <div className={`menu-item ${step === 11 ? 'active' : ''}`} onClick={() => { setStep(11); setIsMenuOpen(false); }}>⚙️ הגדרות וביצועים</div>
                        <div style={{ marginTop: 'auto', opacity: 0.3, fontSize: 10, textAlign: 'center' }}>NoExcuse v2.0</div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    const refreshAction = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/data`);
            const d = await res.json();
            setData(d);
        } catch (e) { console.error("No Connection to Server"); }
    };

    useEffect(() => { refreshAction(); }, [step]);

    const updateSettings = async (updates) => {
        const newSettings = { ...data.settings, ...updates };
        await fetch(`${API_BASE}/api/settings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings)
        });
        refreshAction();
    };

    const submitDone = async (id) => {
        playSoundEffect('success');
        try {
            const res = await fetch(`${API_BASE}/api/commitments/done`, {
                method: 'POST', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            if (result.cheer) {
                setTimeout(() => playNaturalVoice(result.cheer, result.persona, data.settings?.voiceGender), 100);
            }
            refreshAction();
        } catch (e) { console.error(e); }
    };

    const submitExcuse = async (text) => {
        setStep(8);
        if (data.settings?.persona === 'polish') playNaturalVoice("נו? אני מחכה לתירוץ המצויין שלך.", 'polish', data.settings?.voiceGender);
        try {
            const res = await fetch(`${API_BASE}/api/judge`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: activeTask.id, task: activeTask.title, excuse: text })
            });
            const result = await res.json();
            setActiveTask({ ...activeTask, ...result });
            setStep(4);
            setTimeout(() => {
                playSoundEffect('cash');
                playNaturalVoice(result.roast, result.personaUsed, data.settings?.voiceGender);
            }, 300);
        } catch (e) { alert("השרת נפל"); setStep(1); }
    };

    const handleAddCommitment = async () => {
        if (!newTask) return;
        let dl = new Date();
        if (mode === 'min') dl.setMinutes(dl.getMinutes() + parseInt(minInput || 15));
        else dl = new Date(dtInput);

        await fetch(`${API_BASE}/api/commitments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTask, deadline: dl.toISOString() })
        });
        setNewTask(""); setMinInput(""); setStep(1);
    };

    return (
        <div className="app-container">
            <AnimatePresence mode="wait">
                {step === 1 && (
                    <Screen key="1">
                        <Sidebar />
                        <div className="header-container" style={{ padding: '0 5px' }}>
                            <button className="menu-trigger" onClick={() => setIsMenuOpen(true)} style={{ fontSize: 24, padding: 5, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>☰</button>

                            <div className="score-badge">
                                <div className="score-label">SCORE</div>
                                <div className="score-value" style={{ color: data.score > 70 ? 'var(--success)' : 'var(--accent)' }}>{data.score}</div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ textAlign: 'left' }}>
                                    <h2 style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 900, margin: 0, letterSpacing: 1 }}>NOEXCUSE</h2>
                                </div>
                                <img src="/noexcuse_logo.png" className="logo-img" alt="logo" />
                            </div>
                        </div>

                        <div style={{ flex: 1, paddingBottom: 100 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, padding: '0 4px' }}>
                                <span style={{ fontSize: 13, opacity: 0.5 }}>משימות פעילות ({data.commitments?.length || 0})</span>
                                {data.commitments?.length > 0 && (
                                    <button onClick={async () => {
                                        if (window.confirm("למחוק את כל המשימות?")) {
                                            await fetch(`${API_BASE}/api/commitments/clear`, { method: 'POST' });
                                            refreshAction();
                                        }
                                    }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', fontWeight: 700 }}>מחק הכל</button>
                                )}
                            </div>
                            <div style={{ display: 'grid', gap: 12 }}>
                                {data.commitments?.map(c => (
                                    <CommitmentCard
                                        key={c.id} item={c}
                                        onFail={(task) => { setActiveTask(task); setStep(3); }}
                                        onSuccess={submitDone}
                                        onDelete={async (id) => {
                                            if (window.confirm("למחוק משימה זו?")) {
                                                await fetch(`${API_BASE}/api/commitments/delete`, { method: 'POST', body: JSON.stringify({ id }), headers: { 'Content-Type': 'application/json' } });
                                                refreshAction();
                                            }
                                        }}
                                    />
                                ))}
                                {data.commitments?.length === 0 && (
                                    <div style={{ textAlign: 'center', marginTop: 80, opacity: 0.4 }}>
                                        <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
                                        <p style={{ fontSize: 16, fontWeight: 700 }}>אין לך משימות פעילות</p>
                                        <p style={{ fontSize: 13 }}>הגיע הזמן להתחייב למשהו!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)', left: 20, right: 20, zIndex: 100 }}>
                            <Button onClick={() => setStep(2)} style={{ width: '100%', height: 60, fontSize: 18, background: 'var(--accent)', color: 'white', borderRadius: 16, boxShadow: '0 10px 30px rgba(255, 59, 48, 0.3)' }}>+ התחייבות חדשה</Button>
                        </div>
                    </Screen>
                )}

                {step === 11 && (
                    <Screen key="11">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30, direction: 'rtl' }}>
                            <h1 style={{ margin: 0 }}>הגדרות</h1>
                            <Button onClick={() => setStep(1)} variant="outline">חזרה</Button>
                        </div>

                        <div className="card" style={{ direction: 'rtl', textAlign: 'right', marginBottom: 20 }}>
                            <h3 style={{ marginTop: 0 }}>🔊 סוג קול</h3>
                            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                                <div onClick={() => { updateSettings({ voiceGender: 'female' }); playNaturalVoice("שלום, אני הקול הנשי.", 'sarcastic', 'female'); }} className={`persona-row ${data.settings?.voiceGender === 'female' ? 'active' : ''}`} style={{
                                    flex: 1, padding: 15, borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                                    background: data.settings?.voiceGender === 'female' ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                                }}>👩 אישה</div>
                                <div onClick={() => { updateSettings({ voiceGender: 'male' }); playNaturalVoice("שלום, אני הקול הגברי.", 'sarcastic', 'male'); }} className={`persona-row ${data.settings?.voiceGender === 'male' ? 'active' : ''}`} style={{
                                    flex: 1, padding: 15, borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                                    background: data.settings?.voiceGender === 'male' ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                                }}>👨 גבר</div>
                            </div>
                        </div>

                        <div className="card" style={{ direction: 'rtl', textAlign: 'right', marginBottom: 20 }}>
                            <h3>📊 ביצועים</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 15 }}>
                                <div className="stat-box" style={{ background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, textAlign: 'center' }}>
                                    <div style={{ fontSize: 9, opacity: 0.5 }}>ציון כללי</div>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: data.score > 70 ? 'var(--success)' : 'var(--accent)' }}>{data.score}</div>
                                </div>
                                <div className="stat-box" style={{ background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, textAlign: 'center' }}>
                                    <div style={{ fontSize: 9, opacity: 0.5 }}>מדד חירטוט</div>
                                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--accent)' }}>{data.stats?.bullshitRatio || 0}%</div>
                                </div>
                                <div className="stat-box" style={{ background: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 12, textAlign: 'center' }}>
                                    <div style={{ fontSize: 9, opacity: 0.5 }}>קנסות</div>
                                    <div style={{ fontSize: 20, fontWeight: 900 }}>₪{data.stats?.totalFines || 0}</div>
                                </div>
                            </div>
                        </div>

                        <div className="card" style={{ direction: 'rtl', textAlign: 'right' }}>
                            <h3>🎭 אישיות AI</h3>
                            <div style={{ display: 'grid', gap: 10, marginTop: 15 }}>
                                {[
                                    { id: 'sarcastic', name: '🤖 הבוט הציני' },
                                    { id: 'coach', name: '🏋️ המאמן' },
                                    { id: 'polish', name: '👵 הפולנייה' }
                                ].map(p => (
                                    <div key={p.id} onClick={() => {
                                        updateSettings({ persona: p.id });
                                        playNaturalVoice("שיניתי אישיות.", p.id, data.settings?.voiceGender);
                                    }} style={{
                                        padding: 15, borderRadius: 12, background: data.settings?.persona === p.id ? 'var(--accent)' : 'rgba(255,255,255,0.03)',
                                        cursor: 'pointer', textAlign: 'center', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        {p.name}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Screen>
                )}

                {step === 2 && (
                    <Screen key="2">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, direction: 'rtl' }}>
                            <h1 style={{ margin: 0, fontSize: 24 }}>התחייבות חדשה</h1>
                            <Button onClick={() => setStep(1)} variant="outline">ביטול</Button>
                        </div>

                        <div className="card" style={{ direction: 'rtl', textAlign: 'right' }}>
                            <label style={{ fontSize: 12, opacity: 0.6, marginBottom: 8, display: 'block' }}>מה המשימה שלך?</label>
                            <input autoFocus placeholder="ללכת לחדר כושר, לסיים את הפרויקט..." className="input-field" value={newTask} onChange={e => setNewTask(e.target.value)} style={{ fontSize: 18 }} />

                            <div style={{ marginTop: 24 }}>
                                <label style={{ fontSize: 12, opacity: 0.6, marginBottom: 12, display: 'block' }}>מתי הדדליין?</label>
                                <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
                                    <button onClick={() => setMode('min')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: mode === 'min' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 700 }}>דקות</button>
                                    <button onClick={() => setMode('date')} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: mode === 'date' ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 700 }}>תאירך ושעה</button>
                                </div>

                                {mode === 'min' ? (
                                    <input placeholder="בעוד כמה דקות?" className="input-field" type="number" value={minInput} onChange={e => setMinInput(e.target.value)} style={{ textAlign: 'right', fontSize: 18 }} />
                                ) : (
                                    <input
                                        className="input-field"
                                        type="datetime-local"
                                        value={dtInput}
                                        onChange={e => setDtInput(e.target.value)}
                                        onClick={(e) => e.target.showPicker && e.target.showPicker()}
                                        style={{ textAlign: 'right', cursor: 'pointer', fontSize: 16 }}
                                    />
                                )}
                            </div>
                        </div>

                        <Button onClick={handleAddCommitment} style={{ background: 'var(--success)', color: 'white', fontWeight: 900, marginTop: 20, padding: 20, fontSize: 18 }}>אני מתחייב!</Button>
                    </Screen>
                )}

                {step === 3 && activeTask && (
                    <Screen key="3">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, direction: 'rtl' }}>
                            <h1 style={{ margin: 0, fontSize: 24 }}>למה נכשלת?</h1>
                            <Button onClick={() => setStep(1)} variant="outline">חזרה</Button>
                        </div>
                        <div className="card" style={{ direction: 'rtl', textAlign: 'right' }}>
                            <p style={{ color: 'var(--accent)', fontSize: 20, fontWeight: 800, margin: '0 0 15px 0' }}>{activeTask.title}</p>
                            <textarea placeholder="כתוב את התירוץ שלך כאן... ה-AI יחליט אם זה בולשיט או לגיטימי." className="input-field" value={excuse} onChange={e => setExcuse(e.target.value)} style={{ textAlign: 'right', minHeight: 180, fontSize: 18, paddingTop: 15, lineHeight: 1.5 }} />
                        </div>
                        <Button onClick={() => submitExcuse(excuse)} style={{ background: 'var(--accent)', color: 'white', marginTop: 20, padding: 20, fontSize: 18, fontWeight: 900 }}>שלח לשיפוט ה-AI</Button>
                    </Screen>
                )}

                {step === 8 && <Screen key="8"><div style={{ textAlign: 'center', marginTop: 150 }}><div className="loading-ring" style={{ margin: '0 auto 20px' }} /><h2>מנתח את הבולשיט...</h2></div></Screen>}

                {step === 4 && activeTask && (
                    <Screen key="4">
                        <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <motion.div initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} style={{ fontSize: 80, marginBottom: 10 }}>
                                {activeTask.personaUsed === 'polish' ? '👵' : (activeTask.personaUsed === 'coach' ? '🏋️' : '🤖')}
                            </motion.div>
                            <h2 style={{ fontSize: 16, opacity: 0.6, margin: 0 }}>גזר הדין:</h2>
                            <h1 style={{ color: activeTask.verdict === 'BULLSHIT' ? 'var(--accent)' : 'var(--success)', fontSize: 50, fontWeight: 900, margin: '5px 0' }}>{activeTask.verdict}</h1>

                            <div className="card" style={{ padding: 24, marginTop: 20, background: 'rgba(255,255,255,0.03)', borderRadius: 20, borderStyle: 'dashed' }}>
                                <p style={{ fontSize: 20, fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>"{activeTask.roast}"</p>
                            </div>

                            <div className="card" style={{ marginTop: 20, padding: '15px 30px', display: 'inline-block' }}>
                                <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>קנס</div>
                                <div style={{ fontSize: 32, fontWeight: 900 }}>₪{activeTask.fine}</div>
                            </div>

                            <Button onClick={() => { if (window.currentAudio) window.currentAudio.pause(); setStep(1); }} style={{ marginTop: 30, width: '100%', padding: 20, fontSize: 18, background: 'var(--text)', color: 'black' }}>חזרה ללוח בקרה</Button>
                        </div>
                    </Screen>
                )}

                {step === 10 && (
                    <Screen key="10">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, direction: 'rtl' }}>
                            <h1 style={{ margin: 0, fontSize: 24 }}>היסטוריה</h1>
                            <Button onClick={() => setStep(1)} variant="outline">חזרה</Button>
                        </div>

                        <div style={{ display: 'grid', gap: 12, paddingBottom: 40 }}>
                            {data.excuses?.map(ex => (
                                <div key={ex.id} className="card" style={{ direction: 'rtl', textAlign: 'right', padding: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                                        <span style={{ fontWeight: 900, color: ex.verdict === 'BULLSHIT' ? 'var(--accent)' : 'var(--success)', fontSize: 14 }}>{ex.verdict}</span>
                                        <span style={{ fontSize: 11, opacity: 0.4 }}>{new Date(ex.date).toLocaleDateString('he-IL')}</span>
                                    </div>
                                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{ex.task}</div>
                                    <div style={{ fontSize: 13, opacity: 0.6, fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: 10, borderRadius: 8 }}>"{ex.roast}"</div>
                                </div>
                            ))}
                            {data.excuses?.length === 0 && (
                                <div style={{ textAlign: 'center', marginTop: 100, opacity: 0.3 }}>אין היסטוריה עדיין. תתחיל להתחייב (או לפשל).</div>
                            )}
                            {data.excuses?.length > 0 && (
                                <Button onClick={async () => {
                                    if (window.confirm("למחוק את כל ההיסטוריה?")) {
                                        try {
                                            const res = await fetch(`${API_BASE}/api/history/clear`, { method: 'POST' });
                                            if (res.ok) await refreshAction();
                                        } catch (e) {
                                            console.error(e);
                                        }
                                    }
                                }} variant="outline" style={{ marginTop: 20, color: 'var(--accent)', borderColor: 'rgba(255, 59, 48, 0.2)' }}>🗑️ נקה היסטוריה</Button>
                            )}
                        </div>
                    </Screen>
                )}
            </AnimatePresence>
        </div>
    );
}
