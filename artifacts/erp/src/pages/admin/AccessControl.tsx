import React, { useState, useEffect } from 'react';
import { useGetCurrentUser, getGetCurrentUserQueryKey } from '@workspace/api-client-react';
import { DeveloperAPI, UserSession, DemoUser } from '@/lib/developer-api';
import { useToast } from '@/hooks/use-toast';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Monitor,
  Ban,
  RefreshCw,
  Plus,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Globe,
  Laptop,
  KeyRound,
  Calendar,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AccessControl() {
  const { toast } = useToast();
  const { data: currentUser } = useGetCurrentUser({
    query: { queryKey: getGetCurrentUserQueryKey() },
  });

  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal state for creating demo account
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Demo@1234');
  const [newName, setNewName] = useState('');
  const [newDays, setNewDays] = useState(7);

  // Modal state for reset confirmation
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Strictly verify user authorization: Evolix developer only
  const isDeveloperAdmin = currentUser?.email === 'admin@albunyan.com';

  const loadData = async () => {
    try {
      setLoading(true);
      const [sessionsRes, demoRes] = await Promise.all([
        DeveloperAPI.getSessions(100),
        DeveloperAPI.getDemoUsers(),
      ]);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (demoRes.data) setDemoUsers(demoRes.data);
    } catch (err: any) {
      toast({
        title: 'Error fetching access data',
        description: err.message || 'Could not load sessions or demo accounts.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isDeveloperAdmin) {
      loadData();
    }
  }, [isDeveloperAdmin]);

  if (!isDeveloperAdmin) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <div className="inline-flex p-4 rounded-full bg-destructive/10 text-destructive mb-4">
          <ShieldAlert className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
        <p className="text-muted-foreground mt-2">
          Only the Evolix developer administrator (<code>admin@albunyan.com</code>) is authorized
          to access this portal.
        </p>
      </div>
    );
  }

  // Session termination handler
  const handleTerminateSession = async (sessionId: string) => {
    try {
      setActionLoading(true);
      await DeveloperAPI.terminateSession(sessionId);
      toast({
        title: 'Session Terminated',
        description: 'The user session was immediately revoked and access blocked.',
      });
      loadData();
    } catch (err: any) {
      toast({
        title: 'Failed to terminate session',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Create demo user handler
  const handleCreateDemoUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    try {
      setActionLoading(true);
      const res = await DeveloperAPI.createDemoUser({
        email: newEmail.trim(),
        password: newPassword.trim(),
        name: newName.trim() || 'Demo Client User',
        expiresInDays: newDays,
      });
      toast({
        title: 'Demo Account Created',
        description: `Created ${res.data.email} valid for ${newDays} days.`,
      });
      setCreateModalOpen(false);
      setNewEmail('');
      setNewName('');
      loadData();
    } catch (err: any) {
      toast({
        title: 'Failed to create demo account',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle demo user active status
  const handleToggleDemoUser = async (userId: string) => {
    try {
      setActionLoading(true);
      const res = await DeveloperAPI.toggleDemoUser(userId);
      toast({
        title: res.message,
        description: res.data.isActive ? 'Account reactivated' : 'Account suspended and all active sessions terminated.',
      });
      loadData();
    } catch (err: any) {
      toast({
        title: 'Failed to toggle account',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Extend demo user
  const handleExtendDemoUser = async (userId: string) => {
    try {
      setActionLoading(true);
      await DeveloperAPI.extendDemoUser(userId, 7);
      toast({
        title: 'Demo Access Extended',
        description: 'Account expiration extended by 7 days.',
      });
      loadData();
    } catch (err: any) {
      toast({
        title: 'Failed to extend account',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Reset demo sandbox data
  const handleResetDemoData = async () => {
    try {
      setActionLoading(true);
      const res = await DeveloperAPI.resetDemoData();
      toast({
        title: 'Demo Sandbox Reset',
        description: res.message || 'Demo environment restored with fresh hardware inventory and sample sales.',
      });
      setResetModalOpen(false);
      loadData();
    } catch (err: any) {
      toast({
        title: 'Reset failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const activeSessionsCount = sessions.filter(s => s.status === 'ACTIVE').length;
  const demoSessionsCount = sessions.filter(s => s.isDemo && s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Developer Access & Session Control
            </h1>
            <Badge variant="outline" className="text-xs font-mono bg-primary/5 text-primary border-primary/20">
              Evolix Master
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time sign-in monitoring, one-click access revocation, and isolated demo account sandbox manager.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading || actionLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="gap-1.5 bg-primary text-white"
          >
            <Plus className="w-4 h-4" />
            New Demo Account
          </Button>
        </div>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Sessions</span>
            <Monitor className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{activeSessionsCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {sessions.length} total logged sign-in events
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Demo Users</span>
            <Users className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{demoUsers.length}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {demoSessionsCount} live active demo sessions
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Session Policy</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">7 Days</div>
          <div className="text-xs text-muted-foreground mt-1">
            Auto-expires demo access upon deadline
          </div>
        </div>

        <div className="bg-card border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Data Isolation</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 mt-1">
            <CheckCircle2 className="w-4 h-4" /> 100% Schema Isolated
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Demo hits &lsquo;demo&rsquo; schema; client data safe
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md bg-muted/50 p-1">
          <TabsTrigger value="sessions" className="text-xs sm:text-sm">
            Live Sessions ({sessions.length})
          </TabsTrigger>
          <TabsTrigger value="demo-users" className="text-xs sm:text-sm">
            Demo Accounts ({demoUsers.length})
          </TabsTrigger>
          <TabsTrigger value="sandbox" className="text-xs sm:text-sm">
            Sandbox Control
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Live Sessions Monitor */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Sign-In History & Live Monitoring</h3>
                <p className="text-xs text-muted-foreground">
                  Track who is signed in, client device metadata, and revoke sessions on demand.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Environment</th>
                    <th className="px-4 py-3">IP Address</th>
                    <th className="px-4 py-3">Browser / Device</th>
                    <th className="px-4 py-3">Logged In</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                        No session records found.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((sess) => {
                      const isActive = sess.status === 'ACTIVE';
                      const isTerminated = sess.status === 'TERMINATED';

                      return (
                        <tr key={sess.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{sess.userName || 'User'}</div>
                            <div className="text-xs text-muted-foreground font-mono">{sess.userEmail}</div>
                          </td>
                          <td className="px-4 py-3">
                            {sess.isDemo ? (
                              <Badge className="bg-amber-500/15 text-amber-700 border-amber-300 font-normal text-xs">
                                Demo Sandbox
                              </Badge>
                            ) : (
                              <Badge className="bg-blue-500/15 text-blue-700 border-blue-300 font-normal text-xs">
                                Real Production
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                            {sess.ipAddress || '127.0.0.1'}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Laptop className="w-3.5 h-3.5 text-muted-foreground" />
                              <span>{sess.browser || 'Browser'} on {sess.os || 'OS'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <div>{new Date(sess.loggedInAt).toLocaleDateString()}</div>
                            <div className="text-[11px] opacity-75">{new Date(sess.loggedInAt).toLocaleTimeString()}</div>
                          </td>
                          <td className="px-4 py-3">
                            {isActive ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-xs">
                                Active
                              </Badge>
                            ) : isTerminated ? (
                              <Badge variant="destructive" className="text-xs">
                                Terminated
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Expired
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isActive && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleTerminateSession(sess.id)}
                                disabled={actionLoading}
                                className="h-7 text-xs gap-1"
                              >
                                <Ban className="w-3 h-3" />
                                Terminate
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Demo Accounts Manager */}
        <TabsContent value="demo-users" className="space-y-4">
          <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Demo Accounts & Evaluation Links</h3>
                <p className="text-xs text-muted-foreground">
                  Create dedicated accounts for prospective clients. Sessions expire automatically in 7 days.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                className="gap-1.5 h-8 text-xs bg-primary text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Demo Account
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/40 text-muted-foreground border-b font-medium">
                  <tr>
                    <th className="px-4 py-3">Demo User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Expires On</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {demoUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                        No demo users configured yet. Click &quot;Add Demo Account&quot; to create one.
                      </td>
                    </tr>
                  ) : (
                    demoUsers.map((user) => {
                      const isExpired = user.demoExpiresAt && new Date(user.demoExpiresAt) < new Date();

                      return (
                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">{user.name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{user.email}</div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className="text-xs font-mono">
                              {user.role?.name || 'ADMIN'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {user.isActive && !isExpired ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 text-xs">
                                Active Demo
                              </Badge>
                            ) : isExpired ? (
                              <Badge variant="destructive" className="text-xs">
                                Expired (7 Days)
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Suspended
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {user.demoExpiresAt ? (
                              <div>
                                <div className="font-medium">
                                  {new Date(user.demoExpiresAt).toLocaleDateString()}
                                </div>
                                <div className="text-[11px] opacity-75">
                                  {new Date(user.demoExpiresAt).toLocaleTimeString()}
                                </div>
                              </div>
                            ) : (
                              'No expiration set'
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right space-x-1.5 rtl:space-x-reverse">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExtendDemoUser(user.id)}
                              disabled={actionLoading}
                              className="h-7 text-xs"
                              title="Extend expiration by 7 days"
                            >
                              +7 Days
                            </Button>
                            <Button
                              variant={user.isActive ? 'destructive' : 'default'}
                              size="sm"
                              onClick={() => handleToggleDemoUser(user.id)}
                              disabled={actionLoading}
                              className="h-7 text-xs"
                            >
                              {user.isActive ? 'Suspend' : 'Activate'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Sandbox Control */}
        <TabsContent value="sandbox" className="space-y-4">
          <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  Demo Environment Sandbox Reset
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Reset the demo sandbox back to pristine realistic hardware store inventory.
                  This refreshes 11 professional hardware items (Bosch impact drills, Makita grinders,
                  DeWalt rotary hammers, 3M PPE, Stanley hand tools), 4 mock construction contractors,
                  2 suppliers, and clean sample quotations.
                </p>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-300/40 rounded-lg p-4 text-xs sm:text-sm text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Safe Operation:</span> This operation affects
                <strong> ONLY the isolated &lsquo;demo&rsquo; schema</strong>. Real client data in
                the &lsquo;public&rsquo; schema is 100% physically separated and will never be touched or altered.
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="destructive"
                onClick={() => setResetModalOpen(true)}
                disabled={actionLoading}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Demo Database Now
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal: Create Demo Account */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Create Client Demo Account
            </DialogTitle>
            <DialogDescription>
              Create a sandbox account with 7-day expiration for a client demo. No real client data will ever be visible.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateDemoUser} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="demo-email">Demo Email Address *</Label>
              <Input
                id="demo-email"
                type="email"
                placeholder="e.g. client-demo@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-name">Client or Company Name</Label>
              <Input
                id="demo-name"
                placeholder="e.g. Al-Bahar Contracting Demo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-password">Temporary Password</Label>
              <Input
                id="demo-password"
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="demo-days">Access Duration (Days)</Label>
              <Input
                id="demo-days"
                type="number"
                min={1}
                max={90}
                value={newDays}
                onChange={(e) => setNewDays(Number(e.target.value))}
              />
              <p className="text-[11px] text-muted-foreground">
                Demo session will automatically expire and terminate after this duration.
              </p>
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                Create Demo Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirm Reset */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Reset Demo Sandbox Environment?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the mock demo data? This will restore standard sample hardware products, customers, and sales orders in the sandbox.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setResetModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetDemoData}
              disabled={actionLoading}
            >
              Confirm Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
