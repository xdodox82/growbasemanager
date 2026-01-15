import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Načítavam...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isEnabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
          {isEnabled ? <ShieldCheck className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
        </div>
        <div>
          <h2 className="text-lg font-semibold">Dvojfaktorové overenie (2FA)</h2>
          <p className="text-sm text-muted-foreground">
            {isEnabled ? 'Aktivované - váš účet je chránený' : 'Neaktívne - pridajte ďalšiu vrstvu zabezpečenia'}
          </p>
        </div>
      </div>

      {isEnabled ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={disabling}>
              {disabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <ShieldOff className="mr-2 h-4 w-4" />
              Deaktivovať 2FA
            </Button>
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
            <Button>
              <Shield className="mr-2 h-4 w-4" />
              Aktivovať 2FA
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nastaviť 2FA</DialogTitle>
              <DialogDescription>
                Nastavte dvojfaktorové overenie pre váš účet
              </DialogDescription>
            </DialogHeader>
            <TwoFactorSetup 
              onComplete={handleSetupComplete} 
              onCancel={() => setShowSetup(false)} 
            />
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
};
