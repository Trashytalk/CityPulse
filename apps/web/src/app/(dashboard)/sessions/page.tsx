'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Clock, MapPin, Recycle, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { api, type CollectionSession } from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

export default function SessionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions', page, statusFilter],
    queryFn: () =>
      api.collection.getSessions({
        page,
        limit: 10,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }),
  });

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

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Collection Sessions</h1>
        <p className="text-gray-500">View and manage your collection history</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input placeholder="Search sessions..." className="pl-9" />
            </div>
            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sessions History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : sessions?.data?.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Earnings</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.data.map((session: CollectionSession) => (
                    <TableRow key={session.id} className="cursor-pointer hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {format(new Date(session.startTime), 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(new Date(session.startTime), 'h:mm a')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {session.location?.address ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm truncate max-w-[150px]">
                              {session.location.address}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Recycle className="h-4 w-4 text-primary-500" />
                          <span>{session.itemsCollected}</span>
                        </div>
                      </TableCell>
                      <TableCell>{session.weight.toFixed(1)} kg</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span>{formatDuration(session.duration)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {formatCurrency(session.earnings)}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(session.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {sessions.meta && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * sessions.meta.limit + 1} to{' '}
                    {Math.min(page * sessions.meta.limit, sessions.meta.total)} of{' '}
                    {sessions.meta.total} sessions
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
                      disabled={page >= sessions.meta.totalPages}
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
              <Clock className="mb-2 h-12 w-12 text-gray-300" />
              <p>No sessions found</p>
              <p className="text-sm">Start collecting to see your sessions here</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
