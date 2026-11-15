import { useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  ForecastParams,
  ForecastResponse,
  SimulationReport,
  SimulationReportSummary,
} from '@hestia/api-client';
import {
  Button,
  DetailSheet,
  LoadError,
  IconCheck,
  LEVEL_META,
  Input,
  Panel,
  StatusBadge,
  dateLocale,
  parseServerTime,
  t,
  useLocale,
} from '@hestia/ui';
import { api } from '../lib/api';
import { useStation } from '../lib/hooks';
import { useRefreshOn } from '../lib/useSSE';
import { ForecastCurve, type Marker } from '../components/simulator/ForecastCurve';
import {
  LIMITS,
  STEPS,
  defaultInputs,
  demoInputs,
  fieldError,
  stepValid,
  type NumericKey,
  type StepKey,
} from '../lib/managementSimulator';

type View = { kind: 'home' } | { kind: 'wizard'; step: number } | { kind: 'report'; id: number };

const STEP_TITLE: Record<StepKey, () => string> = {
  mission: () => t('Mission and horizon', 'Mission et horizon'),
  food: () => t('Food and cargo', 'Réserve et cargo'),
  ration: () => t('Daily ration', 'Ration quotidienne'),
  body: () => t('Exercise', 'Exercice'),
  radiation: () => t('Radiation event', 'Événement radiatif'),
};

