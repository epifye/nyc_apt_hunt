/** Strip city/state/ZIP for display — keeps only the street address. */
export function shortAddress(address: string, aptNumber?: string): string {
  const street = address
    .replace(/,?\s*New York,?\s*NY\s*\d{0,5}\s*$/i, '')
    .replace(/,?\s*NY\s*\d{5}\s*$/i, '')
    .trim()
    .replace(/,\s*$/, '');
  return aptNumber ? `${street}, Apt ${aptNumber}` : street;
}
