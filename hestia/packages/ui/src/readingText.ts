/** Authored translations of the server's display strings. Numbers are preserved.
 * Unknown formats remain untouched; this does not interpret a health reading. */
export function readingText(value: string, locale: 'en' | 'fr'): string {
  if (locale !== 'fr') return value;
  const exact: Record<string, string> = {
    'no data': 'aucune donnée',
    'no test yet': 'aucun test enregistré',
    'none in the last 24 h': 'aucun déclaré dans les dernières 24 h',
  };
  if (exact[value]) return exact[value];
  return value
    .replace(
      /^(\d+) ms, ([+-]?\d+) % vs your baseline \((\d+) ms\)$/,
      '$1 ms · $2 % par rapport à votre référence ($3 ms)',
    )
    .replace(
      /^(\d+) ms, building your baseline \((\d+) of (\d+) tests\)$/,
      '$1 ms · référence en cours ($2 tests sur $3)',
    )
    .replace(
      /^([+-]?[\d.]+) % vs baseline \(([\d.]+) kg\)$/,
      '$1 % par rapport au poids de référence · dernier poids : $2 kg',
    )
    .replace(
      /^(\d+) days? in a row under (\d+) min$/,
      (_, days, minutes) =>
        `${days} jour${days === '1' ? '' : 's'} de suite avec moins de ${minutes} min d’exercice`,
    )
    .replace(/^([\d.]+) min on the last logged day$/, '$1 min au dernier jour enregistré')
    .replace(/^(\d+) mSv \((\d+) % of ([\d.]+) mSv\)$/, '$1 mSv ($2 % de $3 mSv)');
}
