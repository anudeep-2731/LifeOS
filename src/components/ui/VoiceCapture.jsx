import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import BottomSheet from './BottomSheet';
import { cn } from '../../lib/utils';
import { db, getTodayStr } from '../../db/database';
import { askGemini } from '../../lib/ai';

const SILENCE_MS = 4500;
const MAX_RESTARTS = 3; // Android Chrome kills continuous mode — retry up to this many times

// ─── Single-segment keyword parser ───────────────────────────────────────────

function parseSegment(text, categories) {
  const lower = text.toLowerCase().trim();
  if (!lower) return null;

  const amtMatch = text.match(/(\d+(?:\.\d+)?)/);
  const amount = amtMatch ? Number(amtMatch[1]) : null;

  const catKeywords = {
    Food:          ['food', 'grocery', 'groceries', 'vegetable', 'fruit'],
    Transport:     ['fuel', 'petrol', 'auto', 'cab', 'uber', 'ola', 'bus', 'metro', 'taxi', 'transport'],
    Dining:        ['restaurant', 'swiggy', 'zomato', 'cafe', 'coffee', 'tea', 'biryani', 'pizza'],
    Shopping:      ['shopping', 'clothes', 'shirt', 'amazon', 'flipkart', 'order'],
    Utilities:     ['electricity', 'water', 'gas', 'internet', 'wifi', 'recharge', 'mobile'],
    Health:        ['medicine', 'pharmacy', 'doctor', 'hospital', 'health'],
    Entertainment: ['movie', 'netflix', 'spotify', 'game', 'entertainment', 'concert'],
  };

  const buildExpense = (description) => {
    let category = categories[0]?.name || 'Other';
    for (const [cat, kws] of Object.entries(catKeywords)) {
      if (kws.some(k => lower.includes(k))) { category = cat; break; }
    }
    return { type: 'expense', data: { amount, description, category } };
  };

  // 1. Strong expense: explicit payment word + amount
  if (amount && /paid|spent|bought|rs\b|₹|rupee/.test(lower)) {
    const desc = text
      .replace(/\d+(?:\.\d+)?/, '')
      .replace(/\b(paid|spent|for|on|at|bought|rupees?|rs)\b/gi, '')
      .trim() || 'Expense';
    return buildExpense(desc);
  }

  // 2. Meal (before weak expense so "had 3 eggs for breakfast" routes here)
  const mealMap = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack', brunch: 'Breakfast' };
  for (const [kw, type] of Object.entries(mealMap)) {
    if (lower.includes(kw)) {
      const title = text
        .replace(new RegExp(kw, 'gi'), '')
        .replace(/\b(had|ate|having|logged|for|just)\b/gi, '')
        .trim() || type;
      return { type: 'meal', data: { mealType: type, title } };
    }
  }

  // 3. Task
  if (/remind|todo|task|need to|have to|add task/.test(lower)) {
    const title = text
      .replace(/\b(remind me to|todo|add task|i need to|i have to|task:?)\b/gi, '')
      .trim() || text;
    return { type: 'task', data: { title, priority: 'medium', duration: 30 } };
  }

  // 4. Routine
  if (/done|completed|finished|workout|ran|run|gym|meditat|walk|yoga|swim/.test(lower)) {
    const title = text.replace(/\b(done|completed|finished|just)\b/gi, '').trim() || text;
    return { type: 'routine', data: { title } };
  }

  // 5. Weak expense: bare number ("350 for juice")
  if (amount) {
    const desc = text
      .replace(/\d+(?:\.\d+)?/, '')
      .replace(/\b(for|on|at)\b/gi, '')
      .trim() || 'Expense';
    return buildExpense(desc);
  }

  return null;
}

// Splits on "and" / comma / semicolon only when both sides have 3+ words (avoids splitting "chicken and rice")
function parseFallback(text, categories) {
  const segments = text
    .split(/\s+and\s+|[,;]/)
    .map(s => s.trim())
    .filter(s => s.split(' ').length >= 3);

  if (segments.length >= 2) {
    const results = segments.map(s => parseSegment(s, categories)).filter(Boolean);
    if (results.length >= 2) return results;
  }

  const single = parseSegment(text, categories);
  return single ? [single] : [{ type: 'unknown', data: { raw: text } }];
}

