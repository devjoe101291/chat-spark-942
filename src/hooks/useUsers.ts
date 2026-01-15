import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Profile } from '@/lib/supabase-types';

export function useUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .order('display_name', { ascending: true });

      if (fetchError) throw fetchError;

      setUsers(data as Profile[]);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const searchUsers = async (query: string) => {
    if (!user || !query.trim()) return [];

    try {
      const { data, error: searchError } = await supabase
        .from('profiles')
        .select('*')
        .neq('user_id', user.id)
        .ilike('display_name', `%${query}%`)
        .limit(10);

      if (searchError) throw searchError;

      return data as Profile[];
    } catch (err) {
      console.error('Error searching users:', err);
      return [];
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Subscribe to profile updates for online status
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('profiles-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          const updatedProfile = payload.new as Profile;
          setUsers((prev) =>
            prev.map((p) => (p.user_id === updatedProfile.user_id ? updatedProfile : p))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    users,
    loading,
    error,
    searchUsers,
    refetch: fetchUsers,
  };
}
