import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-components';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, User, Loader2, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WorkerPermissionsSettings } from '@/components/settings/WorkerPermissionsSettings';

interface UserWithRole {
  id: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'worker';
  createdAt: string;
}

const UsersPage = () => {
  const { isAdmin, user, session } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newUserData, setNewUserData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'worker' as 'admin' | 'worker',
  });
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: profile.email || '',
          fullName: profile.full_name,
          role: (userRole?.role as 'admin' | 'worker') || 'worker',
          createdAt: profile.created_at,
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: 'Nepodarilo sa načítať používateľov.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const updateUserRole = async (userId: string, newRole: 'admin' | 'worker') => {
    if (!isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Prístup zamietnutý',
        description: 'Len administrátori môžu meniť role.',
      });
      return;
    }

    if (userId === user?.id) {
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: 'Nemôžete zmeniť svoju vlastnú rolu.',
      });
      return;
    }

    setUpdating(userId);

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );

      toast({
        title: 'Rola aktualizovaná',
        description: `Používateľ bol nastavený ako ${newRole === 'admin' ? 'Administrátor' : 'Pracovník'}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: 'Nepodarilo sa aktualizovať rolu.',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newUserData.email || !newUserData.password) {
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: 'Vyplňte email a heslo.',
      });
      return;
    }

    if (newUserData.password.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: 'Heslo musí mať aspoň 6 znakov.',
      });
      return;
    }

    setIsCreating(true);

    try {
      console.log('[CREATE USER] Calling RPC: admin_create_user_v3');
      console.log('[CREATE USER] Data:', {
        email: newUserData.email,
        fullName: newUserData.fullName,
        role: newUserData.role,
      });

      const { data, error } = await supabase.rpc('admin_create_user_v3', {
        p_email: newUserData.email,
        p_password: newUserData.password,
        p_full_name: newUserData.fullName || '',
        p_role: newUserData.role,
      });

      console.log('[CREATE USER] RPC Response:', { data, error });

      if (error) {
        console.error('[CREATE USER] RPC error:', error);
        throw new Error(error.message || 'Chyba pri volaní RPC funkcie');
      }

      if (!data) {
        console.error('[CREATE USER] No data returned from RPC');
        throw new Error('Žiadna odpoveď zo servera');
      }

      if (!data.success) {
        console.error('[CREATE USER] RPC returned error:', data);

        let errorMsg = data.error || 'Nepodarilo sa vytvoriť používateľa';

        if (data.error_code) {
          errorMsg += ` (${data.error_code})`;
        }

        if (data.details) {
          errorMsg += `\n\nDetaily: ${data.details}`;
        }

        throw new Error(errorMsg);
      }

      console.log('[CREATE USER] SUCCESS - User ID:', data.user_id);

      toast({
        title: 'Používateľ vytvorený',
        description: `Používateľ ${newUserData.email} bol úspešne vytvorený.`,
      });

      setNewUserData({ email: '', password: '', fullName: '', role: 'worker' });
      setIsAddDialogOpen(false);
      setRefreshKey((prev) => prev + 1);
      await fetchUsers();
    } catch (error: unknown) {
      console.error('[CREATE USER] ERROR:', error);

      let errorMessage = 'Nepodarilo sa vytvoriť používateľa.';
      let errorDetails = '';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        variant: 'destructive',
        title: 'Chyba pri vytváraní používateľa',
        description: (
          <div className="space-y-1">
            <p>{errorMessage}</p>
            {errorDetails && <p className="text-xs opacity-80">{errorDetails}</p>}
          </div>
        ),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    setIsDeleting(true);

    try {
      console.log('[DELETE USER] Calling RPC: admin_delete_user');
      console.log('[DELETE USER] User ID:', deleteUserId);

      const { data, error } = await supabase.rpc('admin_delete_user', {
        p_user_id_to_delete: deleteUserId,
      });

      console.log('[DELETE USER] RPC Response:', { data, error });

      if (error) {
        console.error('[DELETE USER] RPC error:', error);
        throw new Error(error.message || 'Chyba pri volaní RPC funkcie');
      }

      if (!data) {
        console.error('[DELETE USER] No data returned from RPC');
        throw new Error('Žiadna odpoveď zo servera');
      }

      if (!data.success) {
        console.error('[DELETE USER] RPC returned error:', data.error);
        throw new Error(data.error || 'Nepodarilo sa zmazať používateľa');
      }

      console.log('[DELETE USER] SUCCESS');

      setUsers((prev) => prev.filter((u) => u.id !== deleteUserId));
      setDeleteUserId(null);
      setRefreshKey((prev) => prev + 1);

      toast({
        title: 'Používateľ zmazaný',
        description: 'Používateľ bol úspešne odstránený.',
      });

      fetchUsers();
    } catch (error: unknown) {
      console.error('[DELETE USER] ERROR:', error);
      const message = error instanceof Error ? error.message : 'Nepodarilo sa zmazať používateľa.';
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <MainLayout>
        <PageHeader title="Používatelia" />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Nemáte oprávnenie na zobrazenie tejto stránky. Len administrátori môžu spravovať používateľov.
          </AlertDescription>
        </Alert>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Správa používateľov"
        description="Spravujte používateľov a ich prístupové práva"
      >
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Pridať používateľa
        </Button>
      </PageHeader>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Zoznam používateľov</h2>
            <p className="text-sm text-muted-foreground">
              {users.length} {users.length === 1 ? 'používateľ' : 'používateľov'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Používateľ</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rola</TableHead>
                <TableHead>Registrovaný</TableHead>
                <TableHead className="text-right">Akcie</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        {u.role === 'admin' ? (
                          <Shield className="h-4 w-4 text-primary" />
                        ) : (
                          <User className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <span className="font-medium">
                        {u.fullName || 'Bez mena'}
                        {u.id === user?.id && (
                          <Badge variant="outline" className="ml-2">
                            Vy
                          </Badge>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                      {u.role === 'admin' ? 'Administrátor' : 'Pracovník'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(u.createdAt).toLocaleDateString('sk-SK')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.id !== user?.id && (
                        <>
                          <Select
                            value={u.role}
                            onValueChange={(value: 'admin' | 'worker') =>
                              updateUserRole(u.id, value)
                            }
                            disabled={updating === u.id}
                          >
                            <SelectTrigger className="w-[140px]">
                              {updating === u.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <SelectValue />
                              )}
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrátor</SelectItem>
                              <SelectItem value="worker">Pracovník</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteUserId(u.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">Popis rolí:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              <strong>Administrátor:</strong> Plný prístup - môže upravovať, mazať a spravovať používateľov
            </li>
            <li>
              <strong>Pracovník:</strong> Môže prezerať všetky dáta a pridávať nové záznamy
            </li>
          </ul>
        </div>
      </Card>

      <div className="mt-6">
        <WorkerPermissionsSettings key={refreshKey} />
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pridať nového používateľa</DialogTitle>
            <DialogDescription>
              Vytvorte nový účet pre kolegu. Email bude automaticky overený.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="kolega@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Heslo *</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Minimálne 6 znakov"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Celé meno</Label>
                <Input
                  id="fullName"
                  value={newUserData.fullName}
                  onChange={(e) => setNewUserData({ ...newUserData, fullName: e.target.value })}
                  placeholder="Ján Novák"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rola</Label>
                <Select
                  value={newUserData.role}
                  onValueChange={(value: 'admin' | 'worker') =>
                    setNewUserData({ ...newUserData, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="worker">Pracovník</SelectItem>
                    <SelectItem value="admin">Administrátor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Zrušiť
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Vytvoriť používateľa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať používateľa?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Používateľ bude natrvalo odstránený zo systému.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Zmazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default UsersPage;
