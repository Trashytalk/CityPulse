'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Gift,
  Users,
  CreditCard,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api, type Transaction, type PayoutMethod } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

export default function WalletPage() {
  const queryClient = useQueryClient();
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [page, setPage] = useState(1);

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => api.wallet.getBalance(),
  });

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', page],
    queryFn: () => api.wallet.getTransactions({ page, limit: 10 }),
  });

  const { data: payoutMethods } = useQuery({
    queryKey: ['payout-methods'],
    queryFn: () => api.wallet.getPayoutMethods(),
  });

  const withdrawMutation = useMutation({
    mutationFn: (data: { amount: number; method: string; destination: string }) =>
      api.wallet.requestWithdrawal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setWithdrawOpen(false);
      setWithdrawAmount('');
      setWithdrawMethod('');
    },
  });

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earning':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      case 'bonus':
        return <Gift className="h-4 w-4 text-purple-600" />;
      case 'referral':
        return <Users className="h-4 w-4 text-blue-600" />;
      default:
        return <CreditCard className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'failed':
        return <Badge variant="error">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const selectedMethod = payoutMethods?.find((m: PayoutMethod) => m.id === withdrawMethod);

  const handleWithdraw = () => {
    if (!withdrawAmount || !withdrawMethod || !selectedMethod) return;

    const destination =
      selectedMethod.type === 'mpesa'
        ? selectedMethod.details.phone
        : selectedMethod.details.accountNumber;

    withdrawMutation.mutate({
      amount: parseFloat(withdrawAmount),
      method: selectedMethod.type,
      destination,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="text-gray-500">Manage your earnings and withdrawals</p>
        </div>
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogTrigger asChild>
            <Button>
              <ArrowUpRight className="mr-2 h-4 w-4" />
              Withdraw
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Withdraw Funds</DialogTitle>
              <DialogDescription>
                Withdraw your earnings to M-Pesa or bank account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount (KES)</label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min={100}
                  max={wallet?.available}
                />
                <p className="text-xs text-gray-500">
                  Available: {formatCurrency(wallet?.available || 0)}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payout Method</label>
                <Select value={withdrawMethod} onValueChange={setWithdrawMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payout method" />
                  </SelectTrigger>
                  <SelectContent>
                    {payoutMethods?.map((method: PayoutMethod) => (
                      <SelectItem key={method.id} value={method.id}>
                        {method.type === 'mpesa'
                          ? `M-Pesa - ${method.details.phone}`
                          : `Bank - ${method.details.bankName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setWithdrawOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleWithdraw}
                loading={withdrawMutation.isPending}
                disabled={
                  !withdrawAmount ||
                  !withdrawMethod ||
                  parseFloat(withdrawAmount) > (wallet?.available || 0) ||
                  parseFloat(withdrawAmount) < 100
                }
              >
                Withdraw {withdrawAmount && formatCurrency(parseFloat(withdrawAmount))}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Available Balance</p>
                <p className="text-3xl font-bold">
                  {walletLoading ? '—' : formatCurrency(wallet?.available || 0)}
                </p>
              </div>
              <Wallet className="h-10 w-10 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {walletLoading ? '—' : formatCurrency(wallet?.pending || 0)}
                </p>
              </div>
              <div className="rounded-full bg-yellow-100 p-3">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Lifetime Earnings</p>
                <p className="text-2xl font-bold text-gray-900">
                  {walletLoading ? '—' : formatCurrency(wallet?.lifetime || 0)}
                </p>
              </div>
              <div className="rounded-full bg-green-100 p-3">
                <ArrowDownLeft className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payout Methods */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payout Methods</CardTitle>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Method
          </Button>
        </CardHeader>
        <CardContent>
          {payoutMethods?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
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
                      {method.type === 'mpesa' ? (
                        <CreditCard className="h-5 w-5 text-green-600" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-blue-600" />
                      )}
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
                  {method.isDefault && (
                    <Badge variant="default">Default</Badge>
                  )}
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

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : transactions?.data?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.data.map((tx: Transaction) => (
                    <TableRow key={tx.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="rounded-full bg-gray-100 p-1.5">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <span className="capitalize">{tx.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell>
                        {format(new Date(tx.createdAt), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-medium',
                            tx.type === 'withdrawal' ? 'text-red-600' : 'text-green-600'
                          )}
                        >
                          {tx.type === 'withdrawal' ? '-' : '+'}
                          {formatCurrency(tx.amount)}
                        </span>
                      </TableCell>
                      <TableCell>{getTransactionBadge(tx.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {transactions.meta && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * transactions.meta.limit + 1} to{' '}
                    {Math.min(page * transactions.meta.limit, transactions.meta.total)} of{' '}
                    {transactions.meta.total} transactions
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= transactions.meta.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex h-64 flex-col items-center justify-center text-gray-500">
              <Wallet className="mb-2 h-12 w-12 text-gray-300" />
              <p>No transactions yet</p>
              <p className="text-sm">Your transaction history will appear here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
