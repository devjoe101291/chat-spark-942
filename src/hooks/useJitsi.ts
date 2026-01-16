import { useEffect, useRef, useCallback, useState } from 'react';

declare global {
  interface Window {
    JitsiMeetExternalAPI: any;
  }
}

interface JitsiConfig {
  roomName: string;
  displayName: string;
  avatarUrl?: string;
  startWithAudioMuted?: boolean;
  startWithVideoMuted?: boolean;
  startScreenSharing?: boolean;
}

interface UseJitsiReturn {
  isLoading: boolean;
  isInCall: boolean;
  error: string | null;
  startCall: (config: JitsiConfig) => void;
  endCall: () => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export function useJitsi(): UseJitsiReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Jitsi script
  const loadJitsiScript = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.JitsiMeetExternalAPI) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Jitsi script'));
      document.body.appendChild(script);
    });
  }, []);

  const startCall = useCallback(async (config: JitsiConfig) => {
    if (!containerRef.current) {
      setError('Container not ready');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await loadJitsiScript();

      // Clean room name (alphanumeric and hyphens only)
      const cleanRoomName = config.roomName.replace(/[^a-zA-Z0-9-]/g, '');
      
      const domain = 'meet.jit.si';
      const options = {
        roomName: cleanRoomName,
        width: '100%',
        height: '100%',
        parentNode: containerRef.current,
        userInfo: {
          displayName: config.displayName,
          avatarURL: config.avatarUrl,
        },
        configOverwrite: {
          startWithAudioMuted: config.startWithAudioMuted ?? false,
          startWithVideoMuted: config.startWithVideoMuted ?? false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableClosePage: false,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          HIDE_INVITE_MORE_HEADER: true,
          DEFAULT_REMOTE_DISPLAY_NAME: 'Guest',
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          TOOLBAR_BUTTONS: [
            'microphone',
            'camera',
            'desktop',
            'fullscreen',
            'hangup',
            'chat',
            'settings',
            'raisehand',
            'videoquality',
            'filmstrip',
            'participants-pane',
            'tileview',
          ],
        },
      };

      apiRef.current = new window.JitsiMeetExternalAPI(domain, options);

      // Event listeners
      apiRef.current.addEventListener('videoConferenceJoined', () => {
        setIsLoading(false);
        setIsInCall(true);

        // Start screen sharing if requested
        if (config.startScreenSharing) {
          setTimeout(() => {
            apiRef.current?.executeCommand('toggleShareScreen');
          }, 1000);
        }
      });

      apiRef.current.addEventListener('videoConferenceLeft', () => {
        setIsInCall(false);
        if (apiRef.current) {
          apiRef.current.dispose();
          apiRef.current = null;
        }
      });

      apiRef.current.addEventListener('readyToClose', () => {
        setIsInCall(false);
        if (apiRef.current) {
          apiRef.current.dispose();
          apiRef.current = null;
        }
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start call');
      setIsLoading(false);
    }
  }, [loadJitsiScript]);

  const endCall = useCallback(() => {
    if (apiRef.current) {
      apiRef.current.executeCommand('hangup');
      setTimeout(() => {
        if (apiRef.current) {
          apiRef.current.dispose();
          apiRef.current = null;
        }
        setIsInCall(false);
      }, 500);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (apiRef.current) {
        apiRef.current.dispose();
        apiRef.current = null;
      }
    };
  }, []);

  return {
    isLoading,
    isInCall,
    error,
    startCall,
    endCall,
    containerRef,
  };
}
