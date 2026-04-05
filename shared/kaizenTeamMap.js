const KAIZEN_TEAM_ALIASES = {
  'MA-BCB-O001M': ['MA_MA-BCB-O001M', '10786'],
  'MA-BCB-O002M': ['MA_MA-BCB-O002M', '10789'],
  'MA-BCB-O003M': ['MA_MA-BCB-O003M', '10790'],
  'MA-BCB-O004M': ['MA_MA-BCB-O004M', '10791'],
  'MA-BCB-O005M': ['MA_MA-BCB-O005M', '10787'],
  'MA-BCB-O006M': ['MA_MA-BCB-O006M', '10788'],
  'MA-BCB-O007M': ['MA_MA-BCB-O007M', '14338'],
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
  KAIZEN_TEAM_LOOKUP,
};