import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Pencil, Trash2, KeyRound,
  Users, CheckCircle, XCircle, ShieldCheck,
  UserCheck, UserX,
} from 'lucide-react';

import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/use-debounce';
import type { User, UserRole, UserStatistics, PaginatedResponse } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useGetCurrentUser } from '@workspace/api-client-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_ROLES: UserRole[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE'];

const ROLE_RANK: Record<UserRole, number> = {
  WAREHOUSE: 1, SALES: 2, MANAGER: 3, ADMIN: 4, OWNER: 5,
};

/** Returns true when actor's role is strictly above target's role. */
function canActOn(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_RANK[actorRole] > ROLE_RANK[targetRole];
}

// ─── Role badge colours ───────────────────────────────────────────────────────

const ROLE_STYLES: Record<UserRole, string> = {
  OWNER:     'bg-purple-100 text-purple-800 border-purple-300',
  ADMIN:     'bg-red-100 text-red-800 border-red-300',
  MANAGER:   'bg-blue-100 text-blue-800 border-blue-300',
  SALES:     'bg-green-100 text-green-800 border-green-300',
  WAREHOUSE: 'bg-amber-100 text-amber-800 border-amber-300',
};

function RoleBadge({ role }: { role: UserRole }) {
  const { t } = useTranslation();
  const label = t(`role_${role.toLowerCase()}`);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_STYLES[role]}`}>
      {label}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserForm {
  email: string;
  password: string;
  name: string;
  nameAr: string;
  role: UserRole;
  isActive: boolean;
}

type FieldErrors = Partial<Record<keyof UserForm, string>>;

const emptyForm = (): UserForm => ({
  email: '', password: '', name: '', nameAr: '',
  role: 'SALES', isActive: true,
});

function userToForm(u: User): UserForm {
  return {
    email:    u.email,
    password: '',           // never pre-fill
    name:     u.name,
    nameAr:   u.nameAr ?? '',
    role:     u.role,
    isActive: u.isActive,
  };
}

// ─── API helpers ──────────────────────────────────────────────────────────────

const fetchUsers = (qs: string) =>
  api.get<PaginatedResponse<User>>(`/api/users?${qs}`);

const fetchStats = () =>
  api.get<{ data: UserStatistics }>('/api/users/statistics');

const createUser = (body: Partial<UserForm>) =>
  api.post<{ data: User }>('/api/users', body);

const updateUser = (id: string, body: Partial<Omit<UserForm, 'email' | 'password'>>) =>
  api.put<{ data: User }>(`/api/users/${id}`, body);

const updateUserStatus = (id: string, isActive: boolean) =>
  api.patch<{ data: User }>(`/api/users/${id}/status`, { isActive });

const resetUserPassword = (id: string, password: string) =>
  api.patch<void>(`/api/users/${id}/password`, { password });

const deleteUser = (id: string) =>
  api.delete(`/api/users/${id}`);

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  title, value, icon, loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {loading
          ? <Skeleton className="h-8 w-24" />
          : <div className="text-2xl font-bold">{value}</div>
        }
      </CardContent>
    </Card>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

function UserDialog({
  open, onOpenChange, user, currentUserRole, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user?: User | null;
  currentUserRole: UserRole;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = !!user;

  const [form, setForm]     = useState<UserForm>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [showPw, setShowPw] = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setForm(user ? userToForm(user) : emptyForm());
      setErrors({});
      setShowPw(false);
    }
    onOpenChange(next);
  };

  const field = (key: keyof UserForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const applyFieldErrors = (
    raw: { field: string; message: string }[] | undefined,
  ) => {
    if (!raw?.length) return false;
    const fe: FieldErrors = {};
    raw.forEach(({ field: f, message: m }) => { fe[f as keyof UserForm] = m; });
    setErrors(fe);
    return true;
  };

  // Roles the current actor can assign (must outrank the target role)
  const assignableRoles = ALL_ROLES.filter(r =>
    // Same as canActOn but ≥ for self-editing same role
    ROLE_RANK[currentUserRole] >= ROLE_RANK[r],
  );

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      toast({ title: t('user_created') });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error & { errors?: { field: string; message: string }[] }) => {
      if (!applyFieldErrors(err.errors)) {
        toast({ title: t('error'), description: err.message, variant: 'destructive' });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (body: Partial<Omit<UserForm, 'email' | 'password'>>) =>
      updateUser(user!.id, body),
    onSuccess: () => {
      toast({ title: t('user_updated') });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err: Error & { errors?: { field: string; message: string }[] }) => {
      if (!applyFieldErrors(err.errors)) {
        toast({ title: t('error'), description: err.message, variant: 'destructive' });
      }
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (isEdit) {
      updateMutation.mutate({
        name:     form.name,
        nameAr:   form.nameAr || undefined,
        role:     form.role,
        isActive: form.isActive,
      });
    } else {
      createMutation.mutate({
        email:    form.email,
        password: form.password,
        name:     form.name,
        nameAr:   form.nameAr || undefined,
        role:     form.role,
        isActive: form.isActive,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('edit_user') : t('add_user')}</DialogTitle>
          <DialogDescription>
            {isEdit ? t('user_edit_desc') : t('user_add_desc')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email — create only (cannot change email after creation) */}
          {!isEdit && (
            <div className="space-y-1">
              <Label htmlFor="u-email">
                {t('user_email')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="u-email"
                type="email"
                value={form.email}
                onChange={field('email')}
                placeholder={t('user_email_placeholder')}
                disabled={isPending}
                autoComplete="off"
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
          )}

          {/* Password — create only */}
          {!isEdit && (
            <div className="space-y-1">
              <Label htmlFor="u-password">
                {t('user_password')} <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="u-password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={field('password')}
                  placeholder={t('user_password_placeholder')}
                  disabled={isPending}
                  autoComplete="new-password"
                  className="pr-16 rtl:pl-16 rtl:pr-3"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {showPw ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t('password_hint')}</p>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
          )}

          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="u-name">
              {t('user_name')} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="u-name"
              value={form.name}
              onChange={field('name')}
              placeholder={t('user_name_placeholder')}
              disabled={isPending}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          {/* Arabic name */}
          <div className="space-y-1">
            <Label htmlFor="u-name-ar">{t('user_name_ar')}</Label>
            <Input
              id="u-name-ar"
              dir="rtl"
              value={form.nameAr}
              onChange={field('nameAr')}
              placeholder={t('user_name_ar_placeholder')}
              disabled={isPending}
            />
            {errors.nameAr && <p className="text-sm text-destructive">{errors.nameAr}</p>}
          </div>

          {/* Role + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="u-role">{t('user_role')}</Label>
              <Select
                value={form.role}
                onValueChange={v => setForm(prev => ({ ...prev, role: v as UserRole }))}
                disabled={isPending}
              >
                <SelectTrigger id="u-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignableRoles.map(r => (
                    <SelectItem key={r} value={r}>
                      {t(`role_${r.toLowerCase()}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-sm text-destructive">{errors.role}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="u-status">{t('user_status')}</Label>
              <Select
                value={form.isActive ? 'true' : 'false'}
                onValueChange={v => setForm(prev => ({ ...prev, isActive: v === 'true' }))}
                disabled={isPending}
              >
                <SelectTrigger id="u-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">{t('active')}</SelectItem>
                  <SelectItem value="false">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('saving') : isEdit ? t('save_changes') : t('create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reset Password dialog ────────────────────────────────────────────────────

function ResetPasswordDialog({
  open, onOpenChange, user, onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: User | null;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [showPw, setShowPw]     = useState(false);

  const handleOpenChange = (next: boolean) => {
    if (!next) { setPassword(''); setError(''); setShowPw(false); }
    onOpenChange(next);
  };

  const mutation = useMutation({
    mutationFn: () => resetUserPassword(user!.id, password),
    onSuccess: () => {
      toast({ title: t('password_reset') });
      onSuccess();
      handleOpenChange(false);
    },
    onError: (err: Error & { errors?: { field: string; message: string }[] }) => {
      const pwErr = err.errors?.find(e => e.field === 'password');
      if (pwErr) {
        setError(pwErr.message);
      } else {
        toast({ title: t('error'), description: err.message, variant: 'destructive' });
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('user_reset_password_title')}</DialogTitle>
          <DialogDescription>
            {user?.name} — {t('user_reset_password_desc')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="rp-password">{t('user_new_password')}</Label>
            <div className="relative">
              <Input
                id="rp-password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('user_password_placeholder')}
                disabled={mutation.isPending}
                autoComplete="new-password"
                className="pr-16 rtl:pl-16 rtl:pr-3"
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{t('password_hint')}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={mutation.isPending || !password}>
              {mutation.isPending ? t('saving') : t('save_changes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Users page ───────────────────────────────────────────────────────────────

export default function UsersPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Current authenticated user (for permission checks)
  const { data: currentUser } = useGetCurrentUser();
  const meRole = (currentUser?.role ?? 'WAREHOUSE') as UserRole;
  const meId   = currentUser?.id ?? '';

  // Filters & pagination
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');
  const [sortBy,       setSortBy]       = useState('createdAt');
  const [page,         setPage]         = useState(1);
  const LIMIT = 20;

  const debouncedSearch = useDebounce(search, 400);

  // Dialog state
  const [createOpen,    setCreateOpen]    = useState(false);
  const [editTarget,    setEditTarget]    = useState<User | null>(null);
  const [resetPwTarget, setResetPwTarget] = useState<User | null>(null);
  const [activateTarget,   setActivateTarget]   = useState<User | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<User | null>(null);
  const [deleteTarget,     setDeleteTarget]      = useState<User | null>(null);

  // ── Build query string ──────────────────────────────────────────────────────
  const qs = new URLSearchParams({
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(roleFilter   !== 'all' && { role: roleFilter }),
    ...(statusFilter !== 'all' && { isActive: statusFilter }),
    sortBy,
    sortOrder: 'desc',
    page:  String(page),
    limit: String(LIMIT),
  }).toString();

  // ── Queries ─────────────────────────────────────────────────────────────────
  const usersQuery = useQuery({
    queryKey: ['users', debouncedSearch, roleFilter, statusFilter, sortBy, page],
    queryFn:  () => fetchUsers(qs),
  });

  const statsQuery = useQuery({
    queryKey: ['users-statistics'],
    queryFn:  fetchStats,
  });

  // ── Status mutation ─────────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUserStatus(id, isActive),
    onSuccess: (_, { isActive }) => {
      toast({ title: isActive ? t('user_activated') : t('user_deactivated') });
      setActivateTarget(null);
      setDeactivateTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users-statistics'] });
    },
    onError: (err: Error) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
      setActivateTarget(null);
      setDeactivateTarget(null);
    },
  });

  // ── Delete mutation ─────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(deleteTarget!.id),
    onSuccess: () => {
      toast({ title: t('user_deleted') });
      setDeleteTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      void queryClient.invalidateQueries({ queryKey: ['users-statistics'] });
    },
    onError: (err: Error) => {
      toast({ title: t('error'), description: err.message, variant: 'destructive' });
      setDeleteTarget(null);
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['users'] });
    void queryClient.invalidateQueries({ queryKey: ['users-statistics'] });
  }, [queryClient]);

  const stats = statsQuery.data?.data;
  const list  = usersQuery.data;

  // ── Permission helpers ──────────────────────────────────────────────────────
  const canCreate  = ROLE_RANK[meRole] >= ROLE_RANK['MANAGER'];
  const canEdit    = (u: User) => meId !== u.id
    ? canActOn(meRole, u.role)
    : true;                              // can always edit own name/nameAr
  const canStatus  = (u: User) => meId !== u.id && canActOn(meRole, u.role);
  const canReset   = (u: User) => meId === u.id || canActOn(meRole, u.role);
  const canDelete  = (u: User) =>
    meId !== u.id && u.role !== 'OWNER' && canActOn(meRole, u.role) &&
    ROLE_RANK[meRole] >= ROLE_RANK['ADMIN'];

  function formatDate(iso: string | null): string {
    if (!iso) return t('user_never_logged_in');
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t('users')}</h1>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="me-2 h-4 w-4" />
            {t('add_user')}
          </Button>
        )}
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('user_stat_total')}
          value={stats?.total ?? 0}
          icon={<Users className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('user_stat_active')}
          value={stats?.active ?? 0}
          icon={<CheckCircle className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        <StatCard
          title={t('user_stat_inactive')}
          value={stats?.inactive ?? 0}
          icon={<XCircle className="h-4 w-4" />}
          loading={statsQuery.isLoading}
        />
        {/* Role breakdown card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('user_stat_by_role')}
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsQuery.isLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <div className="flex flex-wrap gap-1 pt-1">
                {ALL_ROLES.map(r => (
                  stats?.byRole[r] ? (
                    <span key={r} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_STYLES[r]}`}>
                      {t(`role_${r.toLowerCase()}`)}
                      <span className="font-bold">{stats.byRole[r]}</span>
                    </span>
                  ) : null
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            placeholder={t('user_search_placeholder')}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <Select
          value={roleFilter}
          onValueChange={v => { setRoleFilter(v as UserRole | 'all'); setPage(1); }}
        >
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_roles')}</SelectItem>
            {ALL_ROLES.map(r => (
              <SelectItem key={r} value={r}>{t(`role_${r.toLowerCase()}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={v => { setStatusFilter(v as typeof statusFilter); setPage(1); }}
        >
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_statuses')}</SelectItem>
            <SelectItem value="true">{t('active')}</SelectItem>
            <SelectItem value="false">{t('inactive')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={sortBy}
          onValueChange={v => { setSortBy(v); setPage(1); }}
        >
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t('sort_date_added')}</SelectItem>
            <SelectItem value="name">{t('sort_name')}</SelectItem>
            <SelectItem value="email">{t('sort_email')}</SelectItem>
            <SelectItem value="role">{t('sort_role')}</SelectItem>
            <SelectItem value="lastLogin">{t('sort_last_login')}</SelectItem>
            <SelectItem value="isActive">{t('status')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('user_name')}</TableHead>
                <TableHead>{t('user_email')}</TableHead>
                <TableHead>{t('user_role')}</TableHead>
                <TableHead>{t('user_status')}</TableHead>
                <TableHead>{t('user_last_login')}</TableHead>
                <TableHead>{t('created_at')}</TableHead>
                <TableHead className="text-end">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQuery.isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : usersQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-destructive">
                    {t('no_records')}
                  </TableCell>
                </TableRow>
              ) : !list?.data?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    {debouncedSearch ? t('user_no_results') : t('user_empty')}
                  </TableCell>
                </TableRow>
              ) : (
                list.data.map(user => (
                  <TableRow key={user.id} className={!user.isActive ? 'opacity-60' : ''}>
                    <TableCell>
                      <div className="font-medium">
                        {user.name}
                        {user.id === meId && (
                          <span className="ms-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </div>
                      {user.nameAr && (
                        <div dir="rtl" className="text-xs text-muted-foreground">{user.nameAr}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell><RoleBadge role={user.role} /></TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="outline" className="border-green-500 text-green-600">
                          {t('active')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-destructive text-destructive">
                          {t('inactive')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(user.lastLogin)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Intl.DateTimeFormat(undefined, {
                        day: '2-digit', month: 'short', year: 'numeric',
                      }).format(new Date(user.createdAt))}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit */}
                        {canEdit(user) && (
                          <Button size="icon" variant="ghost" onClick={() => setEditTarget(user)} title={t('edit')}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Reset password */}
                        {canReset(user) && (
                          <Button size="icon" variant="ghost" onClick={() => setResetPwTarget(user)} title={t('reset_password')}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Activate / Deactivate */}
                        {canStatus(user) && (
                          user.isActive ? (
                            <Button
                              size="icon" variant="ghost"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              onClick={() => setDeactivateTarget(user)}
                              title={t('deactivate')}
                            >
                              <UserX className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              size="icon" variant="ghost"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => setActivateTarget(user)}
                              title={t('activate')}
                            >
                              <UserCheck className="h-4 w-4" />
                            </Button>
                          )
                        )}
                        {/* Delete */}
                        {canDelete(user) && (
                          <Button
                            size="icon" variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteTarget(user)}
                            title={t('delete')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {list && list.meta.pages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              {t('showing_results', {
                from:  (list.meta.page - 1) * list.meta.limit + 1,
                to:    Math.min(list.meta.page * list.meta.limit, list.meta.total),
                total: list.meta.total,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                {t('previous')}
              </Button>
              <span className="text-sm">{t('page_of', { page, pages: list.meta.pages })}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(list.meta.pages, p + 1))} disabled={page === list.meta.pages}>
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Dialogs ── */}

      <UserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        currentUserRole={meRole}
        onSuccess={invalidate}
      />

      <UserDialog
        open={!!editTarget}
        onOpenChange={open => !open && setEditTarget(null)}
        user={editTarget}
        currentUserRole={meRole}
        onSuccess={invalidate}
      />

      <ResetPasswordDialog
        open={!!resetPwTarget}
        onOpenChange={open => !open && setResetPwTarget(null)}
        user={resetPwTarget}
        onSuccess={invalidate}
      />

      {/* Activate confirmation */}
      <ConfirmDialog
        open={!!activateTarget}
        onOpenChange={open => !open && setActivateTarget(null)}
        title={t('activate_user_confirm')}
        description={t('user_activate_desc')}
        confirmLabel={t('activate')}
        onConfirm={() =>
          statusMutation.mutate({ id: activateTarget!.id, isActive: true })
        }
        loading={statusMutation.isPending}
      />

      {/* Deactivate confirmation */}
      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={open => !open && setDeactivateTarget(null)}
        title={t('deactivate_user_confirm')}
        description={t('user_deactivate_desc')}
        confirmLabel={t('deactivate')}
        onConfirm={() =>
          statusMutation.mutate({ id: deactivateTarget!.id, isActive: false })
        }
        loading={statusMutation.isPending}
        destructive
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title={t('delete_user_confirm')}
        description={t('user_delete_desc')}
        confirmLabel={t('delete')}
        onConfirm={() => deleteMutation.mutate()}
        loading={deleteMutation.isPending}
        destructive
      />
    </div>
  );
}
