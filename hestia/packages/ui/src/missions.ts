/** Product scenarios, not descriptions of an actual NASA mission plan. */
export const MISSION_PROFILES = [
  {
    type: 'mars_base',
    label: 'Mars base',
    place: ['Living on Mars', 'Vivre sur Mars'],
    setting: ['A fictional habitat on the Martian surface.', 'Un habitat fictif à la surface de Mars.'],
    goal: [
      'Keep the crew supplied and monitor health while help from Earth is delayed.',
      'Préserver les réserves et suivre la santé quand l’aide de la Terre se fait attendre.',
    ],
    constraint: [
      'Plan daily life between distant supply deliveries.',
      'Organiser le quotidien entre des ravitaillements espacés.',
    ],
  },
  {
    type: 'mars_transit',
    label: 'Earth-Mars transit',
    place: ['Travelling to Mars', 'Voyager vers Mars'],
    setting: [
      'A fictional spacecraft travelling from Earth to Mars.',
      'Un vaisseau fictif en route de la Terre vers Mars.',
    ],
    goal: [
      'Track the crew’s health and compare how long the food on board can last.',
      'Suivre la santé de l’équipage et comparer la durée des réserves embarquées.',
    ],
    constraint: [
      'No resupply during the journey in this scenario.',
      'Aucun ravitaillement en route dans ce scénario.',
    ],
  },
  {
    type: 'moon_base',
    label: 'Moon base',
    place: ['Living on the Moon', 'Vivre sur la Lune'],
    setting: ['A fictional habitat on the lunar surface.', 'Un habitat fictif à la surface de la Lune.'],
    goal: [
      'Follow daily health and plan supplies between deliveries from Earth.',
      'Suivre la santé au quotidien et prévoir les réserves entre deux livraisons terrestres.',
    ],
    constraint: [
      'Earth is easier to reach, but supplies still need planning.',
      'Les échanges avec la Terre sont rapides ; les réserves restent à anticiper.',
    ],
  },
  {
    type: 'iss',
    label: 'ISS',
    place: ['Orbiting Earth', 'En orbite terrestre'],
    setting: [
      'A simulated crew aboard the International Space Station.',
      'Un équipage simulé à bord de la Station spatiale internationale.',
    ],
    goal: [
      'Follow daily health and check that food lasts until the next cargo.',
      'Suivre la santé au quotidien et vérifier que les réserves couvrent le prochain ravitaillement.',
    ],
    constraint: [
      'Use this nearby-Earth scenario as a comparison with distant missions.',
      'Un scénario proche de la Terre pour comparer avec les missions lointaines.',
    ],
  },
] as const;
