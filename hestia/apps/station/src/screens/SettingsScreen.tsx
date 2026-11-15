import { useEffect, useState } from 'react';
import type { StationInfo } from '@hestia/api-client';
import {
  Button,
  DetailSheet,
  IconReplay,
  IconPhone,
  IconScan,
  IconEarthLink,
  IconCargo,
  IconCheck,
  LoadingState,
  MissionIllustration,
  MissionBrief,
  MISSION_PROFILES,
  Panel,
  ScienceSources,
  ShelfSetup,
  StatusBadge,
  t,
} from '@hestia/ui';
import { api } from '../lib/api';
import { formatDelay, useStation, usePantry } from '../lib/hooks';
import './settings.css';
import { StockScale } from '../components/pantry/StockScale';

export function SettingsScreen() {
  const { context, refreshContext } = useStation();
  const [section, setSection] = useState('setup');
  const [info, setInfo] = useState<StationInfo | null>(null);
  const [infoError, setInfoError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [missionFeedback, setMissionFeedback] = useState<{ message: string; failed: boolean } | null>(null);
  useEffect(() => {
    let current = true;
    const load = () =>
      api
        .getStationInfo()
        .then((value) => {
          if (current) {
            setInfo(value);
            setInfoError(false);
          }
        })
        .catch(() => {
          if (current) setInfoError(true);
        });
    void load();
    const timer = setInterval(load, 8000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, []);
  async function run(key: string, action: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(key);
    setError(null);
    setFeedback(null);
    try {
      await action();
      refreshContext();
      setFeedback(message);
      if (key === 'reset') setResetOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(null);
    }
  }
  async function selectMission(type: string) {
    if (busy || context?.type === type) return;
    setBusy(type);
    setMissionFeedback(null);
    try {
      const saved = await api.setContext(type);
      refreshContext();
      setMissionFeedback({
        message: t(
          `${t(saved.label)} is now active for everyone.`,
          `${t(saved.label)} est active pour tous.`,
        ),
        failed: false,
      });
    } catch {
      setMissionFeedback({
        message: t(
          'Mission not changed. Check the station and try again.',
          'Mission non modifiée. Vérifiez la connexion à la station, puis réessayez.',
        ),
        failed: true,
      });
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="settings-page">
      <header>
        <h1>{t('Mission settings', 'Réglages de la mission')}</h1>
        <p>
          {t(
            'Set up the station, connect phones, or prepare your presentation.',
            'Configurez la station, connectez les téléphones ou préparez la présentation.',
          )}
        </p>
      </header>
      <nav className="settings-tabs" aria-label={t('Settings sections', 'Rubriques des réglages')}>
        {[
          { key: 'setup', label: t('Mission & phones', 'Mission et téléphones'), icon: IconPhone },
          { key: 'demo', label: t('Presentation tools', 'Outils de présentation'), icon: IconReplay },
          { key: 'ai', label: t('Local AI', 'IA locale'), icon: IconScan },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            active={section === key}
            aria-pressed={section === key}
            icon={<Icon size={18} />}
            onClick={() => setSection(key)}
          >
            {label}
          </Button>
        ))}
      </nav>
      {feedback && (
        <p role="status" className="settings-feedback">
          {feedback}
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      {section === 'setup' && (
        <div className="settings-columns">
          <Panel title={t('1 · Choose the active mission', '1 · Choisir la mission active')}>
            <p>
              {t(
                'Choose where the crew lives. The mission applies to the whole station.',
                'Choisissez où vit l’équipage. La mission s’applique à toute la station.',
              )}
            </p>
            <div className="settings-missions">
              {MISSION_PROFILES.map(({ type, label, place }) => (
                <Button
                  key={type}
                  active={context?.type === type}
                  aria-pressed={context?.type === type}
                  aria-disabled={busy != null}
                  onClick={() => void selectMission(type)}
                >
                  <MissionIllustration context={type} size={36} />
                  <span>
                    <strong>{t(label)}</strong>
                    <small>{t(place[0], place[1])}</small>
                  </span>
                </Button>
              ))}
            </div>
            <div
              className="settings-mission-feedback"
              role="status"
              aria-live="polite"
              data-error={missionFeedback?.failed || undefined}
            >
              {busy && MISSION_PROFILES.some(({ type }) => type === busy)
                ? t('Changing the mission…', 'Changement de mission…')
                : (missionFeedback?.message ?? (
                    <>
                      <IconCheck size={14} aria-hidden="true" />
                      {context
                        ? t(`Active: ${t(context.label)}`, `Active : ${t(context.label)}`)
                        : t('Reading the mission…', 'Lecture de la mission…')}
                    </>
                  ))}
            </div>
            {context && (
              <MissionBrief context={context}>
                <dl className="hz-mission-facts">
                  <div>
                    <dt>
                      <IconEarthLink size={16} />
                      {t('Earth · round trip', 'Terre · aller-retour')}
                    </dt>
                    <dd>{t(formatDelay(context.delay_s * 2))}</dd>
                  </div>
                  <div>
                    <dt>
                      <IconCargo size={16} />
                      {t('Next supply', 'Ravitaillement')}
                    </dt>
                    <dd>
                      {context.next_resupply_in_days == null
                        ? t('Not planned', 'Non prévu')
                        : `${context.next_resupply_in_days} ${t('days', 'jours')}`}
                    </dd>
                  </div>
                </dl>
                <p className="hz-mission-assumption">
                  {t(
                    'Demo settings: fixed communication delay and assumed supply schedule. These are not an actual mission plan.',
                    'Paramètres de démo : délai de liaison fixe et calendrier de ravitaillement hypothétique. Ce n’est pas le plan d’une mission réelle.',
                  )}
                </p>
              </MissionBrief>
            )}
            <ScienceSources />
          </Panel>
          <Panel title={t('2 · Connect a phone', '2 · Connecter un téléphone')}>
            <p>
              {t(
                'For your crew — or a jury member trying a fictional profile.',
                'Pour votre équipage — ou un membre du jury qui essaie un profil fictif.',
              )}
            </p>
            {infoError ? (
              <p role="alert">
                {t(
                  'Network information unavailable. Retrying…',
                  'Informations réseau indisponibles. Nouvelle tentative en cours…',
                )}
              </p>
            ) : !info ? (
              <LoadingState label={t('Reading network…', 'Lecture du réseau…')} />
            ) : (
              <>
                <div className="settings-qr">
                  <img
                    src={api.crewQrUrl(Boolean(info.crew_url_secure))}
                    width={150}
                    height={150}
                    alt={t('Open the crew app', 'Ouvrir l’app équipage')}
                  />
                  <ol>
                    <li>{t('Join the same Wi-Fi as the Mac.', 'Rejoignez le même Wi-Fi que le Mac.')}</li>
                    <li>{t('Scan this code with the phone.', 'Scannez ce code avec le téléphone.')}</li>
                    <li>{t('Choose a fictional astronaut.', 'Choisissez un astronaute fictif.')}</li>
                  </ol>
                </div>
                <p className="settings-address">{info.crew_url_secure ?? info.crew_url}</p>
                {!info.on_lan && (
                  <StatusBadge
                    level="orange"
                    label={t('No local network detected', 'Aucun réseau local détecté')}
                  />
                )}
                <div className="settings-note">
                  <strong>{t('No Internet needed', 'Pas besoin d’Internet')}</strong>
                  <p>
                    {t(
                      'The phone connects to this Mac over local Wi-Fi. Some school networks block this link: check before presenting.',
                      'Le téléphone rejoint ce Mac par le Wi-Fi local. Certains réseaux d’école bloquent ce lien : vérifiez avant la présentation.',
                    )}
                  </p>
                </div>
                {info.crew_url_secure && (
                  <p className="hz-caption">
                    {t(
                      'For the camera preview, the HTTPS address uses a local certificate to trust only on your own station. The HTTP address also supports importing a photo:',
                      'Pour l’aperçu caméra, l’adresse HTTPS utilise un certificat local, à accepter seulement sur votre station. L’adresse HTTP permet aussi d’importer une photo :',
                    )}{' '}
                    {info.crew_url}
                  </p>
                )}
                <p className="hz-caption">
                  {t(
                    'On iPhone: Safari → Share → Add to Home Screen.',
                    'Sur iPhone : Safari → Partager → Sur l’écran d’accueil.',
                  )}
                </p>
              </>
            )}
            <aside className="settings-simulation-note">
              <strong>{t('What remains simulated', 'Ce qui reste simulé')}</strong>
              <p>
                {t('Fictional crew and health readings.', 'Équipage et mesures fictifs.')}{' '}
                {t(
                  'Earth replies are scripted; colour rules are indicative.',
                  'Les réponses Terre sont préparées ; les règles de couleur sont indicatives.',
                )}
              </p>
              <p>
                {t(
                  'Mission stock uses the selected multiplier. Demo photos are generated; imported photos are your own.',
                  'Le stock de mission utilise le multiplicateur choisi. Les photos de démo sont générées ; les photos importées sont les vôtres.',
                )}
              </p>
            </aside>
          </Panel>
        </div>
      )}
      {section === 'demo' && (
        <div className="settings-columns">
          <div className="settings-stack">
            <PantryPresentationTools />
            <Panel
              title={t('Show an Earth exchange in minutes', 'Montrer un échange Terre en quelques minutes')}
            >
              <p>
                {t(
                  'For the presenter: speed up the waiting time of new simulated messages. This does not speed up the real station clock.',
                  'Pour la présentation : accélérez l’attente des nouveaux messages simulés. Cela n’accélère pas l’horloge réelle de la station.',
                )}
              </p>
              <div
                className="settings-tabs"
                role="group"
                aria-label={t('Message speed', 'Vitesse des messages')}
              >
                {[1, 10, 30, 60].map((scale) => (
                  <Button
                    key={scale}
                    active={context?.time_scale === scale}
                    aria-pressed={context?.time_scale === scale}
                    disabled={busy != null}
                    onClick={() =>
                      void run(
                        'clock',
                        () => api.setTimeScale(scale),
                        t('Message timing changed.', 'Délai des messages modifié.'),
                      )
                    }
                  >
                    {scale === 1 ? t('Real time', 'Temps réel') : `×${scale}`}
                  </Button>
                ))}
              </div>
              <div className="settings-note">
                <strong>{t('Example at ×30', 'Exemple à ×30')}</strong>
                <p>
                  {t(
                    'A 20-minute one-way delay becomes 40 seconds. A reply still needs the return trip.',
                    'Un trajet de 20 minutes devient 40 secondes. La réponse demande encore le trajet retour.',
                  )}
                </p>
                <p>
                  {t(
                    'For messages already queued, use the advance controls on Earth link.',
                    'Pour les messages déjà en attente, utilisez les commandes d’avance dans Liaison Terre.',
                  )}
                </p>
              </div>
            </Panel>
          </div>
          <Panel title={t('Rehearse a situation', 'Jouer une situation')}>
            <p>
              {t(
                'These buttons change the fictional demo data. They are presentation tools for you and Massi.',
                'Ces boutons modifient les données fictives de démo. Ce sont des outils de présentation pour toi et Massi.',
              )}
            </p>
            {[
              {
                key: 'low-exercise',
                title: t('Chen has not exercised enough', 'Chen manque d’exercice'),
                detail: t(
                  'Records a check-in and shows the bone-zone advice.',
                  'Enregistre un bilan et affiche le conseil pour les os.',
                ),
              },
              {
                key: 'shelf-removal',
                title: t('Three soup boxes removed', 'Trois boîtes de soupe retirées'),
                detail: t(
                  'Replays known stock counts without AI. The mission projection updates.',
                  'Rejoue un comptage connu sans IA. La projection de mission se met à jour.',
                ),
              },
              {
                key: 'red-alert',
                title: t(
                  'Sofia reports fever and a fast pulse',
                  'Sofia présente de la fièvre et un pouls élevé',
                ),
                detail: t(
                  'Creates an alert and a simulated Earth report.',
                  'Crée une alerte et un rapport simulé vers la Terre.',
                ),
              },
            ].map((s) => (
              <div className="settings-scenario" key={s.key}>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.detail}</p>
                </div>
                <Button
                  loading={busy === s.key}
                  disabled={busy != null && busy !== s.key}
                  onClick={() =>
                    void run(s.key, () => api.runScenario(s.key), t('Scenario played.', 'Scénario joué.'))
                  }
                >
                  {t('Play', 'Jouer')}
                </Button>
              </div>
            ))}
            <Button variant="danger" onClick={() => setResetOpen(true)}>
              {t('Reset the demo…', 'Remettre la démo à zéro…')}
            </Button>
          </Panel>
        </div>
      )}
      {section === 'ai' && (
        <div className="settings-columns">
          <Panel title={t('Can the station read photos?', 'La station peut-elle lire les photos ?')}>
            <p>
              {t(
                'Ollama runs the vision model on this computer. Photos stay on the station.',
                'Ollama fait tourner le modèle de vision sur cet ordinateur. Les photos restent sur la station.',
              )}
            </p>
            {info ? (
              <>
                <div className="settings-tabs">
                  <StatusBadge
                    level={info.ollama.running ? 'green' : 'red'}
                    label={
                      info.ollama.running
                        ? t('Service running', 'Service démarré')
                        : t('Service stopped', 'Service arrêté')
                    }
                  />
                  <StatusBadge
                    level={info.ollama.installed ? 'green' : 'orange'}
                    label={
                      info.ollama.installed
                        ? t('Model installed', 'Modèle installé')
                        : t('Model missing', 'Modèle absent')
                    }
                  />
                </div>
                <p className="settings-address">{info.ollama.model}</p>
                <p>
                  {info.ollama.loaded
                    ? t('Model currently loaded in memory.', 'Modèle actuellement chargé en mémoire.')
                    : t(
                        'Model not loaded: the next scan may take longer.',
                        'Modèle non chargé : le prochain scan peut prendre plus de temps.',
                      )}
                </p>
              </>
            ) : (
              <LoadingState label={t('Checking local AI…', 'Vérification de l’IA locale…')} />
            )}
            <div className="settings-note">
              <strong>{t('Available does not mean accurate', 'Disponible ne veut pas dire fiable')}</strong>
              <p>
                {t(
                  'This shows service availability, not recognition accuracy. Check every proposed quantity before saving. Replay demos work without Ollama.',
                  'Cet état indique la disponibilité du service, pas la précision de reconnaissance. Vérifiez chaque quantité proposée avant d’enregistrer. Les rejeux de démo fonctionnent sans Ollama.',
                )}
              </p>
            </div>
          </Panel>
          <Panel
            title={t(
              'How health explanations are written',
              'Comment les explications de santé sont rédigées',
            )}
          >
            <p>
              {t(
                'This changes the wording of advice, not the colour rules or your measurements.',
                'Ce choix change la formulation des conseils, pas les règles de couleur ni vos mesures.',
              )}
            </p>
            <div className="settings-tabs">
              <Button
                active={context?.use_llm_advice === false}
                aria-pressed={context?.use_llm_advice === false}
                disabled={busy != null}
                onClick={() =>
                  void run(
                    'advice',
                    () => api.setUseLlmAdvice(false),
                    t('Prepared text selected.', 'Textes préparés sélectionnés.'),
                  )
                }
              >
                {t('Prepared text · default', 'Textes préparés · par défaut')}
              </Button>
              <Button
                active={context?.use_llm_advice === true}
                aria-pressed={context?.use_llm_advice === true}
                disabled={busy != null}
                onClick={() =>
                  void run(
                    'advice',
                    () => api.setUseLlmAdvice(true),
                    t('Local reformulation enabled.', 'Reformulation locale activée.'),
                  )
                }
              >
                {t('Local AI reformulation', 'Reformulation par l’IA locale')}
              </Button>
            </div>
            <p className="hz-caption">
              {t(
                'Prepared text is immediate. The optional model response is checked and falls back to prepared text after failure or an 8-second timeout. These checks are not medical validation.',
                'Les textes préparés sont immédiats. La réponse facultative du modèle est contrôlée ; en cas d’échec ou après 8 secondes, le texte préparé est utilisé. Ces contrôles ne constituent pas une validation médicale.',
              )}
            </p>
          </Panel>
        </div>
      )}
      {resetOpen && (
        <DetailSheet
          title={t('Reset all demo data?', 'Effacer les données de démo ?')}
          onClose={() => setResetOpen(false)}
        >
          <p>
            {t(
              'This erases check-ins, inventory readings and alerts, then restores the fictional Mars-base starting state.',
              'Cela efface les bilans, lectures de stock et alertes, puis restaure l’état fictif initial de la base martienne.',
            )}
          </p>
          <Button
            variant="danger"
            loading={busy === 'reset'}
            onClick={() =>
              void run('reset', () => api.runScenario('demo-mars'), t('Demo reset.', 'Démo réinitialisée.'))
            }
          >
            {t('Erase and restart', 'Effacer et recommencer')}
          </Button>
        </DetailSheet>
      )}
    </div>
  );
}

function PantryPresentationTools() {
  const { pantry, refresh, error } = usePantry();
  return (
    <Panel title={t('Prepare the real shelf demo', 'Préparer la démonstration de réserve')}>
      <p>
        {t(
          'Choose the products you will bring, then clear old quantities before counting your tray.',
          'Choisissez les produits que vous apporterez, puis effacez les anciennes quantités avant de compter votre bac.',
        )}
      </p>
      {error ? (
        <p role="alert">
          {t('Stock unavailable.', 'Stock indisponible.')}{' '}
          <Button onClick={refresh}>{t('Retry', 'Réessayer')}</Button>
        </p>
      ) : pantry ? (
        <>
          <ShelfSetup api={api} slots={pantry.slots} onChanged={refresh} />
          <StockScale pantry={pantry} onChanged={refresh} />
        </>
      ) : (
        <LoadingState label={t('Loading stock…', 'Chargement du stock…')} />
      )}
    </Panel>
  );
}
