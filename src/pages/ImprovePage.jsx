import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebase.js';
import { generateCoachPlan } from '../services/improveCoach.js';

const tips = [
  {
    icon: '🌡️',
    title: 'Cool your room',
    tip: 'The ideal sleep temperature is 16-19°C. Your body needs to drop its core temperature to fall asleep. A cool room speeds this up by up to 40 minutes.',
    tag: 'Environment',
  },
  {
    icon: '📵',
    title: 'Phone face-down 30 min before',
    tip: "Blue light suppresses melatonin for up to 3 hours. You don't need to quit screens — just flip the phone over and let the notifications wait.",
    tag: 'Habit',
  },
  {
    icon: '⏰',
    title: 'Same wake time, every day',
    tip: 'Your wake time anchors your entire sleep cycle. Consistent wake time — even weekends — is the single highest-leverage sleep habit according to sleep researchers.',
    tag: 'Routine',
  },
  {
    icon: '☀️',
    title: 'Morning light within 30 minutes',
    tip: 'Getting sunlight in your eyes within 30 minutes of waking sets your circadian clock. It makes falling asleep easier that same night — 12 to 16 hours later.',
    tag: 'Circadian',
  },
  {
    icon: '🍵',
    title: 'Caffeine cutoff at 1 PM',
    tip: 'Caffeine has a half-life of 5-7 hours. A coffee at 3 PM still has half its caffeine in your system at 9 PM. Move your last cup earlier and notice the difference.',
    tag: 'Nutrition',
  },
  {
    icon: '🧘',
    title: '4-7-8 breathing to fall asleep',
    tip: 'Inhale 4 seconds, hold 7, exhale 8. Repeat 4 times. This activates the parasympathetic nervous system and lowers heart rate — clinically shown to reduce sleep onset time.',
    tag: 'Meditation',
  },
];

