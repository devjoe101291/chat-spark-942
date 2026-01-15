import { cn } from '@/lib/utils';
import { ConversationWithDetails } from '@/lib/supabase-types';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { Users } from 'lucide-react';

interface ConversationItemProps {
  conversation: ConversationWithDetails;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const { user } = useAuth();

  // Get the other user for private conversations
  const otherMember = conversation.type === 'private'
    ? conversation.members.find((m) => m.user_id !== user?.id)
    : null;

  const displayName = conversation.type === 'group'
    ? conversation.name || 'Unnamed Group'
    : otherMember?.profile?.display_name || 'Unknown User';

  const displayProfile = conversation.type === 'private' ? otherMember?.profile : null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const lastMessagePreview = conversation.lastMessage
    ? conversation.lastMessage.sender_id === user?.id
      ? `You: ${conversation.lastMessage.content}`
      : conversation.lastMessage.content
    : 'No messages yet';

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200',
        'hover:bg-accent/50',
        isActive && 'bg-accent/80'
      )}
    >
      {/* Avatar */}
      {conversation.type === 'group' ? (
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Users className="w-6 h-6 text-primary" />
        </div>
      ) : (
        <UserAvatar profile={displayProfile || null} size="lg" showStatus />
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-foreground truncate">{displayName}</h3>
          {conversation.lastMessage && (
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatTime(conversation.lastMessage.created_at)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className="text-sm text-muted-foreground truncate">{lastMessagePreview}</p>
          {conversation.unreadCount && conversation.unreadCount > 0 && (
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">
              {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
