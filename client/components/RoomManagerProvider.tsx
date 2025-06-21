"use client";
import { useEffect } from 'react';
import { RoomManager } from '@/lib/room-manager';

export function RoomManagerProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Start the room cleanup schedule when the app loads
    RoomManager.startCleanupSchedule();
  }, []);

  return <>{children}</>;
}
