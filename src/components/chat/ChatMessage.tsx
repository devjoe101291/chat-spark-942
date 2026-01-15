import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MessageWithSender } from '@/lib/supabase-types';
import { useAuth } from '@/contexts/AuthContext';
import { UserAvatar } from './UserAvatar';
import { Check, CheckCheck } from 'lucide-react';

interface ChatMessageProps {
  message: MessageWithSender;
  showAvatar?: boolean;
  isGrouped?: boolean;
}

export function ChatMessage({ message, showAvatar = true, isGrouped = false }: ChatMessageProps) {
  const { user } = useAuth();
  const isSent = message.sender_id === user?.id;
  const isRead = message.read_by && message.read_by.length > 0;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex gap-3',
        isSent ? 'flex-row-reverse' : 'flex-row',
        isGrouped && 'mt-1',
        !isGrouped && 'mt-4'
      )}
    >
      {/* Avatar */}
      <div className={cn('flex-shrink-0', isGrouped && 'invisible', !showAvatar && 'invisible')}>
        <UserAvatar profile={message.sender} size="sm" />
      </div>

      {/* Message content */}
      <div className={cn('max-w-[70%] flex flex-col gap-1', isSent ? 'items-end' : 'items-start')}>
        {/* Sender name (for group chats) */}
        {!isSent && !isGrouped && showAvatar && (
          <span className="text-xs text-muted-foreground ml-1">
            {message.sender?.display_name}
          </span>
        )}

        {/* Message bubble */}
        <div className={cn(isSent ? 'chat-bubble-sent' : 'chat-bubble-received')}>
          <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* Time and read status */}
        <div className={cn('flex items-center gap-1 px-1', isSent ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-muted-foreground">
            {formatTime(message.created_at)}
          </span>
          {isSent && (
            <span className="text-muted-foreground">
              {isRead ? (
                <CheckCheck className="w-3 h-3 text-primary" />
              ) : (
                <Check className="w-3 h-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
