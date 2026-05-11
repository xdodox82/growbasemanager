import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Shield, ShieldCheck, ShieldOff, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TwoFactorSetup } from './TwoFactorSetup';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const TwoFactorSettings = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [disabling, setDisabling] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const { toast } = useToast();

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const verifiedTOTP = data?.totp?.some(factor => factor.status === 'verified');
      setIsEnabled(!!verifiedTOTP);
    } catch (error) {
      console.error('Error checking MFA status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const handleDisable = async () => {
    setDisabling(true);
    try {
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) throw listError;

      const totpFactor = data?.totp?.[0];
      if (totpFactor) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
        if (error) throw error;
      }

      setIsEnabled(false);
      toast({
        title: '2FA deaktivované',
        description: 'Dvojfaktorové overenie bolo vypnuté.',
      });
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa deaktivovať 2FA',
        variant: 'destructive',
      });
    } finally {
      setDisabling(false);
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    setIsEnabled(true);
  };

  if (loading) return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm px-5 py-4 flex items-center gap-3">
      <Loader2 className="h-4 w-4 animate-spin text-[#16a34a]" />
      <span className="text-sm text-[#64748b]">Načítavam...</span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-[#f1f5f9]">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${isEnabled ? 'bg-[#f0fdf4] border-[#bbf7d0]' : 'bg-[#f1f5f9] border-[#e2e8f0]'}`}>
            {isEnabled ? <ShieldCheck className="h-4 w-4 text-[#16a34a]" /> : <Shield className="h-4 w-4 text-[#475569]" />}
          </div>
          <div>
            <div className="text-sm font-bold text-[#0f172a]">Dvojfaktorové overenie (2FA)</div>
            <div className="text-xs text-[#64748b]">
              {isEnabled ? 'Aktivované — váš účet je chránený' : 'Neaktívne — pridajte ďalšiu vrstvu zabezpečenia'}
            </div>
          </div>
          {isEnabled && <span className="ml-auto text-[10px] font-bold px-2 py-1 rounded-full bg-[#dcfce7] border border-[#bbf7d0] text-[#166534]">Aktívne</span>}
        </div>
      </div>
      <div className="px-5 py-4">
        {isEnabled ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button disabled={disabling}
                className="h-9 px-4 rounded-xl border border-[#fecaca] bg-[#fef2f2] text-[#dc2626] text-sm font-semibold hover:bg-[#fee2e2] transition-colors disabled:opacity-50 flex items-center gap-2">
                {disabling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldOff className="h-3.5 w-3.5" />}
                Deaktivovať 2FA
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deaktivovať 2FA?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tým sa zníži zabezpečenie vášho účtu. Budete sa môcť prihlásiť len pomocou hesla.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušiť</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisable}>Deaktivovať</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Dialog open={showSetup} onOpenChange={setShowSetup}>
            <DialogTrigger asChild>
              <button className="h-9 px-5 rounded-xl bg-[#16a34a] text-white text-sm font-semibold hover:bg-[#15803d] transition-colors flex items-center gap-2">
                <Shield className="h-3.5 w-3.5" /> Aktivovať 2FA
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nastaviť 2FA</DialogTitle>
                <DialogDescription>Nastavte dvojfaktorové overenie pre váš účet</DialogDescription>
              </DialogHeader>
              <TwoFactorSetup onComplete={handleSetupComplete} onCancel={() => setShowSetup(false)} />
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};
