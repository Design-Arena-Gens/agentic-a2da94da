"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";

type WorkoutCategory =
  | "Strength"
  | "Conditioning"
  | "Mobility"
  | "Recovery"
  | "Core"
  | "Endurance";

type Workout = {
  id: string;
  name: string;
  category: WorkoutCategory;
  duration: number; // minutes per block
  equipment: string[];
  focus: string[];
  description: string;
  defaultSets?: number;
  defaultReps?: number;
  defaultInterval?: string;
};

type PlannedWorkout = {
  id: string;
  workoutId: string;
  sets?: number;
  reps?: number;
  interval?: string;
  duration: number;
  intensity: "Recovery" | "Moderate" | "Power";
  notes?: string;
};

type DayPlan = {
  id: string;
  label: string;
  focus: string;
  energyTarget: number;
  workouts: PlannedWorkout[];
};

type Schedule = Record<string, DayPlan>;

const daysOfWeek: { id: string; label: string; focus: string; energy: number }[] =
  [
    { id: "mon", label: "Mon", focus: "Push Power + Core", energy: 76 },
    { id: "tue", label: "Tue", focus: "Pull Strength", energy: 70 },
    { id: "wed", label: "Wed", focus: "Active Recovery", energy: 38 },
    { id: "thu", label: "Thu", focus: "Legs + Conditioning", energy: 82 },
    { id: "fri", label: "Fri", focus: "Hybrid Athlete Day", energy: 88 },
    { id: "sat", label: "Sat", focus: "Endurance Session", energy: 62 },
    { id: "sun", label: "Sun", focus: "Mobility Reset", energy: 30 },
  ];

const workoutLibrary: Workout[] = [
  {
    id: "wrk-bench-press",
    name: "Barbell Bench Press",
    category: "Strength",
    duration: 20,
    equipment: ["Barbell", "Bench"],
    focus: ["Chest", "Triceps", "Anterior Delts"],
    description: "Heavy compound lift targeting pushing strength.",
    defaultSets: 4,
    defaultReps: 6,
  },
  {
    id: "wrk-dumbbell-shoulder-press",
    name: "Dumbbell Shoulder Press",
    category: "Strength",
    duration: 15,
    equipment: ["Dumbbells"],
    focus: ["Shoulders", "Triceps"],
    description: "Seated or standing press to build shoulder stability.",
    defaultSets: 3,
    defaultReps: 10,
  },
  {
    id: "wrk-push-circuit",
    name: "Push Power Circuit",
    category: "Conditioning",
    duration: 18,
    equipment: ["Medicine Ball"],
    focus: ["Explosiveness", "Core"],
    description:
      "3 rounds of plyo push ups, med ball chest pass, hollow holds. 40s work / 20s rest.",
    defaultSets: 3,
    defaultInterval: "40s ON / 20s OFF",
  },
  {
    id: "wrk-deadlift",
    name: "Conventional Deadlift",
    category: "Strength",
    duration: 22,
    equipment: ["Barbell", "Plates"],
    focus: ["Posterior Chain", "Grip"],
    description: "Heavy hinge movement prioritizing tension and bracing.",
    defaultSets: 5,
    defaultReps: 5,
  },
  {
    id: "wrk-assisted-pullups",
    name: "Assisted Pull-Ups",
    category: "Strength",
    duration: 16,
    equipment: ["Pull-Up Bar", "Bands"],
    focus: ["Lats", "Biceps"],
    description: "Vertical pulling focus with tempo holds at top.",
    defaultSets: 4,
    defaultReps: 8,
  },
  {
    id: "wrk-hang-clean",
    name: "Hang Power Clean",
    category: "Conditioning",
    duration: 15,
    equipment: ["Barbell"],
    focus: ["Power", "Full Body"],
    description: "Explosive triple extension for hybrid performance.",
    defaultSets: 5,
    defaultReps: 3,
  },
  {
    id: "wrk-sprint-intervals",
    name: "Sprint Intervals",
    category: "Endurance",
    duration: 25,
    equipment: ["Track", "Treadmill"],
    focus: ["Anaerobic", "Speed"],
    description:
      "10 rounds: 30s sprint, 90s walk. Maintain max speed with full recovery.",
    defaultInterval: "30s sprint / 90s walk",
  },
  {
    id: "wrk-long-run",
    name: "Zone 2 Long Run",
    category: "Endurance",
    duration: 60,
    equipment: ["Running Shoes"],
    focus: ["Aerobic Base"],
    description:
      "Steady state run holding 70-75% HR max. Focus on nasal breathing.",
  },
  {
    id: "wrk-yoga-flow",
    name: "Mobility Flow",
    category: "Mobility",
    duration: 35,
    equipment: ["Yoga Mat"],
    focus: ["Hips", "T-Spine"],
    description:
      "Slow flow with 5-position hip opener, thoracic rotations, ankle priming.",
  },
  {
    id: "wrk-core-ladder",
    name: "Core Stability Ladder",
    category: "Core",
    duration: 18,
    equipment: ["Mat", "Sliders"],
    focus: ["Ankles", "Core"],
    description:
      "EMOM: plank sliders, dead bugs, Copenhagen plank. Alternate sides.",
    defaultSets: 6,
    defaultInterval: "60s EMOM",
  },
  {
    id: "wrk-rower-emom",
    name: "Rower Threshold EMOM",
    category: "Conditioning",
    duration: 24,
    equipment: ["Rower"],
    focus: ["VO2 Max"],
    description:
      "12-minute EMOM alternating 90s threshold row with 60s easy pace.",
    defaultInterval: "Emom 12 min",
  },
  {
    id: "wrk-soft-tissue",
    name: "Soft Tissue + Breath",
    category: "Recovery",
    duration: 20,
    equipment: ["Foam Roller"],
    focus: ["Parasympathetic"],
    description: "Full body foam rolling + 6 min box breathing finisher.",
  },
];

