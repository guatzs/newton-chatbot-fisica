const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '\u2070',
  '1': '\u00B9',
  '2': '\u00B2',
  '3': '\u00B3',
  '4': '\u2074',
  '5': '\u2075',
  '6': '\u2076',
  '7': '\u2077',
  '8': '\u2078',
  '9': '\u2079',
  '-': '\u207B',
};

function toSuperscript(exp: number): string {
  return String(exp)
    .split('')
    .map((ch) => SUPERSCRIPT_MAP[ch] ?? '')
    .join('');
}

export function formatSci(value: number, sig = 3): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return '0';

  const sign = value < 0 ? '\u2212' : '';
  const abs = Math.abs(value);
  const digits = Math.max(1, Math.floor(sig));

  const [mantStr, expStr] = abs.toExponential(digits - 1).split('e');
  let mant = Number(mantStr);
  let exp = parseInt(expStr, 10);

  if (mant >= 10) {
    mant /= 10;
    exp += 1;
  }

  const formattedMant = mant.toFixed(digits - 1);
  return `${sign}${formattedMant} \u00D7 10${toSuperscript(exp)}`;
}

export function formatSig(value: number, sig = 3): string {
  if (!Number.isFinite(value)) return String(value);
  const digits = Math.max(1, Math.floor(sig));
  const rounded = Number(value.toPrecision(digits));
  if (rounded === 0) {
    return digits > 1 ? `0.${'0'.repeat(digits - 1)}` : '0';
  }

  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const [, expStr] = abs.toExponential(digits - 1).split('e');
  const exp = parseInt(expStr, 10);
  const decimals = digits - 1 - exp;

  if (decimals >= 0) {
    return `${sign}${abs.toFixed(decimals)}`;
  }

  return `${sign}${Math.round(abs)}`;
}
