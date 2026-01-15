import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { ConversationWithDetails } from '@/lib/supabase-types';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

export default function ChatPage() {
  const { user, loading } = useAuth();
  const [activeConversation, setActiveConversation] = useState<ConversationWithDetails | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-screen flex bg-chat-bg">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 hidden md:flex">
        <ChatSidebar
          activeConversation={activeConversation}
          onSelectConversation={setActiveConversation}
        />
      </div>

      {/* Main Chat Panel */}
      <ChatPanel conversation={activeConversation} />
    </div>
  );
}