const when = (iso: string) =>
  new Date(parseServerTime(iso)).toLocaleString(dateLocale(), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

const PAGE_SIZE = 4;

const muted = { fontSize: 'var(--text-sm)', color: 'var(--text-muted)' } as const;
const caption = { fontSize: 'var(--text-xs)', color: 'var(--text-faint)' } as const;
const figure = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' } as const;

/** Numbers in the reader's locale: "9 615", "−22,3" in French. */
const num = (value: number, digits = 0) =>
  value.toLocaleString(dateLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function ForecastsScreen() {
  useLocale();
  const { context } = useStation();
  const [view, setView] = useState<View>({ kind: 'home' });
  const [baseline, setBaseline] = useState<ForecastResponse | null>(null);
  const [inputs, setInputs] = useState<ForecastParams | null>(null);
  const [reports, setReports] = useState<SimulationReportSummary[] | null>(null);
  const [reportsError, setReportsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [requestedPage, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil((reports?.length ?? 0) / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount - 1); // the list can shrink after a demo reset

  useRefreshOn(['scan_complete', 'slot_confirmed', 'meal_logged', 'reset', 'context_changed'], () =>
    setTick((n) => n + 1),
  );

  // today's mission, crew and stock: what every step is pre-filled from
  useEffect(() => {
    api
      .forecast(defaultInputs(context?.next_resupply_in_days ?? null))
      .then((r) => {
        setBaseline(r);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    api
      .listSimulationReports()
      .then((value) => {
        setReports(value);
        setReportsError(false);
      })
      .catch(() => setReportsError(true));
  }, [tick, context?.type, context?.next_resupply_in_days]);

  const nextCargo = baseline?.context.next_resupply_in_days ?? null;

  function start(values: ForecastParams) {
    setInputs(values);
    setView({ kind: 'wizard', step: 0 });
  }

  async function generate(values: ForecastParams) {
    const report = await api.createSimulationReport(values);
    setReports((list) => [report, ...(list ?? [])]);
    setPage(0);
    setView({ kind: 'report', id: report.id });
  }

  if (view.kind === 'wizard' && inputs && baseline) {
    return (
      <Wizard
        step={view.step}
        inputs={inputs}
        baseline={baseline}
        onChange={setInputs}
        onStep={(step) => setView({ kind: 'wizard', step })}
        onCancel={() => setView({ kind: 'home' })}
        onGenerate={generate}
      />
    );
  }

  if (view.kind === 'report') {
    return (
      <ReportView
        id={view.id}
        onBack={() => setView({ kind: 'home' })}
        onEdit={(values, step) => {
          setInputs(values);
          setView({ kind: 'wizard', step });
        }}
      />
    );
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <header style={{ display: 'grid', gap: 'var(--space-1)' }}>
        <p style={caption}>{t('Simulation · simulated crew', 'Simulation · équipage simulé')}</p>
        <h1 style={{ fontSize: 'var(--text-xl)' }}>{t('Management simulator', 'Simulateur de gestion')}</h1>
      </header>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 440px), 1fr))',
          gap: 'var(--space-4)',
          alignItems: 'stretch',
        }}
      >
        <Panel title={t('How it works', 'Comment ça marche')} bodyStyle={{ display: 'flex' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', flex: 1 }}>
            <p style={{ maxWidth: '68ch' }}>
              {t(
                'Earth answers in minutes and the next cargo is months away, so the crew decides alone. In five short steps, describe a situation; HESTIA then writes a report on what it does to the food stock, body weight, bone mass and radiation dose until the end of the period.',
                'La Terre répond en plusieurs minutes et le prochain cargo est dans des mois : l’équipage décide seul. En cinq étapes courtes, décrivez une situation ; HESTIA rédige ensuite un rapport sur ses effets sur la réserve, le poids, la masse osseuse et la dose de radiation jusqu’à la fin de la période.',
              )}
            </p>
            <p style={{ ...muted, maxWidth: '68ch' }}>
              {t(
                'Every step starts from today’s mission and stock; change only what your situation changes. Simulation on NASA reference values and flagged assumptions — not a prediction for a real person, not a medical device.',
                'Chaque étape part de la mission et du stock actuels : ne modifiez que ce que votre situation change. Simulation sur des valeurs de référence NASA et des hypothèses signalées : ce n’est ni une prédiction pour une vraie personne, ni un dispositif médical.',
              )}
            </p>
            <ol
              aria-label={t('The five steps', 'Les cinq étapes')}
              style={{ display: 'grid', gap: 'var(--space-1)', listStyle: 'none', padding: 0, margin: 0 }}
            >
              {STEPS.map((step, i) => (
                <li
                  key={step}
                  style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'baseline', ...muted }}
                >
                  <span style={{ ...figure, color: 'var(--accent)', minWidth: '1.5ch' }}>{i + 1}</span>
                  <span style={{ color: 'var(--text)' }}>{STEP_TITLE[step]()}</span>
                </li>
              ))}
            </ol>
            {error && (
              <p role="alert" style={{ color: 'var(--red-ink)' }}>
                {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'auto' }}>
              <Button variant="primary" disabled={!baseline} onClick={() => start(defaultInputs(nextCargo))}>
                {t('Start a simulation', 'Lancer une simulation')}
              </Button>
              {nextCargo != null && (
                <Button disabled={!baseline} onClick={() => start(demoInputs(nextCargo))}>
                  {t('Example: the cargo is 90 days late', 'Exemple : le cargo a 90 jours de retard')}
                </Button>
              )}
            </div>
          </div>
        </Panel>

        <Panel title={t('Report history', 'Historique des rapports')}>
          {reportsError && (
            <LoadError
              label={
                reports?.length
                  ? t(
                      'Report history could not refresh. Displayed reports may be outdated.',
                      'Actualisation de l’historique impossible. Les rapports affichés peuvent être anciens.',
                    )
                  : t('Report history could not load.', 'Impossible de charger l’historique des rapports.')
              }
              onRetry={() => setTick((value) => value + 1)}
            />
          )}
          {reports == null ? (
            !reportsError && <p style={muted}>{t('Loading…', 'Chargement…')}</p>
          ) : reports.length === 0 ? (
            !reportsError && (
              <p style={muted}>
                {t(
                  'No report yet. Each simulation you complete is kept here, with the inputs you confirmed.',
                  'Aucun rapport pour l’instant. Chaque simulation terminée est conservée ici, avec les valeurs confirmées.',
                )}
              </p>
            )
          ) : (
            <ul style={{ display: 'grid', gap: 'var(--space-2)', listStyle: 'none', padding: 0, margin: 0 }}>
              {reports.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setView({ kind: 'report', id: r.id })}
                    className="hz-control"
                    style={{
                      width: '100%',
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0, 1fr) auto',
                      gap: 'var(--space-3)',
                      alignItems: 'center',
                      textAlign: 'left',
                      cursor: 'pointer',
                      minHeight: 44,
                    }}
                  >
                    <span style={{ display: 'grid', gap: 2 }}>
                      <strong>
                        {t('Report', 'Rapport')} #{r.id} · {t(r.context_label)}
                      </strong>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {when(r.created_ts)} · {inputsLine(r.inputs)}
                      </span>
                    </span>
                    <FoodBadge summary={r.summary} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {reports != null && pageCount > 1 && (
            <nav
              aria-label={t('Report pages', 'Pages des rapports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 'var(--space-2)',
                marginTop: 'var(--space-3)',
              }}
            >
              <Button size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                {t('Newer', 'Plus récents')}
              </Button>
              <span style={{ ...muted, fontVariantNumeric: 'tabular-nums' }} aria-live="polite">
                {t('Page', 'Page')} {page + 1} / {pageCount} · {reports.length} {t('reports', 'rapports')}
              </span>
              <Button size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(page + 1)}>
                {t('Older', 'Plus anciens')}
              </Button>
            </nav>
          )}
        </Panel>
      </div>
    </div>
  );
}

function inputsLine(p: ForecastParams): string {
  const parts = [
    `${p.mission_days} ${t('days', 'jours')}`,
    `${t('ration', 'ration')} ${p.ration_pct} %`,
    `${p.exercise_h_per_day} ${t('h/day exercise', 'h/j d’exercice')}`,
  ];
  if (p.resupply_delay_days) parts.push(`${t('cargo', 'cargo')} +${p.resupply_delay_days} ${t('d', 'j')}`);
  if (p.solar_storm) parts.push(t('solar storm', 'tempête solaire'));
  return parts.join(' · ');
}

function FoodBadge({ summary }: { summary: SimulationReport['summary'] }) {
  if (summary.days_without_food > 0)
    return (
      <StatusBadge
        level="red"
        size="sm"
        label={`${summary.days_without_food} ${t('days without food', 'jours sans nourriture')}`}
      />
    );
  if (summary.ration_below_floor)
    return (
      <StatusBadge
        level="red"
        size="sm"
        label={`${t('ration under', 'ration sous')} ${summary.safety_floor_pct} %`}
      />
    );
  return <StatusBadge level="green" size="sm" label={t('stock holds', 'le stock tient')} />;
}

/* ---------------------------------------------------------------- wizard */

function NumberField({
  id,
  label,
  unit,
  field,
  inputs,
  onChange,
  step = 1,
  help,
}: {
  id: string;
  label: string;
  unit: string;
  field: NumericKey;
  inputs: ForecastParams;
  onChange: (next: ForecastParams) => void;
  step?: number;
  help?: string;
}) {
  const value = inputs[field];
  const problem = fieldError(field, value);
  return (
    <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
      <label htmlFor={id} style={{ fontWeight: 600 }}>
        {label}
      </label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={LIMITS[field].min}
          max={LIMITS[field].max}
          step={step}
          value={Number.isFinite(value) ? value : ''}
          aria-invalid={problem != null}
          aria-describedby={`${id}-help`}
          onChange={(e) =>
            onChange({ ...inputs, [field]: e.target.value === '' ? NaN : Number(e.target.value) })
          }
          style={{ width: 120, fontFamily: 'var(--font-mono)' }}
        />
        <span style={muted}>{unit}</span>
      </div>
      <p
        id={`${id}-help`}
        style={{ fontSize: 'var(--text-xs)', color: problem ? 'var(--red-ink)' : 'var(--text-faint)' }}
      >
        {problem ? t(problem) : help}
      </p>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', ...muted }}>
      <span>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{value}</span>
    </div>
  );
}

function Why({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderLeft: '2px solid var(--accent)',
        paddingLeft: 'var(--space-3)',
        ...muted,
      }}
    >
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginBottom: 2 }}>
        {t('Why we ask', 'Pourquoi cette question')}
      </p>
      {children}
    </div>
  );
}

