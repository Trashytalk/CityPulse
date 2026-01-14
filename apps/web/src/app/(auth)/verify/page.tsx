'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const setAuth = useAuthStore((state) => state.setAuth);

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!phone) {
      router.replace('/login');
    }
  }, [phone, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const verifyOtpMutation = useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      api.auth.verifyOtp(phone, code),
    onSuccess: (data) => {
      setAuth(data.token, data.user);
      if (data.user.role === 'admin') {
        router.replace('/');
      } else {
        router.replace('/');
      }
    },
    onError: (err: { message: string }) => {
      setError(err.message || 'Invalid verification code');
    },
  });

  const resendOtpMutation = useMutation({
    mutationFn: (phoneNumber: string) => api.auth.requestOtp(phoneNumber),
    onSuccess: () => {
      setCountdown(60);
      setError('');
    },
    onError: (err: { message: string }) => {
      setError(err.message || 'Failed to resend OTP');
    },
  });

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('');
      const newOtp = [...otp];
      pastedCode.forEach((char, i) => {
        if (i < 6) newOtp[i] = char;
      });
      setOtp(newOtp);
      if (pastedCode.length === 6) {
        verifyOtpMutation.mutate({ phone, code: newOtp.join('') });
      }
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all digits are entered
    if (newOtp.every((digit) => digit) && value) {
      verifyOtpMutation.mutate({ phone, code: newOtp.join('') });
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleResend = () => {
    if (countdown === 0) {
      resendOtpMutation.mutate(phone);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
          <ShieldCheck className="h-6 w-6 text-primary-500" />
        </div>
        <CardTitle className="text-2xl">Verify Your Phone</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <strong>{phone}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <Input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="h-12 w-12 text-center text-lg font-semibold"
                autoFocus={index === 0}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm text-error">{error}</p>
          )}

          <Button
            onClick={() => verifyOtpMutation.mutate({ phone, code: otp.join('') })}
            className="w-full"
            loading={verifyOtpMutation.isPending}
            disabled={otp.some((digit) => !digit)}
          >
            Verify Code
          </Button>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Didn&apos;t receive the code?{' '}
              {countdown > 0 ? (
                <span className="text-gray-400">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-primary-500 hover:underline"
                  disabled={resendOtpMutation.isPending}
                >
                  Resend Code
                </button>
              )}
            </p>
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.back()}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Login
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    }>
      <VerifyForm />
    </Suspense>
  );
}
