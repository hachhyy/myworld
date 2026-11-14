import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Volume2,
  Sparkles,
  HeartHandshake,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Droplets,
} from 'lucide-react';
import {
  CyclePhase,
  LunarProfileState,
  useWorldStore,
} from '../../store/useWorldStore';
import { CuteOvuloAvatar } from '../characters/CuteOvuloAvatar';
import { soundEngine, triggerHeartbeatHaptic } from '../../utils/soundAndHaptics';

interface InvernaderoLunarProps {
  onClose: () => void;
}

const PHASE_META: Record<
  CyclePhase,
  { label: string; outfitDesc: string; badgeBg: string }
> = {
  menstruacion: {
    label: '🩸 Menstruación',
    outfitDesc: 'Con mantita suave y bolsa de agua caliente en la barriga',
    badgeBg: 'bg-[#FFB5C2] text-[#591C29]',
  },
  folicular: {
    label: '🌱 Fase Folicular',
    outfitDesc: 'Con una flor primaveral en la cabecita y energía renovada',
    badgeBg: 'bg-[#B7E4C7] text-[#1B4332]',
  },
  ovulacion: {
    label: '✨ Ventana Fértil / Ovulación',
    outfitDesc: 'Con gafas de sol brillantes y estrellitas doradas',
    badgeBg: 'bg-[#FFE066] text-[#5C4400]',
  },
  lutea: {
    label: '🌙 Fase Lútea / SPM',
    outfitDesc: 'Con gorrito de dormir pastel y taza de té calentita',
    badgeBg: 'bg-[#DEC9E9] text-[#3C234A]',
  },
};

function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateStr(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0);
}

function diffDays(target: Date, base: Date): number {
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const b = new Date(base.getFullYear(), base.getMonth(), base.getDate()).getTime();
  return Math.round((t - b) / 86400000);
}