function Wizard({
  step,
  inputs,
  baseline,
  onChange,
  onStep,
  onCancel,
  onGenerate,
}: {
  step: number;
  inputs: ForecastParams;
  baseline: ForecastResponse;
  onChange: (next: ForecastParams) => void;
  onStep: (step: number) => void;
  onCancel: () => void;
  onGenerate: (values: ForecastParams) => Promise<void>;
}) {
  const key = STEPS[step];
  const last = step === STEPS.length - 1;
  const valid = stepValid(key, inputs);
  const [preview, setPreview] = useState<ForecastResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const ctx = baseline.context;
  const noCargo = ctx.next_resupply_in_days == null;

  useEffect(() => titleRef.current?.focus(), [step]);

  // running estimate with the values typed so far, shown as a hint only
  useEffect(() => {
    if (!STEPS.every((s) => stepValid(s, inputs))) return;
    const timer = setTimeout(() => {
      api
        .forecast(inputs)
        .then(setPreview)
        .catch(() => setPreview(null));
    }, 200);
    return () => clearTimeout(timer);
  }, [inputs]);

  const summary = preview?.summary;
  const autonomyAtFull = baseline.summary.crew_need_kcal_day
    ? Math.round(ctx.stock_kcal / baseline.summary.crew_need_kcal_day)
    : null;

  async function confirm() {
    if (!valid) return;
    if (!last) return onStep(step + 1);
    setSaving(true);
    setSaveError(null);
    try {
      await onGenerate(inputs);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)', maxWidth: 880 }}>
      <nav aria-label={t('Simulation steps', 'Étapes de la simulation')}>
        <ol
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))`,
            gap: 'var(--space-2)',
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {STEPS.map((s, i) => {
            const current = i === step;
            const done = i < step;
            return (
              <li
                key={s}
                aria-current={current ? 'step' : undefined}
                style={{
                  display: 'grid',
                  gap: 'var(--space-1)',
                  paddingTop: 'var(--space-2)',
                  borderTop: `2px solid ${current || done ? 'var(--accent)' : 'var(--border)'}`,
                  fontSize: 'var(--text-xs)',
                  color: current ? 'var(--text)' : 'var(--text-faint)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', ...figure }}>
                  {done ? <IconCheck size={12} /> : null}
                  {i + 1}
                  {done && <span className="sr-only">{t('done', 'fait')}</span>}
                </span>
                <span style={{ fontWeight: current ? 600 : 400 }}>{STEP_TITLE[s]()}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      <Panel elevated>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void confirm();
          }}
          style={{ display: 'grid', gap: 'var(--space-4)' }}
        >
          <h2 ref={titleRef} tabIndex={-1} style={{ outline: 'none', fontSize: 'var(--text-xl)' }}>
            <span className="sr-only">
              {t('Step', 'Étape')} {step + 1} / {STEPS.length} ·{' '}
            </span>
            {STEP_TITLE[key]()}
          </h2>

          {key === 'mission' && (
            <>
              <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
                <Fact label={t('Mission', 'Mission')} value={t(ctx.label)} />
                <Fact
                  label={t('Crew', 'Équipage')}
                  value={`${ctx.crew_count} (${t('simulated', 'simulé')})`}
                />
                <Fact
                  label={t('Radiation at this location', 'Radiation sur ce site')}
                  value={`${ctx.radiation_msv_day} mSv/${t('day', 'jour')}`}
                />
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                  {t(
                    'To simulate another mission, change it in Settings first.',
                    'Pour une autre mission, changez-la d’abord dans les Réglages.',
                  )}
                </p>
              </div>
              <NumberField
                id="sim-horizon"
                label={t('How many days ahead?', 'Sur combien de jours ?')}
                unit={t('days from today', 'jours à partir d’aujourd’hui')}
                field="mission_days"
                inputs={inputs}
                onChange={onChange}
                help={
                  noCargo
                    ? undefined
                    : t(
                        `The next cargo is planned in ${ctx.next_resupply_in_days} days; look a little beyond it to see the effect of a delay.`,
                        `Le prochain cargo est prévu dans ${ctx.next_resupply_in_days} jours ; regardez un peu au-delà pour voir l’effet d’un retard.`,
                      )
                }
              />
              <Why>
                {t(
                  'The horizon is the period the report covers. Every curve stops on that day.',
                  'L’horizon est la période couverte par le rapport. Toutes les courbes s’arrêtent ce jour-là.',
                )}
              </Why>
            </>
          )}

          {key === 'food' && (
            <>
              <div style={{ display: 'grid', gap: 'var(--space-1)' }}>
                <Fact
                  label={t('Food in stock (last confirmed count)', 'Réserve (dernier comptage confirmé)')}
                  value={`${num(ctx.stock_kcal)} kcal`}
                />
                <Fact
                  label={t('That is, at full rations', 'Soit, en rations complètes')}
                  value={autonomyAtFull != null ? `${autonomyAtFull} ${t('days', 'jours')}` : '–'}
                />
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
                  {t(
                    'Uses the demo scale of the shelf. To change it, scan or correct the shelf on the Pantry screen.',
                    'Utilise l’échelle de démo de l’étagère. Pour la changer, photographiez ou corrigez la réserve.',
                  )}
                </p>
              </div>
              {noCargo ? (
                <p style={muted}>
                  {t('No cargo is planned for this mission.', 'Aucun cargo n’est prévu pour cette mission.')}
                </p>
              ) : (
                <NumberField
                  id="sim-delay"
                  label={t('How late is the next cargo?', 'Quel retard pour le prochain cargo ?')}
                  unit={t('days late (0 = on time)', 'jours de retard (0 = à l’heure)')}
                  field="resupply_delay_days"
                  inputs={inputs}
                  onChange={onChange}
                  help={t(
                    `Planned in ${ctx.next_resupply_in_days} days.`,
                    `Prévu dans ${ctx.next_resupply_in_days} jours.`,
                  )}
                />
              )}
              <Why>
                {t(
                  'A late cargo is the most common reason a stock that looked sufficient runs out. The simulator assumes the cargo restores the stock to today’s level.',
                  'Un cargo en retard est la raison la plus courante pour laquelle une réserve suffisante finit par manquer. Le simulateur suppose que le cargo rétablit le stock au niveau actuel.',
                )}
              </Why>
            </>
          )}

          {key === 'ration' && (
            <>
              <NumberField
                id="sim-ration"
                label={t('Ration you plan to serve', 'Ration que vous prévoyez')}
                unit={t('% of each person’s energy need', '% du besoin énergétique de chacun')}
                field="ration_pct"
                inputs={inputs}
                onChange={onChange}
                help={`${t('Crew need today:', 'Besoin de l’équipage aujourd’hui :')} ${num(baseline.summary.crew_need_kcal_day)} kcal/${t('day', 'jour')}`}
              />
              {summary && summary.required_ration_pct < 100 && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto minmax(0, 1fr)',
                    gap: 'var(--space-2) var(--space-4)',
                    alignItems: 'center',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--panel-raised)',
                  }}
                >
                  <p style={{ ...figure, fontSize: 'var(--text-2xl)', lineHeight: 1 }}>
                    {Math.floor(summary.required_ration_pct)}
                    <span style={{ fontSize: 'var(--text-lg)', color: 'var(--text-muted)' }}> %</span>
                  </p>
                  <p style={muted}>
                    {t('ration needed to last until', 'ration nécessaire pour tenir jusqu’au')}{' '}
                    {summary.resupply_day != null
                      ? `${t('the cargo on day', 'cargo du jour')} ${summary.resupply_day}`
                      : `${t('day', 'jour')} ${inputs.mission_days}`}
                  </p>
                  {summary.required_ration_below_floor && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <StatusBadge
                        level="red"
                        label={t(
                          `Below the ${summary.safety_floor_pct} % safety floor`,
                          `Sous le plancher de sécurité de ${summary.safety_floor_pct} %`,
                        )}
                      />
                    </div>
                  )}
                  <div style={{ gridColumn: '1 / -1' }}>
                    <Button
                      size="sm"
                      onClick={() =>
                        onChange({
                          ...inputs,
                          ration_pct: Math.max(
                            LIMITS.ration_pct.min,
                            Math.floor(summary.required_ration_pct),
                          ),
                        })
                      }
                    >
                      {t('Use', 'Utiliser')} {Math.floor(summary.required_ration_pct)} %
                    </Button>
                  </div>
                </div>
              )}
              {inputs.ration_pct < (summary?.safety_floor_pct ?? 70) && (
                <StatusBadge
                  level="red"
                  label={t(
                    'This ration is under the safety floor',
                    'Cette ration est sous le plancher de sécurité',
                  )}
                />
              )}
              <Why>
                {t(
                  'Eating less makes the stock last longer, at the cost of body weight. The report shows both, so the trade-off is visible. Below 70 % the plan is flagged as unsafe.',
                  'Manger moins fait durer la réserve, au prix du poids. Le rapport montre les deux pour rendre le compromis visible. Sous 70 %, le plan est signalé comme dangereux.',
                )}
              </Why>
            </>
          )}

          {key === 'body' && (
            <>
              <NumberField
                id="sim-exercise"
                label={t('Exercise per person', 'Exercice par personne')}
                unit={t('hours per day', 'heures par jour')}
                field="exercise_h_per_day"
                inputs={inputs}
                onChange={onChange}
                step={0.25}
                help={t('Resistance and treadmill time together.', 'Musculation et tapis de course cumulés.')}
              />
              <Why>
                {t(
                  'In reduced gravity bones lose about 1 to 1.5 % of their mass per month (NASA). Exercise slows that loss; how much is an assumption shown in the report.',
                  'En gravité réduite, les os perdent environ 1 à 1,5 % de leur masse par mois (NASA). L’exercice ralentit cette perte ; son effet exact est une hypothèse indiquée dans le rapport.',
                )}
              </Why>
            </>
          )}

          {key === 'radiation' && (
            <>
              <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 'var(--space-2)' }}>
                <legend style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                  {t('Include a solar storm?', 'Inclure une tempête solaire ?')}
                </legend>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button
                    aria-pressed={!inputs.solar_storm}
                    variant={!inputs.solar_storm ? 'primary' : 'secondary'}
                    onClick={() => onChange({ ...inputs, solar_storm: false })}
                  >
                    {t('No', 'Non')}
                  </Button>
                  <Button
                    aria-pressed={inputs.solar_storm}
                    variant={inputs.solar_storm ? 'primary' : 'secondary'}
                    onClick={() => onChange({ ...inputs, solar_storm: true })}
                  >
                    {t('Yes', 'Oui')}
                  </Button>
                </div>
              </fieldset>
              {inputs.solar_storm && (
                <>
                  <NumberField
                    id="sim-storm-day"
                    label={t('On which day?', 'Quel jour ?')}
                    unit={t('days from today', 'jours à partir d’aujourd’hui')}
                    field="storm_day"
                    inputs={inputs}
                    onChange={onChange}
                    help={
                      inputs.storm_day > inputs.mission_days
                        ? t(
                            'After the horizon: choose an earlier day.',
                            'Après l’horizon : choisissez un jour plus tôt.',
                          )
                        : undefined
                    }
                  />
                  <NumberField
                    id="sim-storm-dose"
                    label={t('Extra dose received', 'Dose supplémentaire reçue')}
                    unit="mSv"
                    field="storm_dose_msv"
                    inputs={inputs}
                    onChange={onChange}
                    step={10}
                    help={t(
                      '50 mSv is an assumption, not a measurement.',
                      '50 mSv est une hypothèse, pas une mesure.',
                    )}
                  />
                </>
              )}
              <Why>
                {t(
                  'The daily dose comes from Curiosity’s RAD measurements. A storm adds a sudden dose; the report compares the total with the 600 mSv career limit of NASA-STD-3001.',
                  'La dose quotidienne vient des mesures RAD de Curiosity. Une tempête ajoute une dose soudaine ; le rapport compare le total à la limite de carrière de 600 mSv de NASA-STD-3001.',
                )}
              </Why>
            </>
          )}

          {saveError && (
            <p role="alert" style={{ color: 'var(--red-ink)' }}>
              {t('The report could not be saved:', 'Le rapport n’a pas pu être enregistré :')} {saveError}
            </p>
          )}

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 'var(--space-2)',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Button variant="ghost" onClick={onCancel}>
                {t('Cancel', 'Annuler')}
              </Button>
              {step > 0 && <Button onClick={() => onStep(step - 1)}>{t('Back', 'Retour')}</Button>}
            </div>
            <Button type="submit" variant="primary" disabled={!valid || saving}>
              {last
                ? saving
                  ? t('Writing the report…', 'Rédaction du rapport…')
                  : t('Confirm and write the report', 'Confirmer et rédiger le rapport')
                : t('Confirm and continue', 'Confirmer et continuer')}
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}

/* ---------------------------------------------------------------- report */

type Level = 'green' | 'orange' | 'red';
type Finding = { level: Level; topic: string; text: string };

const TILE_ORDER: Level[] = ['red', 'orange', 'green'];
const capital = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/** Three large counters, worst first. Opening one lists its findings in a modal.
 * Team choice (15 Nov): red findings sit behind a click too; see STATUS.md. */
function LevelTiles({ findings }: { findings: Finding[] }) {
  const [open, setOpen] = useState<Level | null>(null);
  const items = open ? findings.filter((f) => f.level === open) : [];
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 'var(--space-3)',
          height: '100%',
        }}
      >
        {TILE_ORDER.map((level) => {
          const meta = LEVEL_META[level];
          const Icon = meta.icon;
          const count = findings.filter((f) => f.level === level).length;
          return (
            <button
              key={level}
              type="button"
              disabled={count === 0}
              onClick={() => setOpen(level)}
              aria-haspopup="dialog"
              aria-label={`${t(meta.word)}: ${count}`}
              style={{
                display: 'grid',
                gridTemplateRows: 'auto 1fr auto',
                alignItems: 'center',
                gap: 'var(--space-2)',
                justifyItems: 'start',
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${count ? meta.color : 'var(--border)'}`,
                background: count ? meta.dim : 'transparent',
                color: count ? meta.ink : 'var(--text-faint)',
                cursor: count ? 'pointer' : 'default',
                textAlign: 'left',
                font: 'inherit',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                }}
              >
                <Icon size={16} />
                {capital(t(meta.word))}
              </span>
              <span
                style={{
                  ...figure,
                  fontSize: 'var(--text-display)',
                  lineHeight: 1,
                  color: count ? 'var(--text)' : 'var(--text-faint)',
                }}
              >
                {count}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                {count ? t('See the details', 'Voir le détail') : t('None', 'Aucun')}
              </span>
            </button>
          );
        })}
      </div>
      {open && (
        <DetailSheet
          variant="modal"
          title={`${capital(t(LEVEL_META[open].word))} · ${items.length}`}
          onClose={() => setOpen(null)}
        >
          <ul style={{ display: 'grid', gap: 'var(--space-3)', listStyle: 'none', padding: 0, margin: 0 }}>
            {items.map((f) => (
              <li key={f.text} style={{ display: 'grid', gap: 'var(--space-1)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <StatusBadge level={f.level} size="sm" />
                  <strong>{f.topic}</strong>
                </span>
                <span style={muted}>{f.text}</span>
              </li>
            ))}
          </ul>
        </DetailSheet>
      )}
    </>
  );
}

