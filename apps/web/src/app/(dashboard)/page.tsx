'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Recycle,
  Wallet,
  Clock,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['collection-stats'],
    queryFn: () => api.collection.getStats(),
  });

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['wallet-balance'],
    queryFn: () => api.wallet.getBalance(),
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ['recent-sessions'],
    queryFn: () => api.collection.getSessions({ limit: 5 }),
  });

  const { data: gamification, isLoading: gamificationLoading } = useQuery({
    queryKey: ['gamification-progress'],
    queryFn: () => api.gamification.getProgress(),
  });

  const isLoading = statsLoading || walletLoading || sessionsLoading || gamificationLoading;

  const statCards = [
    {
      title: 'Total Earnings',
      value: formatCurrency(stats?.totalEarnings || 0),
      change: '+12%',
      changeType: 'positive' as const,
      icon: Wallet,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Items Collected',
      value: (stats?.totalItems || 0).toLocaleString(),
      change: '+8%',
      changeType: 'positive' as const,
      icon: Recycle,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      title: 'Total Sessions',
      value: stats?.totalSessions || 0,
      change: '+5%',
      changeType: 'positive' as const,
      icon: Clock,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Current Level',
      value: `Level ${gamification?.level || 1}`,
      change: `${gamification?.currentXp || 0} XP`,
      changeType: 'neutral' as const,
      icon: TrendingUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'active':
        return <Badge variant="default">Active</Badge>;
      case 'cancelled':
        return <Badge variant="error">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Welcome back! Here&apos;s your collection overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn('rounded-lg p-2', stat.iconBg)}>
                  <stat.icon className={cn('h-5 w-5', stat.iconColor)} />
                </div>
                {stat.changeType !== 'neutral' && (
                  <div
                    className={cn(
                      'flex items-center text-sm font-medium',
                      stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {stat.changeType === 'positive' ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {stat.change}
                  </div>
                )}
                {stat.changeType === 'neutral' && (
                  <span className="text-sm text-gray-500">{stat.change}</span>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '—' : stat.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Sessions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : sessions?.data?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.data.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        {format(new Date(session.startTime), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{session.itemsCollected}</TableCell>
                      <TableCell>
                        {Math.floor(session.duration / 60)}m
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(session.earnings)}
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-gray-500">
                <Clock className="mb-2 h-12 w-12 text-gray-300" />
                <p>No sessions yet</p>
                <p className="text-sm">Start collecting to see your history</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Wallet Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Wallet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {walletLoading ? (
              <div className="flex h-48 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
              </div>
            ) : (
              <>
                <div className="rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 p-4 text-white">
                  <p className="text-sm opacity-80">Available Balance</p>
                  <p className="text-3xl font-bold">
                    {formatCurrency(wallet?.available || 0)}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pending</span>
                    <span className="font-medium">
                      {formatCurrency(wallet?.pending || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lifetime Earnings</span>
                    <span className="font-medium">
                      {formatCurrency(wallet?.lifetime || 0)}
                    </span>
                  </div>
                </div>

                <div className="pt-4">
                  <a
                    href="/wallet"
                    className="block w-full rounded-lg border border-primary-500 py-2 text-center text-sm font-medium text-primary-500 transition-colors hover:bg-primary-50"
                  >
                    View Wallet
                  </a>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* This Week Summary */}
      <Card>
        <CardHeader>
          <CardTitle>This Week</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Sessions</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '—' : stats?.thisWeek?.sessions || 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Items Collected</p>
              <p className="text-2xl font-bold text-gray-900">
                {isLoading ? '—' : stats?.thisWeek?.items || 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Earnings</p>
              <p className="text-2xl font-bold text-green-600">
                {isLoading ? '—' : formatCurrency(stats?.thisWeek?.earnings || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
