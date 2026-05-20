import React, { useState, useEffect } from 'react';
import { Pill, Sparkles, FileText, Plus, X, Trash2, Pencil, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Check, Copy, Settings, GripVertical, Calendar, Clock, BarChart3, Heart } from 'lucide-react';

// localStorage shim（取代 Claude artifact 嘅 window.storage）
if (typeof window !== 'undefined' && !window.storage) {
  window.storage = {
    get: async (key) => {
      const v = localStorage.getItem(key);
      return v === null ? null : { value: v };
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
      return { value };
    },
    delete: async (key) => {
      localStorage.removeItem(key);
      return { deleted: true };
    },
    list: async (prefix) => {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      }
      return { keys };
    },
  };
}



const DEFAULT_ACTIVITIES = [
  { id: 'work', label: '工作', emoji: '💼', color: '#3b82f6' },
  { id: 'play', label: '玩樂', emoji: '🎮', color: '#ec4899' },
  { id: 'rest', label: '休息', emoji: '☕', color: '#a855f7' },
  { id: 'teach', label: '教學', emoji: '🎓', color: '#f59e0b' },
  { id: 'study', label: '學習', emoji: '📚', color: '#10b981' },
  { id: 'meal', label: '食飯', emoji: '🍽️', color: '#ef4444' },
  { id: 'training', label: '訓練', emoji: '🏋️', color: '#0891b2' },
];

const COLOR_PALETTE = ['#ef4444', '#f59e0b', '#eab308', '#84cc16', '#10b981', '#0891b2', '#3b82f6', '#6366f1', '#a855f7', '#ec4899', '#78716c', '#1c1917'];
const ACTIVITY_EMOJIS = ['✨', '🎯', '💼', '🎮', '☕', '🎓', '📚', '🍽️', '🏋️', '💪', '🧘', '🛒', '🚗', '🏠', '💤', '📞', '✈️', '🎬', '🍳', '🐶', '🎵', '📝', '🌱', '⚽', '🎸', '🛏️'];
const SLOT_EMOJIS = ['🌅', '☀️', '🌤️', '🌆', '🌙', '⭐', '💪', '🏃', '🧘', '🍽️', '☕', '🥤', '💊', '⏰'];

const DEFAULT_SUPPLEMENT_SLOTS = [
  { id: 'breakfast', label: '早餐後', emoji: '🌅', items: [{ id: 'vitc', name: '維他命 C' }, { id: 'fishoil', name: '魚油' }] },
  { id: 'pre-workout', label: '訓練前', emoji: '💪', items: [{ id: 'creatine', name: '肌酸' }] },
  { id: 'bedtime', label: '睡前', emoji: '🌙', items: [{ id: 'mag', name: '鎂' }] },
];

