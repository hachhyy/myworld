import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, CheckCircle, PiggyBank, Receipt, Sparkles, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ExpenseCategory, ExpenseItem, useWorldStore } from '../../store/useWorldStore';
import { soundEngine } from '../../utils/soundAndHaptics';

interface EdificioCerditoProps {
  onClose: () => void;
}

const CATEGORY_META: Record<ExpenseCategory, { emoji: string; color: string }> = {
  'Cena fuera': { emoji: '🍣', color: '#F6B89E' },
  Supermercado: { emoji: '🛒', color: '#A8D5BA' },
  Viaje: { emoji: '✈️', color: '#8CC5E3' },
  'Cine/Ocio': { emoji: '🍿', color: '#C9B8E8' },
  Casa: { emoji: '🏡', color: '#F9DF92' },
  Capricho: { emoji: '🧁', color: '#FFB5C2' },
};

export const EdificioCerdito: React.FC<EdificioCerditoProps> = ({ onClose }) => {
  const {
    activeUser,
    petA,
    petB,
    currency,
    setCurrency,
    expenses,
    addExpense,
    deleteExpense,
    settleAllExpenses,
    savingsGoals,
    addSavingsContribution,
    addSavingsGoal,
  } = useWorldStore();

  const [tab, setTab] = useState<'tricount' | 'hucha'>('tricount');
  const [composerOpen, setComposerOpen] = useState(false);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);

  // Estado formulario de nuevo gasto
  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidBy, setPaidBy] = useState<'userA' | 'userB'>(activeUser);
  const [splitMode, setSplitMode] = useState<ExpenseItem['splitMode']>('50_50');
  const [customPctA, setCustomPctA] = useState(50);
  const [category, setCategory] = useState<ExpenseCategory>('Cena fuera');

  // Estado Hucha de Ahorro
  const [contributionInputs, setContributionInputs] = useState<Record<string, string>>({});
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalEmoji, setNewGoalEmoji] = useState('🏝️');

  // Cálculo del balance de gastos no saldados
  // Si A pagó X, B debe a A su parte shareB. Si B pagó Y, A debe a B su parte shareA.
  let netB_owes_A = 0;
  expenses
    .filter((e) => !e.settled)
    .forEach((e) => {
      if (e.paidBy === 'userA') {
        netB_owes_A += e.shareB;
      } else {
        netB_owes_A -= e.shareA;
      }
    });

  const roundedNet = Math.round(netB_owes_A * 100) / 100;

  const handleAddExpense = () => {
    const val = parseFloat(amountStr.replace(',', '.'));
    if (!title.trim() || isNaN(val) || val <= 0) return;

    let shareA = val / 2;
    let shareB = val / 2;

    if (splitMode === 'invito_yo') {
      // Quien paga asume el 100%, nadie le debe nada
      if (paidBy === 'userA') {
        shareA = val;
        shareB = 0;
      } else {
        shareA = 0;
        shareB = val;
      }
    } else if (splitMode === '100_otro') {
      // Pagué yo algo 100% suyo
      if (paidBy === 'userA') {
        shareA = 0;
        shareB = val;
      } else {
        shareA = val;
        shareB = 0;
      }
    } else if (splitMode === 'personalizado') {
      shareA = Math.round(val * (customPctA / 100) * 100) / 100;
      shareB = Math.round((val - shareA) * 100) / 100;
    }

    addExpense({
      title: title.trim(),
      amount: val,
      paidBy,
      splitMode,
      shareA,
      shareB,
      category,
      date: 'Hoy',
    });

    setTitle('');
    setAmountStr('');
    setComposerOpen(false);
  };

  // Gráfico circular pastel del mes
  const totalMonth = expenses.reduce((acc, e) => acc + e.amount, 0) || 1;
  const catTotals = (Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => {
    const sum = expenses
      .filter((e) => e.category === cat)
      .reduce((acc, e) => acc + e.amount, 0);
    return {
      cat,
      sum,
      pct: Math.round((sum / totalMonth) * 100),
      ...CATEGORY_META[cat],
    };
  });

  // Construir conic-gradient
  let accDeg = 0;
  const stops = catTotals
    .filter((c) => c.sum > 0)
    .map((c) => {
      const start = accDeg;
      const deg = (c.sum / totalMonth) * 360;
      accDeg += deg;
      return `${c.color} ${start}deg ${accDeg}deg`;
    });
  const pieGradient =
    stops.length > 0 ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#F6B89E 0deg 360deg)';

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
          <h1 className="text-base font-bold">🐷 El Edificio Cerdito</h1>
          <p className="text-[11px] text-[var(--text-muted)]">
            Tricount Cute + Hucha de Ahorro Común
          </p>
        </div>

        {/* Selector Multidivisa (€ por defecto) */}
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as '€' | '$' | '£' | '¥')}
          className="hand-pill px-2.5 py-1 bg-[var(--bg-paper)] text-xs font-bold cursor-pointer"
        >
          <option value="€">EUR (€)</option>
          <option value="$">USD ($)</option>
          <option value="£">GBP (£)</option>
          <option value="¥">JPY (¥)</option>
        </select>
      </div>

      {/* Pestañas: Gastos Compartidos vs Hucha de Ahorro */}
      <div className="px-3 pt-2.5 flex gap-2 max-w-md mx-auto w-full">
        <button
          onClick={() => {
            soundEngine.playPop();
            setTab('tricount');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 border-[var(--border-ink)] cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'tricount' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          Gastos Compartidos
        </button>
        <button
          onClick={() => {
            soundEngine.playPop();
            setTab('hucha');
          }}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border-2 border-[var(--border-ink)] cursor-pointer flex items-center justify-center gap-1.5 ${
            tab === 'hucha' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)]'
          }`}
        >
          <PiggyBank className="w-3.5 h-3.5" />
          Hucha de Ahorro
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 max-w-md mx-auto w-full">
        {tab === 'tricount' ? (
          <>
            {/* BALANCE SUPERIOR CLARO + BOTÓN SALDAR CUENTAS */}
            <div className="hand-card p-4 bg-[var(--bg-card)] flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Balance Actual de Pareja
                </span>
                {Math.abs(roundedNet) < 0.05 ? (
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">
                    ✨ ¡Todo saldado al día!
                  </p>
                ) : roundedNet > 0 ? (
                  <p className="text-base font-bold mt-0.5">
                    {petB.ownerName} le debe{' '}
                    <span className="text-rose-500 text-lg">
                      {roundedNet.toFixed(2).replace('.', ',')} {currency}
                    </span>{' '}
                    a {petA.ownerName}
                  </p>
                ) : (
                  <p className="text-base font-bold mt-0.5">
                    {petA.ownerName} le debe{' '}
                    <span className="text-rose-500 text-lg">
                      {Math.abs(roundedNet).toFixed(2).replace('.', ',')} {currency}
                    </span>{' '}
                    a {petB.ownerName}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5 shrink-0">
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setComposerOpen(!composerOpen)}
                  className="hand-button px-3 py-1.5 bg-[var(--accent-primary)] text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Añadir Gasto
                </motion.button>
                {Math.abs(roundedNet) >= 0.05 && (
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => {
                      settleAllExpenses();
                      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
                    }}
                    className="hand-pill px-2.5 py-1 bg-emerald-200 text-emerald-950 text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CheckCircle className="w-3 h-3" />
                    Saldar cuentas
                  </motion.button>
                )}
              </div>
            </div>

            {/* Formulario de Nuevo Gasto con los 3 botones rápidos + reparto personalizado */}
            <AnimatePresence>
              {composerOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="hand-card p-4 bg-[var(--bg-card)] space-y-3 overflow-hidden"
                >
                  <h3 className="text-xs font-bold uppercase text-[var(--text-muted)]">
                    Nuevo Gasto Compartido
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Concepto (ej. Cena ramen)..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] text-xs font-bold"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={amountStr}
                      onChange={(e) => setAmountStr(e.target.value)}
                      placeholder={`0,00 ${currency}`}
                      className="w-24 px-2.5 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] text-xs font-bold text-right"
                    />
                  </div>

                  {/* ¿Quién pagó? */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold">Pagado por:</span>
                    <button
                      onClick={() => setPaidBy('userA')}
                      className={`hand-pill px-3 py-1 font-bold cursor-pointer ${
                        paidBy === 'userA' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-paper)]'
                      }`}
                    >
                      {petA.ownerName}
                    </button>
                    <button
                      onClick={() => setPaidBy('userB')}
                      className={`hand-pill px-3 py-1 font-bold cursor-pointer ${
                        paidBy === 'userB' ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-paper)]'
                      }`}
                    >
                      {petB.ownerName}
                    </button>
                  </div>

                  {/* 3 Botones Rápidos de Reparto + Personalizado */}
                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    {[
                      { id: '50_50', label: '⚖️ 50/50 entre los dos' },
                      { id: 'invito_yo', label: '🎁 Invito yo' },
                      { id: '100_otro', label: '🛍️ Pagué algo 100% suyo' },
                      { id: 'personalizado', label: '🎛️ % Personalizado' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setSplitMode(m.id as ExpenseItem['splitMode'])}
                        className={`py-1.5 px-2 rounded-xl font-bold border border-[var(--border-ink)] cursor-pointer ${
                          splitMode === m.id ? 'bg-[var(--accent-highlight)] text-[#4A3F35]' : 'bg-[var(--bg-paper)]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {splitMode === 'personalizado' && (
                    <div className="p-2 rounded-xl bg-[var(--bg-paper)] border border-[var(--border-ink)] text-xs space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{petA.ownerName}: {customPctA}%</span>
                        <span>{petB.ownerName}: {100 - customPctA}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={customPctA}
                        onChange={(e) => setCustomPctA(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Categorías con iconos cute */}
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {(Object.keys(CATEGORY_META) as ExpenseCategory[]).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`hand-pill px-2.5 py-1 text-[11px] font-bold shrink-0 cursor-pointer ${
                          category === cat ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-paper)]'
                        }`}
                      >
                        {CATEGORY_META[cat].emoji} {cat}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={handleAddExpense}
                    className="w-full hand-button py-2 bg-[var(--accent-primary)] text-xs font-bold cursor-pointer"
                  >
                    Guardar Gasto en el Cerdito 🐷
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* GRÁFICO CIRCULAR PASTEL DEL MES */}
            <div className="hand-card p-3.5 bg-[var(--bg-card)] flex items-center gap-4">
              <div
                className="w-24 h-24 rounded-full border-3 border-[var(--border-ink)] shrink-0 flex items-center justify-center shadow-xs"
                style={{ background: pieGradient }}
              >
                <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border-ink)] flex flex-col items-center justify-center text-[10px] font-bold">
                  <span>Mes</span>
                  <span>
                    {totalMonth.toFixed(0)}
                    {currency}
                  </span>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-1.5 text-[11px]">
                {catTotals.map((c) => (
                  <div key={c.cat} className="flex items-center gap-1.5">
                    <span
                      className="w-3 h-3 rounded-full border border-[#4A3F35] shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="truncate font-semibold">
                      {c.emoji} {c.cat} ({c.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Historial mensual de gastos con opción de borrado rápido */}
            <div className="space-y-2">
              {expenses.map((e) => (
                <div
                  key={e.id}
                  className={`hand-card p-3 bg-[var(--bg-card)] flex items-center justify-between gap-2 ${
                    e.settled ? 'opacity-65' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-2xl shrink-0">{CATEGORY_META[e.category]?.emoji || '🐷'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{e.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">
                        Pagó {e.paidBy === 'userA' ? petA.ownerName : petB.ownerName} ·{' '}
                        {e.splitMode === '50_50'
                          ? '50/50'
                          : e.splitMode === 'invito_yo'
                          ? 'Invitación 🎁'
                          : e.splitMode === '100_otro'
                          ? '100% del otro'
                          : 'Personalizado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold">
                        {e.amount.toFixed(2).replace('.', ',')} {currency}
                      </p>
                      <span className="text-[10px] font-semibold text-[var(--text-muted)]">
                        {e.settled ? 'Saldado ✅' : e.date}
                      </span>
                    </div>

                    {confirmDeleteExpenseId === e.id ? (
                      <div className="flex items-center gap-1 bg-rose-100 border border-rose-300 px-2 py-1 rounded-xl">
                        <span className="text-[10px] font-bold text-rose-900">¿Borrar?</span>
                        <button
                          onClick={() => {
                            deleteExpense(e.id);
                            setConfirmDeleteExpenseId(null);
                          }}
                          className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold cursor-pointer"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmDeleteExpenseId(null)}
                          className="px-1.5 py-0.5 rounded bg-white text-rose-900 text-[10px] font-bold cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          soundEngine.playPop();
                          setConfirmDeleteExpenseId(e.id);
                        }}
                        title="Borrar este gasto"
                        className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* PESTAÑA 2: HUCHA DE AHORRO COMÚN CON CERDITO QUE SE LLENA DE MONEDAS Y FLORES */
          <div className="space-y-3">
            {savingsGoals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              const inputVal = contributionInputs[goal.id] || '';
              return (
                <div key={goal.id} className="hand-card p-4 bg-[var(--bg-card)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{goal.emoji}</span>
                      <div>
                        <h3 className="text-sm font-bold">{goal.title}</h3>
                        <p className="text-xs font-semibold text-[var(--text-muted)]">
                          {goal.currentAmount} {currency} / {goal.targetAmount} {currency} ({pct}%)
                        </p>
                      </div>
                    </div>

                    {/* Ilustración del cerdito llenándose de monedas y flores */}
                    <div className="relative w-16 h-16 rounded-2xl border-2 border-[var(--border-ink)] bg-[var(--bg-paper)] overflow-hidden flex items-center justify-center">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-[#FFB5C2] transition-all duration-500"
                        style={{ height: `${pct}%` }}
                      />
                      <span className="relative z-10 text-2xl">🐷🌸</span>
                    </div>
                  </div>

                  {/* Barra de progreso con flores */}
                  <div className="w-full h-4 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-ink)] overflow-hidden p-0.5">
                    <div
                      className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500 flex items-center justify-end pr-1 text-[10px]"
                      style={{ width: `${Math.max(8, pct)}%` }}
                    >
                      🪙
                    </div>
                  </div>

                  {/* Aportar monedas a la meta */}
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={inputVal}
                      onChange={(e) =>
                        setContributionInputs({ ...contributionInputs, [goal.id]: e.target.value })
                      }
                      placeholder={`Meter en la hucha (${currency})...`}
                      className="flex-1 px-3 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-paper)] text-xs font-bold"
                    />
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => {
                        const val = parseFloat(inputVal);
                        if (!isNaN(val) && val > 0) {
                          addSavingsContribution(goal.id, val);
                          setContributionInputs({ ...contributionInputs, [goal.id]: '' });
                          confetti({ particleCount: 35, spread: 55, origin: { y: 0.65 } });
                        }
                      }}
                      className="hand-button px-3 py-1.5 bg-[var(--accent-primary)] text-xs font-bold cursor-pointer"
                    >
                      + Meter 🪙
                    </motion.button>
                  </div>
                </div>
              );
            })}

            {/* Crear nueva meta de ahorro */}
            <div className="hand-card p-3.5 bg-[var(--bg-secondary)] space-y-2">
              <h4 className="text-xs font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Nueva Meta de Ahorro Conjunta
              </h4>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newGoalEmoji}
                  onChange={(e) => setNewGoalEmoji(e.target.value)}
                  className="w-11 text-center rounded-xl border border-[var(--border-ink)] bg-[var(--bg-card)] text-base"
                />
                <input
                  type="text"
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Ej. Escapada rural..."
                  className="flex-1 px-2.5 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-card)] text-xs font-bold"
                />
                <input
                  type="number"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder={`Meta ${currency}`}
                  className="w-20 px-2 py-1.5 rounded-xl border border-[var(--border-ink)] bg-[var(--bg-card)] text-xs font-bold"
                />
              </div>
              <button
                onClick={() => {
                  const target = parseFloat(newGoalTarget);
                  if (newGoalTitle.trim() && !isNaN(target) && target > 0) {
                    addSavingsGoal(newGoalTitle.trim(), newGoalEmoji || '🌟', target);
                    setNewGoalTitle('');
                    setNewGoalTarget('');
                  }
                }}
                className="w-full hand-button py-1.5 bg-[var(--bg-card)] text-xs font-bold cursor-pointer"
              >
                Crear Nueva Hucha 🐷✨
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
