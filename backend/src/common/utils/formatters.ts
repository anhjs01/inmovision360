export function formatUser(user: any) {
  const { password, deletedAt, ...safe } = user;
  return safe;
}

export function parsePropArrays(prop: any) {
  if (!prop) return prop;
  return {
    ...prop,
    fotos:       tryParse(prop.fotos,      []),
    comodidades: tryParse(prop.comodidades,[]),
  };
}

function tryParse(value: any, fallback: any) {
  try { return typeof value === 'string' ? JSON.parse(value) : (value ?? fallback); }
  catch { return fallback; }
}
