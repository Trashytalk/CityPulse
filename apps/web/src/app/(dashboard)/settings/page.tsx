'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Phone, Mail, CreditCard, Plus, Trash2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, type PayoutMethod } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [addPayoutOpen, setAddPayoutOpen] = useState(false);
  const [payoutType, setPayoutType] = useState<'mpesa' | 'bank'>('mpesa');
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const { data: payoutMethods, isLoading: payoutLoading } = useQuery({
    queryKey: ['payout-methods'],
    queryFn: () => api.wallet.getPayoutMethods(),
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) => api.users.updateProfile(data),
    onSuccess: (data) => {
      updateUser(data);
    },
  });

  const addPayoutMutation = useMutation({
    mutationFn: (data: { type: string; details: Record<string, string> }) =>
      api.wallet.addPayoutMethod(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payout-methods'] });
      setAddPayoutOpen(false);
      resetPayoutForm();
    },
  });

  const resetPayoutForm = () => {
    setPayoutType('mpesa');
    setMpesaPhone('');
    setBankName('');
    setAccountNumber('');
  };

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ name, email });
  };

  const handleAddPayout = () => {
    const details =
      payoutType === 'mpesa'
        ? { phone: mpesaPhone }
        : { bankName, accountNumber };

    addPayoutMutation.mutate({ type: payoutType, details });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="payout">Payout Methods</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and contact information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-600 text-2xl font-bold">
                  {user?.name?.charAt(0) || user?.phone?.slice(-2)}
                </div>
                <div>
                  <Button variant="outline" size="sm">
                    Change Photo
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input value={user?.phone || ''} disabled className="pl-10 bg-gray-50" />
                  </div>
                  <p className="text-xs text-gray-500">Phone number cannot be changed</p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  loading={updateProfileMutation.isPending}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Account Status</p>
                  <p className="text-sm text-gray-500">Your account verification status</p>
                </div>
                <Badge variant={user?.status === 'active' ? 'success' : 'warning'}>
                  {user?.status || 'pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payout Methods Tab */}
        <TabsContent value="payout" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payout Methods</CardTitle>
                <CardDescription>
                  Manage your withdrawal destinations
                </CardDescription>
              </div>
              <Dialog open={addPayoutOpen} onOpenChange={setAddPayoutOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Method
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Payout Method</DialogTitle>
                    <DialogDescription>
                      Add a new M-Pesa or bank account for withdrawals
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Type</label>
                      <Select
                        value={payoutType}
                        onValueChange={(v) => setPayoutType(v as 'mpesa' | 'bank')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mpesa">M-Pesa</SelectItem>
                          <SelectItem value="bank">Bank Account</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {payoutType === 'mpesa' ? (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">M-Pesa Number</label>
                        <Input
                          placeholder="+254 7XX XXX XXX"
                          value={mpesaPhone}
                          onChange={(e) => setMpesaPhone(e.target.value)}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Bank Name</label>
                          <Select value={bankName} onValueChange={setBankName}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bank" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equity">Equity Bank</SelectItem>
                              <SelectItem value="kcb">KCB Bank</SelectItem>
                              <SelectItem value="coop">Co-operative Bank</SelectItem>
                              <SelectItem value="absa">Absa Bank</SelectItem>
                              <SelectItem value="stanbic">Stanbic Bank</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Account Number</label>
                          <Input
                            placeholder="Enter account number"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddPayoutOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddPayout}
                      loading={addPayoutMutation.isPending}
                    >
                      Add Method
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {payoutLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
                </div>
              ) : payoutMethods?.length ? (
                <div className="space-y-3">
                  {payoutMethods.map((method: PayoutMethod) => (
                    <div
                      key={method.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg border p-4',
                        method.isDefault && 'border-primary-500 bg-primary-50'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-gray-100 p-2">
                          <CreditCard
                            className={cn(
                              'h-5 w-5',
                              method.type === 'mpesa' ? 'text-green-600' : 'text-blue-600'
                            )}
                          />
                        </div>
                        <div>
                          <p className="font-medium">
                            {method.type === 'mpesa' ? 'M-Pesa' : method.details.bankName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {method.type === 'mpesa'
                              ? method.details.phone
                              : `****${method.details.accountNumber?.slice(-4)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.isDefault && <Badge variant="default">Default</Badge>}
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-32 flex-col items-center justify-center text-gray-500">
                  <CreditCard className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm">No payout methods added yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { title: 'Session Updates', description: 'Get notified when a session ends' },
                { title: 'Earnings', description: 'Receive notifications for new earnings' },
                { title: 'Withdrawals', description: 'Get updates on withdrawal status' },
                { title: 'Achievements', description: 'Celebrate when you unlock achievements' },
                { title: 'Promotions', description: 'Receive special offers and bonuses' },
              ].map((item) => (
                <div key={item.title} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input type="checkbox" className="peer sr-only" defaultChecked />
                    <div className="h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:ring-2 peer-focus:ring-primary-300"></div>
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
