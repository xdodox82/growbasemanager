import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2 } from 'lucide-react';

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorVerify = ({ onSuccess, onCancel }: TwoFactorVerifyProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast({
        title: 'Neplatný kód',
        description: 'Zadajte 6-miestny kód z aplikácie',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get the current MFA factors
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;

      const totpFactor = factorsData?.totp?.[0];
      
      if (!totpFactor) {
        throw new Error('Žiadny TOTP faktor nebol nájdený');
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) throw challengeError;

      // Verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code,
      });

      if (verifyError) throw verifyError;

      toast({
        title: 'Úspešne overené',
        description: 'Boli ste prihlásený.',
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Neplatný kód',
        description: 'Skontrolujte kód a skúste znova',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Dvojfaktorové overenie</CardTitle>
        <CardDescription>
          Zadajte 6-miestny kód z vašej autentifikačnej aplikácie
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Overovací kód</Label>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-widest"
            autoFocus
          />
        </div>

        <Button 
          onClick={handleVerify} 
          disabled={loading || code.length !== 6}
          className="w-full"
        >
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Overiť
        </Button>

        <Button 
          variant="ghost" 
          onClick={onCancel}
          className="w-full"
        >
          Späť na prihlásenie
        </Button>
      </CardContent>
    </Card>
  );
};
