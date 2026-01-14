// apps/mobile/app/(auth)/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Phone } from 'lucide-react-native';
import { api } from '../../src/services/api';
import { useAuthStore } from '../../src/stores/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { setPhone } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState('');

  const sendOtp = useMutation({
    mutationFn: (phone: string) => api.auth.sendOtp(phone),
    onSuccess: () => {
      setPhone(`+63${phoneNumber}`);
      router.push('/(auth)/verify');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to send OTP');
    },
  });

  const handleContinue = () => {
    setError('');
    const formatted = phoneNumber.replace(/\D/g, '');
    
    if (formatted.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }
    
    sendOtp.mutate(`+63${formatted}`);
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
          <Text className="text-3xl font-bold text-gray-900">Enter your{'\n'}phone number</Text>
          <Text className="text-gray-500 mt-2">We'll send you a verification code</Text>
        </View>

        <View className="mt-8">
          <View className="flex-row items-center border-2 border-gray-200 rounded-xl px-4 py-3">
            <View className="flex-row items-center mr-3 pr-3 border-r border-gray-200">
              <Text className="text-lg">🇵🇭</Text>
              <Text className="text-gray-900 font-semibold ml-2">+63</Text>
            </View>
            <TextInput
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="917 123 4567"
              keyboardType="phone-pad"
              maxLength={12}
              className="flex-1 text-lg text-gray-900"
              autoFocus
            />
          </View>
          {error ? (
            <Text className="text-red-500 mt-2">{error}</Text>
          ) : null}
        </View>

        <View className="flex-1" />

        <Pressable
          onPress={handleContinue}
          disabled={sendOtp.isPending || phoneNumber.length < 10}
          className={`py-4 rounded-xl items-center mb-8 ${
            phoneNumber.length >= 10 ? 'bg-primary-700' : 'bg-gray-200'
          }`}
        >
          <Text className={`font-bold text-lg ${
            phoneNumber.length >= 10 ? 'text-white' : 'text-gray-400'
          }`}>
            {sendOtp.isPending ? 'Sending...' : 'Continue'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
