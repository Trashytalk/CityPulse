// apps/mobile/app/(auth)/verify.tsx
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';

import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth';

const CODE_LENGTH = 6;

export default function VerifyScreen() {
  const router = useRouter();
  const { phone, login } = useAuthStore();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const verifyOtp = useMutation({
    mutationFn: (otp: string) => api.auth.verifyOtp(phone!, otp),
    onSuccess: (data) => {
      login(data.user, data.accessToken, data.refreshToken);
      router.replace('/(tabs)');
    },
    onError: (err: any) => {
      setError(err.message || 'Invalid code');
      setCode('');
    },
  });

  const resendOtp = useMutation({
    mutationFn: () => api.auth.sendOtp(phone!),
    onSuccess: () => {
      setError('');
      setCode('');
    },
  });

  useEffect(() => {
    if (code.length === CODE_LENGTH) {
      verifyOtp.mutate(code);
    }
  }, [code]);

  const handleCodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(cleaned);
    setError('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <View className="flex-1 px-6">
        <Pressable
          onPress={() => router.back()}
          className="mt-16 w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
        >
          <ChevronLeft size={24} color="#333" />
        </Pressable>

        <View className="mt-12">
          <Text className="text-3xl font-bold text-gray-900">Verify your{'\n'}phone number</Text>
          <Text className="text-gray-500 mt-2">
            Enter the 6-digit code sent to {phone}
          </Text>
        </View>

        <Pressable onPress={() => inputRef.current?.focus()} className="mt-8">
          <View className="flex-row justify-between">
            {Array.from({ length: CODE_LENGTH }).map((_, index) => (
              <View
                key={index}
                className={`w-12 h-14 rounded-xl items-center justify-center border-2 ${
                  code.length === index
                    ? 'border-primary-500'
                    : code.length > index
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-gray-200'
                }`}
              >
                <Text className="text-2xl font-bold text-gray-900">
                  {code[index] || ''}
                </Text>
              </View>
            ))}
          </View>
          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={handleCodeChange}
            keyboardType="number-pad"
            maxLength={CODE_LENGTH}
            autoFocus
            className="absolute opacity-0"
          />
        </Pressable>

        {error ? (
          <Text className="text-red-500 mt-4 text-center">{error}</Text>
        ) : null}

        {verifyOtp.isPending && (
          <Text className="text-primary-600 mt-4 text-center">Verifying...</Text>
        )}

        <View className="mt-8 items-center">
          <Text className="text-gray-500">Didn't receive the code?</Text>
          <Pressable
            onPress={() => resendOtp.mutate()}
            disabled={resendOtp.isPending}
          >
            <Text className="text-primary-600 font-semibold mt-1">
              {resendOtp.isPending ? 'Sending...' : 'Resend Code'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
