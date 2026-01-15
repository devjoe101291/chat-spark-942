import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Conversation, ConversationWithDetails, Profile, Message } from '@/lib/supabase-types';

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get all conversations the user is a member of
      const { data: memberData, error: memberError } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      if (!memberData || memberData.length === 0) {
        setConversations([]);
        return;
      }

      const conversationIds = memberData.map((m) => m.conversation_id);

      // Get conversation details
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds);

      if (convError) throw convError;

      // Get all members for these conversations
      const { data: allMembers, error: membersError } = await supabase
        .from('conversation_members')
        .select('*')
        .in('conversation_id', conversationIds);

      if (membersError) throw membersError;

      // Get profiles for all members
      const userIds = [...new Set(allMembers?.map((m) => m.user_id) || [])];
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Get last message for each conversation
      const { data: lastMessages, error: lastMsgError } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      if (lastMsgError) throw lastMsgError;

      // Build conversation details
      const conversationsWithDetails: ConversationWithDetails[] = (convData || []).map((conv) => {
        const members = (allMembers || [])
          .filter((m) => m.conversation_id === conv.id)
          .map((m) => ({
            ...m,
            profile: profiles?.find((p) => p.user_id === m.user_id) as Profile,
          }));

        const lastMessage = lastMessages?.find((m) => m.conversation_id === conv.id);
        const senderProfile = lastMessage
          ? profiles?.find((p) => p.user_id === lastMessage.sender_id)
          : undefined;

        return {
          ...conv,
          members,
          lastMessage: lastMessage
            ? { ...lastMessage, sender: senderProfile as Profile }
            : undefined,
          unreadCount: 0, // TODO: Calculate unread count
        } as ConversationWithDetails;
      });

      // Sort by last message time
      conversationsWithDetails.sort((a, b) => {
        const aTime = a.lastMessage?.created_at || a.created_at;
        const bTime = b.lastMessage?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(conversationsWithDetails);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createPrivateConversation = async (otherUserId: string) => {
    if (!user) return null;

    try {
      // Check if conversation already exists
      const { data: existingMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id);

      const { data: otherMembers } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', otherUserId);

      const myConvIds = existingMembers?.map((m) => m.conversation_id) || [];
      const otherConvIds = otherMembers?.map((m) => m.conversation_id) || [];
      const commonConvIds = myConvIds.filter((id) => otherConvIds.includes(id));

      if (commonConvIds.length > 0) {
        // Check if any of these are private conversations
        const { data: privateConv } = await supabase
          .from('conversations')
          .select('*')
          .in('id', commonConvIds)
          .eq('type', 'private')
          .single();

        if (privateConv) {
          return privateConv;
        }
      }

      // Create new conversation
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'private',
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add both users as members
      const { error: memberError } = await supabase
        .from('conversation_members')
        .insert([
          { conversation_id: newConv.id, user_id: user.id, role: 'admin' },
          { conversation_id: newConv.id, user_id: otherUserId, role: 'member' },
        ]);

      if (memberError) throw memberError;

      await fetchConversations();
      return newConv;
    } catch (err) {
      console.error('Error creating conversation:', err);
      return null;
    }
  };

  const createGroupConversation = async (name: string, memberIds: string[]) => {
    if (!user) return null;

    try {
      const { data: newConv, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'group',
          name,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add all members including the creator
      const members = [
        { conversation_id: newConv.id, user_id: user.id, role: 'admin' as const },
        ...memberIds.map((id) => ({
          conversation_id: newConv.id,
          user_id: id,
          role: 'member' as const,
        })),
      ];

      const { error: memberError } = await supabase
        .from('conversation_members')
        .insert(members);

      if (memberError) throw memberError;

      await fetchConversations();
      return newConv;
    } catch (err) {
      console.error('Error creating group conversation:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Subscribe to new messages to update conversation list
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('conversations-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_members',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
    createPrivateConversation,
    createGroupConversation,
  };
}
