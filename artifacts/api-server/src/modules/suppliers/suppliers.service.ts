import { SuppliersRepository, type SupplierFilters } from './suppliers.repository.js';
import { NotFoundError, ConflictError, ValidationError } from '../../errors/AppError.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalise(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getKuwaitMobileDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('965') ? digits.slice(3) : digits.replace(/^0+/, '');
}

function isValidKuwaitMobile(phone: string): boolean {
  return /^[569]\d{7}$/.test(getKuwaitMobileDigits(phone));
}

function formatKuwaitMobile(phone: string): string {
  const digits = getKuwaitMobileDigits(phone);
  return `+965 ${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const SuppliersService = {
  async list(filters: SupplierFilters) {
    return SuppliersRepository.findAll(filters);
  },

  async getById(id: string) {
    const supplier = await SuppliersRepository.findById(id);
    if (!supplier) throw new NotFoundError('Supplier');
    return supplier;
  },

  async getStatistics() {
    return SuppliersRepository.getStatistics();
  },

  async create(body: Record<string, unknown>) {
    const fieldErrors: { field: string; message: string }[] = [];

    // ── Required fields ───────────────────────────────────────────────────
    const name = normalise(body['name']);
    if (!name) {
      fieldErrors.push({ field: 'name', message: 'Name is required' });
    } else if (name.length > 200) {
      fieldErrors.push({ field: 'name', message: 'Name must not exceed 200 characters' });
    }

    // ── Optional fields ───────────────────────────────────────────────────
    const nameAr = normalise(body['nameAr']);
    if (nameAr && nameAr.length > 200) {
      fieldErrors.push({ field: 'nameAr', message: 'Arabic name must not exceed 200 characters' });
    }

    let phone: string | null = null;
    const rawPhone = normalise(body['phone']);
    if (rawPhone) {
      if (!isValidKuwaitMobile(rawPhone)) {
        fieldErrors.push({ field: 'phone', message: 'Enter a valid Kuwait mobile number starting with 5, 6, or 9' });
      } else {
        phone = formatKuwaitMobile(rawPhone);
      }
    }

    const email = normalise(body['email']);
    if (email) {
      if (email.length > 200) {
        fieldErrors.push({ field: 'email', message: 'Email must not exceed 200 characters' });
      } else if (!isValidEmail(email)) {
        fieldErrors.push({ field: 'email', message: 'Email format is invalid' });
      }
    }

    const address = normalise(body['address']);
    if (address && address.length > 500) {
      fieldErrors.push({ field: 'address', message: 'Address must not exceed 500 characters' });
    }

    // ── Balance ───────────────────────────────────────────────────────────
    let balance = '0.000';
    const rawBalance = body['balance'];
    if (rawBalance !== undefined && rawBalance !== null && rawBalance !== '') {
      const parsed = parseFloat(String(rawBalance));
      if (isNaN(parsed) || parsed < 0) {
        fieldErrors.push({ field: 'balance', message: 'Balance must be a non-negative number' });
      } else {
        balance = parsed.toFixed(3);
      }
    }

    const isActive = body['isActive'] !== undefined ? Boolean(body['isActive']) : true;

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // ── Uniqueness checks ─────────────────────────────────────────────────
    if (name) {
      const dup = await SuppliersRepository.findByName(name);
      if (dup) throw new ConflictError('A supplier with this name already exists');
    }

    if (email) {
      const dup = await SuppliersRepository.findByEmail(email);
      if (dup) throw new ConflictError('A supplier with this email already exists');
    }

    if (phone) {
      const dup = await SuppliersRepository.findByPhone(phone);
      if (dup) throw new ConflictError('A supplier with this phone number already exists');
    }

    const code = await SuppliersRepository.generateCode();

    return SuppliersRepository.create({ code, name: name!, nameAr, phone, email, address, balance, isActive });
  },

  async update(id: string, body: Record<string, unknown>) {
    const supplier = await SuppliersRepository.findById(id);
    if (!supplier) throw new NotFoundError('Supplier');

    const fieldErrors: { field: string; message: string }[] = [];

    // ── Only validate fields that are present in the request body ─────────
    let name: string | undefined;
    if ('name' in body) {
      const n = normalise(body['name']);
      if (!n) {
        fieldErrors.push({ field: 'name', message: 'Name is required' });
      } else if (n.length > 200) {
        fieldErrors.push({ field: 'name', message: 'Name must not exceed 200 characters' });
      } else {
        name = n;
      }
    }

    let nameAr: string | null | undefined;
    if ('nameAr' in body) {
      const n = normalise(body['nameAr']);
      if (n && n.length > 200) {
        fieldErrors.push({ field: 'nameAr', message: 'Arabic name must not exceed 200 characters' });
      } else {
        nameAr = n;
      }
    }

    let phone: string | null | undefined;
    if ('phone' in body) {
      const p = normalise(body['phone']);
      if (!p) {
        phone = null;
      } else if (!isValidKuwaitMobile(p)) {
        fieldErrors.push({ field: 'phone', message: 'Enter a valid Kuwait mobile number starting with 5, 6, or 9' });
      } else {
        phone = formatKuwaitMobile(p);
      }
    }

    let email: string | null | undefined;
    if ('email' in body) {
      const e = normalise(body['email']);
      if (e) {
        if (e.length > 200) {
          fieldErrors.push({ field: 'email', message: 'Email must not exceed 200 characters' });
        } else if (!isValidEmail(e)) {
          fieldErrors.push({ field: 'email', message: 'Email format is invalid' });
        } else {
          email = e;
        }
      } else {
        email = null;
      }
    }

    let address: string | null | undefined;
    if ('address' in body) {
      address = normalise(body['address']);
    }

    // Balance cannot be manually updated after creation

    const isActive = 'isActive' in body ? Boolean(body['isActive']) : undefined;

    if (fieldErrors.length > 0) {
      throw new ValidationError('Validation failed', { errors: fieldErrors });
    }

    // ── Uniqueness checks (excluding the current supplier) ────────────────
    if (name) {
      const dup = await SuppliersRepository.findByName(name, id);
      if (dup) throw new ConflictError('A supplier with this name already exists');
    }

    if (email) {
      const dup = await SuppliersRepository.findByEmail(email, id);
      if (dup) throw new ConflictError('A supplier with this email already exists');
    }

    if (phone) {
      const dup = await SuppliersRepository.findByPhone(phone, id);
      if (dup) throw new ConflictError('A supplier with this phone number already exists');
    }

    return SuppliersRepository.update(id, { name, nameAr, phone, email, address, isActive });
  },

  async delete(id: string) {
    const supplier = await SuppliersRepository.findById(id);
    if (!supplier) throw new NotFoundError('Supplier');

    const [hasPurchases, hasPayments] = await Promise.all([
      SuppliersRepository.hasPurchases(id),
      SuppliersRepository.hasPayments(id),
    ]);

    if (hasPurchases) {
      throw new ConflictError(
        'Cannot delete this supplier because it has linked purchase orders. Deactivate the supplier instead.',
      );
    }
    if (hasPayments) {
      throw new ConflictError(
        'Cannot delete this supplier because it has linked payment records. Deactivate the supplier instead.',
      );
    }

    await SuppliersRepository.delete(id);
  },
};