// ─── Gemini parser — returns array of intents ─────────────────────────────────

async function parseWithAI(transcript, categories) {
  const catNames = categories.map(c => c.name).join(', ') || 'Food, Transport, Dining, Shopping, Utilities, Health, Entertainment, Other';
  const prompt = `Parse this spoken life-tracker note into a JSON array. The user may log multiple items in one breath.
User said: "${transcript}"
Expense categories: ${catNames}

Return ONLY a valid JSON array (no markdown, no extra text):
[{"type":"expense"|"task"|"meal"|"routine"|"unknown","data":{"amount":number,"description":"string","category":"string","title":"string","priority":"high"|"medium"|"low","duration":number,"mealType":"Breakfast"|"Lunch"|"Dinner"|"Snack","raw":"string"}}]
Include only fields relevant to each type. One object per distinct intent.`;

  const res = await askGemini(prompt);
  if (!res) return null;
  try {
    const cleaned = res.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return null;
  }
}

// ─── Config ───────────────────────────────────────────────────────────────────

const INTENT_META = {
  expense: { icon: 'payments',        color: 'text-primary',   bg: 'bg-primary/5 border-primary/20',     label: 'Log Expense'  },
  task:    { icon: 'check_circle',     color: 'text-secondary', bg: 'bg-secondary/5 border-secondary/20', label: 'Add Task'     },
  meal:    { icon: 'restaurant',       color: 'text-tertiary',  bg: 'bg-tertiary/5 border-tertiary/20',   label: 'Log Meal'     },
  routine: { icon: 'self_improvement', color: 'text-secondary', bg: 'bg-secondary/5 border-secondary/20', label: 'Mark Routine' },
  unknown: { icon: 'help_outline',     color: 'text-outline',   bg: 'bg-surface-container border-outline-variant/20', label: 'Unknown' },
};

// ─── Save helper ──────────────────────────────────────────────────────────────