export const InvernaderoLunar: React.FC<InvernaderoLunarProps> = ({ onClose }) => {
  const {
    lunarMode,
    setLunarMode,
    lunarA,
    lunarB,
    petA,
    petB,
    updateLunarProfile,
  } = useWorldStore();

  const [activeProfileTab, setActiveProfileTab] = useState<'A' | 'B'>('A');
  const current: LunarProfileState = activeProfileTab === 'A' ? lunarA : lunarB;
  const ownerDisplayName = activeProfileTab === 'A' ? petA.ownerName : petB.ownerName;

  // Navegación del mes en el calendario Bullet Journal
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  const cycleLength = current.cycleLength || 28;
  const periodLength = current.periodLength || 5;
  const periodStartDates = useMemo(() => {
    const raw = current.periodStartDates && current.periodStartDates.length > 0
      ? current.periodStartDates
      : [toDateStr(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 2))];
    return [...raw].sort();
  }, [current.periodStartDates, today]);

  // Calcular media real si hay varios inicios de ciclo registrados
  const computedAvgCycle = useMemo(() => {
    if (periodStartDates.length < 2) return cycleLength;
    const diffs: number[] = [];
    for (let i = 1; i < periodStartDates.length; i++) {
      const d = diffDays(parseDateStr(periodStartDates[i]), parseDateStr(periodStartDates[i - 1]));
      if (d >= 18 && d <= 45) diffs.push(d);
    }
    if (diffs.length === 0) return cycleLength;
    return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
  }, [periodStartDates, cycleLength]);

  // Último inicio de regla registrado (anterior o igual a hoy)
  const latestStartStr = useMemo(() => {
    const todayStr = toDateStr(today);
    const pastOrToday = periodStartDates.filter((d) => d <= todayStr);
    return pastOrToday.length > 0
      ? pastOrToday[pastOrToday.length - 1]
      : periodStartDates[periodStartDates.length - 1];
  }, [periodStartDates, today]);

  // Motor de Cálculo Automático de Fase para cualquier fecha del calendario
  const evaluateDateInCycle = (dateObj: Date) => {
    const dateStr = toDateStr(dateObj);
    const ovulationOffset = Math.max(10, cycleLength - 14); // Día de ovulación (~14 días antes de la siguiente regla)
    const fertileStart = Math.max(periodLength + 1, ovulationOffset - 3);
    const fertileEnd = Math.min(cycleLength - 2, ovulationOffset + 1);

    // 1. Comprobar si pertenece a algún ciclo histórico registrado
    for (let i = periodStartDates.length - 1; i >= 0; i--) {
      const startD = parseDateStr(periodStartDates[i]);
      const delta = diffDays(dateObj, startD);
      if (delta >= 0 && delta < cycleLength) {
        const dayNum = delta + 1;
        const isRecordedPeriod = dayNum <= periodLength;
        const isOvulationDay = dayNum === ovulationOffset;
        let phase: CyclePhase = 'lutea';
        if (dayNum <= periodLength) phase = 'menstruacion';
        else if (dayNum < fertileStart) phase = 'folicular';
        else if (dayNum <= fertileEnd) phase = 'ovulacion';
        else phase = 'lutea';

        return {
          dayOfCycle: dayNum,
          phase,
          isRecordedPeriod,
          isPredictedPeriod: false,
          isOvulationDay,
          isStartOfRecordedCycle: delta === 0,
        };
      }
    }

    // 2. Proyección de ciclos futuros o pasados a partir del último inicio registrado
    const latestStart = parseDateStr(latestStartStr);
    const totalDelta = diffDays(dateObj, latestStart);
    const mod = ((totalDelta % cycleLength) + cycleLength) % cycleLength;
    const dayNum = mod + 1;
    const isFuture = totalDelta >= cycleLength;
    const isPredictedPeriod = isFuture && dayNum <= periodLength;
    const isOvulationDay = dayNum === ovulationOffset;

    let phase: CyclePhase = 'lutea';
    if (dayNum <= periodLength) phase = 'menstruacion';
    else if (dayNum < fertileStart) phase = 'folicular';
    else if (dayNum <= fertileEnd) phase = 'ovulacion';
    else phase = 'lutea';

    return {
      dayOfCycle: dayNum,
      phase,
      isRecordedPeriod: false,
      isPredictedPeriod,
      isOvulationDay,
      isStartOfRecordedCycle: false,
    };
  };

  // Estado automático de HOY
  const todayCycleInfo = useMemo(() => {
    const info = evaluateDateInCycle(today);
    const daysRemaining = Math.max(1, cycleLength - info.dayOfCycle + 1);
    return { ...info, daysRemaining };
  }, [today, cycleLength, periodLength, periodStartDates, latestStartStr]);

  // Sincronizar automáticamente la fase y día de hoy con el store global (y el Óvulo Cute del planeta)
  useEffect(() => {
    if (
      current.phase !== todayCycleInfo.phase ||
      current.dayOfCycle !== todayCycleInfo.dayOfCycle
    ) {
      updateLunarProfile(activeProfileTab, {
        phase: todayCycleInfo.phase,
        dayOfCycle: todayCycleInfo.dayOfCycle,
      });
    }
  }, [todayCycleInfo.phase, todayCycleInfo.dayOfCycle, activeProfileTab]);

  // Tocar cualquier día del calendario para marcar o desmarcar inicio de regla
  const handleToggleDayPeriodStart = (dateObj: Date) => {
    soundEngine.playPop(1.15);
    triggerHeartbeatHaptic('calendar-day-tap');
    const clickedStr = toDateStr(dateObj);

    // Si ya hay un inicio registrado a menos de 5 días de distancia, lo quitamos o movemos
    const existingNear = periodStartDates.find(
      (d) => Math.abs(diffDays(parseDateStr(d), dateObj)) < periodLength
    );

    let nextDates: string[];
    if (existingNear) {
      if (existingNear === clickedStr || periodStartDates.length > 1) {
        nextDates = periodStartDates.filter((d) => d !== existingNear);
      } else {
        nextDates = [clickedStr];
      }
    } else {
      nextDates = [...periodStartDates, clickedStr].sort();
    }

    if (nextDates.length === 0) {
      nextDates = [clickedStr];
    }

    updateLunarProfile(activeProfileTab, {
      periodStartDates: nextDates,
    });
  };

  // Botón rápido "🩸 Registrar inicio de regla hoy"
  const handleLogPeriodToday = () => {
    handleToggleDayPeriodStart(today);
  };

  // Construir cuadrícula mensual de Lunes a Domingo
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    // Convertir domingo (0) a 6, lunes (1) a 0
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7;

    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(viewYear, viewMonth, d, 12, 0, 0));
    }
    return cells;
  }, [viewYear, viewMonth]);

  const monthTitle = new Date(viewYear, viewMonth, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const buildEmpatheticMessage = (prof: LunarProfileState, phaseNow: CyclePhase) => {
    if (phaseNow === 'menstruacion') {
      return `«¡Hola! Hoy estamos en el día ${todayCycleInfo.dayOfCycle} del ciclo (días de regla con ${prof.cramps.toLowerCase()}). Es el momento ideal para traernos algo calentito (${prof.craving.toLowerCase()}), dar muchos mimos y descansar juntos 💕»`;
    }
    if (phaseNow === 'folicular') {
      return `«¡Hola! Estamos en fase folicular (día ${todayCycleInfo.dayOfCycle}) con energía ${prof.energy.toLowerCase()} y humor ${prof.mood.toLowerCase()}. ¡Nos apetece mucho ${prof.craving.toLowerCase()} juntos! 🌱»`;
    }
    if (phaseNow === 'ovulacion') {
      return `«¡Brillando a tope en nuestra ventana de ovulación ✨ (día ${todayCycleInfo.dayOfCycle})! Estamos con humor ${prof.mood.toLowerCase()} y ganas de ${prof.craving.toLowerCase()}. ¡Planazo de cita hoy!»`;
    }
    return `«¡Hola! Estamos en fase lútea (día ${todayCycleInfo.dayOfCycle}, faltan ${todayCycleInfo.daysRemaining} días para la próxima regla). Un té calentito, ${prof.craving.toLowerCase()} y abrazos en el sofá nos harán súper felices 🌙🍵»`;
  };

  const messageForPartner = buildEmpatheticMessage(current, todayCycleInfo.phase);

  const handleUpdate = (partial: Partial<LunarProfileState>) => {
    updateLunarProfile(activeProfileTab, partial);
    triggerHeartbeatHaptic('lunar-log');
  };

  return (
    <div className="fixed inset-0 z-40 flex flex-col watercolor-paper overflow-hidden">
      {/* Cabecera */}
      <div className="p-3 flex items-center justify-between border-b-2 border-[var(--border-ink)] bg-[var(--bg-card)]">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={onClose}
          className="hand-button px-3 py-1.5 bg-[var(--bg-paper)] text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Planeta
        </motion.button>

        <div className="text-center">
          <h1 className="text-base font-bold">🌙 El Invernadero Lunar</h1>
          <p className="text-[11px] text-[var(--text-muted)]">
            Calendario Menstrual Automático de {ownerDisplayName}
          </p>
        </div>

        <select
          value={lunarMode}
          onChange={(e) => {
            const val = e.target.value as 'single' | 'dual' | 'hidden';
            setLunarMode(val);
            if (val === 'hidden') onClose();
          }}
          className="hand-pill px-2.5 py-1 bg-[var(--bg-paper)] text-[11px] font-bold cursor-pointer"
        >
          <option value="single">1 Calendario</option>
          <option value="dual">2 Calendarios 👩‍❤️‍👩</option>
          <option value="hidden">Ocultar edificio</option>
        </select>
      </div>

      {/* Pestañas si está en modo 2 calendarios */}
      {lunarMode === 'dual' && (
        <div className="px-3 pt-2.5 flex gap-2 max-w-md mx-auto w-full">
          <button
            onClick={() => setActiveProfileTab('A')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
              activeProfileTab === 'A' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
            }`}
          >
            🌸 Calendario de {petA.ownerName}
          </button>
          <button
            onClick={() => setActiveProfileTab('B')}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold border-2 border-[var(--border-ink)] cursor-pointer ${
              activeProfileTab === 'B' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
            }`}
          >
            🌷 Calendario de {petB.ownerName}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-w-md mx-auto w-full">
        {/* 1. CABECERA DEL ÓVULO CUTE + CONTADOR AUTOMÁTICO DE CICLO */}
        <div className="hand-card p-3.5 bg-[var(--bg-card)] flex flex-col items-center text-center space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5 w-full text-[11px]">
            <span className={`hand-pill px-2.5 py-0.5 font-bold ${PHASE_META[todayCycleInfo.phase].badgeBg}`}>
              Día {todayCycleInfo.dayOfCycle} del ciclo · Faltan {todayCycleInfo.daysRemaining} días para la próxima regla
            </span>
            <button
              onClick={() => soundEngine.speakAnimalese(messageForPartner, 515)}
              className="hand-pill px-2.5 py-0.5 font-bold bg-[var(--bg-secondary)] flex items-center gap-1 cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5" />
              Voz
            </button>
          </div>

          <div className="flex items-center gap-3 w-full">
            <div className="shrink-0">
              <CuteOvuloAvatar
                phase={todayCycleInfo.phase}
                size={110}
                onClick={() => soundEngine.speakAnimalese(messageForPartner, 515)}
              />
            </div>
            <div className="text-left space-y-1 flex-1">
              <span className="text-xs font-extrabold block">
                {PHASE_META[todayCycleInfo.phase].label}
              </span>
              <p className="text-[11px] text-[var(--text-muted)] leading-snug">
                {PHASE_META[todayCycleInfo.phase].outfitDesc}
              </p>
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={handleLogPeriodToday}
                className="hand-button mt-1 px-3 py-1.5 bg-[#FFB5C2] text-[#4A1C24] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Droplets className="w-3.5 h-3.5" />
                🩸 Registrar inicio de regla hoy
              </motion.button>
            </div>
          </div>

          {/* Mensaje empático automático para la pareja */}
          <div className="hand-card p-2.5 bg-[var(--bg-paper)] w-full text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1 text-rose-600">
                <HeartHandshake className="w-3.5 h-3.5" />
                Mensaje automático para {activeProfileTab === 'A' ? petB.ownerName : petA.ownerName}:
              </span>
              <label className="flex items-center gap-1 text-[10px] font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={current.sensitiveAlertActive}
                  onChange={(e) => handleUpdate({ sensitiveAlertActive: e.target.checked })}
                />
                Asomar en el Planeta
              </label>
            </div>
            <p className="font-hand text-lg leading-snug">{messageForPartner}</p>
          </div>
        </div>

        {/* 2. CUADRÍCULA DE CALENDARIO MENSUAL VISUAL (ESTILO BULLET JOURNAL PASTEL) */}
        <div className="hand-card p-3.5 bg-[var(--bg-card)] space-y-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                soundEngine.playPageTurn();
                if (viewMonth === 0) {
                  setViewMonth(11);
                  setViewYear((y) => y - 1);
                } else {
                  setViewMonth((m) => m - 1);
                }
              }}
              className="hand-pill p-1.5 bg-[var(--bg-paper)] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-center">
              <h3 className="text-sm font-bold capitalize flex items-center justify-center gap-1.5">
                <Calendar className="w-4 h-4 text-rose-500" />
                {monthTitle}
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                Toca cualquier día para marcar o desmarcar tus días de regla 🩸
              </p>
            </div>

            <button
              onClick={() => {
                soundEngine.playPageTurn();
                if (viewMonth === 11) {
                  setViewMonth(0);
                  setViewYear((y) => y + 1);
                } else {
                  setViewMonth((m) => m + 1);
                }
              }}
              className="hand-pill p-1.5 bg-[var(--bg-paper)] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Cabecera Lunes a Domingo */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[var(--text-muted)]">
            {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Días del mes coloreados automáticamente por fase */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((dateObj, idx) => {
              if (!dateObj) {
                return <div key={`empty-${idx}`} className="h-10" />;
              }

              const info = evaluateDateInCycle(dateObj);
              const isToday = toDateStr(dateObj) === toDateStr(today);

              // Colores pastel según fase calculada
              let bgClass = 'bg-[#EDE0F5] text-[#3B2847]'; // Lútea (Lavanda pastel)
              let badgeIcon = '🌙';
              if (info.isRecordedPeriod) {
                bgClass = 'bg-[#FF99AC] text-[#4A121F] font-extrabold';
                badgeIcon = '🩸';
              } else if (info.isPredictedPeriod) {
                bgClass = 'bg-[#FFD6E0] text-[#591C29] border-dashed';
                badgeIcon = '🩸';
              } else if (info.phase === 'folicular') {
                bgClass = 'bg-[#C7F9CC] text-[#1B4332]';
                badgeIcon = '🌱';
              } else if (info.phase === 'ovulacion') {
                bgClass = info.isOvulationDay
                  ? 'bg-[#FFD166] text-[#4A3500] font-extrabold'
                  : 'bg-[#FFF3B0] text-[#5C4400]';
                badgeIcon = info.isOvulationDay ? '⭐' : '✨';
              }

              return (
                <motion.button
                  key={toDateStr(dateObj)}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleToggleDayPeriodStart(dateObj)}
                  className={`relative h-11 rounded-xl border-2 border-[var(--border-ink)] flex flex-col items-center justify-center cursor-pointer transition-transform ${bgClass} ${
                    isToday ? 'ring-2 ring-[#3D312A] scale-105 shadow-sm' : ''
                  }`}
                >
                  <span className="text-[11px] leading-none">{dateObj.getDate()}</span>
                  <span className="text-[9px] leading-none mt-0.5">{badgeIcon}</span>
                  {isToday && (
                    <span className="absolute -top-1.5 -right-1 px-1 rounded-full bg-[#3D312A] text-white text-[7px] font-bold">
                      HOY
                    </span>
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Leyenda de Fases del Calendario */}
          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px] font-bold">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#FFB5C2]/70">
              <span>🩸</span>
              <span>Menstruación (y predicción)</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#C7F9CC]/80">
              <span>🌱</span>
              <span>Fase Folicular</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#FFF3B0]">
              <span>⭐</span>
              <span>Ventana Fértil / Ovulación</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#EDE0F5]">
              <span>🌙</span>
              <span>Fase Lútea / SPM</span>
            </div>
          </div>

          {/* Ajuste de Duración Media del Ciclo (21-40) y de la Regla (3-8) */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[var(--border-ink)]/15 text-xs">
            <div className="bg-[var(--bg-paper)] p-2 rounded-xl border border-[var(--border-ink)]">
              <label className="text-[10px] font-bold block">
                Duración media del ciclo: <strong>{cycleLength} días</strong>
              </label>
              <input
                type="range"
                min={21}
                max={40}
                value={cycleLength}
                onChange={(e) => handleUpdate({ cycleLength: Number(e.target.value) })}
                className="w-full accent-rose-500 mt-1"
              />
            </div>
            <div className="bg-[var(--bg-paper)] p-2 rounded-xl border border-[var(--border-ink)]">
              <label className="text-[10px] font-bold block">
                Duración de la regla: <strong>{periodLength} días</strong>
              </label>
              <input
                type="range"
                min={3}
                max={8}
                value={periodLength}
                onChange={(e) => handleUpdate({ periodLength: Number(e.target.value) })}
                className="w-full accent-rose-500 mt-1"
              />
            </div>
          </div>
        </div>

        {/* 3. HISTORIAL DE CICLOS REGISTRADOS */}
        <div className="hand-card p-3.5 bg-[var(--bg-card)] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-bold uppercase text-[var(--text-muted)]">
              📖 Historial de Ciclos Registrados ({periodStartDates.length})
            </h3>
            <span className="hand-pill px-2 py-0.5 text-[10px] font-bold bg-[var(--bg-secondary)]">
              Media calculada: {computedAvgCycle} días
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...periodStartDates].reverse().map((dStr) => {
              const dObj = parseDateStr(dStr);
              const label = dObj.toLocaleDateString('es-ES', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              });
              return (
                <span
                  key={dStr}
                  onClick={() => handleToggleDayPeriodStart(dObj)}
                  title="Toca para eliminar este inicio"
                  className="hand-pill px-2.5 py-1 bg-[#FFD6E0] text-[#4A1C24] text-[11px] font-bold cursor-pointer flex items-center gap-1"
                >
                  <span>🩸 Inicio: {label}</span>
                  <span className="opacity-60">✕</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* 4. REGISTRO DIARIO DE SÍNTOMAS Y ANTOJOS */}
        <div className="hand-card p-3.5 bg-[var(--bg-card)] space-y-3 text-xs">
          <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            Síntomas y Mimos de Hoy
          </h3>

          <div>
            <p className="font-bold mb-1">Dolor de barriga:</p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Sin dolor', 'Molestia leve', 'Dolorcito fuerte'] as const).map((cr) => (
                <button
                  key={cr}
                  onClick={() =>
                    handleUpdate({
                      cramps: cr,
                      sensitiveAlertActive: cr !== 'Sin dolor' || current.sensitiveAlertActive,
                    })
                  }
                  className={`py-1.5 px-2 rounded-xl font-bold border border-[var(--border-ink)] cursor-pointer ${
                    current.cramps === cr ? 'bg-rose-300 text-rose-950' : 'bg-[var(--bg-paper)]'
                  }`}
                >
                  {cr}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-bold mb-1">Flujo:</p>
            <div className="grid grid-cols-4 gap-1.5">
              {(['Ninguno', 'Ligero', 'Medio', 'Abundante'] as const).map((fl) => (
                <button
                  key={fl}
                  onClick={() => handleUpdate({ flow: fl })}
                  className={`py-1.5 px-2 rounded-xl font-bold border border-[var(--border-ink)] cursor-pointer ${
                    current.flow === fl ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-paper)]'
                  }`}
                >
                  💧 {fl}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-bold mb-1">Nivel de Energía:</p>
              <select
                value={current.energy}
                onChange={(e) =>
                  handleUpdate({ energy: e.target.value as LunarProfileState['energy'] })
                }
                className="w-full p-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-semibold"
              >
                <option value="Baja">🔋 Baja (Necesito sofá)</option>
                <option value="Normal">⚡ Normal</option>
                <option value="Alta">🚀 Alta</option>
              </select>
            </div>
            <div>
              <p className="font-bold mb-1">Humor de hoy:</p>
              <select
                value={current.mood}
                onChange={(e) =>
                  handleUpdate({ mood: e.target.value as LunarProfileState['mood'] })
                }
                className="w-full p-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-semibold"
              >
                <option value="Mimosa">🥺 Mimosa</option>
                <option value="Sensible">💧 Sensible</option>
                <option value="Tranquila">🍵 Tranquila</option>
                <option value="Radiante">✨ Radiante</option>
                <option value="Cansada">😴 Cansada</option>
              </select>
            </div>
          </div>

          <div>
            <p className="font-bold mb-1">Antojo del día (se lo chivamos a tu pareja):</p>
            <input
              type="text"
              value={current.craving}
              onChange={(e) => handleUpdate({ craving: e.target.value })}
              placeholder="Ej. Chocolate calentito y mimos..."
              className="w-full px-3 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] font-hand text-lg"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