const scheduleStorageKey = "pulseflow-schedule-v1";

const buildSeedSchedule = (): Schedule => {
  const seed = daysOfWeek.reduce<Schedule>((acc, day) => {
    acc[day.id] = {
      id: day.id,
      label: day.label,
      focus: day.focus,
      energyTarget: day.energy,
      workouts: [],
    };
    return acc;
  }, {});

  const seedPlans: { day: string; workoutId: string; sets?: number; reps?: number; duration?: number; interval?: string; intensity?: PlannedWorkout["intensity"]; notes?: string }[] =
    [
      {
        day: "mon",
        workoutId: "wrk-bench-press",
        sets: 4,
        reps: 6,
        duration: 20,
        intensity: "Power",
        notes: "2 warm-up sets before working sets.",
      },
      {
        day: "mon",
        workoutId: "wrk-dumbbell-shoulder-press",
        sets: 3,
        reps: 10,
        duration: 15,
        intensity: "Moderate",
      },
      {
        day: "mon",
        workoutId: "wrk-core-ladder",
        duration: 18,
        intensity: "Moderate",
        interval: "60s EMOM",
      },
      {
        day: "tue",
        workoutId: "wrk-deadlift",
        sets: 5,
        reps: 5,
        duration: 22,
        intensity: "Power",
        notes: "Reset between reps, hook grip focus.",
      },
      {
        day: "tue",
        workoutId: "wrk-assisted-pullups",
        sets: 4,
        reps: 8,
        duration: 16,
        intensity: "Moderate",
      },
      {
        day: "wed",
        workoutId: "wrk-yoga-flow",
        duration: 35,
        intensity: "Recovery",
      },
      {
        day: "thu",
        workoutId: "wrk-hang-clean",
        sets: 5,
        reps: 3,
        duration: 15,
        intensity: "Power",
      },
      {
        day: "thu",
        workoutId: "wrk-rower-emom",
        duration: 24,
        interval: "90s threshold / 60s easy",
        intensity: "Moderate",
      },
      {
        day: "fri",
        workoutId: "wrk-push-circuit",
        duration: 18,
        interval: "40s ON / 20s OFF",
        intensity: "Power",
      },
      {
        day: "fri",
        workoutId: "wrk-core-ladder",
        duration: 18,
        intensity: "Moderate",
      },
      {
        day: "sat",
        workoutId: "wrk-long-run",
        duration: 60,
        intensity: "Moderate",
        notes: "Hold 145-150 bpm.",
      },
      {
        day: "sun",
        workoutId: "wrk-soft-tissue",
        duration: 20,
        intensity: "Recovery",
      },
    ];

  for (const plan of seedPlans) {
    const workout = workoutLibrary.find((item) => item.id === plan.workoutId);
    if (!workout) continue;
    const targetDay = seed[plan.day];
    if (!targetDay) continue;

    targetDay.workouts.push({
      id: `${plan.day}-${plan.workoutId}-${targetDay.workouts.length + 1}`,
      workoutId: plan.workoutId,
      sets: plan.sets ?? workout.defaultSets,
      reps: plan.reps ?? workout.defaultReps,
      interval: plan.interval ?? workout.defaultInterval,
      duration: plan.duration ?? workout.duration,
      intensity: plan.intensity ?? "Moderate",
      notes: plan.notes,
    });
  }

  return seed;
};

