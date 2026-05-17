/** Compara nombre del cliente en reserva pública (puede incluir sufijos antiguos tras "·"). */
export function publicCustomerNameMatches(
  storedCustomer: string,
  inputName: string,
): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
  const stored = norm(storedCustomer);
  const input = norm(inputName);
  if (stored === input) {
    return true;
  }
  const firstPart = norm(storedCustomer.split('·')[0].trim());
  return firstPart === input;
}
