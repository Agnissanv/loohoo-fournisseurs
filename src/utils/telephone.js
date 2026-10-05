// Garde les chiffres uniquement ; « 07 00 00 00 00 » devient 2250700000000
export function normaliserTelephone(saisie) {
  const chiffres = String(saisie || '').replace(/\D/g, '').replace(/^00/, '');
  if (chiffres.length === 10) return `225${chiffres}`;
  return chiffres;
}

// 2250700000000 devient +225 07 00 00 00 00
export function formaterTelephone(numero) {
  const n = String(numero || '').replace(/\D/g, '');
  if (n.length === 13 && n.startsWith('225')) return `+225 ${n.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ')}`;
  return numero || '';
}