async function saveItem(item) {
  const today = getTodayStr();
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  if (item.type === 'expense' && item.data.amount) {
    await db.expenses.add({
      date: today, timestamp: ts,
      amount: Number(item.data.amount),
      category: item.data.category || 'Other',
      description: item.data.description || 'Voice log',
    });
  } else if (item.type === 'task' && item.data.title) {
    await db.tasks.add({
      date: today, dueDate: today,
      title: item.data.title,
      duration: Number(item.data.duration) || 30,
      priority: item.data.priority || 'medium',
      scheduledTime: '', postponeCount: 0, completed: false, recurring: 'none',
    });
  } else if (item.type === 'meal' && item.data.title) {
    await db.meals.add({
      date: today,
      mealType: item.data.mealType || 'Snack',
      title: item.data.title,
      completed: true, tags: [],
    });
  } else if (item.type === 'routine' && item.data.title) {
    const routines = await db.routines.where('date').equals(today).toArray();
    const match = routines.find(r =>
      r.title.toLowerCase().includes(item.data.title.toLowerCase()) ||
      item.data.title.toLowerCase().includes(r.title.toLowerCase())
    );
    if (match) {
      await db.routines.update(match.id, { completed: true });
    } else {
      await db.routines.add({ date: today, title: item.data.title, start: ts, duration: 30, type: 'routine', completed: true });
    }
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VoiceCapture({ className }) {
  const [isListening, setIsListening]   = useState(false);
  const [liveText, setLiveText]         = useState('');
  const [silenceLeft, setSilenceLeft]   = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems]   = useState([]);  // array of intents
  const [currentIdx, setCurrentIdx]     = useState(0);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [itemSaved, setItemSaved]       = useState(false);
  const [transcript, setTranscript]     = useState('');
  const [categories, setCategories]     = useState([]);

  const recognitionRef      = useRef(null);
  const transcriptRef       = useRef('');
  const preRestartRef       = useRef('');  // accumulated transcript before each Chrome restart
  const silenceTimerRef     = useRef(null);
  const countdownRef        = useRef(null);
  const intentionalRef      = useRef(false); // true = we stopped on purpose
  const restartCountRef     = useRef(0);
  const isListeningRef      = useRef(false);
  const categoriesRef       = useRef([]);

  useEffect(() => {
    db.settings.get('expenseCategories').then(c => {
      if (c?.value) { setCategories(c.value); categoriesRef.current = c.value; }
    });
  }, []);

  const setListening = (val) => {
    isListeningRef.current = val;
    setIsListening(val);
  };

  const clearSilenceTimer = () => {
    clearTimeout(silenceTimerRef.current);
    clearInterval(countdownRef.current);
    setSilenceLeft(0);
  };

  const armSilenceTimer = () => {
    clearSilenceTimer();
    const seconds = Math.ceil(SILENCE_MS / 1000);
    setSilenceLeft(seconds);

    let remaining = seconds;
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setSilenceLeft(remaining > 0 ? remaining : 0);
      if (remaining <= 0) clearInterval(countdownRef.current);
    }, 1000);

    silenceTimerRef.current = setTimeout(() => {
      intentionalRef.current = true;
      recognitionRef.current?.stop();
    }, SILENCE_MS);
  };

  const buildRecognition = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Speech recognition requires Chrome or Safari.'); return null; }

    const rec = new SR();
    rec.lang = 'en-IN';
    rec.continuous = true;
    rec.interimResults = true;
    recognitionRef.current = rec;

    rec.onresult = (e) => {
      // After a Chrome restart, results reset to index 0 — prefix with pre-restart transcript
      let fresh = '';
      for (let i = 0; i < e.results.length; i++) {
        fresh += e.results[i][0].transcript + ' ';
      }
      fresh = fresh.trim();
      const full = preRestartRef.current ? `${preRestartRef.current} ${fresh}` : fresh;
      setLiveText(full.trim());
      transcriptRef.current = full.trim();
      armSilenceTimer();
    };

    rec.onend = async () => {
      // Unexpected stop (Android Chrome killed the mic) → restart up to MAX_RESTARTS
      if (!intentionalRef.current && isListeningRef.current) {
        if (restartCountRef.current < MAX_RESTARTS) {
          restartCountRef.current++;
          preRestartRef.current = transcriptRef.current;
          try {
            rec.start();
            armSilenceTimer();
            return; // don't process yet, keep accumulating
          } catch {
            // restart failed — fall through to processing
          }
        }
      }

      clearSilenceTimer();
      setListening(false);

      const text = transcriptRef.current.trim();
      if (!text) return;

      // Show "Thinking…" immediately — covers the Gemini API latency
      setIsProcessing(true);
      setTranscript(text);

      let items = await parseWithAI(text, categoriesRef.current);
      if (!items) items = parseFallback(text, categoriesRef.current);

      setIsProcessing(false);
      setParsedItems(items.map((item, i) => ({ ...item, _id: i })));
      setCurrentIdx(0);
      setItemSaved(false);
      setShowConfirm(true);
    };

    rec.onerror = (e) => {
      if (e.error !== 'aborted') console.error('SpeechRecognition error', e.error);
      clearSilenceTimer();
      setListening(false);
      setIsProcessing(false);
    };

    return rec;
  };

  const startListening = () => {
    intentionalRef.current = false;
    restartCountRef.current = 0;
    preRestartRef.current = '';
    transcriptRef.current = '';
    setLiveText('');
    setItemSaved(false);

    const rec = buildRecognition();
    if (!rec) return;

    rec.start();
    setListening(true);
    armSilenceTimer();
  };

  const stopListening = () => {
    intentionalRef.current = true;
    clearSilenceTimer();
    recognitionRef.current?.stop();
  };

  const editCurrent = (field, val) => {
    setParsedItems(items =>
      items.map((item, i) => i === currentIdx ? { ...item, data: { ...item.data, [field]: val } } : item)
    );
  };

  const setCurrentType = (type) => {
    setParsedItems(items =>
      items.map((item, i) => i === currentIdx ? { ...item, type } : item)
    );
  };

  const closeSheet = () => {
    setShowConfirm(false);
    setParsedItems([]);
    setCurrentIdx(0);
    setSaving(false);
    setItemSaved(false);
  };

  const advance = () => {
    if (currentIdx < parsedItems.length - 1) {
      setCurrentIdx(i => i + 1);
      setItemSaved(false);
      setSaving(false);
    } else {
      closeSheet();
      window.dispatchEvent(new CustomEvent('life-os:voice-saved'));
    }
  };

  const handleConfirm = async () => {
    if (saving) return;
    const current = parsedItems[currentIdx];
    if (!current) return;
    setSaving(true);
    try {
      await saveItem(current);
      setItemSaved(true);
      setSaving(false);
      setTimeout(advance, 800);
    } catch (err) {
      console.error('VoiceCapture save error', err);
      setSaving(false);
    }
  };

  const handleSkip = () => advance();

  const currentItem = parsedItems[currentIdx];
  const meta = INTENT_META[currentItem?.type] || INTENT_META.unknown;
  const isMulti = parsedItems.length > 1;

  // ── Portal content (escapes BottomNav stacking context) ───────────────────
  const portalContent = (
    <>
      {/* Listening overlay */}
      {isListening && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center px-6"
          style={{ zIndex: 9998 }}
          onClick={stopListening}
        >
          <div
            className="bg-surface rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative w-20 h-20 mx-auto mb-5">
              <span className="absolute inset-0 rounded-full bg-error/20 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-error/10 flex items-center justify-center">
                <Icon name="mic" size={40} filled className="text-error" />
              </div>
            </div>

            <p className="text-base font-bold text-on-surface mb-1">Listening…</p>

            {liveText ? (
              <p className="text-sm text-primary italic bg-primary/5 rounded-2xl px-4 py-2 my-3 leading-relaxed">
                "{liveText}"
              </p>
            ) : (
              <div className="my-3 space-y-1.5">
                {[
                  { color: 'text-primary',   bg: 'bg-primary/8',   example: '"paid 350 for lunch, 200 for coffee"' },
                  { color: 'text-tertiary',  bg: 'bg-tertiary/8',  example: '"had eggs and toast for breakfast"'    },
                  { color: 'text-secondary', bg: 'bg-secondary/8', example: '"remind me to call bank"'              },
                  { color: 'text-secondary', bg: 'bg-secondary/8', example: '"completed gym session"'               },
                ].map(({ color, bg, example }) => (
                  <p key={example} className={cn('text-[11px] font-medium italic px-3 py-1.5 rounded-xl', color, bg)}>
                    {example}
                  </p>
                ))}
              </div>
            )}

            {silenceLeft > 0 && (
              <div className="flex items-center justify-center gap-2 my-3">
                <div className="flex gap-1">
                  {Array.from({ length: Math.ceil(SILENCE_MS / 1000) }).map((_, i) => (
                    <span
                      key={i}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all duration-500',
                        i < silenceLeft ? 'bg-error' : 'bg-outline-variant/30'
                      )}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-outline font-semibold">auto-stops in {silenceLeft}s</span>
              </div>
            )}

            <button
              onClick={stopListening}
              className="mt-2 w-full py-3 rounded-full bg-error text-white font-bold text-sm active:scale-95 transition-all"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Processing overlay — shows immediately after speech ends, before parse completes */}
      {isProcessing && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
          style={{ zIndex: 9998 }}
        >
          <div className="bg-surface rounded-3xl px-10 py-8 text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-4 relative">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
            </div>
            <p className="text-base font-bold text-on-surface">Thinking…</p>
            <p className="text-xs text-outline mt-1">Parsing your note</p>
          </div>
        </div>
      )}

      {/* Confirmation sheet */}
      <div style={{ zIndex: 9999, position: 'relative' }}>
        <BottomSheet
          isOpen={showConfirm}
          onClose={closeSheet}
          title={isMulti ? `Voice Log — ${currentIdx + 1} of ${parsedItems.length}` : 'Voice Log'}
          zIndex={9999}
        >
          {currentItem && (
            <div className="pb-4 space-y-4">
              {/* Transcript */}
              <div className="bg-surface-container-low rounded-2xl px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-bold text-outline uppercase tracking-wider">You said</p>
                  {isMulti && (
                    <div className="flex gap-1">
                      {parsedItems.map((_, i) => (
                        <span
                          key={i}
                          className={cn(
                            'w-2 h-2 rounded-full transition-all',
                            i < currentIdx ? 'bg-secondary' : i === currentIdx ? 'bg-primary' : 'bg-outline-variant/40'
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-on-surface italic">"{transcript}"</p>
              </div>

              {/* Intent card */}
              <div className={cn('rounded-2xl p-4 border', meta.bg)}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name={meta.icon} size={18} className={meta.color} />
                  <span className={cn('text-xs font-black uppercase tracking-widest', meta.color)}>
                    {meta.label}
                  </span>
                </div>

                {currentItem.type === 'expense' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[10px] text-outline mb-1">Amount (₹)</p>
                        <input type="number" className="input-pill w-full text-sm font-bold"
                          value={currentItem.data.amount || ''} onChange={e => editCurrent('amount', e.target.value)} />
                      </div>
                      <div>
                        <p className="text-[10px] text-outline mb-1">Category</p>
                        <select className="input-pill w-full text-sm" value={currentItem.data.category || ''}
                          onChange={e => editCurrent('category', e.target.value)}>
                          {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-outline mb-1">Description</p>
                      <input className="input-pill w-full text-sm" value={currentItem.data.description || ''}
                        onChange={e => editCurrent('description', e.target.value)} />
                    </div>
                  </div>
                )}

                {currentItem.type === 'task' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-outline mb-1">Task title</p>
                      <input className="input-pill w-full text-sm" value={currentItem.data.title || ''}
                        onChange={e => editCurrent('title', e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      {['high', 'medium', 'low'].map(p => (
                        <button key={p} type="button" onClick={() => editCurrent('priority', p)}
                          className={cn('flex-1 py-2 rounded-full text-xs font-semibold capitalize transition-all',
                            currentItem.data.priority === p
                              ? (p === 'high' ? 'bg-error text-white' : p === 'medium' ? 'bg-tertiary text-white' : 'bg-on-surface text-surface')
                              : 'bg-surface-container text-outline')}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentItem.type === 'meal' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-outline mb-1">What did you eat?</p>
                      <input className="input-pill w-full text-sm" value={currentItem.data.title || ''}
                        onChange={e => editCurrent('title', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(m => (
                        <button key={m} type="button" onClick={() => editCurrent('mealType', m)}
                          className={cn('py-2 rounded-full text-[10px] font-bold transition-all',
                            currentItem.data.mealType === m ? 'bg-tertiary text-white' : 'bg-surface-container text-outline')}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {currentItem.type === 'routine' && (
                  <div>
                    <p className="text-[10px] text-outline mb-1">Routine / activity</p>
                    <input className="input-pill w-full text-sm" value={currentItem.data.title || ''}
                      onChange={e => editCurrent('title', e.target.value)} />
                  </div>
                )}

                {currentItem.type === 'unknown' && (
                  <div>
                    <p className="text-sm text-outline mb-3">What did you mean?</p>
                    <div className="grid grid-cols-2 gap-2">
                      {['expense', 'task', 'meal', 'routine'].map(t => (
                        <button key={t} onClick={() => setCurrentType(t)}
                          className="py-2.5 rounded-full text-xs font-semibold bg-surface-container text-outline hover:bg-primary hover:text-white transition-all capitalize">
                          {INTENT_META[t].label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              {itemSaved ? (
                <div className="flex items-center justify-center gap-2 py-4 text-secondary font-bold">
                  <Icon name="check_circle" size={22} filled /> Saved!
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={handleSkip}
                    className="flex-1 py-3.5 rounded-full bg-surface-container text-outline font-semibold text-sm">
                    {isMulti ? 'Skip' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={saving || currentItem.type === 'unknown'}
                    className="flex-[2] py-3.5 rounded-full primary-gradient text-white font-bold text-sm shadow-gradient disabled:opacity-40 active:scale-95 transition-all">
                    {saving ? 'Saving…' : isMulti ? `Save (${currentIdx + 1}/${parsedItems.length})` : 'Save'}
                  </button>
                </div>
              )}
            </div>
          )}
        </BottomSheet>
      </div>
    </>
  );

  return (
    <>
      <button
        onClick={isListening ? stopListening : startListening}
        className={cn(
          'relative flex items-center justify-center rounded-full transition-all duration-200 active:scale-90',
          isListening ? 'bg-error shadow-lg shadow-error/30' : 'primary-gradient shadow-gradient',
          className
        )}
        aria-label="Voice log"
      >
        <Icon name={isListening ? 'stop' : 'mic'} size={26} filled className="text-white" />
        {isListening && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-error rounded-full animate-ping" />}
      </button>

      {createPortal(portalContent, document.body)}
    </>
  );
}
