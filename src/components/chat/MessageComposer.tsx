import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Smile, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MessageComposerProps {
  onSendMessage: (content: string) => void;
  onTyping?: (isTyping: boolean) => void;
  disabled?: boolean;
}

export function MessageComposer({ onSendMessage, onTyping, disabled }: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [message]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // Handle typing indicator
    if (onTyping) {
      onTyping(true);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        onTyping(false);
      }, 2000);
    }
  };

  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSendMessage(message);
    setMessage('');

    if (onTyping) {
      onTyping(false);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-chat-input">
      <motion.div
        className={cn(
          'flex items-end gap-2 rounded-2xl border bg-background p-2 transition-all duration-200',
          isFocused ? 'border-primary shadow-glow' : 'border-border'
        )}
      >
        {/* Attachment button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex-shrink-0 w-9 h-9 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Paperclip className="w-5 h-5" />
        </Button>

        {/* Text input */}
        <div className="flex-1 min-h-[36px] flex items-center">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type a message..."
            disabled={disabled}
            className="w-full bg-transparent border-0 resize-none focus:outline-none text-foreground placeholder:text-muted-foreground text-sm py-2 max-h-[150px] no-scrollbar"
            rows={1}
          />
        </div>

        {/* Emoji button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="flex-shrink-0 w-9 h-9 rounded-full text-muted-foreground hover:text-foreground"
        >
          <Smile className="w-5 h-5" />
        </Button>

        {/* Send/Voice button */}
        {message.trim() ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={disabled}
              className="flex-shrink-0 w-9 h-9 rounded-full"
            >
              <Send className="w-4 h-4" />
            </Button>
          </motion.div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 w-9 h-9 rounded-full text-muted-foreground hover:text-foreground"
          >
            <Mic className="w-5 h-5" />
          </Button>
        )}
      </motion.div>
    </div>
  );
}
