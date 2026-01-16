import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJitsi } from '@/hooks/useJitsi';
import { Button } from '@/components/ui/button';
import { X, Loader2, PhoneOff } from 'lucide-react';

type CallMode = 'audio' | 'video' | 'screenshare';

interface VideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  displayName: string;
  avatarUrl?: string;
  mode: CallMode;
}

export function VideoCallModal({
  isOpen,
  onClose,
  roomName,
  displayName,
  avatarUrl,
  mode,
}: VideoCallModalProps) {
  const { isLoading, isInCall, error, startCall, endCall, containerRef } = useJitsi();

  useEffect(() => {
    if (isOpen && roomName && displayName) {
      startCall({
        roomName,
        displayName,
        avatarUrl,
        startWithAudioMuted: false,
        startWithVideoMuted: mode === 'audio',
        startScreenSharing: mode === 'screenshare',
      });
    }
  }, [isOpen, roomName, displayName, avatarUrl, mode, startCall]);

  const handleClose = () => {
    endCall();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90"
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
            <h2 className="text-white font-semibold">
              {mode === 'audio' ? 'Voice Call' : mode === 'video' ? 'Video Call' : 'Screen Share'}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/20 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-white text-lg">Connecting to call...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-destructive text-lg mb-4">{error}</p>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          )}

          {/* Jitsi Container */}
          <div
            ref={containerRef}
            className="w-full h-full"
            style={{ display: isLoading || error ? 'none' : 'block' }}
          />

          {/* End Call Button */}
          {isInCall && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
              <Button
                onClick={handleClose}
                size="lg"
                className="rounded-full bg-destructive hover:bg-destructive/90 px-8"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
