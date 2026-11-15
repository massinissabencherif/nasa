import { setLocale, useLocale } from '../i18n';

export function LanguageSwitch() {
  const locale = useLocale();
  const next = locale === 'fr' ? 'en' : 'fr';
  const label =
    locale === 'fr' ? 'Langue : français. Passer en anglais' : 'Language: English. Switch to French';
  return (
    <button
      className="hz-language"
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setLocale(next)}
    >
      {locale.toUpperCase()}
      <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12">
        <path
          d="M3 5h10l-3-3M13 11H3l3 3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