const computeDayStats = (day: DayPlan) => {
  const totalDuration = day.workouts.reduce((acc, workout) => acc + workout.duration, 0);
  const totalSets = day.workouts.reduce(
    (acc, workout) => acc + (workout.sets ?? 0),
    0,
  );
  return { totalDuration, totalSets };
};

const computeWeekStats = (schedule: Schedule) => {
  return Object.values(schedule).reduce(
    (acc, day) => {
      const { totalDuration, totalSets } = computeDayStats(day);
      acc.minutes += totalDuration;
      acc.sets += totalSets;
      acc.sessions += day.workouts.length;
      return acc;
    },
    { minutes: 0, sets: 0, sessions: 0 },
  );
};

const intensityColors: Record<PlannedWorkout["intensity"], string> = {
  Recovery: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
  Moderate: "bg-sky-500/10 text-sky-300 border border-sky-500/30",
  Power: "bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-600/40",
};

export default function Home() {
  const [schedule, setSchedule] = useState<Schedule>(buildSeedSchedule);
  const [selectedDayId, setSelectedDayId] = useState<string>(daysOfWeek[0].id);
  const [selectedCategory, setSelectedCategory] =
    useState<WorkoutCategory>("Strength");
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(scheduleStorageKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Schedule;
        const merged = buildSeedSchedule();
        for (const key of Object.keys(merged)) {
          if (parsed[key]) {
            merged[key] = {
              ...merged[key],
              ...parsed[key],
              workouts: parsed[key].workouts ?? merged[key].workouts,
            };
          }
        }
        startTransition(() => {
          setSchedule(merged);
        });
      } catch {
        // ignore corrupted payloads
      }
    }
    hasHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasHydratedRef.current) return;
    window.localStorage.setItem(scheduleStorageKey, JSON.stringify(schedule));
  }, [schedule]);

  const selectedDay = schedule[selectedDayId];
  const categories = useMemo(
    () =>
      Array.from(
        new Set(workoutLibrary.map((workout) => workout.category)),
      ) as WorkoutCategory[],
    [],
  );

  const weekStats = useMemo(() => computeWeekStats(schedule), [schedule]);

  const addWorkout = (dayId: string, base: Workout) => {
    setSchedule((prev) => {
      const next = structuredClone(prev);
      const day = next[dayId];
      const plan: PlannedWorkout = {
        id: `${dayId}-${base.id}-${Date.now()}`,
        workoutId: base.id,
        sets: base.defaultSets,
        reps: base.defaultReps,
        interval: base.defaultInterval,
        duration: base.duration,
        intensity: "Moderate",
      };
      day.workouts = [...day.workouts, plan];
      return next;
    });
  };

  const updateWorkout = (
    dayId: string,
    planId: string,
    updates: Partial<PlannedWorkout>,
  ) => {
    setSchedule((prev) => {
      const next = structuredClone(prev);
      const day = next[dayId];
      day.workouts = day.workouts.map((item) =>
        item.id === planId ? { ...item, ...updates } : item,
      );
      return next;
    });
  };

  const removeWorkout = (dayId: string, planId: string) => {
    setSchedule((prev) => {
      const next = structuredClone(prev);
      const day = next[dayId];
      day.workouts = day.workouts.filter((item) => item.id !== planId);
      return next;
    });
  };

  const resetDay = (dayId: string) => {
    setSchedule((prev) => {
      const next = structuredClone(prev);
      const base = buildSeedSchedule()[dayId];
      next[dayId] = base;
      return next;
    });
  };

  const clearWeek = () => {
    setSchedule(buildSeedSchedule());
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-5 pb-24 pt-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              PulseFlow
            </p>
            <h1 className="text-3xl font-semibold text-slate-50">
              Mobile Workout Planner
            </h1>
          </div>
          <button
            onClick={clearWeek}
            className="rounded-full border border-slate-700/80 bg-slate-800/50 px-4 py-2 text-xs font-semibold text-slate-200 shadow-lg shadow-cyan-500/10 backdrop-blur transition hover:border-sky-400/60 hover:bg-slate-800/80"
          >
            Reset Week
          </button>
        </div>
        <div className="rounded-3xl border border-slate-800/70 bg-gradient-to-br from-slate-900/80 via-slate-900/40 to-slate-900/80 p-5 shadow-2xl shadow-cyan-500/10">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-300/90">This week&apos;s focus</p>
              <p className="text-lg font-medium text-slate-100">
                Hybrid strength & endurance
              </p>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs uppercase tracking-[0.35em] text-slate-400">
                Sessions
              </span>
              <span className="text-3xl font-semibold text-sky-300">
                {weekStats.sessions}
              </span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-300/90">
            <div>
              <p className="uppercase tracking-[0.25em] text-slate-400">
                Minutes
              </p>
              <p className="text-xl font-semibold text-slate-100">
                {weekStats.minutes}
              </p>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all"
                  style={{
                    width: `${Math.min(100, (weekStats.minutes / 420) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <p className="uppercase tracking-[0.25em] text-slate-400">Sets</p>
              <p className="text-xl font-semibold text-slate-100">
                {weekStats.sets}
              </p>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-500 transition-all"
                  style={{
                    width: `${Math.min(100, (weekStats.sets / 80) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <p className="uppercase tracking-[0.25em] text-slate-400">
                Recovery
              </p>
              <p className="text-xl font-semibold text-slate-100">
                {Math.max(1, 7 - weekStats.sessions)}
              </p>
              <div className="mt-2 h-2 rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      ((7 - weekStats.sessions) / 3) * 100,
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-slate-400">
            Weekly Flow
          </h2>
          <span className="rounded-full border border-slate-700/60 bg-slate-900/60 px-3 py-1 text-[11px] font-medium text-slate-300">
            Tap a day to plan
          </span>
        </div>
        <div className="-mx-2 flex gap-3 overflow-x-auto px-2 pb-1">
          {daysOfWeek.map((day) => {
            const plan = schedule[day.id];
            const { totalDuration } = computeDayStats(plan);
            const isSelected = selectedDayId === day.id;
            return (
              <button
                key={day.id}
                onClick={() => setSelectedDayId(day.id)}
                className={`flex min-w-[120px] flex-col rounded-3xl border px-4 py-3 text-left transition ${
                  isSelected
                    ? "border-sky-400/60 bg-sky-500/10 shadow-lg shadow-sky-500/20"
                    : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                  {day.label}
                </span>
                <span className="mt-1 text-base font-semibold text-slate-100">
                  {plan.focus.split("+")[0]}
                </span>
                <span className="mt-2 text-[11px] text-slate-400">
                  {plan.workouts.length ? (
                    <>
                      {plan.workouts.length} session
                      {plan.workouts.length > 1 ? "s" : ""} · {totalDuration} min
                    </>
                  ) : (
                    "No sessions yet"
                  )}
                </span>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-sky-400 to-cyan-500"
                    style={{
                      width: `${Math.min(100, (totalDuration / 90) * 100)}%`,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {selectedDay && (
        <section className="flex flex-col gap-4 rounded-3xl border border-slate-800/70 bg-slate-900/70 p-5 shadow-lg shadow-cyan-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-100">
                {selectedDay.label} · {selectedDay.focus}
              </h3>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Energy target {selectedDay.energyTarget}%
              </p>
            </div>
            <button
              onClick={() => resetDay(selectedDay.id)}
              className="rounded-full border border-slate-700/70 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-sky-400/60 hover:text-sky-200"
            >
              Restore template
            </button>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4">
            {selectedDay.workouts.length === 0 ? (
              <div className="flex flex-col items-center gap-2 text-center text-sm text-slate-400">
                <span className="text-2xl">📅</span>
                <p>Drop a session from the library to program today.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {selectedDay.workouts.map((planned) => {
                  const workout = workoutLibrary.find(
                    (item) => item.id === planned.workoutId,
                  );
                  if (!workout) return null;
                  return (
                    <div
                      key={planned.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-900/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm uppercase tracking-[0.25em] text-slate-500">
                            {workout.category}
                          </p>
                          <h4 className="text-lg font-semibold text-slate-100">
                            {workout.name}
                          </h4>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${intensityColors[planned.intensity]}`}
                        >
                          {planned.intensity}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-300">
                        {workout.description}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                        {workout.focus.map((tag) => (
                          <span
                            key={`${planned.id}-${tag}`}
                            className="rounded-full border border-slate-700/70 px-2 py-1"
                          >
                            {tag}
                          </span>
                        ))}
                        {workout.equipment.length > 0 && (
                          <span className="rounded-full border border-slate-700/70 px-2 py-1">
                            Gear: {workout.equipment.join(", ")}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-slate-300 md:grid-cols-4">
                        <label className="flex flex-col gap-1">
                          <span>Sets</span>
                          <input
                            type="number"
                            min={0}
                            value={planned.sets ?? 0}
                            onChange={(event) =>
                              updateWorkout(selectedDay.id, planned.id, {
                                sets: Number(event.target.value),
                              })
                            }
                            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/30"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span>Reps</span>
                          <input
                            type="number"
                            min={0}
                            value={planned.reps ?? 0}
                            onChange={(event) =>
                              updateWorkout(selectedDay.id, planned.id, {
                                reps: Number(event.target.value),
                              })
                            }
                            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/30"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span>Duration (min)</span>
                          <input
                            type="number"
                            min={5}
                            value={planned.duration}
                            onChange={(event) =>
                              updateWorkout(selectedDay.id, planned.id, {
                                duration: Number(event.target.value),
                              })
                            }
                            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/30"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span>Interval</span>
                          <input
                            type="text"
                            value={planned.interval ?? ""}
                            onChange={(event) =>
                              updateWorkout(selectedDay.id, planned.id, {
                                interval: event.target.value,
                              })
                            }
                            placeholder="e.g. 45s on / 15s off"
                            className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/30"
                          />
                        </label>
                      </div>

                      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <label className="flex w-full flex-1 flex-col gap-1 text-xs text-slate-300">
                          <span>Notes</span>
                          <textarea
                            rows={2}
                            value={planned.notes ?? ""}
                            onChange={(event) =>
                              updateWorkout(selectedDay.id, planned.id, {
                                notes: event.target.value,
                              })
                            }
                            placeholder="Coaching cues, RPE targets, recovery work..."
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400/70 focus:ring-2 focus:ring-sky-500/30"
                          />
                        </label>
                        <div className="flex flex-wrap items-center gap-2">
                          {(["Recovery", "Moderate", "Power"] as const).map(
                            (tag) => (
                              <button
                                key={tag}
                                onClick={() =>
                                  updateWorkout(selectedDay.id, planned.id, {
                                    intensity: tag,
                                  })
                                }
                                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                  planned.intensity === tag
                                    ? `${intensityColors[tag]}`
                                    : "border border-transparent bg-slate-800/60 text-slate-300 hover:border-slate-700"
                                }`}
                              >
                                {tag}
                              </button>
                            ),
                          )}
                          <button
                            onClick={() =>
                              removeWorkout(selectedDay.id, planned.id)
                            }
                            className="ml-auto rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200 transition hover:border-red-400/60 hover:bg-red-500/20"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="text-xs text-slate-400">
            Tip: Dial in the intensity tags to balance high output days with
            restorative work. Your goal is to align with the energy target above.
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-3xl border border-slate-800/70 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">
              Session Library
            </h3>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Drag inspiration into your week
            </p>
          </div>
          <div className="flex gap-2">
            {categories.map((category) => {
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${
                    isActive
                      ? "border border-sky-400/60 bg-sky-500/15 text-sky-100"
                      : "border border-slate-800/70 bg-slate-950/50 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {workoutLibrary
            .filter((workout) => workout.category === selectedCategory)
            .map((workout) => (
              <article
                key={workout.id}
                className="rounded-2xl border border-slate-800/70 bg-slate-950/40 p-4 shadow-lg shadow-slate-950/40"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-slate-500">
                        {workout.category}
                      </p>
                      <h4 className="text-xl font-semibold text-slate-100">
                        {workout.name}
                      </h4>
                    </div>
                    <span className="rounded-full border border-slate-700/60 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-slate-300">
                      {workout.duration} min
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{workout.description}</p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                    {workout.focus.map((tag) => (
                      <span
                        key={`${workout.id}-${tag}`}
                        className="rounded-full border border-slate-800/70 px-2 py-1"
                      >
                        {tag}
                      </span>
                    ))}
                    {workout.equipment.length > 0 && (
                      <span className="rounded-full border border-slate-800/70 px-2 py-1">
                        Gear: {workout.equipment.join(", ")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    {workout.defaultSets && (
                      <span className="rounded-full border border-slate-800/70 px-2 py-1">
                        {workout.defaultSets} sets
                      </span>
                    )}
                    {workout.defaultReps && (
                      <span className="rounded-full border border-slate-800/70 px-2 py-1">
                        {workout.defaultReps} reps
                      </span>
                    )}
                    {workout.defaultInterval && (
                      <span className="rounded-full border border-slate-800/70 px-2 py-1">
                        {workout.defaultInterval}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => addWorkout(selectedDayId, workout)}
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/60 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-100 transition hover:border-sky-300 hover:bg-sky-500/25"
                  >
                    Add to {schedule[selectedDayId].label}
                    <span className="text-lg leading-none text-sky-200">＋</span>
                  </button>
                </div>
              </article>
            ))}
        </div>
      </section>
      <footer className="pb-6 text-center text-[11px] uppercase tracking-[0.35em] text-slate-500">
        Engineered for athletes who live in motion.
      </footer>
    </div>
  );
}
