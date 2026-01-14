'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Recycle,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

export default function AdminOverviewPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => api.admin.getStats(),
  });

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      change: stats?.growth?.users || 0,
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers || 0,
      subtext: `${stats?.totalUsers ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}% of total`,
      icon: Users,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
    },
    {
      title: 'Total Sessions',
      value: stats?.totalSessions || 0,
      change: stats?.growth?.sessions || 0,
      icon: Recycle,
      iconBg: 'bg-primary-100',
      iconColor: 'text-primary-600',
    },
    {
      title: 'Total Earnings',
      value: formatCurrency(stats?.totalEarnings || 0),
      change: stats?.growth?.earnings || 0,
      icon: Wallet,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
        <p className="text-gray-500">Monitor platform performance and key metrics</p>
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
                {stat.change !== undefined && (
                  <div
                    className={cn(
                      'flex items-center text-sm font-medium',
                      stat.change >= 0 ? 'text-green-600' : 'text-red-600'
                    )}
                  >
                    {stat.change >= 0 ? (
                      <TrendingUp className="h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="h-4 w-4 mr-1" />
                    )}
                    {Math.abs(stat.change)}%
                  </div>
                )}
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {isLoading ? '—' : typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                </p>
                {stat.subtext && (
                  <p className="text-xs text-gray-500 mt-1">{stat.subtext}</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Withdrawals Alert */}
      {stats?.pendingWithdrawals && stats.pendingWithdrawals > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-yellow-100 p-3">
                  <CreditCard className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Pending Withdrawals
                  </h3>
                  <p className="text-sm text-gray-600">
                    {stats.pendingWithdrawals} withdrawal{stats.pendingWithdrawals > 1 ? 's' : ''} pending approval totaling{' '}
                    {formatCurrency(stats.pendingWithdrawalsAmount)}
                  </p>
                </div>
              </div>
              <a
                href="/admin/withdrawals"
                className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Review
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Platform Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">API Uptime</span>
                <span className="font-medium text-green-600">99.9%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Avg Response Time</span>
                <span className="font-medium">45ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Active Sessions</span>
                <span className="font-medium">{isLoading ? '—' : Math.round((stats?.activeUsers || 0) * 0.1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Database Size</span>
                <span className="font-medium">2.4 GB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="/admin/users"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors"
              >
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium">Manage Users</span>
              </a>
              <a
                href="/admin/withdrawals"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors"
              >
                <CreditCard className="h-5 w-5 text-green-600" />
                <span className="font-medium">Process Withdrawals</span>
              </a>
              <a
                href="/admin/analytics"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors"
              >
                <TrendingUp className="h-5 w-5 text-purple-600" />
                <span className="font-medium">View Analytics</span>
              </a>
              <a
                href="/admin/settings"
                className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors"
              >
                <Recycle className="h-5 w-5 text-primary-600" />
                <span className="font-medium">Platform Settings</span>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