function ImprovePage() {
  const { settings, playerData, players } = useAuth();
  const currentUser = playerData ?? {
    uid: '',
    displayName: 'Player',
    continent: 'Unknown',
    hasAndroidApk: false,
    currentStreak: 0,
    longestStreak: 0,
    xp: 0,
  };
  const hasGeminiKeyAtRuntime = Boolean(String(import.meta.env.VITE_GEMINI_API_KEY ?? '').trim());
  const sleepTargetHours = settings?.sleepTarget ?? 7;
  const [showMoreTips, setShowMoreTips] = useState(false);
  const [coachPlan, setCoachPlan] = useState(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [weeklyData, setWeeklyData] = useState([]);

  const sorted = useMemo(
    () =>
      [...(players ?? [])].sort((a, b) => {
        if (b.xp !== a.xp) return b.xp - a.xp;
        if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
        return b.longestStreak - a.longestStreak;
      }),
    [players]
  );
  const top3Threshold = sorted[2]?.xp ?? currentUser.xp;
  const safeXp = Number(currentUser.xp) || 0;
  const safeTop3Threshold = Number(top3Threshold) || 0;
  const gapXp = Math.max(0, safeTop3Threshold - safeXp);
  const gapFill = safeTop3Threshold > 0 ? Math.min(100, (safeXp / safeTop3Threshold) * 100) : 100;
  const nightsToClose = Math.max(1, Math.ceil(gapXp / 120));
  const targetXp = nightsToClose * 120;

  useEffect(() => {
    if (!db || !currentUser?.uid) {
      setWeeklyData([]);
      return undefined;
    }
    const sessionsQuery = query(
      collection(db, 'sleep_sessions'),
      where('uid', '==', currentUser.uid),
      orderBy('createdAt', 'desc'),
      limit(14)
    );
    const unsubscribe = onSnapshot(
      sessionsQuery,
      (snapshot) => {
        if (snapshot.empty) {
          setWeeklyData([]);
          return;
        }
        const rows = snapshot.docs
          .map((item, index) => {
            const data = item.data();
            const dateValue =
              typeof data?.createdAt?.toDate === 'function'
                ? data.createdAt.toDate()
                : new Date(Date.now() - index * 86400000);
            const hoursSlept = Number(data?.sleptHours) || 0;
            return {
              id: item.id,
              day: dateValue.toLocaleDateString('en-US', { weekday: 'short' }),
              date: dateValue.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              hoursSlept: Number(hoursSlept.toFixed(1)),
              hitTarget: Boolean(data?.hitTarget),
              xpEarned: Number(data?.xpEarned) || 0,
              isToday: dateValue.toDateString() === new Date().toDateString(),
            };
          })
          .reverse();
        setWeeklyData(rows);
      },
      () => setWeeklyData([])
    );
    return () => unsubscribe();
  }, [currentUser?.uid]);

  const bestDays = useMemo(
    () => [...weeklyData].sort((a, b) => b.xpEarned - a.xpEarned).slice(0, 3),
    [weeklyData]
  );

  const tonightFocus = useMemo(() => {
    const streak = currentUser.currentStreak;
    if (streak === 0) {
      return {
        title: 'Time to restart 🌱',
        message: `One good night resets everything. Your target is just ${sleepTargetHours}h. That's it. Just tonight.`,
        cta: 'Set a bedtime reminder',
      };
    }
    if (streak <= 6) {
      return {
        title: 'Keep the chain alive 🔗',
        message: `You're ${streak} nights in. Hit tonight and the streak bonus kicks in at day 3. You're ${Math.max(
          0,
          3 - streak
        )} nights away from bonus XP.`,
        cta: 'Protect your streak tonight',
      };
    }
    if (streak <= 13) {
      return {
        title: "You're on fire 🔥",
        message:
          "7+ day streak means +50 XP every single night. Don't break it now — you're in the bonus zone.",
        cta: 'Lock in your bonus zone',
      };
    }
    return {
      title: 'Elite territory 👑',
      message: `14+ days. +100 XP per night. Only ${Math.max(
        0,
        currentUser.longestStreak - streak
      )} nights from your personal record of ${currentUser.longestStreak} days.`,
      cta: 'Defend your legacy',
    };
  }, [currentUser.currentStreak, currentUser.longestStreak, sleepTargetHours]);

  const visibleTips = showMoreTips ? tips : tips.slice(0, 3);

  const handleGeneratePlan = async () => {
    setIsGeneratingPlan(true);
    const bestDaysSummary = bestDays
      .map((day) => `${day.day}:${day.hoursSlept}h/+${day.xpEarned}xp`)
      .join(', ');
    const plan = await generateCoachPlan({
      displayName: currentUser.displayName ?? 'Player',
      continent: currentUser.continent ?? 'Unknown',
      hasAndroidApk: Boolean(currentUser.hasAndroidApk),
      streak: currentUser.currentStreak,
      longestStreak: currentUser.longestStreak,
      xp: currentUser.xp,
      sleepTargetHours,
      gapXp,
      nightsToClose,
      bestDaysSummary,
    });
    setCoachPlan(plan);
    setIsGeneratingPlan(false);
  };

  const handleReminder = () => {
    const reminderTime = new Date();
    reminderTime.setMinutes(reminderTime.getMinutes() + 30);
    setReminderMessage(
      `Reminder set for ${reminderTime.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}.`
    );
  };

  return (
    <section className="animate-fade-up space-y-8">
      <header>
        <h1 className="font-sora text-[28px] font-extrabold text-ink">Improve</h1>
        <p className="text-text-secondary">Your personal sleep coach</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <article className="card card-hover animate-fade-up p-6" style={{ animationDelay: '50ms' }}>
          <h2 className="font-sora text-2xl font-bold text-ink">How far from Top 3?</h2>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="font-mono text-indigo">{safeXp.toLocaleString()} XP</span>
            <span className="font-mono text-amber">{safeTop3Threshold.toLocaleString()} XP</span>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-amber-pale">
            <div
              className="h-full rounded-full bg-indigo transition-all duration-700"
              style={{ width: `${Math.max(4, gapFill)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-text-secondary">
            Gap to Top 3: <span className="font-mono text-ink">{gapXp.toLocaleString()} XP</span>
          </p>

          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-border bg-card px-3 py-3">
              <p className="border-l-4 border-indigo pl-3 text-sm text-ink">
                ⚡ Hit your target {nightsToClose} more nights in a row → +{targetXp} XP
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-3">
              <p className="border-l-4 border-indigo pl-3 text-sm text-ink">
                🔥 Maintain your streak 7 days → +50 XP bonus/night
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-3">
              <p className="border-l-4 border-indigo pl-3 text-sm text-ink">
                🏆 Perfect week this Sunday → +500 XP
              </p>
            </div>
          </div>
        </article>

        <article className="card card-hover animate-fade-up relative overflow-hidden rounded-[20px] bg-indigo p-6 text-white" style={{ animationDelay: '100ms' }}>
          <svg className="absolute right-5 top-4 h-10 w-10 opacity-30" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M64 17a30 30 0 1 0 0 66 34 34 0 1 1 0-66z" fill="white" />
          </svg>
          <h3 className="font-sora text-2xl font-semibold">{tonightFocus.title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-white/90">{tonightFocus.message}</p>
          <button
            type="button"
            onClick={handleReminder}
            className="mt-5 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white"
          >
            {tonightFocus.cta}
          </button>
          {reminderMessage ? (
            <p className="mt-3 text-xs text-white/85">{reminderMessage}</p>
          ) : null}
        </article>
      </div>

      <article className="card card-hover animate-fade-up p-6" style={{ animationDelay: '125ms' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-sora text-xl font-bold text-ink">AI Night Plan</h2>
            <p className="text-sm text-text-secondary">
              Your plan is generated with Google Gemini when your API key is configured in the project (local or Vercel). Otherwise you will see a simple offline version.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={isGeneratingPlan}
            className="rounded-full border border-border bg-indigo px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isGeneratingPlan ? 'Generating...' : 'Generate tonight plan'}
          </button>
        </div>

        {coachPlan ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink">
              <span className="font-semibold">Objective:</span> {coachPlan.objective}
            </p>

            <div className="space-y-1.5 text-sm text-text-secondary">
              {coachPlan.schedule.map((step, index) => (
                <div key={step} className="grid grid-cols-[100px_1fr] gap-3 border-b border-border/70 pb-2">
                  <span className="font-mono text-indigo-light">
                    {index === 0 ? 'Afternoon' : index === 1 ? 'Evening' : 'Pre-bed'}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1.5 text-sm text-text-secondary">
              {coachPlan.actions.map((action, index) => (
                <div key={action} className="grid grid-cols-[100px_1fr] gap-3 border-b border-border/70 pb-2">
                  <span className="font-mono text-indigo-light">Action {index + 1}</span>
                  <span>{action}</span>
                </div>
              ))}
            </div>

            <p className="text-sm italic text-text-secondary">{coachPlan.motivation}</p>
            <p className="text-xs text-indigo-light">
              {coachPlan.source === 'gemini' ? (
                <>Source: Google Gemini{coachPlan.model ? ` · ${coachPlan.model}` : ''}</>
              ) : (
                <>Source: Offline (add Gemini API key to enable AI)</>
              )}
            </p>
            {coachPlan.source !== 'gemini' ? (
              <p className="text-[11px] text-amber" title="Check key scope, API restrictions, and billing in Google AI Studio">
                Gemini status: {hasGeminiKeyAtRuntime ? 'key detected in runtime' : 'key missing in runtime'} · reason: {coachPlan.fallbackReason ?? 'unknown'}
              </p>
            ) : null}
          </div>
        ) : null}
      </article>

      <article className="card card-hover animate-fade-up p-6" style={{ animationDelay: '150ms' }}>
        <h2 className="font-sora text-xl font-bold text-ink">Your Best Days</h2>
        {weeklyData.length > 0 ? (
          <div className="mt-4 grid grid-cols-7 gap-2">
            {weeklyData.map((day) => (
              <div key={`${day.date}-${day.day}`} className="text-center">
                <div
                  className={`mx-auto flex h-11 w-11 flex-col items-center justify-center rounded-lg border text-[10px] ${
                    day.hitTarget ? 'bg-mint-pale border-mint text-mint' : 'bg-amber-warm border-amber-pale text-text-secondary'
                  } ${day.isToday ? 'ring-2 ring-indigo' : ''}`}
                >
                  <span>{day.hitTarget ? '✓' : '✕'}</span>
                  <span className="font-mono">{day.hoursSlept}</span>
                </div>
                <p className="mt-1 text-[10px] text-text-secondary">{day.day}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            No tracked sleep sessions yet in Firebase. Sleep/wake from the dashboard to start generating real weekly stats.
          </p>
        )}

        <h3 className="mt-6 font-sora text-lg font-semibold text-ink">Your best nights</h3>
        {bestDays.length > 0 ? (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {bestDays.map((day, idx) => (
              <div key={`${day.date}-best`} className="rounded-xl border border-border bg-card p-4">
                <p className="font-medium text-ink">{day.day} · {day.date}</p>
                <p className="mt-1 font-mono text-3xl text-mint">{day.hoursSlept}h</p>
                <p className="mt-1 text-sm text-text-secondary">🌙 Slept {day.hoursSlept}h · Hit target · +{day.xpEarned} XP earned</p>
                <p className="mt-2 text-[13px] italic text-text-secondary">
                  {idx === 0
                    ? `You slept best on ${day.day}s — your peak this cycle.`
                    : idx === 1
                      ? `${day.day} nights are consistently high-performing for you.`
                      : `When ${day.day} works, your XP follows immediately.`}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">Your best nights will appear once Firebase sleep-session history is available.</p>
        )}
      </article>

      <article className="card card-hover animate-fade-up p-6" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-sora text-xl font-bold text-ink">Sleep Science Tips</h2>
          <button
            type="button"
            onClick={() => setShowMoreTips((value) => !value)}
            className="rounded-full border border-border bg-indigo px-3 py-1 text-xs font-medium text-white"
          >
            {showMoreTips ? 'Show less' : 'Show more'}
          </button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {visibleTips.map((tip) => (
            <article key={tip.title} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl">{tip.icon}</p>
                <span className="rounded-full bg-mint-pale px-2 py-0.5 text-[10px] text-ink">{tip.tag}</span>
              </div>
              <h3 className="mt-2 font-sora text-base font-semibold text-ink">{tip.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{tip.tip}</p>
              <div className="mt-3 rounded-md bg-indigo-pale px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-indigo-light">
                Did you know?
              </div>
            </article>
          ))}
        </div>
      </article>

      <article
        className="card card-hover animate-fade-up relative overflow-hidden p-6"
        style={{
          animationDelay: '250ms',
          backgroundImage: 'radial-gradient(rgba(124,131,255,0.14) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="font-sora text-[20px] font-bold text-ink">Wind down tonight</h2>
            <p className="text-text-secondary">A 2-minute routine before bed</p>
            <div className="mt-4 flex flex-col gap-2 md:flex-row md:flex-wrap">
              <span className="rounded-full border border-border bg-card px-4 py-2 text-sm text-ink">
                <span className="font-mono text-indigo">1</span> · Put your phone down
              </span>
              <span className="rounded-full border border-border bg-card px-4 py-2 text-sm text-ink">
                <span className="font-mono text-indigo">2</span> · Breathe 4-7-8 for 2 minutes
              </span>
              <span className="rounded-full border border-border bg-card px-4 py-2 text-sm text-ink">
                <span className="font-mono text-indigo">3</span> · Think of 3 things that went well today
              </span>
            </div>
          </div>
          <svg className="h-20 w-20 opacity-20" viewBox="0 0 100 100" aria-hidden="true">
            <path d="M62 18a28 28 0 1 0 0 64 32 32 0 1 1 0-64z" fill="#7c83ff" />
            <circle cx="20" cy="24" r="3" fill="#7c83ff" />
            <circle cx="32" cy="15" r="2.6" fill="#7c83ff" />
            <circle cx="78" cy="28" r="2.8" fill="#7c83ff" />
          </svg>
        </div>
      </article>
    </section>
  );
}

export default ImprovePage;

