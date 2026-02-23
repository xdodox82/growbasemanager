import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Leaf, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { TwoFactorVerify } from '@/components/auth/TwoFactorVerify';

const emailSchema = z.string().email('Neplatný formát emailu');
const passwordSchema = z.string()
  .min(8, 'Heslo musí mať aspoň 8 znakov')
  .regex(/[a-z]/, 'Heslo musí obsahovať aspoň jedno malé písmeno')
  .regex(/[A-Z]/, 'Heslo musí obsahovať aspoň jedno veľké písmeno')
  .regex(/[0-9]/, 'Heslo musí obsahovať aspoň jednu číslicu');

type AuthMode = 'login' | 'forgot-password' | '2fa-verify';

const AuthPage = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const { signIn, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = (skipPassword = false) => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    if (!skipPassword) {
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm(true)) return;
    
    setLoading(true);
    try {
      const { error } = await resetPassword(email);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Chyba',
          description: error.message,
        });
      } else {
        toast({
          title: 'Email odoslaný!',
          description: 'Skontrolujte svoju emailovú schránku pre odkaz na obnovenie hesla.',
        });
        setMode('login');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: 'Niečo sa pokazilo. Skúste to znova.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            variant: 'destructive',
            title: 'Prihlásenie zlyhalo',
            description: 'Nesprávny email alebo heslo.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Prihlásenie zlyhalo',
            description: error.message,
          });
        }
      } else {
        // Check if MFA is required
        const { data: factorsData } = await supabase.auth.mfa.listFactors();
        const hasVerifiedTOTP = factorsData?.totp?.some(factor => factor.status === 'verified');

        if (hasVerifiedTOTP) {
          // Get AAL level
          const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
          if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
            // Need to verify 2FA
            setMode('2fa-verify');
            setLoading(false);
            return;
          }
        }

        toast({
          title: 'Úspešne prihlásený!',
          description: 'Vitajte späť.',
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Chyba',
        description: 'Niečo sa pokazilo. Skúste to znova.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Prihlásenie';
      case 'forgot-password': return 'Obnovenie hesla';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Prihláste sa do správcu mikrozeleniny';
      case 'forgot-password': return 'Zadajte email pre obnovenie hesla';
    }
  };

  const handle2FASuccess = () => {
    toast({
      title: 'Úspešne prihlásený!',
      description: 'Vitajte späť.',
    });
    navigate('/');
  };

  const handle2FACancel = async () => {
    await supabase.auth.signOut();
    setMode('login');
  };

  if (mode === '2fa-verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 md:p-8">
        <TwoFactorVerify onSuccess={handle2FASuccess} onCancel={handle2FACancel} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <Card className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md">
        <CardHeader className="text-center space-y-2 sm:space-y-4">
          <div className="mx-auto mb-2 sm:mb-4 flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10">
            <Leaf className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            {getTitle()}
          </CardTitle>
          <CardDescription className="text-sm sm:text-base">
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          {mode === 'forgot-password' ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vas@email.sk"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`h-10 sm:h-11 text-sm sm:text-base ${errors.email ? 'border-destructive' : ''}`}
                />
                {errors.email && (
                  <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Odoslať odkaz na obnovenie
              </Button>

              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Späť na prihlásenie
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm sm:text-base">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vas@email.sk"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={`h-10 sm:h-11 text-sm sm:text-base ${errors.email ? 'border-destructive' : ''}`}
                  />
                  {errors.email && (
                    <p className="text-xs sm:text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm sm:text-base">Heslo</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      }}
                      className={`h-10 sm:h-11 text-sm sm:text-base pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs sm:text-sm text-destructive">{errors.password}</p>
                  )}
                </div>

                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMode('forgot-password')}
                      className="text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors"
                    >
                      Zabudli ste heslo?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full h-10 sm:h-11 text-sm sm:text-base" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Prihlásiť sa
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;