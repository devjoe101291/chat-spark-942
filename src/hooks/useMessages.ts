import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Message, MessageWithSender, Profile } from '@/lib/supabase-types';

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [typingUsers, setTypingUsers] = useState<Profile[]>([]);

  const fetchMessages = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      setLoading(true);

      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Get all unique sender IDs
      const senderIds = [...new Set(messagesData?.map((m) => m.sender_id) || [])];

      // Fetch profiles for senders
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', senderIds);

      if (profilesError) throw profilesError;

      // Combine messages with sender profiles
      const messagesWithSenders: MessageWithSender[] = (messagesData || []).map((msg) => ({
        ...msg,
        message_type: msg.message_type as 'text' | 'image' | 'file' | 'system',
        sender: profiles?.find((p) => p.user_id === msg.sender_id) as Profile,
      }));

      setMessages(messagesWithSenders);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [conversationId, user]);

  const sendMessage = async (content: string, messageType: 'text' | 'image' | 'file' = 'text') => {
    if (!conversationId || !user || !content.trim()) return null;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: messageType,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (err) {
      console.error('Error sending message:', err);
      return null;
    }
  };

  const updateTypingStatus = async (isTyping: boolean) => {
    if (!conversationId || !user) return;

    try {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.error('Error updating typing status:', err);
    }
  };

  const markAsRead = async () => {
    if (!conversationId || !user) return;

    try {
      // Get unread messages
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id, read_by')
        .eq('conversation_id', conversationId)
        .not('sender_id', 'eq', user.id);

      if (!unreadMessages) return;

      // Update each message's read_by array
      for (const msg of unreadMessages) {
        const readBy = msg.read_by || [];
        if (!readBy.includes(user.id)) {
          await supabase
            .from('messages')
            .update({ read_by: [...readBy, user.id] })
            .eq('id', msg.id);
        }
      }
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Fetch sender profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', newMessage.sender_id)
            .single();

          const messageWithSender: MessageWithSender = {
            ...newMessage,
            sender: profile as Profile,
          };

          setMessages((prev) => [...prev, messageWithSender]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!conversationId || !user) return;

    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          // Fetch all typing users
          const { data: indicators } = await supabase
            .from('typing_indicators')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .eq('is_typing', true)
            .neq('user_id', user.id);

          if (!indicators || indicators.length === 0) {
            setTypingUsers([]);
            return;
          }

          // Fetch profiles for typing users
          const { data: profiles } = await supabase
            .from('profiles')
            .select('*')
            .in(
              'user_id',
              indicators.map((i) => i.user_id)
            );

          setTypingUsers((profiles as Profile[]) || []);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  return {
    messages,
    loading,
    error,
    typingUsers,
    sendMessage,
    updateTypingStatus,
    markAsRead,
    refetch: fetchMessages,
  };
}
