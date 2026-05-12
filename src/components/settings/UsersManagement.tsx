import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, User, Loader2, Plus, Trash2, Key } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserWithRole {
  id: string;
  email: string;
  fullName: string | null;
  role: 'admin' | 'worker';
  createdAt: string;
}

export function UsersManagement() {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newUserData, setNewUserData] = useState({ email: '', password: '', fullName: '', role: 'worker' as 'admin' | 'worker' });

  const fetchUsers = async () => {
    try {
      const { data: profiles } = await supabase.from('profiles').select('*');
      const { data: roles } = await supabase.from('user_roles').select('*');
      const usersWithRoles: UserWithRole[] = (profiles || [])
        .filter(p => roles?.some(r => r.user_id === p.user_id))
        .map(p => {
          const userRole = roles?.find(r => r.user_id === p.user_id);
          return { id: p.user_id, email: p.email || '', fullName: p.full_name, role: (userRole?.role as 'admin' | 'worker') || 'worker', createdAt: p.created_at };
        });
      setUsers(usersWithRoles);
    } catch { toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa načítať používateľov.' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const updateUserRole = async (userId: string, newRole: 'admin' | 'worker') => {
    if (userId === user?.id) { toast({ variant: 'destructive', title: 'Chyba', description: 'Nemôžete zmeniť svoju vlastnú rolu.' }); return; }
    setUpdating(userId);
    try {
      const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({ title: 'Rola aktualizovaná' });
    } catch { toast({ variant: 'destructive', title: 'Chyba', description: 'Nepodarilo sa aktualizovať rolu.' }); }
    finally { setUpdating(null); }
  };

  const handleCreateUser = async () => {
    if (!newUserData.email || !newUserData.password) { toast({ variant: 'destructive', title: 'Chyba', description: 'Vyplňte email a heslo.' }); return; }
    if (newUserData.password.length < 6) { toast({ variant: 'destructive', title: 'Chyba', description: 'Heslo musí mať aspoň 6 znakov.' }); return; }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('admin_create_user_v3', { p_email: newUserData.email, p_password: newUserData.password, p_full_name: newUserData.fullName || '', p_role: newUserData.role });
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || 'Nepodarilo sa vytvoriť používateľa');
      toast({ title: 'Používateľ vytvorený', description: `${newUserData.email} bol pridaný` });
      setNewUserData({ email: '', password: '', fullName: '', role: 'worker' });
      setIsAddDialogOpen(false);
      await fetchUsers();
    } catch (err: any) { toast({ variant: 'destructive', title: 'Chyba', description: err.message }); }
    finally { setIsCreating(false); }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    setIsDeleting(true);
    try {
      // Najprv skús cez RPC
      const { data, error } = await supabase.rpc('admin_delete_user', { p_user_id_to_delete: deleteUserId });
      
      if (error) {
        console.error('[DELETE USER] RPC error:', error);
        // Fallback: zmaž len z user_roles (odoberie prístup do GrowBase)
        const { error: roleError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', deleteUserId);
        if (roleError) throw roleError;
        setUsers(prev => prev.filter(u => u.id !== deleteUserId));
        setDeleteUserId(null);
        toast({ title: 'Prístup odobratý', description: 'Používateľ bol odstránený zo zoznamu pracovníkov.' });
        return;
      }

      if (data && !data.success) {
        console.error('[DELETE USER] RPC failed:', data);
        throw new Error(data.error || 'Nepodarilo sa zmazať používateľa');
      }

      setUsers(prev => prev.filter(u => u.id !== deleteUserId));
      setDeleteUserId(null);
      toast({ title: 'Používateľ zmazaný' });
    } catch (err: any) {
      console.error('[DELETE USER] Error:', err);
      toast({ variant: 'destructive', title: 'Chyba', description: err.message || 'Neočakávaná chyba pri mazaní.' });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#f1f5f9] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#f1f5f9] border border-[#e2e8f0] flex items-center justify-center">
              <Users className="h-4 w-4 text-[#475569]" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#0f172a]">Správa používateľov</div>
              <div className="text-xs text-[#64748b]">{users.length} {users.length === 1 ? 'používateľ' : 'používateľov'}</div>
            </div>
          </div>
          <button onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors">
            <Plus className="h-4 w-4" /> Pridať
          </button>
        </div>

        <div className="divide-y divide-[#f1f5f9]">
          {loading ? (
            <div className="px-5 py-4 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#16a34a]" />
              <span className="text-sm text-[#64748b]">Načítavam...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-[#64748b]">Žiadni používatelia</div>
          ) : (
            users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-[#eff6ff] border-[#bfdbfe]' : 'bg-[#f1f5f9] border-[#e2e8f0]'}`}>
                  {u.role === 'admin' ? <Shield className="h-4 w-4 text-[#2563eb]" /> : <User className="h-4 w-4 text-[#475569]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#0f172a] truncate">{u.fullName || 'Bez mena'}</span>
                    {u.id === user?.id && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#dcfce7] border border-[#bbf7d0] text-[#166534]">Vy</span>}
                  </div>
                  <div className="text-xs text-[#64748b] truncate">{u.email}</div>
                </div>
                {u.id !== user?.id && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={u.role} onValueChange={(v: 'admin' | 'worker') => updateUserRole(u.id, v)} disabled={updating === u.id}>
                      <SelectTrigger className="h-8 w-[130px] text-xs border-[#e2e8f0]">
                        {updating === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue />}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="worker">Pracovník</SelectItem>
                        <SelectItem value="admin">Administrátor</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => setDeleteUserId(u.id)}
                      className="w-8 h-8 rounded-lg border border-[#fecaca] bg-[#fef2f2] flex items-center justify-center text-[#dc2626] hover:bg-[#fee2e2] transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 bg-[#f8fafc] border-t border-[#e2e8f0]">
          <div className="flex gap-4 text-xs text-[#64748b]">
            <span><Shield className="h-3 w-3 inline mr-1 text-[#2563eb]" /><strong className="text-[#0f172a]">Administrátor</strong> — plný prístup</span>
            <span><User className="h-3 w-3 inline mr-1 text-[#475569]" /><strong className="text-[#0f172a]">Pracovník</strong> — obmedzený prístup podľa nastavení</span>
          </div>
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-[#16a34a]" /> Pridať používateľa
            </DialogTitle>
            <DialogDescription>Vytvorte nový účet pre zamestnanca alebo brigádnika.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-semibold text-[#475569] mb-1 block">Email *</Label>
              <Input type="email" value={newUserData.email} onChange={e => setNewUserData({ ...newUserData, email: e.target.value })}
                placeholder="zamestnanec@example.com" className="h-9 border-[#e2e8f0] text-sm" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#475569] mb-1 block">Heslo *</Label>
              <Input type="password" value={newUserData.password} onChange={e => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="Minimálne 6 znakov" className="h-9 border-[#e2e8f0] text-sm" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#475569] mb-1 block">Celé meno</Label>
              <Input value={newUserData.fullName} onChange={e => setNewUserData({ ...newUserData, fullName: e.target.value })}
                placeholder="Ján Novák" className="h-9 border-[#e2e8f0] text-sm" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-[#475569] mb-1 block">Rola</Label>
              <Select value={newUserData.role} onValueChange={(v: 'admin' | 'worker') => setNewUserData({ ...newUserData, role: v })}>
                <SelectTrigger className="h-9 border-[#e2e8f0] text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Pracovník</SelectItem>
                  <SelectItem value="admin">Administrátor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setIsAddDialogOpen(false)}
              className="h-9 px-4 rounded-xl border border-[#e2e8f0] bg-white text-sm font-medium text-[#475569] hover:bg-[#f8fafc]">
              Zrušiť
            </button>
            <button onClick={handleCreateUser} disabled={isCreating}
              className="h-9 px-5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] disabled:opacity-50 flex items-center gap-2">
              {isCreating && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Vytvoriť
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zmazať používateľa?</AlertDialogTitle>
            <AlertDialogDescription>
              Táto akcia je nevratná. Používateľ bude natrvalo odstránený zo systému vrátane všetkých prístupov.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušiť</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} disabled={isDeleting}
              className="bg-[#dc2626] hover:bg-[#b91c1c] text-white">
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Zmazať
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
