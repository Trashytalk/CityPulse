'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Phone, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const requestOtpMutation = useMutation({
    mutationFn: (phoneNumber: string) => api.auth.requestOtp(phoneNumber),
    onSuccess: () => {
      router.push(`/verify?phone=${encodeURIComponent(phone)}`);
    },
    onError: (err: { message: string }) => {
      setError(err.message || 'Failed to send OTP');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate phone number format
    const phoneRegex = /^(?:\+254|0)[17]\d{8}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      setError('Please enter a valid Kenyan phone number');
      return;
    }

    requestOtpMutation.mutate(phone);
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>
          Enter your phone number to sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="+254 7XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-error">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full"
            loading={requestOtpMutation.isPending}
          >
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-primary-500 hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-primary-500 hover:underline">
              Privacy Policy
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
