export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  status: 'online' | 'offline' | 'away' | 'busy';
  last_seen: string;
  created_at: string;
  updated_at: string;
}

// Limited profile data returned by secure search RPC
export interface SearchableProfile {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  type: 'private' | 'group';
  name: string | null;
  avatar_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationMember {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  read_by: string[];
  created_at: string;
  updated_at: string;
}

export interface TypingIndicator {
  id: string;
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  updated_at: string;
}

export interface ConversationWithDetails extends Conversation {
  members: (ConversationMember & { profile: Profile })[];
  lastMessage?: Message & { sender: Profile };
  unreadCount?: number;
}

export interface MessageWithSender extends Message {
  sender: Profile;
}
