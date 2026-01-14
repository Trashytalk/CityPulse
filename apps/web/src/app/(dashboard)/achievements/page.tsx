'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Trophy, Star, Lock, CheckCircle, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api, type Achievement } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function AchievementsPage() {
  const { data: progress, isLoading: progressLoading } = useQuery({
    queryKey: ['gamification-progress'],
    queryFn: () => api.gamification.getProgress(),
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => api.gamification.getAchievements(),
  });

  const isLoading = progressLoading || achievementsLoading;

  const categories = [
    { id: 'collection', name: 'Collection', icon: '♻️' },
    { id: 'streak', name: 'Streaks', icon: '🔥' },
    { id: 'social', name: 'Social', icon: '👥' },
    { id: 'milestone', name: 'Milestones', icon: '🏆' },
  ];

  const groupedAchievements = achievements?.reduce((acc: Record<string, Achievement[]>, achievement: Achievement) => {
    const category = achievement.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Achievements</h1>
        <p className="text-gray-500">Track your progress and unlock rewards</p>
      </div>

      {/* Level Progress */}
      <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-2xl font-bold">
                {progressLoading ? '—' : progress?.level || 1}
              </div>
              <div>
                <p className="text-sm opacity-80">Current Level</p>
                <p className="text-2xl font-bold">Level {progress?.level || 1}</p>
                <p className="text-sm opacity-80">Rank #{progress?.rank || '—'}</p>
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-2">
                <span>{progress?.currentXp || 0} XP</span>
                <span>{progress?.xpToNextLevel || 1000} XP</span>
              </div>
              <div className="h-3 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{
                    width: `${((progress?.currentXp || 0) / (progress?.xpToNextLevel || 1)) * 100}%`,
                  }}
                />
              </div>
              <p className="text-sm opacity-80 mt-2">
                {(progress?.xpToNextLevel || 0) - (progress?.currentXp || 0)} XP to next level
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-white/20 p-3">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{progress?.streakDays || 0}</p>
                <p className="text-sm opacity-80">Day Streak</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-100 p-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total XP</p>
                <p className="text-xl font-bold">{progress?.totalXp || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Unlocked</p>
                <p className="text-xl font-bold">
                  {achievements?.filter((a: Achievement) => a.unlockedAt).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-gray-100 p-2">
                <Lock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Locked</p>
                <p className="text-xl font-bold">
                  {achievements?.filter((a: Achievement) => !a.unlockedAt).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <Star className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completion</p>
                <p className="text-xl font-bold">
                  {achievements?.length
                    ? Math.round(
                        (achievements.filter((a: Achievement) => a.unlockedAt).length /
                          achievements.length) *
                          100
                      )
                    : 0}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Achievement Categories */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
        </div>
      ) : (
        categories.map((category) => {
          const categoryAchievements = groupedAchievements?.[category.id] || [];
          if (categoryAchievements.length === 0) return null;

          return (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{category.icon}</span>
                  {category.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryAchievements.map((achievement: Achievement) => {
                    const isUnlocked = !!achievement.unlockedAt;
                    const progressPercent = Math.min(
                      (achievement.progress / achievement.requirement) * 100,
                      100
                    );

                    return (
                      <div
                        key={achievement.id}
                        className={cn(
                          'relative rounded-lg border p-4 transition-all',
                          isUnlocked
                            ? 'border-primary-200 bg-primary-50'
                            : 'border-gray-200 bg-white'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'flex h-12 w-12 items-center justify-center rounded-lg text-2xl',
                              isUnlocked ? 'bg-primary-100' : 'bg-gray-100'
                            )}
                          >
                            {achievement.icon || '🏅'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-gray-900">
                                {achievement.name}
                              </h3>
                              {isUnlocked && (
                                <CheckCircle className="h-4 w-4 text-primary-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {achievement.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-500">
                              {achievement.progress} / {achievement.requirement}
                            </span>
                            <span className="font-medium">
                              +{achievement.reward.amount}{' '}
                              {achievement.reward.type === 'xp' ? 'XP' : ''}
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all',
                                isUnlocked ? 'bg-primary-500' : 'bg-gray-400'
                              )}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>

                        {isUnlocked && (
                          <div className="mt-2 text-xs text-gray-500">
                            Unlocked {format(new Date(achievement.unlockedAt!), 'MMM d, yyyy')}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
