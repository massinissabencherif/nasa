import { useState } from 'react';
import { t } from '../i18n';
import { IconCheck, IconPantry, IconInfo, IconSettings } from '../icons';
import { Button } from './Button';
import { ProjectIdentity } from './ProjectCredits';
import { HelpButton } from './HelpButton';
import { CompanionPortrait } from './StationCompanion';

/** One topic at a time, with the same short reading hierarchy as result sheets. */
export function QuickHelp() {
  const [topic, setTopic] = useState('today');
  const topics = [
    { key: 'today', label: t('Daily check', 'Mon bilan'), icon: IconCheck },
    { key: 'pantry', label: t('Pantry photo', 'Photo du stock'), icon: IconPantry },
    { key: 'connection', label: t('Connection', 'Connexion'), icon: IconSettings },
    { key: 'trust', label: t('Data & limits', 'Données et limites'), icon: IconInfo },
  ];
  return (
    <HelpButton label={t('Onboard guide', 'Guide de bord')} icon={<CompanionPortrait />}>
      <div className="hz-guide-intro">
        <CompanionPortrait />
        <div>
          <h3>{t('A little help on board', 'Un coup de main à bord')}</h3>
          <p>{t('Choose what you want to do.', 'Choisissez ce que vous voulez faire.')}</p>
        </div>
      </div>
      <nav className="hz-guide-topics" aria-label={t('Help topics', 'Sujets d’aide')}>
        {topics.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            active={topic === key}
            aria-pressed={topic === key}
            icon={<Icon size={18} />}
            onClick={() => setTopic(key)}
          >
            {label}
          </Button>
        ))}
      </nav>
      <article key={topic} className="hz-guide-content hz-feedback-arrive" aria-live="polite">
        {topic === 'today' && (
          <>
            <h3>{t('Your daily check-in', 'Votre bilan du jour')}</h3>
            <ol className="hz-guide-steps">
              <li>
                <strong>{t('Choose your profile', 'Choisissez votre profil')}</strong>
                <p>
                  {t('Open your daily check-in from Home.', 'Ouvrez votre bilan du jour depuis l’accueil.')}
                </p>
              </li>
              <li>
                <strong>{t('Enter what you know', 'Saisissez ce que vous savez')}</strong>
                <p>
                  {t(
                    'Mood, sleep and available measurements. Leave missing measurements empty.',
                    'Moral, sommeil et mesures disponibles. Laissez vide une mesure que vous n’avez pas.',
                  )}
                </p>
              </li>
              <li>
                <strong>{t('Review, then save', 'Vérifiez, puis enregistrez')}</strong>
                <p>
                  {t(
                    'Open a body zone to see the readings behind its colour.',
                    'Ouvrez une zone du corps pour voir les mesures derrière sa couleur.',
                  )}
                </p>
              </li>
            </ol>
            <aside className="hz-guide-note">
              <strong>{t('Reaction test: optional', 'Test de réaction : facultatif')}</strong>
              <p>
                {t(
                  'It is separate from your check-in and does not change the body colour. Find its history under Reaction results.',
                  'Il est séparé du bilan et ne change pas la couleur du corps. Son historique est dans Résultats de réaction.',
                )}
              </p>
            </aside>
          </>
        )}
        {topic === 'pantry' && (
          <>
            <h3>{t('From a photo to checked stock', 'De la photo au stock vérifié')}</h3>
            <ol className="hz-guide-steps">
              <li>
                <strong>{t('Take or import a photo', 'Prenez ou importez une photo')}</strong>
                <p>
                  {t(
                    'Pantry → New photo. Face the products and keep every slot visible.',
                    'Réserve → Nouvelle photo. Placez-vous face aux produits, avec toutes les cases visibles.',
                  )}
                </p>
              </li>
              <li>
                <strong>{t('Frame the compartments', 'Cadrez les cases')}</strong>
                <p>
                  {t(
                    'Move the four corners on the picture. Choose the rows and columns, with a known product per slot.',
                    'Déplacez les quatre coins sur la photo. Choisissez les rangées et colonnes, avec un produit connu par case.',
                  )}
                </p>
              </li>
              <li>
                <strong>{t('Check before saving', 'Vérifiez avant d’enregistrer')}</strong>
                <p>
                  {t(
                    'Compare every quantity, correct mistakes, then confirm. Until then, stock is unchanged.',
                    'Comparez chaque quantité, corrigez les erreurs, puis confirmez. Jusque-là, le stock reste inchangé.',
                  )}
                </p>
              </li>
            </ol>
            <aside className="hz-guide-note">
              <strong>{t('The model counts; you validate', 'Le modèle compte ; vous validez')}</strong>
              <p>
                {t(
                  'It can invent objects or miss a stack. It does not recognise unknown products or measure calories. Replays are labelled “no AI”.',
                  'Il peut inventer des objets ou manquer une pile. Il ne reconnaît pas les produits inconnus et ne mesure pas les calories. Les rejeux sont indiqués « sans IA ».',
                )}
              </p>
            </aside>
            <p className="hz-caption">
              {t(
                'Today, you trigger each photo. Planned direction: a fixed camera proposing stock changes from periodic images, with human review. Automatic capture is not implemented yet.',
                'Aujourd’hui, vous déclenchez chaque photo. Évolution envisagée : une caméra fixe proposant les changements de stock à partir d’images périodiques, à vérifier. La capture automatique n’est pas encore disponible.',
              )}
            </p>
          </>
        )}
        {topic === 'connection' && (
          <>
            <h3>{t('Local Wi-Fi, without Internet', 'Wi-Fi local, sans Internet')}</h3>
            <section className="hz-guide-note">
              <strong>{t('On the station computer', 'Sur l’ordinateur de la station')}</strong>
              <p>
                {t(
                  'HESTIA and the calculations run here. No Internet connection is required.',
                  'HESTIA et les calculs fonctionnent ici. Aucune connexion Internet n’est nécessaire.',
                )}
              </p>
            </section>
            <section className="hz-guide-note">
              <strong>{t('On a separate phone', 'Sur un téléphone distinct')}</strong>
              <p>
                {t(
                  'Connect it to the same Wi-Fi as the computer, then scan the station QR code.',
                  'Connectez-le au même Wi-Fi que l’ordinateur, puis scannez le QR code de la station.',
                )}
              </p>
            </section>
            <p>
              {t(
                'If Wi-Fi disconnects, reconnect before saving your check-in. Reaction results can wait on the phone; the app tells you when this happens.',
                'Si le Wi-Fi se coupe, reconnectez-vous avant d’enregistrer le bilan. Les résultats de réaction peuvent attendre sur le téléphone ; l’app vous le signale.',
              )}
            </p>
          </>
        )}
        {topic === 'trust' && (
          <>
            <h3>{t('What these results represent', 'Ce que représentent les résultats')}</h3>
            <dl className="hz-guide-definitions">
              <div>
                <dt>{t('Simulated', 'Simulé')}</dt>
                <dd>
                  {t(
                    'Astronaut profiles, health measurements, replies from Earth and mission stock projections.',
                    'Les profils d’astronautes, les mesures de santé, les réponses de la Terre et les projections de stock de mission.',
                  )}
                </dd>
              </div>
              <div>
                <dt>{t('Documented', 'Documenté')}</dt>
                <dd>
                  {t(
                    'Explanations draw on published research, including NASA references. Sources are accessible in the app.',
                    'Les explications s’appuient sur des recherches publiées, dont des références NASA. Les sources sont accessibles dans l’app.',
                  )}
                </dd>
              </div>
              <div>
                <dt>{t('Indicative', 'Indicatif')}</dt>
                <dd>
                  {t(
                    'Colour rules and alerts are chosen for this prototype. They are not medically validated decisions.',
                    'Les règles de couleur et les alertes ont été choisies pour le prototype. Ce ne sont pas des décisions médicales validées.',
                  )}
                </dd>
              </div>
            </dl>
            <aside className="hz-guide-note">
              <strong>{t('No diagnosis', 'Aucun diagnostic')}</strong>
              <p>
                {t(
                  'HESTIA demonstrates local monitoring and traceable explanations. It does not replace a medical assessment.',
                  'HESTIA démontre un suivi local avec des explications traçables. Il ne remplace pas une évaluation médicale.',
                )}
              </p>
            </aside>
          </>
        )}
        {topic === 'project' && <ProjectIdentity />}
      </article>
      <Button variant="ghost" size="sm" onClick={() => setTopic('project')}>
        {t('About HESTIA and the team', 'À propos de HESTIA et de l’équipe')}
      </Button>
    </HelpButton>
  );
}
