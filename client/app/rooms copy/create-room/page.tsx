"use client";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function CreateRoomRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to new rooms page
    router.replace('/rooms');
  }, [router]);

  return null;
}