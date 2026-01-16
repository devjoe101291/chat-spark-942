import { cn } from '@/lib/utils';
import { Profile, SearchableProfile } from '@/lib/supabase-types';
import { User } from 'lucide-react';

// Allow both full Profile and limited SearchableProfile
type AvatarProfile = Profile | SearchableProfile | null;

interface UserAvatarProps {
  profile: AvatarProfile;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
};

const statusSizeClasses = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4',
};

export function UserAvatar({ profile, size = 'md', showStatus = false, className }: UserAvatarProps) {
  const getStatusClass = (status: string | undefined) => {
    switch (status) {
      case 'online':
        return 'bg-status-online';
      case 'away':
        return 'bg-status-away';
      case 'busy':
        return 'bg-status-busy';
      default:
        return 'bg-status-offline';
    }
  };

  // Check if profile has status (full Profile vs SearchableProfile)
  const profileStatus = profile && 'status' in profile ? profile.status : undefined;

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'rounded-full bg-muted flex items-center justify-center overflow-hidden',
          sizeClasses[size]
        )}
      >
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className={cn(
            'text-muted-foreground',
            size === 'sm' && 'w-4 h-4',
            size === 'md' && 'w-5 h-5',
            size === 'lg' && 'w-6 h-6',
            size === 'xl' && 'w-8 h-8'
          )} />
        )}
      </div>
      
      {showStatus && (
        <div
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-background',
            statusSizeClasses[size],
            getStatusClass(profileStatus)
          )}
        />
      )}
    </div>
  );
}
