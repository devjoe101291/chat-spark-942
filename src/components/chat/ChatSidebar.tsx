import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useConversations } from '@/hooks/useConversations';
import { useUsers } from '@/hooks/useUsers';
import { ConversationItem } from './ConversationItem';
import { UserAvatar } from './UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  MessageSquarePlus, 
  Users, 
  Settings, 
  LogOut,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Profile, ConversationWithDetails } from '@/lib/supabase-types';

interface ChatSidebarProps {
  activeConversation: ConversationWithDetails | null;
  onSelectConversation: (conversation: ConversationWithDetails) => void;
}

export function ChatSidebar({ activeConversation, onSelectConversation }: ChatSidebarProps) {
  const { profile, signOut } = useAuth();
  const { conversations, createPrivateConversation, createGroupConversation } = useConversations();
  const { users, searchUsers } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isNewGroupOpen, setIsNewGroupOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Profile[]>([]);
  const [groupName, setGroupName] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    if (conv.name?.toLowerCase().includes(searchLower)) return true;
    
    return conv.members.some((m) =>
      m.profile?.display_name?.toLowerCase().includes(searchLower)
    );
  });

  const handleUserSearch = async (query: string) => {
    setUserSearchQuery(query);
    if (query.trim()) {
      const results = await searchUsers(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleStartPrivateChat = async (user: Profile) => {
    const conversation = await createPrivateConversation(user.user_id);
    if (conversation) {
      setIsNewChatOpen(false);
      // The conversation will be added via realtime subscription
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    
    const memberIds = selectedUsers.map((u) => u.user_id);
    const conversation = await createGroupConversation(groupName, memberIds);
    if (conversation) {
      setIsNewGroupOpen(false);
      setGroupName('');
      setSelectedUsers([]);
    }
  };

  const toggleUserSelection = (user: Profile) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u.user_id === user.user_id);
      if (isSelected) {
        return prev.filter((u) => u.user_id !== user.user_id);
      }
      return [...prev, user];
    });
  };

  return (
    <div className="flex flex-col h-full bg-chat-sidebar border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Chats</h1>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Plus className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setIsNewChatOpen(true)}>
                <MessageSquarePlus className="w-4 h-4 mr-2" />
                New Chat
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsNewGroupOpen(true)}>
                <Users className="w-4 h-4 mr-2" />
                New Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background/50"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence mode="popLayout">
          {filteredConversations.map((conversation) => (
            <motion.div
              key={conversation.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ConversationItem
                conversation={conversation}
                isActive={activeConversation?.id === conversation.id}
                onClick={() => onSelectConversation(conversation)}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredConversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquarePlus className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs">Start a new chat to begin</p>
          </div>
        )}
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent/50 transition-colors">
              <UserAvatar profile={profile} size="md" showStatus />
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-foreground truncate">
                  {profile?.display_name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile?.status || 'offline'}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Start a New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search users..."
              value={userSearchQuery}
              onChange={(e) => handleUserSearch(e.target.value)}
            />
            <div className="max-h-64 overflow-y-auto space-y-1">
              {(userSearchQuery ? searchResults : users).map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => handleStartPrivateChat(user)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <UserAvatar profile={user} size="sm" showStatus />
                  <span className="font-medium">{user.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Group Dialog */}
      <Dialog open={isNewGroupOpen} onOpenChange={setIsNewGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create a Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <span
                    key={user.user_id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-sm"
                  >
                    {user.display_name}
                    <button
                      onClick={() => toggleUserSelection(user)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-1">
              {users.map((user) => {
                const isSelected = selectedUsers.some((u) => u.user_id === user.user_id);
                return (
                  <button
                    key={user.user_id}
                    onClick={() => toggleUserSelection(user)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-accent'
                    }`}
                  >
                    <UserAvatar profile={user} size="sm" showStatus />
                    <span className="font-medium">{user.display_name}</span>
                    {isSelected && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsers.length === 0}
              className="w-full"
            >
              Create Group
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
