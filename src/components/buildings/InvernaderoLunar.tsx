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
    activeUser,
    lunarMode,
    setLunarMode,
    lunarOwner,
    setLunarOwner,
    lunarA,
    lunarB,
    petA,
    petB,
    updateLunarProfile,
  } = useWorldStore();

  const [activeProfileTab, setActiveProfileTab] = useState<'A' | 'B'>(
    lunarOwner === 'userB' ? 'B' : 'A'
  );

  // En modo 'single', siempre mostramos el calendario de la propietaria configurada (`lunarOwner`)
  const effectiveTab: 'A' | 'B' =
    lunarMode === 'dual' ? activeProfileTab : lunarOwner === 'userB' ? 'B' : 'A';

  const current: LunarProfileState = effectiveTab === 'A' ? lunarA : lunarB;
  const ownerDisplayName = effectiveTab === 'A' ? petA.ownerName : petB.ownerName;
  const partnerDisplayName = effectiveTab === 'A' ? petB.ownerName : petA.ownerName;

  // Permiso estricto de edición: SOLO la persona propietaria de este calendario puede editar fechas o síntomas
  const canEdit =
    lunarMode === 'dual'
      ? effectiveTab === 'A'
        ? activeUser === 'userA'
        : activeUser === 'userB'
      : activeUser === lunarOwner;

  // Navegación del mes en el calendario Bullet Journal
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-11

  const cycleLength = current.cycleLength || 28;
  const periodLength = current.periodLength || 5;
  const periodStartDates = useMemo(() => {
    const raw =
      current.periodStartDates && current.periodStartDates.length > 0
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
    const ovulationOffset = Math.max(10, cycleLength - 14);
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
      updateLunarProfile(effectiveTab, {
        phase: todayCycleInfo.phase,
        dayOfCycle: todayCycleInfo.dayOfCycle,
      });
    }
  }, [todayCycleInfo.phase, todayCycleInfo.dayOfCycle, effectiveTab]);

  // Tocar cualquier día del calendario para marcar o desmarcar inicio de regla (SOLO si canEdit === true)
  const handleToggleDayPeriodStart = (dateObj: Date) => {
    if (!canEdit) return;
    soundEngine.playPop(1.15);
    triggerHeartbeatHaptic('calendar-day-tap');
    const clickedStr = toDateStr(dateObj);

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

    updateLunarProfile(effectiveTab, {
      periodStartDates: nextDates,
    });
  };

  // Botón rápido "🩸 Registrar inicio de regla hoy"
  const handleLogPeriodToday = () => {
    if (!canEdit) return;
    handleToggleDayPeriodStart(today);
  };

  // Construir cuadrícula mensual de Lunes a Domingo
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
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
      return `«¡Hola ${partnerDisplayName}! Hoy ${ownerDisplayName} está en el día ${todayCycleInfo.dayOfCycle} del ciclo (días de regla con ${prof.cramps.toLowerCase()}). Es el momento ideal para llevarle algo calentito (${prof.craving.toLowerCase()}), darle muchos mimos y descansar juntos 💕»`;
    }
    if (phaseNow === 'folicular') {
      return `«¡Hola ${partnerDisplayName}! Estamos en fase folicular (día ${todayCycleInfo.dayOfCycle}) con energía ${prof.energy.toLowerCase()} y humor ${prof.mood.toLowerCase()}. ¡Hoy apetece mucho ${prof.craving.toLowerCase()} juntos! 🌱»`;
    }
    if (phaseNow === 'ovulacion') {
      return `«¡Brillando a tope en ventana de ovulación ✨ (día ${todayCycleInfo.dayOfCycle})! ${ownerDisplayName} está con humor ${prof.mood.toLowerCase()} y ganas de ${prof.craving.toLowerCase()}. ¡Planazo de cita hoy!»`;
    }
    return `«¡Hola ${partnerDisplayName}! Hoy estamos en fase lútea (día ${todayCycleInfo.dayOfCycle}, faltan ${todayCycleInfo.daysRemaining} días para la próxima regla). Apetecen mimos, ${prof.craving.toLowerCase()} y abrazos en el sofá 🌙🍵»`;
  };

  const messageForPartner = buildEmpatheticMessage(current, todayCycleInfo.phase);

  const handleUpdate = (partial: Partial<LunarProfileState>) => {
    if (!canEdit) return;
    updateLunarProfile(effectiveTab, partial);
    triggerHeartbeatHaptic('lunar-log');
  };

  return (
    <div className="fixed inset-0 w-screen h-[100dvh] z-40 flex flex-col watercolor-paper overflow-hidden overscroll-none">
      {/* Cabecera con Safe Area superior de iOS */}
      <div className="safe-top-header px-4 pb-3 flex items-center justify-between gap-2 border-b-2 border-[var(--border-ink)] bg-[var(--bg-card)]">
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
            Calendario Menstrual de {ownerDisplayName}{' '}
            {canEdit ? '(Modo Edición ✏️)' : '(Solo-Lectura 👀)'}
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
        {/* Banner informativo de Permisos cuando entra la pareja en Modo Solo-Lectura */}
        {!canEdit && (
          <div className="hand-card p-3 bg-[#FFF3E6] border-2 border-[var(--border-ink)] flex items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5">
              <p className="font-bold text-[#4A3F35]">
                🔒 Modo Solo-Lectura para {activeUser === 'userA' ? petA.ownerName : petB.ownerName}
              </p>
              <p className="text-[11px] text-[var(--text-muted)]">
                Solo <strong>{ownerDisplayName}</strong> puede anotar días de sangrado o editar síntomas. ¡El Óvulo Cute te resume abajo cómo cuidarla hoy! 💕
              </p>
            </div>
            {lunarMode === 'single' && (
              <button
                type="button"
                onClick={() => setLunarOwner(activeUser)}
                className="hand-pill px-2.5 py-1 bg-[var(--bg-card)] text-[10px] font-bold shrink-0 cursor-pointer"
                title="Cambiar si este calendario es tuyo"
              >
                Soy yo quien menstrúa
              </button>
            )}
          </div>
        )}

        {/* 1. CABECERA DEL ÓVULO CUTE COMO MENSAJERO ÚNICO + CONTADOR AUTOMÁTICO DE CICLO */}
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
              {canEdit ? (
                <motion.button
                  whileTap={{ scale: 0.94 }}
                  onClick={handleLogPeriodToday}
                  className="hand-button mt-1 px-3 py-1.5 bg-[#FFB5C2] text-[#4A1C24] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Droplets className="w-3.5 h-3.5" />
                  🩸 Registrar inicio de regla hoy
                </motion.button>
              ) : (
                <span className="inline-block mt-1 px-2.5 py-1 rounded-full bg-pink-100 text-pink-950 text-[10px] font-bold border border-pink-300">
                  💌 Resumen del Óvulo Cute para ti
                </span>
              )}
            </div>
          </div>

          {/* Tarjeta Resumen del Óvulo Cute Mensajero para la pareja */}
          <div className="hand-card p-2.5 bg-[var(--bg-paper)] w-full text-left space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold flex items-center gap-1 text-rose-600">
                <HeartHandshake className="w-3.5 h-3.5" />
                Óvulo Cute Mensajero para {partnerDisplayName}:
              </span>
              {canEdit && (
                <label className="flex items-center gap-1 text-[10px] font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.sensitiveAlertActive}
                    onChange={(e) => handleUpdate({ sensitiveAlertActive: e.target.checked })}
                  />
                  Asomar en el Planeta
                </label>
              )}
            </div>
            <p className="font-hand text-lg leading-snug">{messageForPartner}</p>
          </div>
        </div>

        {/* 2. CUADRÍCULA DE CALENDARIO MENSUAL VISUAL (EDITABLE SOLO POR ELLA / SOLO-LECTURA PARA LA PAREJA) */}
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
                {canEdit
                  ? 'Toca cualquier día para marcar o desmarcar tus días de regla 🩸'
                  : `Vista de consulta de los días y fases de ${ownerDisplayName} 🌸`}
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

              let bgClass = 'bg-[#EDE0F5] text-[#3B2847]';
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
                  whileTap={canEdit ? { scale: 0.9 } : undefined}
                  disabled={!canEdit}
                  onClick={() => handleToggleDayPeriodStart(dateObj)}
                  className={`relative h-11 rounded-xl border-2 border-[var(--border-ink)] flex flex-col items-center justify-center transition-transform ${bgClass} ${
                    canEdit ? 'cursor-pointer' : 'cursor-default'
                  } ${isToday ? 'ring-2 ring-[#3D312A] scale-105 shadow-sm' : ''}`}
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

          {/* Ajuste de Duración Media del Ciclo (Solo editable por ella) */}
          {canEdit ? (
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
          ) : (
            <div className="pt-1 border-t border-[var(--border-ink)]/15 flex items-center justify-between text-[11px] font-semibold text-[var(--text-muted)]">
              <span>Ciclo medio de {ownerDisplayName}: {cycleLength} días</span>
              <span>Duración media de sangrado: {periodLength} días</span>
            </div>
          )}
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
                  onClick={() => canEdit && handleToggleDayPeriodStart(dObj)}
                  title={canEdit ? 'Toca para eliminar este inicio' : undefined}
                  className={`hand-pill px-2.5 py-1 bg-[#FFD6E0] text-[#4A1C24] text-[11px] font-bold flex items-center gap-1 ${
                    canEdit ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span>🩸 Inicio: {label}</span>
                  {canEdit && <span className="opacity-60">✕</span>}
                </span>
              );
            })}
          </div>
        </div>

        {/* 4. REGISTRO DIARIO DE SÍNTOMAS Y ANTOJOS (EDITABLE POR ELLA / TARJETA RESUMEN PARA LA PAREJA) */}
        <div className="hand-card p-3.5 bg-[var(--bg-card)] space-y-3 text-xs">
          <h3 className="text-xs font-bold uppercase text-[var(--text-muted)] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            {canEdit
              ? 'Anótale tus Síntomas y Antojos de Hoy'
              : `Estado y Antojos de ${ownerDisplayName} Hoy (Solo-Lectura)`}
          </h3>

          {canEdit ? (
            <>
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
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-ink)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Dolor / Molestia:</span>
                <span className="font-bold text-sm">{current.cramps}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-ink)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Flujo hoy:</span>
                <span className="font-bold text-sm">💧 {current.flow}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-ink)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Energía:</span>
                <span className="font-bold text-sm">🔋 {current.energy}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-ink)]">
                <span className="text-[10px] text-[var(--text-muted)] block">Estado de ánimo:</span>
                <span className="font-bold text-sm">✨ {current.mood}</span>
              </div>
              <div className="col-span-2 p-3 rounded-xl bg-pink-50 border border-pink-300">
                <span className="text-[10px] font-bold uppercase text-pink-900 block">
                  🍫 Antojo especial que le hace ilusión hoy:
                </span>
                <p className="font-hand text-xl text-pink-950 mt-0.5">«{current.craving}»</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
