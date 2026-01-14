import { Leaf } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-500 shadow-lg">
          <Leaf className="h-7 w-7 text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900">CityPulse</span>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <p className="mt-8 text-sm text-gray-500">
        © 2026 CityPulse. All rights reserved.
      </p>
    </div>
  );
}
