const KAIZEN_TEAM_ALIASES = {
  'MA-BCB-O001M': ['MA_MA-BCB-O001M', '10786'],
  'MA-BCB-O002M': ['MA_MA-BCB-O002M', '10789'],
  'MA-BCB-O003M': ['MA_MA-BCB-O003M', '10790'],
  'MA-BCB-O004M': ['MA_MA-BCB-O004M', '10791'],
  'MA-BCB-O005M': ['MA_MA-BCB-O005M', '10787'],
  'MA-BCB-O006M': ['MA_MA-BCB-O006M', '10788'],
  'MA-BCB-O007M': ['MA_MA-BCB-O007M', '14338'],
  'MA-ITM-O001M': ['MA_MA-ITM-O001M', '10794'],
  'MA-ITM-O002M': ['MA_MA-ITM-O002M', '10795'],
  'MA-ITM-O003M': ['MA_MA-ITM-O003M', '10797'],
  'MA-ITM-O004M': ['MA_MA-ITM-O004M', '10796'],
  'MA-STI-O001M': ['MA_MA-STI-O001M', '10812'],
  'MA-STI-O002M': ['MA_MA-STI-O002M', '10813'],
  'MA-STI-O003M': ['MA_MA-STI-O003M', '10814'],
  'MA-STI-O004M': ['MA_MA-STI-O004M', '14345'],
};

const KAIZEN_CENTER_TEAM_ROSTERS = {
  'LINHA MORTA - CENTRO MA': [
    'MA-BCB-O001M',
    'MA-BCB-O002M',
    'MA-BCB-O003M',
    'MA-BCB-O004M',
    'MA-BCB-O005M',
    'MA-BCB-O006M',
    'MA-BCB-O007M',
    'MA-ITM-O001M',
    'MA-ITM-O002M',
    'MA-ITM-O003M',
    'MA-ITM-O004M',
    'MA-STI-O001M',
    'MA-STI-O002M',
    'MA-STI-O003M',
    'MA-STI-O004M',
  ],
};

function buildAliasLookup() {
  const lookup = new Map();

  Object.entries(KAIZEN_TEAM_ALIASES).forEach(([teamId, aliases]) => {
    lookup.set(teamId, teamId);
    aliases.forEach((alias) => lookup.set(String(alias).trim().toUpperCase(), teamId));
  });

  return lookup;
}

const KAIZEN_TEAM_LOOKUP = buildAliasLookup();

module.exports = {
  KAIZEN_TEAM_ALIASES,
  KAIZEN_CENTER_TEAM_ROSTERS,
  KAIZEN_TEAM_LOOKUP,
};