function ReportView({
  id,
  onBack,
  onEdit,
}: {
  id: number;
  onBack: () => void;
  onEdit: (inputs: ForecastParams, step: number) => void;
}) {
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);

  useEffect(() => {
    api
      .getSimulationReport(id)
      .then(setReport)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, [id]);

  if (error)
    return (
      <Panel>
        <p role="alert" style={{ color: 'var(--red-ink)' }}>
          {error}
        </p>
        <Button onClick={onBack}>{t('Back to the simulator', 'Retour au simulateur')}</Button>
      </Panel>
    );
  if (!report) return <p style={muted}>{t('Loading…', 'Chargement…')}</p>;

  const { summary: s, inputs: p, series, context: ctx } = report;
  const last = series[series.length - 1];
  const resupplyMarker: Marker[] =
    s.resupply_day != null && s.resupply_day <= p.mission_days
      ? [{ x: s.resupply_day, label: t('cargo', 'cargo'), color: 'var(--text-muted)' }]
      : [];

  const findings: Finding[] = [
    s.days_without_food > 0
      ? {
          topic: t('Food stock', 'Réserve'),
          level: 'red',
          text: t(
            `Food runs out on day ${s.stockout_day}: ${s.days_without_food} days without food before the period ends or the cargo arrives.`,
            `La réserve s’épuise au jour ${s.stockout_day} : ${s.days_without_food} jours sans nourriture avant la fin de la période ou l’arrivée du cargo.`,
          ),
        }
      : {
          topic: t('Food stock', 'Réserve'),
          level: s.ration_below_floor ? 'red' : 'green',
          text: t(
            `The stock lasts the whole period; about ${num(last?.stock_days ?? 0, 0)} days of full rations remain on day ${p.mission_days}.`,
            `La réserve tient toute la période ; il reste environ ${num(last?.stock_days ?? 0, 0)} jours de rations complètes au jour ${p.mission_days}.`,
          ),
        },
    {
      topic: t('Crew weight', 'Poids de l’équipage'),
      level: s.weight_change_pct_final <= -5 ? 'red' : s.weight_change_pct_final <= -2 ? 'orange' : 'green',
      text: t(
        `Average body weight changes by ${num(s.weight_change_pct_final, 1)} %.`,
        `Le poids moyen varie de ${num(s.weight_change_pct_final, 1)} %.`,
      ),
    },
    {
      topic: t('Bone mass', 'Masse osseuse'),
      level: 'orange',
      text: t(
        `Bone mass ends at ${num(s.bone_pct_final, 1)} % of today (−${num(s.bone_loss_pct_per_month, 2)} % per month at ${p.exercise_h_per_day} h/day of exercise).`,
        `La masse osseuse finit à ${num(s.bone_pct_final, 1)} % d’aujourd’hui (−${num(s.bone_loss_pct_per_month, 2)} % par mois avec ${p.exercise_h_per_day} h/j d’exercice).`,
      ),
    },
    s.radiation_limit_day != null
      ? {
          topic: t('Radiation', 'Radiation'),
          level: 'red',
          text: t(
            `The career radiation limit is crossed on day ${s.radiation_limit_day}.`,
            `La limite de radiation de carrière est franchie au jour ${s.radiation_limit_day}.`,
          ),
        }
      : {
          topic: t('Radiation', 'Radiation'),
          level: s.radiation_pct_of_limit >= 70 ? 'orange' : 'green',
          text: t(
            `Radiation reaches ${num(s.radiation_msv_final, 0)} mSv, ${num(s.radiation_pct_of_limit, 0)} % of the ${s.radiation_limit_msv} mSv career limit.`,
            `La radiation atteint ${num(s.radiation_msv_final, 0)} mSv, soit ${num(s.radiation_pct_of_limit, 0)} % de la limite de carrière de ${s.radiation_limit_msv} mSv.`,
          ),
        },
  ];

  const confirmed: { label: string; value: string; step: number }[] = [
    { label: t('Horizon', 'Horizon'), value: `${p.mission_days} ${t('days', 'jours')}`, step: 0 },
    {
      label: t('Cargo delay', 'Retard du cargo'),
      value:
        ctx.next_resupply_in_days == null
          ? t('no cargo planned', 'aucun cargo prévu')
          : `${p.resupply_delay_days} ${t('days', 'jours')}`,
      step: 1,
    },
    { label: t('Ration', 'Ration'), value: `${p.ration_pct} %`, step: 2 },
    { label: t('Exercise', 'Exercice'), value: `${p.exercise_h_per_day} h/${t('day', 'jour')}`, step: 3 },
    {
      label: t('Solar storm', 'Tempête solaire'),
      value: p.solar_storm
        ? `${t('day', 'jour')} ${p.storm_day} · ${p.storm_dose_msv} mSv`
        : t('none', 'aucune'),
      step: 4,
    },
  ];

  return (
    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 'var(--space-3)',
          flexWrap: 'wrap',
          alignItems: 'end',
        }}
      >
        <div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
            {t('Simulation report', 'Rapport de simulation')} #{report.id} · {when(report.created_ts)}
          </p>
          <h1 style={{ fontSize: 'var(--text-xl)' }}>
            {t(ctx.label)} · {ctx.crew_count} {t('crew (simulated)', 'membres (simulés)')}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button onClick={onBack}>{t('All reports', 'Tous les rapports')}</Button>
          <Button variant="primary" onClick={() => onEdit(p, 0)}>
            {t('Adjust and run again', 'Ajuster et relancer')}
          </Button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 320px)',
          gap: 'var(--space-4)',
          alignItems: 'stretch',
        }}
      >
        <Panel
          title={t('What this situation leads to', 'Ce que cette situation entraîne')}
          bodyStyle={{ display: 'grid', gridTemplateRows: 'minmax(0, 1fr) auto', gap: 'var(--space-3)' }}
        >
          <LevelTiles findings={findings} />
          {s.required_ration_pct < 100 && (
            <p style={muted}>
              {t('To last until', 'Pour tenir jusqu’au')}{' '}
              {s.resupply_day != null
                ? `${t('the cargo on day', 'cargo du jour')} ${s.resupply_day}`
                : `${t('day', 'jour')} ${p.mission_days}`}
              , {t('the crew would need a ration of', 'il faudrait une ration de')}{' '}
              <strong style={{ color: s.required_ration_below_floor ? 'var(--red-ink)' : 'var(--text)' }}>
                {Math.floor(s.required_ration_pct)} %
              </strong>
              {s.required_ration_below_floor
                ? t(
                    `, under the ${s.safety_floor_pct} % safety floor: not sustainable, ask Earth for options now.`,
                    `, sous le plancher de sécurité de ${s.safety_floor_pct} % : intenable, demandez des options à la Terre dès maintenant.`,
                  )
                : '.'}
            </p>
          )}
        </Panel>

        <Panel title={t('Inputs you confirmed', 'Valeurs confirmées')}>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {confirmed.map((c) => (
              <div
                key={c.label}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
                  gap: 'var(--space-2)',
                  alignItems: 'center',
                  ...muted,
                }}
              >
                <span>{c.label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{c.value}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(p, c.step)}
                  aria-label={`${t('Change', 'Modifier')} ${c.label}`}
                >
                  {t('Change', 'Modifier')}
                </Button>
              </div>
            ))}
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>
              {t('Stock at the time:', 'Réserve à ce moment :')} {num(ctx.stock_kcal)} kcal ·{' '}
              {t('starting dose', 'dose de départ')} {num(ctx.current_dose_msv, 1)} mSv.{' '}
              {t(
                'Changing a value writes a new report; this one stays as it is.',
                'Modifier une valeur crée un nouveau rapport ; celui-ci reste tel quel.',
              )}
            </p>
          </div>
        </Panel>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 'var(--space-4)' }}
      >
        <ForecastCurve
          title={t('Food stock', 'Réserve')}
          headline={
            s.stockout_day != null
              ? t(`runs out on day ${s.stockout_day}`, `épuisée au jour ${s.stockout_day}`)
              : t(
                  `${num(last?.stock_days ?? 0, 0)} days left at the end`,
                  `${num(last?.stock_days ?? 0, 0)} jours restants à la fin`,
                )
          }
          badge={<FoodBadge summary={s} />}
          detail={
            s.resupply_day != null
              ? t(
                  `cargo on day ${s.resupply_day}${p.resupply_delay_days ? ` (${p.resupply_delay_days} days late)` : ''} · ${p.ration_pct} % rations`,
                  `cargo au jour ${s.resupply_day}${p.resupply_delay_days ? ` (${p.resupply_delay_days} j de retard)` : ''} · rations à ${p.ration_pct} %`,
                )
              : t(
                  `no resupply · ${p.ration_pct} % rations`,
                  `aucun ravitaillement · rations à ${p.ration_pct} %`,
                )
          }
          data={series}
          dataKey="stock_days"
          unit={t('days of full rations', 'jours de rations complètes')}
          color="var(--chart-series-1)"
          markers={resupplyMarker}
          domain={[0, 'auto']}
        />
        <ForecastCurve
          title={t('Crew weight', 'Poids de l’équipage')}
          headline={`${s.weight_change_pct_final > 0 ? '+' : ''}${num(s.weight_change_pct_final, 1)} % ${t('on average', 'en moyenne')}`}
          detail={s.weight_per_crew
            .map((c) => `${c.name.split(' ')[0]} ${c.change_kg > 0 ? '+' : ''}${c.change_kg} kg`)
            .join(' · ')}
          data={series}
          dataKey="weight_change_pct"
          unit={t('% vs today', '% vs aujourd’hui')}
          color="var(--chart-series-2)"
          markers={[
            { y: -2, label: t('orange −2 %', 'orange −2 %'), color: 'var(--orange-ink)' },
            { y: -5, label: t('red −5 %', 'rouge −5 %'), color: 'var(--red-ink)' },
          ]}
          domain={
            [
              (min: number) => Math.min(-6, Math.floor(min)),
              (max: number) => Math.max(1, Math.ceil(max)),
            ] as never
          }
        />
        <ForecastCurve
          title={t('Bone mass', 'Masse osseuse')}
          headline={`${num(s.bone_pct_final, 1)} % ${t('of today', 'd’aujourd’hui')}`}
          detail={t(
            `−${num(s.bone_loss_pct_per_month, 2)} % per month at ${p.exercise_h_per_day} h/day of exercise (assumption)`,
            `−${num(s.bone_loss_pct_per_month, 2)} % par mois avec ${p.exercise_h_per_day} h/j d’exercice (hypothèse)`,
          )}
          data={series}
          dataKey="bone_pct"
          unit="%"
          color="var(--chart-series-1)"
          markers={[]}
          domain={[(min: number) => Math.floor(min - 1), 100] as never}
        />
        <ForecastCurve
          title={t('Cumulative radiation', 'Radiation cumulée')}
          headline={`${num(s.radiation_msv_final, 0)} mSv · ${num(s.radiation_pct_of_limit, 0)} % ${t('of limit', 'de la limite')}`}
          detail={`${ctx.radiation_msv_day} mSv/${t('day', 'jour')}${p.solar_storm ? ` + ${p.storm_dose_msv} mSv ${t('storm on day', 'tempête au jour')} ${p.storm_day}` : ''}`}
          data={series}
          dataKey="radiation_msv"
          unit="mSv"
          color="var(--chart-series-2)"
          markers={[
            {
              y: s.radiation_limit_msv,
              label: `${t('career limit', 'limite de carrière')} ${s.radiation_limit_msv} mSv`,
              color: 'var(--red-ink)',
            },
          ]}
          domain={[0, (max: number) => Math.max(s.radiation_limit_msv * 1.08, max)] as never}
        />
      </div>

      <Panel>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <p style={muted}>
            <strong style={{ color: 'var(--text)' }}>
              {t('Simulator, not a trained model.', 'Simulateur, pas un modèle entraîné.')}{' '}
            </strong>
            {t(
              'Day-by-day arithmetic on NASA reference values and flagged assumptions. Simulated crew; not a medical device.',
              'Calcul jour par jour sur des valeurs de référence NASA et des hypothèses signalées. Équipage simulé ; pas un dispositif médical.',
            )}
          </p>
          <Button size="sm" aria-expanded={showAssumptions} onClick={() => setShowAssumptions((v) => !v)}>
            {showAssumptions
              ? t('Hide sources', 'Masquer les sources')
              : t('Assumptions & sources', 'Hypothèses et sources')}
          </Button>
        </div>
        {showAssumptions && (
          <div style={{ display: 'grid', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
            {report.assumptions.map((a) => (
              <p key={a.label} style={muted}>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    marginRight: 'var(--space-2)',
                    color:
                      a.kind === 'assumption'
                        ? 'var(--orange-ink)'
                        : a.kind === 'nasa'
                          ? 'var(--accent)'
                          : 'var(--text-muted)',
                  }}
                >
                  {a.kind === 'assumption'
                    ? t('ASSUMPTION', 'HYPOTHÈSE')
                    : a.kind === 'nasa'
                      ? t('NASA VALUE', 'VALEUR NASA')
                      : t('METHOD', 'MÉTHODE')}
                </span>
                <strong style={{ color: 'var(--text)' }}>{a.label}. </strong>
                {a.text}
              </p>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
