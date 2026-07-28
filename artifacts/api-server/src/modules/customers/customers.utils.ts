export function normalizeUniqueValue(value: unknown, field: 'phone' | 'email') {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (field === 'phone') {
    return formatPhoneNumber(trimmed);
  }

  return trimmed.toLowerCase();
}

function getKuwaitMobileDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.startsWith('965') ? digits.slice(3) : digits.replace(/^0+/, '');
}

export function formatPhoneNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;

  const normalized = getKuwaitMobileDigits(value);
  if (!normalized) return null;
  return `+965 ${normalized.slice(0, Math.min(4, normalized.length))}${normalized.length > 4 ? ` ${normalized.slice(4, 8)}` : ''}`;
}

export function getPhoneValidationError(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const local = getKuwaitMobileDigits(value);
  if (!local) return 'Kuwait mobile number is required';
  if (!/^[569]\d{7}$/.test(local)) {
    return 'Enter a valid Kuwait mobile number starting with 5, 6, or 9';
  }

  return null;
}

export function generateCustomerCode(sequence: number) {
  return `CUST-${String(sequence + 1).padStart(3, '0')}`;
}
