import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Copy, Check } from 'lucide-react';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const TwoFactorSetup = ({ onComplete, onCancel }: TwoFactorSetupProps) => {
  const [step, setStep] = useState<'start' | 'verify'>('start');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [factorId, setFactorId] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator App'
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep('verify');
      }
    } catch (error: any) {
      toast({
        title: 'Chyba',
        description: error.message || 'Nepodarilo sa aktivovať 2FA',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast({
        title: 'Neplatný kód',
        description: 'Zadajte 6-miestny kód z aplikácie',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verifyCode,
      });

      if (error) throw error;

      toast({
        title: '2FA aktivované',
        description: 'Dvojfaktorové overenie bolo úspešne nastavené.',
      });
      onComplete();
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

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'start') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Nastaviť 2FA
          </CardTitle>
          <CardDescription>
            Dvojfaktorové overenie pridáva ďalšiu vrstvu zabezpečenia vášho účtu.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Budete potrebovať autentifikačnú aplikáciu ako:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Google Authenticator</li>
              <li>Microsoft Authenticator</li>
              <li>Authy</li>
            </ul>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleEnroll} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Pokračovať
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Zrušiť
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Overiť nastavenie
        </CardTitle>
        <CardDescription>
          Naskenujte QR kód v autentifikačnej aplikácii a zadajte overovací kód.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrCode && (
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <img src={qrCode} alt="QR Code" className="w-48 h-48" />
          </div>
        )}
        
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">
            Alebo zadajte kód manuálne:
          </Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
              {secret}
            </code>
            <Button variant="outline" size="icon" onClick={copySecret}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="verifyCode">Overovací kód</Label>
          <Input
            id="verifyCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={verifyCode}
            onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
            className="text-center text-2xl tracking-widest"
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleVerify} disabled={loading || verifyCode.length !== 6}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Overiť a aktivovať
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Zrušiť
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
