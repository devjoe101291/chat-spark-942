import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useMessages } from '@/hooks/useMessages';
import { ConversationWithDetails } from '@/lib/supabase-types';
import { ChatMessage } from './ChatMessage';
import { MessageComposer } from './MessageComposer';
import { TypingIndicator } from './TypingIndicator';
import { UserAvatar } from './UserAvatar';
import { VideoCallModal } from './VideoCallModal';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  Video, 
  MoreVertical, 
  Users, 
  MessageCircle,
  Monitor
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type CallMode = 'audio' | 'video' | 'screenshare' | null;

interface ChatPanelProps {
  conversation: ConversationWithDetails | null;
}

export function ChatPanel({ conversation }: ChatPanelProps) {
  const { user, profile } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, typingUsers, sendMessage, updateTypingStatus, markAsRead } = useMessages(
    conversation?.id || null
  );
  const [callMode, setCallMode] = useState<CallMode>(null);

  // Generate a unique room name based on conversation ID
  const roomName = conversation ? `flowchat-${conversation.id}` : '';

  // Get display info for the conversation
  const otherMember = conversation?.type === 'private'
    ? conversation.members.find((m) => m.user_id !== user?.id)
    : null;

  const displayName = conversation?.type === 'group'
    ? conversation.name || 'Group Chat'
    : otherMember?.profile?.display_name || 'Unknown User';

  const displayProfile = conversation?.type === 'private' ? otherMember?.profile : null;

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversation) {
      markAsRead();
    }
  }, [conversation, markAsRead]);

  // Group consecutive messages from same sender
  const groupedMessages = messages.map((msg, index) => {
    const prevMsg = messages[index - 1];
    const isGrouped =
      prevMsg &&
      prevMsg.sender_id === msg.sender_id &&
      new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 60000;
    return { ...msg, isGrouped };
  });

  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-chat-panel text-muted-foreground">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <MessageCircle className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">Welcome to FlowChat</h2>
          <p className="text-muted-foreground">Select a conversation or start a new one</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-chat-panel">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-chat-sidebar">
        <div className="flex items-center gap-3">
          {conversation.type === 'group' ? (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          ) : (
            <UserAvatar profile={displayProfile || null} size="md" showStatus />
          )}
          <div>
            <h2 className="font-semibold text-foreground">{displayName}</h2>
            <p className="text-xs text-muted-foreground">
              {conversation.type === 'group'
                ? `${conversation.members.length} members`
                : displayProfile?.status === 'online'
                ? 'Online'
                : 'Offline'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setCallMode('audio')}
            title="Voice Call"
          >
            <Phone className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setCallMode('video')}
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full"
            onClick={() => setCallMode('screenshare')}
            title="Screen Share"
          >
            <Monitor className="w-5 h-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>View Profile</DropdownMenuItem>
              <DropdownMenuItem>Search Messages</DropdownMenuItem>
              <DropdownMenuItem>Mute Notifications</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Delete Chat</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="popLayout">
          {groupedMessages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              isGrouped={message.isGrouped}
              showAvatar={conversation.type === 'group' || !message.isGrouped}
            />
          ))}
        </AnimatePresence>
        
        <TypingIndicator names={typingUsers.map((u) => u.display_name)} />
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <MessageComposer
        onSendMessage={sendMessage}
        onTyping={updateTypingStatus}
      />

      {/* Video Call Modal */}
      <VideoCallModal
        isOpen={callMode !== null}
        onClose={() => setCallMode(null)}
        roomName={roomName}
        displayName={profile?.display_name || 'User'}
        avatarUrl={profile?.avatar_url || undefined}
        mode={callMode || 'video'}
      />
    </div>
  );
}