const DEFAULT_SKINCARE = {
  am: [{ id: 'am-1', name: '潔面' }, { id: 'am-2', name: '化妝水' }, { id: 'am-3', name: '精華' }, { id: 'am-4', name: '保濕' }, { id: 'am-5', name: '防曬' }],
  pm: [{ id: 'pm-1', name: '卸妝' }, { id: 'pm-2', name: '潔面' }, { id: 'pm-3', name: '化妝水' }, { id: 'pm-4', name: '精華' }, { id: 'pm-5', name: '面霜' }],
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = [
  { id: 0, label: '一', full: '星期一' },
  { id: 1, label: '二', full: '星期二' },
  { id: 2, label: '三', full: '星期三' },
  { id: 3, label: '四', full: '星期四' },
  { id: 4, label: '五', full: '星期五' },
  { id: 5, label: '六', full: '星期六' },
  { id: 6, label: '日', full: '星期日' },
];

const ACTIVITIES_KEY = 'activities-v5';
const TEMPLATE_KEY = 'plan-template-v1'; // 週 template: { "0-9": "work", ... }
const SLOTS_KEY = 'supp-slots-v1';
const SKINCARE_KEY = 'skincare-v1';
const HEALTH_RECORD_PREFIX = 'health:'; // health:YYYY-MM-DD = { supps:{}, skincare:{} }

const fmtDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDateZh = (d) => `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
const fmtWeekday = (d) => ['日', '一', '二', '三', '四', '五', '六'][d.getDay()];
const isSameDate = (a, b) => fmtDate(a) === fmtDate(b);
const formatHour = (h) => `${h.toString().padStart(2, '0')}:00`;
// 將 JS day (0=Sun) 轉做我哋嘅 (0=Mon, 6=Sun)
const jsDayToMonIdx = (d) => d === 0 ? 6 : d - 1;

export default function App() {
  const [tab, setTab] = useState('plan');
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [template, setTemplate] = useState({}); // 週 template
  const [slots, setSlots] = useState(DEFAULT_SUPPLEMENT_SLOTS);
  const [skincare, setSkincare] = useState(DEFAULT_SKINCARE);
  const [loading, setLoading] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [a, t, s, k] = await Promise.all([
          window.storage.get(ACTIVITIES_KEY).catch(() => null),
          window.storage.get(TEMPLATE_KEY).catch(() => null),
          window.storage.get(SLOTS_KEY).catch(() => null),
          window.storage.get(SKINCARE_KEY).catch(() => null),
        ]);
        if (a?.value) setActivities(JSON.parse(a.value));
        if (t?.value) setTemplate(JSON.parse(t.value));
        if (s?.value) setSlots(JSON.parse(s.value));
        if (k?.value) setSkincare(JSON.parse(k.value));
      } finally { setLoading(false); }
    })();
  }, []);

  const flashSaved = () => { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1000); };
  const saveActivities = async (n) => { setActivities(n); try { await window.storage.set(ACTIVITIES_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };
  const saveTemplate = async (n) => { setTemplate(n); try { await window.storage.set(TEMPLATE_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };
  const saveSlots = async (n) => { setSlots(n); try { await window.storage.set(SLOTS_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };
  const saveSkincare = async (n) => { setSkincare(n); try { await window.storage.set(SKINCARE_KEY, JSON.stringify(n)); flashSaved(); } catch(e){} };

  if (loading) {
    return <div className="min-h-screen bg-stone-50 flex items-center justify-center"><p className="text-stone-500" style={{fontFamily:'Georgia, serif'}}>載入緊...</p></div>;
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: 'linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)', fontFamily: '"Helvetica Neue", -apple-system, sans-serif' }}>
      <header className="px-5 pt-7 pb-3 sticky top-0 z-30" style={{ background: 'rgba(250, 250, 249, 0.92)', backdropFilter: 'blur(12px)' }}>
        <div className="mb-3">
          <p className="text-[10px] tracking-[0.3em] text-stone-500 uppercase mb-0.5">My Planner</p>
          <h1 className="text-2xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 400, letterSpacing: '-0.02em' }}>每週計劃</h1>
        </div>

        {/* 3 個 Tab */}
        <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full">
          {[
            { id: 'plan', label: '計劃', icon: Clock },
            { id: 'health', label: '健康', icon: Heart },
            { id: 'report', label: '統計報告', icon: FileText },
          ].map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5"
                style={{
                  background: active ? 'white' : 'transparent',
                  fontWeight: active ? 600 : 400,
                  color: active ? '#1c1917' : '#78716c',
                  boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <Icon size={13} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main className="px-4 pt-3">
        {tab === 'plan' && <PlanTab activities={activities} template={template} onSaveTemplate={saveTemplate} onSaveActivities={saveActivities} />}
        {tab === 'health' && <HealthTab slots={slots} skincare={skincare} onSaveSlots={saveSlots} onSaveSkincare={saveSkincare} />}
        {tab === 'report' && <ReportTab activities={activities} template={template} slots={slots} skincare={skincare} />}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 px-4 pb-5 pt-3 z-20 pointer-events-none" style={{ background: 'linear-gradient(0deg, rgba(250,250,249,1) 60%, rgba(250,250,249,0))' }}>
        <div className="flex items-center justify-center text-xs text-stone-500">
          {savedFlash ? <span className="flex items-center gap-1.5"><Check size={14} className="text-emerald-600" /><span className="text-emerald-700">已儲存</span></span> : <span style={{ fontFamily: 'Georgia, serif' }} className="italic">自動儲存</span>}
        </div>
      </footer>
    </div>
  );
}

// ============ Plan Tab（週 template） ============

function PlanTab({ activities, template, onSaveTemplate, onSaveActivities }) {
  const [view, setView] = useState('day');
  const [currentDay, setCurrentDay] = useState(jsDayToMonIdx(new Date().getDay()));
  const [openPicker, setOpenPicker] = useState(null);
  const [managing, setManaging] = useState(false);

  const cellKey = (day, hour) => `${day}-${hour}`;
  const getActivity = (id) => activities.find(a => a.id === id);

  const handleSelect = (day, hour, actId) => {
    onSaveTemplate({ ...template, [cellKey(day, hour)]: actId });
    setOpenPicker(null);
  };
  const handleClear = (day, hour) => {
    const next = { ...template };
    delete next[cellKey(day, hour)];
    onSaveTemplate(next);
    setOpenPicker(null);
  };
  const handleClearDay = (day) => {
    if (!confirm(`清空${DAYS[day].full}所有時段？`)) return;
    const next = {};
    Object.keys(template).forEach(k => {
      if (!k.startsWith(`${day}-`)) next[k] = template[k];
    });
    onSaveTemplate(next);
  };

  const dayFilledCount = HOURS.filter(h => template[cellKey(currentDay, h)]).length;

  return (
    <div>
      {/* View switcher */}
      <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full mb-3">
        <button onClick={() => setView('day')} className="flex-1 py-2 rounded-full text-sm transition-all" style={{ background: view === 'day' ? 'white' : 'transparent', fontWeight: view === 'day' ? 600 : 400, color: view === 'day' ? '#1c1917' : '#78716c', boxShadow: view === 'day' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>日視圖</button>
        <button onClick={() => setView('week')} className="flex-1 py-2 rounded-full text-sm transition-all" style={{ background: view === 'week' ? 'white' : 'transparent', fontWeight: view === 'week' ? 600 : 400, color: view === 'week' ? '#1c1917' : '#78716c', boxShadow: view === 'week' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>週視圖</button>
      </div>

      {view === 'day' && (
        <>
          {/* Day picker */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <button onClick={() => setCurrentDay((currentDay + 6) % 7)} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95">
              <ChevronLeft size={15} className="text-stone-700" />
            </button>
            <div className="flex-1 flex gap-1 justify-center">
              {DAYS.map(d => (
                <button key={d.id} onClick={() => setCurrentDay(d.id)} className="w-9 h-9 rounded-full text-sm transition-all flex items-center justify-center" style={{ background: currentDay === d.id ? '#1c1917' : 'transparent', color: currentDay === d.id ? 'white' : '#78716c', fontWeight: currentDay === d.id ? 600 : 400 }}>
                  {d.label}
                </button>
              ))}
            </div>
            <button onClick={() => setCurrentDay((currentDay + 1) % 7)} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95">
              <ChevronRight size={15} className="text-stone-700" />
            </button>
          </div>

          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>{DAYS[currentDay].full}</h2>
            <div className="flex items-center gap-2">
              <p className="text-xs text-stone-500" style={{ fontFamily: 'Georgia, serif' }}>
                <span className="text-base text-stone-900" style={{ fontWeight: 500 }}>{dayFilledCount}</span><span className="mx-1">/</span>24
              </p>
              <button onClick={() => setManaging(true)} className="text-xs text-stone-600 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-stone-200 active:scale-95">
                <Settings size={11} />管理
              </button>
            </div>
          </div>

          {HOURS.map(hour => {
            const key = cellKey(currentDay, hour);
            const actId = template[key];
            const activity = actId ? getActivity(actId) : null;
            const isOpen = openPicker === key;
            return (
              <div key={hour} className="mb-1.5">
                <button onClick={() => setOpenPicker(isOpen ? null : key)} className="w-full text-left rounded-xl transition-all active:scale-[0.98]" style={{ background: activity ? activity.color + '15' : '#ffffff', border: `1px solid ${activity ? activity.color + '35' : '#e7e5e4'}`, padding: '12px 16px' }}>
                  <div className="flex items-center gap-3">
                    <p className="text-base text-stone-900 w-14 flex-shrink-0" style={{ fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>{formatHour(hour)}</p>
                    <div className="flex-1 flex items-center gap-2.5">
                      {activity ? (
                        <>
                          <span className="text-xl">{activity.emoji}</span>
                          <span className="text-base text-stone-900" style={{ fontWeight: 500 }}>{activity.label}</span>
                        </>
                      ) : (
                        <span className="text-stone-400 text-sm italic" style={{ fontFamily: 'Georgia, serif' }}>輕觸新增 ⋯</span>
                      )}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full transition-transform" style={{ background: activity ? activity.color : '#d6d3d1', transform: isOpen ? 'scale(2.2)' : 'scale(1)' }} />
                  </div>
                </button>

                {isOpen && (
                  <div className="mt-1.5 p-3 rounded-xl bg-white border border-stone-200" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                    <div className="grid grid-cols-4 gap-1.5 mb-2">
                      {activities.map(act => {
                        const selected = actId === act.id;
                        return (
                          <button key={act.id} onClick={() => handleSelect(currentDay, hour, act.id)} className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg transition-all active:scale-95" style={{ background: selected ? act.color : act.color + '15', border: `1px solid ${selected ? act.color : 'transparent'}` }}>
                            <span className="text-lg leading-none">{act.emoji}</span>
                            <span className="text-[11px] leading-tight" style={{ color: selected ? 'white' : '#1c1917', fontWeight: selected ? 600 : 500 }}>{act.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    {activity && (
                      <button onClick={() => handleClear(currentDay, hour)} className="w-full py-2 rounded-lg text-xs text-stone-600 bg-stone-100 active:bg-stone-200 flex items-center justify-center gap-1.5">
                        <Trash2 size={12} />清除
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {dayFilledCount > 0 && (
            <button onClick={() => handleClearDay(currentDay)} className="w-full mt-4 py-2.5 rounded-xl text-xs text-stone-500 bg-white border border-stone-200 active:bg-stone-50 flex items-center justify-center gap-1.5">
              <Trash2 size={12} />清空{DAYS[currentDay].full}
            </button>
          )}
        </>
      )}

      {view === 'week' && (
        <div className="overflow-x-auto -mx-4 px-2">
          <div className="min-w-[640px]">
            <div className="flex sticky top-0 bg-stone-50 z-10 pb-1">
              <div className="w-12 flex-shrink-0" />
              {DAYS.map(d => (
                <div key={d.id} className="flex-1 text-center py-2">
                  <p className="text-sm text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>{d.label}</p>
                </div>
              ))}
            </div>

            {HOURS.map(hour => (
              <div key={hour} className="flex items-stretch border-b border-stone-100" style={{ minHeight: '36px' }}>
                <div className="w-12 flex-shrink-0 flex items-start justify-end pr-1.5 pt-1">
                  <p className="text-[10px] text-stone-500" style={{ fontFamily: 'Georgia, serif', fontVariantNumeric: 'tabular-nums' }}>{formatHour(hour)}</p>
                </div>
                {DAYS.map(d => {
                  const key = cellKey(d.id, hour);
                  const actId = template[key];
                  const activity = actId ? getActivity(actId) : null;
                  return (
                    <button
                      key={d.id}
                      onClick={() => { setCurrentDay(d.id); setView('day'); setOpenPicker(key); }}
                      className="flex-1 m-0.5 rounded-md flex items-center justify-center active:scale-95"
                      style={{ background: activity ? activity.color : '#fff', border: activity ? 'none' : '1px solid #e7e5e4' }}
                      title={activity ? activity.label : '空'}
                    >
                      {activity && <span className="text-xs">{activity.emoji}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="pt-4 pb-2 px-2">
            <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">圖例</p>
            <div className="flex flex-wrap gap-1.5">
              {activities.map(act => (
                <div key={act.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ background: act.color + '15', color: '#1c1917' }}>
                  <span>{act.emoji}</span>
                  <span>{act.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {managing && <ActivityManager activities={activities} onSave={onSaveActivities} onClose={() => setManaging(false)} />}
    </div>
  );
}

// ============ Health Tab（Supp + 護膚 + 日期 nav） ============

function HealthTab({ slots, skincare, onSaveSlots, onSaveSkincare }) {
  const [section, setSection] = useState('supps');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [record, setRecord] = useState({ supps: {}, skincare: {} });

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(HEALTH_RECORD_PREFIX + fmtDate(currentDate)).catch(() => null);
        if (r?.value) {
          const p = JSON.parse(r.value);
          setRecord({ supps: p.supps || {}, skincare: p.skincare || {} });
        } else {
          setRecord({ supps: {}, skincare: {} });
        }
      } catch { setRecord({ supps: {}, skincare: {} }); }
    })();
  }, [currentDate]);

  const saveRecord = async (n) => {
    setRecord(n);
    try { await window.storage.set(HEALTH_RECORD_PREFIX + fmtDate(currentDate), JSON.stringify(n)); } catch(e){}
  };
  const toggleSupp = (sId, iId) => { const k = `${sId}:${iId}`; saveRecord({ ...record, supps: { ...record.supps, [k]: !record.supps[k] } }); };
  const toggleSkin = (p, id) => { const k = `${p}:${id}`; saveRecord({ ...record, skincare: { ...record.skincare, [k]: !record.skincare[k] } }); };

  const goPrev = () => setCurrentDate(new Date(currentDate.getTime() - 86400000));
  const goNext = () => setCurrentDate(new Date(currentDate.getTime() + 86400000));
  const goToday = () => setCurrentDate(new Date());
  const isToday = isSameDate(currentDate, new Date());

  return (
    <div>
      {/* Date nav */}
      <div className="flex items-center gap-2 mb-3">
        <button onClick={goPrev} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95">
          <ChevronLeft size={15} className="text-stone-700" />
        </button>
        <button onClick={goToday} className="flex-1 py-2 px-3 rounded-full text-center active:scale-95 text-sm" style={{ background: isToday ? '#1c1917' : 'white', border: `1px solid ${isToday ? '#1c1917' : '#e7e5e4'}`, color: isToday ? 'white' : '#1c1917' }}>
          <span style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}>{fmtDateZh(currentDate)}</span>
          <span className="text-xs ml-1.5 opacity-60">星期{fmtWeekday(currentDate)}</span>
          {isToday && <span className="text-[10px] ml-1.5 opacity-80">· 今日</span>}
        </button>
        <button onClick={goNext} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95">
          <ChevronRight size={15} className="text-stone-700" />
        </button>
      </div>

      {/* Section switcher */}
      <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full mb-4">
        <button onClick={() => setSection('supps')} className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5" style={{ background: section === 'supps' ? 'white' : 'transparent', fontWeight: section === 'supps' ? 600 : 400, color: section === 'supps' ? '#1c1917' : '#78716c', boxShadow: section === 'supps' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
          <Pill size={13} />Supplements
        </button>
        <button onClick={() => setSection('skincare')} className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5" style={{ background: section === 'skincare' ? 'white' : 'transparent', fontWeight: section === 'skincare' ? 600 : 400, color: section === 'skincare' ? '#1c1917' : '#78716c', boxShadow: section === 'skincare' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
          <Sparkles size={13} />護膚
        </button>
      </div>

      {section === 'supps' && <SupplementsSection slots={slots} record={record} onToggle={toggleSupp} onSaveSlots={onSaveSlots} />}
      {section === 'skincare' && <SkincareSection skincare={skincare} record={record} onToggle={toggleSkin} onSaveSkincare={onSaveSkincare} />}
    </div>
  );
}

function SupplementsSection({ slots, record, onToggle, onSaveSlots }) {
  const [managing, setManaging] = useState(false);
  const totalItems = slots.reduce((s, sl) => s + sl.items.length, 0);
  const checkedItems = slots.reduce((s, sl) => s + sl.items.filter(i => record.supps[`${sl.id}:${i.id}`]).length, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <p className="text-xs text-stone-500" style={{ fontFamily: 'Georgia, serif' }}>
          <span className="text-base text-stone-900" style={{ fontWeight: 500 }}>{checkedItems}</span><span className="mx-1">/</span>{totalItems} 已食
        </p>
        <button onClick={() => setManaging(true)} className="text-xs text-stone-600 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-stone-200 active:scale-95">
          <Settings size={11} />管理
        </button>
      </div>

      {slots.length === 0 && <EmptyState icon={Pill} title="未有時段" desc="撳「管理」加入時段" />}

      {slots.map(slot => (
        <div key={slot.id} className="mb-4">
          <div className="flex items-baseline gap-2 mb-2 px-1">
            <span className="text-lg">{slot.emoji}</span>
            <h3 className="text-base text-stone-900" style={{ fontWeight: 600 }}>{slot.label}</h3>
            <span className="text-[11px] text-stone-400 ml-auto">{slot.items.filter(i => record.supps[`${slot.id}:${i.id}`]).length}/{slot.items.length}</span>
          </div>
          {slot.items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-stone-300 py-4 text-center"><p className="text-xs text-stone-400 italic" style={{ fontFamily: 'Georgia, serif' }}>未有項目</p></div>
          ) : slot.items.map(item => {
            const checked = !!record.supps[`${slot.id}:${item.id}`];
            return (
              <button key={item.id} onClick={() => onToggle(slot.id, item.id)} className="w-full mb-1.5 rounded-xl flex items-center gap-3 py-3 px-4 transition-all active:scale-[0.98]" style={{ background: checked ? '#ecfdf5' : '#ffffff', border: `1px solid ${checked ? '#10b981' : '#e7e5e4'}` }}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: checked ? '#10b981' : 'transparent', border: checked ? 'none' : '2px solid #d6d3d1' }}>
                  {checked && <Check size={14} color="white" strokeWidth={3} />}
                </div>
                <span className="text-base flex-1 text-left" style={{ color: checked ? '#065f46' : '#1c1917', fontWeight: 500, textDecoration: checked ? 'line-through' : 'none', textDecorationColor: '#10b98180' }}>{item.name}</span>
              </button>
            );
          })}
        </div>
      ))}

      {managing && <SupplementManager slots={slots} onSave={onSaveSlots} onClose={() => setManaging(false)} />}
    </div>
  );
}

function SkincareSection({ skincare, record, onToggle, onSaveSkincare }) {
  const [managing, setManaging] = useState(null);

  return (
    <div>
      {['am', 'pm'].map(period => {
        const steps = skincare[period];
        const checked = steps.filter(s => record.skincare[`${period}:${s.id}`]).length;
        return (
          <div key={period} className="mb-5">
            <div className="flex items-center justify-between mb-2 px-1">
              <div className="flex items-baseline gap-2">
                <span className="text-lg">{period === 'am' ? '☀️' : '🌙'}</span>
                <h3 className="text-base text-stone-900" style={{ fontWeight: 600 }}>{period === 'am' ? '早晨護膚' : '晚間護膚'}</h3>
                <span className="text-[11px] text-stone-400">{checked}/{steps.length}</span>
              </div>
              <button onClick={() => setManaging(period)} className="text-xs text-stone-600 flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-stone-200 active:scale-95"><Settings size={11} />管理</button>
            </div>
            {steps.length === 0 ? (
              <div className="rounded-xl border border-dashed border-stone-300 py-4 text-center"><p className="text-xs text-stone-400 italic" style={{ fontFamily: 'Georgia, serif' }}>未有步驟</p></div>
            ) : steps.map((step, idx) => {
              const isChecked = !!record.skincare[`${period}:${step.id}`];
              return (
                <button key={step.id} onClick={() => onToggle(period, step.id)} className="w-full mb-1.5 rounded-xl flex items-center gap-3 py-3 px-4 transition-all active:scale-[0.98]" style={{ background: isChecked ? '#eff6ff' : '#ffffff', border: `1px solid ${isChecked ? '#3b82f6' : '#e7e5e4'}` }}>
                  <span className="text-xs w-5 text-center flex-shrink-0" style={{ color: isChecked ? '#1e40af' : '#a8a29e', fontFamily: 'Georgia, serif', fontWeight: 600 }}>{idx + 1}</span>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isChecked ? '#3b82f6' : 'transparent', border: isChecked ? 'none' : '2px solid #d6d3d1' }}>
                    {isChecked && <Check size={14} color="white" strokeWidth={3} />}
                  </div>
                  <span className="text-base flex-1 text-left" style={{ color: isChecked ? '#1e3a8a' : '#1c1917', fontWeight: 500, textDecoration: isChecked ? 'line-through' : 'none', textDecorationColor: '#3b82f680' }}>{step.name}</span>
                </button>
              );
            })}
          </div>
        );
      })}

      {managing && <SkincareManager period={managing} steps={skincare[managing]} onSave={(s) => onSaveSkincare({ ...skincare, [managing]: s })} onClose={() => setManaging(null)} />}
    </div>
  );
}

// ============ Report Tab（統計 + 報告） ============

function ReportTab({ activities, template, slots, skincare }) {
  const [section, setSection] = useState('stats');

  return (
    <div>
      <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full mb-4">
        <button onClick={() => setSection('stats')} className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5" style={{ background: section === 'stats' ? 'white' : 'transparent', fontWeight: section === 'stats' ? 600 : 400, color: section === 'stats' ? '#1c1917' : '#78716c', boxShadow: section === 'stats' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
          <BarChart3 size={13} />時間統計
        </button>
        <button onClick={() => setSection('report')} className="flex-1 py-2 rounded-full text-sm transition-all flex items-center justify-center gap-1.5" style={{ background: section === 'report' ? 'white' : 'transparent', fontWeight: section === 'report' ? 600 : 400, color: section === 'report' ? '#1c1917' : '#78716c', boxShadow: section === 'report' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
          <FileText size={13} />今日報告
        </button>
      </div>

      {section === 'stats' && <StatsSection activities={activities} template={template} />}
      {section === 'report' && <DailyReportSection activities={activities} template={template} slots={slots} skincare={skincare} />}
    </div>
  );
}

function StatsSection({ activities, template }) {
  const [range, setRange] = useState('week');

  // 計算每個活動嘅時數（由 template 計）
  let stats = {};
  let totalHours = 0;

  if (range === 'day') {
    const todayIdx = jsDayToMonIdx(new Date().getDay());
    HOURS.forEach(h => {
      const id = template[`${todayIdx}-${h}`];
      if (id) {
        stats[id] = (stats[id] || 0) + 1;
        totalHours++;
      }
    });
  } else if (range === 'week') {
    DAYS.forEach(d => {
      HOURS.forEach(h => {
        const id = template[`${d.id}-${h}`];
        if (id) {
          stats[id] = (stats[id] || 0) + 1;
          totalHours++;
        }
      });
    });
  } else {
    // month = 週 × 4.33（平均）
    const weekly = {};
    let weeklyTotal = 0;
    DAYS.forEach(d => {
      HOURS.forEach(h => {
        const id = template[`${d.id}-${h}`];
        if (id) {
          weekly[id] = (weekly[id] || 0) + 1;
          weeklyTotal++;
        }
      });
    });
    Object.keys(weekly).forEach(k => { stats[k] = Math.round(weekly[k] * 4.33); });
    totalHours = Math.round(weeklyTotal * 4.33);
  }

  const sortedActs = activities.map(a => ({ ...a, hours: stats[a.id] || 0 })).sort((a, b) => b.hours - a.hours);
  const maxHours = sortedActs[0]?.hours || 1;

  const rangeLabels = { day: '今日', week: '一週', month: '一月（估算）' };

  return (
    <div>
      <div className="flex gap-1 p-1 bg-stone-200/60 rounded-full mb-3">
        {[
          { id: 'day', label: '今日' },
          { id: 'week', label: '一週' },
          { id: 'month', label: '一月' },
        ].map(r => {
          const active = range === r.id;
          return (
            <button key={r.id} onClick={() => setRange(r.id)} className="flex-1 py-2 rounded-full text-xs transition-all" style={{ background: active ? 'white' : 'transparent', fontWeight: active ? 600 : 400, color: active ? '#1c1917' : '#78716c', boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="px-1 mb-3">
        <p className="text-xs text-stone-500 italic" style={{ fontFamily: 'Georgia, serif' }}>
          根據你嘅週 template 計算 · {rangeLabels[range]}
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-stone-200 p-4 mb-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-1">總計</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>{totalHours}</span>
          <span className="text-base text-stone-500">小時</span>
        </div>
      </div>

      {totalHours === 0 ? (
        <EmptyState icon={BarChart3} title="未有計劃" desc="去「計劃」tab 填寫先" />
      ) : (
        <div>
          <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2 px-1">分佈</p>
          {sortedActs.map(act => {
            if (act.hours === 0) return null;
            const pct = totalHours > 0 ? (act.hours / totalHours * 100) : 0;
            const barPct = (act.hours / maxHours * 100);
            return (
              <div key={act.id} className="mb-3">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{act.emoji}</span>
                    <span className="text-sm text-stone-900" style={{ fontWeight: 500 }}>{act.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-base text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{act.hours}</span>
                    <span className="text-[10px] text-stone-500">小時</span>
                    <span className="text-[10px] text-stone-400 ml-1">({pct.toFixed(0)}%)</span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                  <div className="h-full transition-all duration-500" style={{ width: `${barPct}%`, background: act.color }} />
                </div>
              </div>
            );
          })}

          {sortedActs.filter(a => a.hours === 0).length > 0 && (
            <details className="mt-4">
              <summary className="text-xs text-stone-400 italic cursor-pointer px-1" style={{ fontFamily: 'Georgia, serif' }}>未有時段嘅活動（{sortedActs.filter(a => a.hours === 0).length}）</summary>
              <div className="mt-2 flex flex-wrap gap-1.5 px-1">
                {sortedActs.filter(a => a.hours === 0).map(a => (
                  <div key={a.id} className="flex items-center gap-1 px-2 py-1 rounded-full bg-stone-100 text-xs text-stone-500">
                    <span>{a.emoji}</span>
                    <span>{a.label}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function DailyReportSection({ activities, template, slots, skincare }) {
  const [copied, setCopied] = useState(false);
  const [todayRecord, setTodayRecord] = useState({ supps: {}, skincare: {} });
  const today = new Date();
  const todayIdx = jsDayToMonIdx(today.getDay());

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(HEALTH_RECORD_PREFIX + fmtDate(today)).catch(() => null);
        if (r?.value) setTodayRecord(JSON.parse(r.value));
      } catch {}
    })();
  }, []);

  const getActivity = (id) => activities.find(a => a.id === id);

  const generateReport = () => {
    const lines = [];
    lines.push(`📋 每日報告 ── ${fmtDateZh(today)}（星期${fmtWeekday(today)}）`);
    lines.push('');

    // Plan (from template)
    lines.push('⏰ 今日計劃');
    lines.push('─────────────');
    const todaysPlan = HOURS.filter(h => template[`${todayIdx}-${h}`]);
    if (todaysPlan.length === 0) {
      lines.push('（未設定計劃）');
    } else {
      todaysPlan.forEach(h => {
        const a = getActivity(template[`${todayIdx}-${h}`]);
        if (!a) return;
        lines.push(`${formatHour(h)}  ${a.emoji} ${a.label}`);
      });
      lines.push(`\n小計：${todaysPlan.length} 個時段`);
    }
    lines.push('');

    // Supplements
    lines.push('💊 SUPPLEMENTS');
    lines.push('─────────────');
    let totalSupps = 0, checkedSupps = 0;
    slots.forEach(slot => {
      if (slot.items.length === 0) return;
      const sC = slot.items.filter(i => todayRecord.supps?.[`${slot.id}:${i.id}`]).length;
      totalSupps += slot.items.length;
      checkedSupps += sC;
      lines.push(`\n${slot.emoji} ${slot.label}（${sC}/${slot.items.length}）`);
      slot.items.forEach(item => {
        const c = !!todayRecord.supps?.[`${slot.id}:${item.id}`];
        lines.push(`  ${c ? '✅' : '⬜'} ${item.name}`);
      });
    });
    if (totalSupps === 0) lines.push('（未設定）');
    else lines.push(`\n小計：${checkedSupps}/${totalSupps}`);
    lines.push('');

    // Skincare
    lines.push('🧴 護膚');
    lines.push('─────────────');
    let totalSkin = 0, checkedSkin = 0;
    ['am', 'pm'].forEach(p => {
      const steps = skincare[p];
      if (steps.length === 0) return;
      const sC = steps.filter(s => todayRecord.skincare?.[`${p}:${s.id}`]).length;
      totalSkin += steps.length;
      checkedSkin += sC;
      const em = p === 'am' ? '☀️' : '🌙';
      const lb = p === 'am' ? '早晨' : '晚間';
      lines.push(`\n${em} ${lb}（${sC}/${steps.length}）`);
      steps.forEach(step => {
        const c = !!todayRecord.skincare?.[`${p}:${step.id}`];
        lines.push(`  ${c ? '✅' : '⬜'} ${step.name}`);
      });
    });
    if (totalSkin === 0) lines.push('（未設定）');
    else lines.push(`\n小計：${checkedSkin}/${totalSkin}`);
    lines.push('');

    lines.push('━━━━━━━━━━━━━');
    const totalChecks = totalSupps + totalSkin;
    const doneChecks = checkedSupps + checkedSkin;
    const pct = totalChecks > 0 ? Math.round((doneChecks / totalChecks) * 100) : 0;
    lines.push(`📊 健康完成率：${doneChecks}/${totalChecks}（${pct}%）`);
    lines.push(`⏰ 計劃時段：${todaysPlan.length}/24`);

    return lines.join('\n');
  };

  const report = generateReport();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = report;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      document.body.removeChild(ta);
    }
  };

  return (
    <div>
      <div className="px-1 mb-3">
        <p className="text-xs text-stone-500 italic" style={{ fontFamily: 'Georgia, serif' }}>一撳 Copy 貼去 WhatsApp / Telegram</p>
      </div>
      <div className="rounded-2xl bg-white border border-stone-200 p-4 mb-3" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <pre className="whitespace-pre-wrap text-sm text-stone-800 leading-relaxed" style={{ fontFamily: '-apple-system, "Helvetica Neue", sans-serif', wordBreak: 'break-word' }}>{report}</pre>
      </div>
      <button onClick={handleCopy} className="w-full py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98]" style={{ background: copied ? '#10b981' : '#1c1917', color: 'white', fontWeight: 500 }}>
        {copied ? <><Check size={16} /><span>已複製！</span></> : <><Copy size={16} /><span>複製報告</span></>}
      </button>
    </div>
  );
}

// ============ Activity Manager ============

function ActivityManager({ activities, onSave, onClose }) {
  const [local, setLocal] = useState(activities);
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const handleClose = () => { onSave(local); onClose(); };
  const addAct = (data) => { setLocal([...local, { ...data, id: `custom-${Date.now()}` }]); setAdding(false); };
  const updateAct = (id, data) => setLocal(local.map(a => a.id === id ? { ...a, ...data } : a));
  const deleteAct = (id) => { if (!confirm('刪除呢個類別？')) return; setLocal(local.filter(a => a.id !== id)); };
  const moveAct = (id, dir) => {
    const idx = local.findIndex(a => a.id === id);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= local.length) return;
    const next = [...local];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setLocal(next);
  };

  return (
    <Modal title="活動類別" onClose={handleClose}>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => { setReorderMode(!reorderMode); setEditingId(null); setAdding(false); }} className="px-3 h-8 rounded-full border border-stone-200 text-xs flex items-center gap-1.5 active:scale-95" style={{ background: reorderMode ? '#1c1917' : 'white', color: reorderMode ? 'white' : '#44403c', fontWeight: 500 }}>
          <GripVertical size={11} />{reorderMode ? '完成排序' : '排序'}
        </button>
      </div>

      {local.map((act, idx) => {
        if (editingId === act.id) return <ActivityForm key={act.id} initial={act} onSubmit={(data) => { updateAct(act.id, data); setEditingId(null); }} onCancel={() => setEditingId(null)} />;
        return (
          <div key={act.id} className="flex items-center gap-3 py-2.5 px-4 mb-1.5 rounded-xl bg-white border border-stone-200">
            <span className="text-lg">{act.emoji}</span>
            <span className="flex-1 text-sm text-stone-900 truncate" style={{ fontWeight: 500 }}>{act.label}</span>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: act.color }} />
            {reorderMode ? (
              <div className="flex gap-1">
                <button onClick={() => moveAct(act.id, 'up')} disabled={idx === 0} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowUp size={11} className="text-stone-600" /></button>
                <button onClick={() => moveAct(act.id, 'down')} disabled={idx === local.length - 1} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowDown size={11} className="text-stone-600" /></button>
              </div>
            ) : (
              <div className="flex gap-1">
                <button onClick={() => setEditingId(act.id)} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center active:scale-95"><Pencil size={10} className="text-stone-600" /></button>
                <button onClick={() => deleteAct(act.id)} className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center active:scale-95"><Trash2 size={10} className="text-stone-500" /></button>
              </div>
            )}
          </div>
        );
      })}

      {!reorderMode && (adding ? <ActivityForm onSubmit={addAct} onCancel={() => setAdding(false)} /> : (
        <button onClick={() => setAdding(true)} className="w-full mt-2 py-3 rounded-xl bg-white border border-dashed border-stone-300 text-stone-700 active:bg-stone-50 flex items-center justify-center gap-2 text-sm" style={{ fontWeight: 500 }}>
          <Plus size={14} />新增活動類別
        </button>
      ))}
    </Modal>
  );
}

function ActivityForm({ initial, onSubmit, onCancel }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '✨');
  const [color, setColor] = useState(initial?.color || COLOR_PALETTE[6]);

  return (
    <div className="p-3 mb-2 rounded-xl bg-white border-2 border-stone-900">
      <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">{initial ? '編輯' : '新增'}類別</p>
      <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="例如：閱讀、家務..." maxLength={8} className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm mb-2 outline-none focus:border-stone-400" />
      <p className="text-[10px] text-stone-500 mb-1">圖示</p>
      <div className="grid grid-cols-9 gap-1 mb-2 max-h-32 overflow-y-auto">
        {ACTIVITY_EMOJIS.map(em => (
          <button key={em} onClick={() => setEmoji(em)} className="aspect-square rounded-md text-base" style={{ background: emoji === em ? '#1c1917' : '#fafaf9', border: `1px solid ${emoji === em ? '#1c1917' : '#e7e5e4'}` }}>{em}</button>
        ))}
      </div>
      <p className="text-[10px] text-stone-500 mb-1">顏色</p>
      <div className="grid grid-cols-12 gap-1 mb-3">
        {COLOR_PALETTE.map(c => (
          <button key={c} onClick={() => setColor(c)} className="aspect-square rounded-full" style={{ background: c, transform: color === c ? 'scale(1.15)' : 'scale(1)', boxShadow: color === c ? `0 0 0 2px white, 0 0 0 4px ${c}` : 'none' }} />
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-xs text-stone-600 bg-stone-100">取消</button>
        <button onClick={() => { if (label.trim()) onSubmit({ label: label.trim(), emoji, color }); }} disabled={!label.trim()} className="flex-1 py-2 rounded-lg text-xs text-white bg-stone-900 disabled:opacity-30" style={{ fontWeight: 500 }}>{initial ? '儲存' : '加入'}</button>
      </div>
    </div>
  );
}

// ============ Supplement Manager ============

function SupplementManager({ slots, onSave, onClose }) {
  const [local, setLocal] = useState(slots);
  const [editingSlotId, setEditingSlotId] = useState(null);
  const [addingSlot, setAddingSlot] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  const handleClose = () => { onSave(local); onClose(); };
  const addSlot = (data) => { setLocal([...local, { ...data, id: `slot-${Date.now()}`, items: [] }]); setAddingSlot(false); };
  const updateSlot = (id, data) => setLocal(local.map(s => s.id === id ? { ...s, ...data } : s));
  const deleteSlot = (id) => { if (!confirm('刪除呢個時段同所有 supplement？')) return; setLocal(local.filter(s => s.id !== id)); };
  const moveSlot = (id, dir) => {
    const idx = local.findIndex(s => s.id === id);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= local.length) return;
    const next = [...local];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setLocal(next);
  };
  const addItem = (sId, name) => setLocal(local.map(s => s.id === sId ? { ...s, items: [...s.items, { id: `item-${Date.now()}`, name }] } : s));
  const updateItem = (sId, iId, name) => setLocal(local.map(s => s.id === sId ? { ...s, items: s.items.map(i => i.id === iId ? { ...i, name } : i) } : s));
  const deleteItem = (sId, iId) => setLocal(local.map(s => s.id === sId ? { ...s, items: s.items.filter(i => i.id !== iId) } : s));

  return (
    <Modal title="管理 Supplements" onClose={handleClose}>
      <div className="flex items-center gap-2 mb-3">
        <button onClick={() => setReorderMode(!reorderMode)} className="px-3 h-8 rounded-full border border-stone-200 text-xs flex items-center gap-1.5 active:scale-95" style={{ background: reorderMode ? '#1c1917' : 'white', color: reorderMode ? 'white' : '#44403c', fontWeight: 500 }}>
          <GripVertical size={11} />{reorderMode ? '完成排序' : '排序時段'}
        </button>
      </div>

      {local.map((slot, idx) => (
        <div key={slot.id} className="mb-3">
          {editingSlotId === slot.id ? (
            <SlotForm initial={slot} onSubmit={(d) => { updateSlot(slot.id, d); setEditingSlotId(null); }} onCancel={() => setEditingSlotId(null)} />
          ) : (
            <div className="rounded-xl bg-white border border-stone-200 overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-stone-50 border-b border-stone-200">
                <span className="text-lg">{slot.emoji}</span>
                <span className="flex-1 text-sm text-stone-900" style={{ fontWeight: 600 }}>{slot.label}</span>
                {reorderMode ? (
                  <div className="flex gap-1">
                    <button onClick={() => moveSlot(slot.id, 'up')} disabled={idx === 0} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowUp size={11} /></button>
                    <button onClick={() => moveSlot(slot.id, 'down')} disabled={idx === local.length - 1} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowDown size={11} /></button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <button onClick={() => setEditingSlotId(slot.id)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><Pencil size={10} className="text-stone-600" /></button>
                    <button onClick={() => deleteSlot(slot.id)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><Trash2 size={10} className="text-stone-500" /></button>
                  </div>
                )}
              </div>
              {!reorderMode && <ItemsEditor items={slot.items} onAdd={(n) => addItem(slot.id, n)} onUpdate={(iId, n) => updateItem(slot.id, iId, n)} onDelete={(iId) => deleteItem(slot.id, iId)} placeholder="例如：維他命 C" />}
            </div>
          )}
        </div>
      ))}

      {!reorderMode && (addingSlot ? <SlotForm onSubmit={addSlot} onCancel={() => setAddingSlot(false)} /> : (
        <button onClick={() => setAddingSlot(true)} className="w-full py-3 rounded-xl bg-white border border-dashed border-stone-300 text-stone-700 active:bg-stone-50 flex items-center justify-center gap-2 text-sm" style={{ fontWeight: 500 }}>
          <Plus size={14} />新增時段
        </button>
      ))}
    </Modal>
  );
}

function SlotForm({ initial, onSubmit, onCancel }) {
  const [label, setLabel] = useState(initial?.label || '');
  const [emoji, setEmoji] = useState(initial?.emoji || '⏰');

  return (
    <div className="p-3 mb-2 rounded-xl bg-white border-2 border-stone-900">
      <p className="text-[10px] tracking-widest text-stone-500 uppercase mb-2">{initial ? '編輯' : '新增'}時段</p>
      <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="例如：早餐後..." maxLength={10} className="w-full px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm mb-2 outline-none focus:border-stone-400" />
      <p className="text-[10px] text-stone-500 mb-1">圖示</p>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {SLOT_EMOJIS.map(em => (
          <button key={em} onClick={() => setEmoji(em)} className="aspect-square rounded-md text-base" style={{ background: emoji === em ? '#1c1917' : '#fafaf9', border: `1px solid ${emoji === em ? '#1c1917' : '#e7e5e4'}` }}>{em}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 py-2 rounded-lg text-xs text-stone-600 bg-stone-100">取消</button>
        <button onClick={() => { if (label.trim()) onSubmit({ label: label.trim(), emoji }); }} disabled={!label.trim()} className="flex-1 py-2 rounded-lg text-xs text-white bg-stone-900 disabled:opacity-30" style={{ fontWeight: 500 }}>{initial ? '儲存' : '加入'}</button>
      </div>
    </div>
  );
}

// ============ Skincare Manager ============

function SkincareManager({ period, steps, onSave, onClose }) {
  const [local, setLocal] = useState(steps);
  const handleClose = () => { onSave(local); onClose(); };
  const addStep = (n) => setLocal([...local, { id: `step-${Date.now()}`, name: n }]);
  const updateStep = (id, n) => setLocal(local.map(s => s.id === id ? { ...s, name: n } : s));
  const deleteStep = (id) => setLocal(local.filter(s => s.id !== id));
  const moveStep = (id, dir) => {
    const idx = local.findIndex(s => s.id === id);
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= local.length) return;
    const next = [...local];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setLocal(next);
  };

  return (
    <Modal title={`管理${period === 'am' ? '早晨' : '晚間'}護膚`} onClose={handleClose}>
      <ItemsEditor items={local} onAdd={addStep} onUpdate={updateStep} onDelete={deleteStep} onMove={moveStep} placeholder="例如：潔面" numbered />
    </Modal>
  );
}

// ============ Items Editor ============

function ItemsEditor({ items, onAdd, onUpdate, onDelete, onMove, placeholder, numbered }) {
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [newText, setNewText] = useState('');

  const startEdit = (item) => { setEditingId(item.id); setEditText(item.name); };
  const commitEdit = () => { if (editText.trim() && editingId) onUpdate(editingId, editText.trim()); setEditingId(null); setEditText(''); };
  const handleAdd = () => { if (newText.trim()) { onAdd(newText.trim()); setNewText(''); } };

  return (
    <div className="p-3">
      {items.length === 0 && <p className="text-xs text-stone-400 italic text-center py-3" style={{ fontFamily: 'Georgia, serif' }}>未有項目</p>}
      {items.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2 mb-1.5">
          {numbered && <span className="text-xs w-5 text-center text-stone-400" style={{ fontFamily: 'Georgia, serif', fontWeight: 600 }}>{idx + 1}</span>}
          {editingId === item.id ? (
            <input type="text" value={editText} onChange={e => setEditText(e.target.value)} onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditingId(null); setEditText(''); } }} autoFocus className="flex-1 px-3 py-2 rounded-lg bg-white border-2 border-stone-900 text-sm outline-none" />
          ) : (
            <>
              <span className="flex-1 px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 text-sm text-stone-800">{item.name}</span>
              {onMove && (
                <>
                  <button onClick={() => onMove(item.id, 'up')} disabled={idx === 0} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowUp size={10} className="text-stone-600" /></button>
                  <button onClick={() => onMove(item.id, 'down')} disabled={idx === items.length - 1} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center disabled:opacity-30 active:scale-95"><ArrowDown size={10} className="text-stone-600" /></button>
                </>
              )}
              <button onClick={() => startEdit(item)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><Pencil size={10} className="text-stone-600" /></button>
              <button onClick={() => onDelete(item.id)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><Trash2 size={10} className="text-stone-500" /></button>
            </>
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 mt-2">
        {numbered && <span className="w-5" />}
        <input type="text" value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }} placeholder={placeholder} className="flex-1 px-3 py-2 rounded-lg bg-white border border-stone-200 text-sm outline-none focus:border-stone-400" />
        <button onClick={handleAdd} disabled={!newText.trim()} className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center disabled:opacity-30 active:scale-95"><Plus size={14} /></button>
      </div>
    </div>
  );
}

// ============ Shared ============

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full sm:max-w-md bg-stone-50 rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto" style={{ boxShadow: '0 -8px 32px rgba(0,0,0,0.12)' }}>
        <div className="px-5 pt-5 pb-3 flex items-center justify-between sticky top-0 bg-stone-50 z-10">
          <h2 className="text-xl text-stone-900" style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center active:scale-95"><X size={15} className="text-stone-600" /></button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 py-10 px-6 text-center">
      <Icon size={28} className="mx-auto text-stone-400 mb-3" />
      <p className="text-base text-stone-700 mb-1" style={{ fontWeight: 500 }}>{title}</p>
      <p className="text-xs text-stone-500 italic" style={{ fontFamily: 'Georgia, serif' }}>{desc}</p>
    </div>
  );
}
