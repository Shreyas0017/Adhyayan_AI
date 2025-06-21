"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { apiService } from '@/lib/api';
import { FloatingDock } from "@/components/ui/floating-dock";
import { WavyBackground } from "@/components/ui/wavy-background";
import { GyanPointsDisplay } from "@/components/custom/GyanPointsDisplay";
import { Card, CardBody, Button, Input, Skeleton, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/react";
import BlackHoleLoader from "@/components/ui/black-hole-loader";
import { 
  IconMap, 
  IconCalendar, 
  IconEye, 
  IconChevronRight, 
  IconBrain, 
  IconSearch,
  IconHome,
  IconUsers,
  IconSettings,
  IconLogout,
  IconPlus,
  IconArrowLeft,
  IconFilter,
  IconSortAscending,
  IconSortDescending,
  IconTrash
} from "@tabler/icons-react";
import toast from 'react-hot-toast';

interface MindMap {
  id: string;
  title: string;
  subject: string;
  created_at: string;
  updated_at: string;
  nodes_count?: number;
}

export default function AllMindMaps() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [filteredMindMaps, setFilteredMindMaps] = useState<MindMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [mindMapToDelete, setMindMapToDelete] = useState<MindMap | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    fetchMindMaps();
  }, []);

  useEffect(() => {
    filterAndSortMindMaps();
  }, [mindMaps, searchQuery, sortOrder]);

  const fetchMindMaps = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // First try to get from API
      const response = await apiService.getMindMaps();
      
      if (response.success && response.mindMaps) {
        setMindMaps(response.mindMaps);
      } else {
        // Fallback to localStorage if API fails
        const localMindMaps = getLocalMindMaps();
        setMindMaps(localMindMaps);
      }
    } catch (error) {
      console.error('Error fetching mind maps:', error);
      
      // Fallback to localStorage
      const localMindMaps = getLocalMindMaps();
      setMindMaps(localMindMaps);
      
      if (localMindMaps.length === 0) {
        setError('Failed to load mind maps');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getLocalMindMaps = (): MindMap[] => {
    if (typeof window === 'undefined') return [];
    
    const localMindMaps: MindMap[] = [];
    
    // Get all localStorage keys that start with 'mindmap_'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mindmap_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const mindMapData = JSON.parse(data);
            localMindMaps.push({
              id: mindMapData.id || key.replace('mindmap_', ''),
              title: mindMapData.title || mindMapData.subject || 'Untitled Mind Map',
              subject: mindMapData.subject || mindMapData.title || 'Unknown Subject',
              created_at: mindMapData.created_at || new Date().toISOString(),
              updated_at: mindMapData.updated_at || mindMapData.created_at || new Date().toISOString(),
              nodes_count: mindMapData.nodes ? mindMapData.nodes.length : 0
            });
          }
        } catch (error) {
          console.error('Error parsing localStorage mind map:', error);
        }
      }
    }
    
    return localMindMaps;
  };

  const filterAndSortMindMaps = (maps = mindMaps) => {
    let filtered = maps.filter(mindMap => 
      mindMap.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      mindMap.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    switch (sortOrder) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    
    setFilteredMindMaps(filtered);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        return 'Today';
      } else if (diffDays === 2) {
        return 'Yesterday';
      } else if (diffDays <= 7) {
        return `${diffDays - 1} days ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
        });
      }
    } catch (error) {
      return 'Recently';
    }
  };

  const handleViewMindMap = (mindMapId: string) => {
    router.push(`/mind-map/view/${mindMapId}`);
  };

  const openDeleteConfirmation = (e: React.MouseEvent, mindMap: MindMap) => {
    e.stopPropagation(); // Prevent triggering the card click
    e.preventDefault(); // Prevent default behavior
    setMindMapToDelete(mindMap);
    onOpen();
  };
  const handleDeleteMindMap = async () => {
    if (!mindMapToDelete) return;
    
    try {
      setIsDeleting(true);
      const result = await apiService.deleteMindMap(mindMapToDelete.id);
      
      if (result.success) {
        // Remove from local state
        setMindMaps(prev => {
          const updated = prev.filter(map => map.id !== mindMapToDelete.id);
          filterAndSortMindMaps(updated);
          return updated;
        });
        
        // Close modal
        onClose();
        
        // Show success toast
        toast.success(result.message || 'Mind map deleted successfully', {
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid #10b981',
            fontWeight: '500',
            borderRadius: '8px',
          },
        });
      } else {
        throw new Error(result.error || "Failed to delete mind map");
      }
    } catch (error) {
      console.error('Error deleting mind map:', error);
      
      // Even if there's an error, the mind map might have been removed from localStorage
      // Let's check if it still exists
      if (typeof window !== 'undefined' && !localStorage.getItem(`mindmap_${mindMapToDelete.id}`)) {
        // It was removed from localStorage, so update the UI
        setMindMaps(prev => {
          const updated = prev.filter(map => map.id !== mindMapToDelete.id);
          filterAndSortMindMaps(updated);
          return updated;
        });
        
        // Close modal
        onClose();
        
        toast.success('Mind map removed from local storage', {
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid #10b981',
            fontWeight: '500',
            borderRadius: '8px',
          },
        });
      } else {
        toast.error('Failed to delete mind map', {
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid #ef4444',
            fontWeight: '500',
            borderRadius: '8px',
          },
        });
      }
    } finally {
      setIsDeleting(false);
      setMindMapToDelete(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const dockLinks = [
    {
      title: "Home",
      icon: (
        <IconHome className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/",
    },
    {
      title: "Dashboard",
      icon: (
        <IconBrain className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/dashboard",
    },
    {
      title: "Create Room",
      icon: (
        <IconUsers className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/create-room",
    },
    {
      title: "Mind Map",
      icon: (
        <IconMap className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/mind-map",
    },
    {
      title: "Settings",
      icon: (
        <IconSettings className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "/settings",
    },
    {
      title: "Sign Out",
      icon: (
        <IconLogout className="h-full w-full text-neutral-500 dark:text-neutral-300" />
      ),
      href: "#",
      onClick: handleSignOut,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BlackHoleLoader />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen relative">
      <WavyBackground className="min-h-screen flex flex-col p-8 relative">
        {/* Gyan Points Display - Top Right Corner */}
        <div className="fixed top-4 right-4 z-50 md:top-6 md:right-8 lg:right-12">
          <GyanPointsDisplay />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8 z-10">
          <div className="flex items-center gap-4">
            <Button
              variant="light"
              onPress={() => router.back()}
              startContent={<IconArrowLeft className="w-4 h-4" />}
              className="text-gray-400 hover:text-gray-200"
            >
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-600 bg-clip-text text-transparent">
                All Mind Maps
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                {filteredMindMaps.length} mind map{filteredMindMaps.length !== 1 ? 's' : ''} found
              </p>
            </div>
          </div>
          
          <Button
            onPress={() => router.push('/mind-map')}
            className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium transform hover:scale-105 transition-all duration-300"
            startContent={<IconPlus className="w-4 h-4" />}
          >
            Create New
          </Button>
        </div>

        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 z-10">
          <div className="flex-1">
            <Input
              placeholder="Search mind maps by title or subject..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              startContent={<IconSearch className="w-4 h-4 text-gray-400" />}
              variant="bordered"
              classNames={{
                input: "text-white bg-transparent placeholder:text-gray-500",
                inputWrapper: "border-gray-600/50 hover:border-gray-500 data-[focus=true]:border-orange-400 bg-gray-800/30 backdrop-blur-sm"
              }}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="bordered"
              onPress={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
              startContent={sortOrder === 'newest' ? <IconSortDescending className="w-4 h-4" /> : <IconSortAscending className="w-4 h-4" />}
              className="border-gray-600/50 text-gray-400 hover:border-gray-500 hover:text-gray-200 bg-gray-800/20"
            >
              {sortOrder === 'newest' ? 'Newest' : 'Oldest'}
            </Button>
            
            <Button
              variant="bordered"
              onPress={() => setSortOrder('alphabetical')}
              startContent={<IconFilter className="w-4 h-4" />}
              className={`border-gray-600/50 hover:border-gray-500 bg-gray-800/20 ${
                sortOrder === 'alphabetical' 
                  ? 'text-orange-400 border-orange-500/50' 
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              A-Z
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 z-10">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="bg-gray-800/50 border border-gray-700/50 animate-pulse">
                  <CardBody className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-3 bg-gray-700" />
                    <Skeleton className="h-3 w-1/2 mb-2 bg-gray-700" />
                    <Skeleton className="h-3 w-1/3 bg-gray-700" />
                    <div className="mt-4 pt-3 border-t border-gray-700/50">
                      <Skeleton className="h-8 w-full bg-gray-700" />
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          ) : error && filteredMindMaps.length === 0 ? (
            <Card className="bg-gray-800/50 border border-gray-700/50">
              <CardBody className="p-8 text-center">
                <p className="text-gray-400 mb-4">Unable to load mind maps at the moment.</p>
                <Button 
                  size="sm" 
                  variant="light" 
                  onPress={fetchMindMaps}
                  className="text-orange-400 hover:text-orange-300"
                >
                  Try Again
                </Button>
              </CardBody>
            </Card>
          ) : filteredMindMaps.length === 0 ? (
            <Card className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/50 backdrop-blur-sm">
              <CardBody className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center">
                    <IconMap className="w-10 h-10 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-200 mb-2">
                      {searchQuery ? 'No matching mind maps found' : 'No mind maps yet'}
                    </h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto">
                      {searchQuery 
                        ? `No mind maps match "${searchQuery}". Try a different search term.`
                        : 'Create your first mind map to get started with visual learning!'
                      }
                    </p>
                  </div>
                  {!searchQuery && (
                    <Button
                      onPress={() => router.push('/mind-map')}
                      className="mt-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium transform hover:scale-105 transition-all duration-300"
                      startContent={<IconPlus className="w-4 h-4" />}
                    >
                      Create Your First Mind Map
                    </Button>
                  )}
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredMindMaps.map((mindMap, index) => (
                <Card 
                  key={mindMap.id}
                  className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 hover:border-orange-500/50 backdrop-blur-sm transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/10 group cursor-pointer animate-mindmap-fade-in"
                  isPressable
                  onPress={() => handleViewMindMap(mindMap.id)}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <CardBody className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm mb-1 truncate group-hover:text-orange-300 transition-colors">
                          {mindMap.title}
                        </h3>
                        <p className="text-gray-400 text-xs truncate group-hover:text-gray-300 transition-colors">
                          {mindMap.subject}
                        </p>
                      </div>
                      <div className="ml-3 opacity-50 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
                        <IconChevronRight className="w-4 h-4 text-orange-400" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <IconCalendar className="w-3 h-3" />
                        <span>{formatDate(mindMap.created_at)}</span>
                      </div>
                      {mindMap.nodes_count && mindMap.nodes_count > 0 && (
                        <Chip 
                          size="sm" 
                          variant="flat"
                          className="bg-orange-500/10 text-orange-300 text-xs"
                        >
                          {mindMap.nodes_count} nodes
                        </Chip>
                      )}
                    </div>

                    <div className="flex space-x-2 pt-3 border-t border-gray-700/50">
                      <Button
                        size="sm"
                        variant="light"
                        className="flex-1 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0"
                        startContent={<IconEye className="w-4 h-4" />}
                        onPress={() => handleViewMindMap(mindMap.id)}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="light"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0"
                        startContent={<IconTrash className="w-4 h-4" />}
                        onClick={(e) => openDeleteConfirmation(e, mindMap)}
                      >
                        Delete
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Delete Mind Map Confirmation Modal */}
        {mindMapToDelete && (
          <Modal isOpen={isOpen} onClose={onClose}>
            <ModalContent className="bg-gray-800/90 border border-gray-700/50">
              <ModalHeader className="text-white">
                Confirm Deletion
              </ModalHeader>
              <ModalBody className="text-gray-400">
                Are you sure you want to delete the mind map "<span className="font-semibold text-white">{mindMapToDelete.title}</span>"? This action cannot be undone.
              </ModalBody>
              <ModalFooter className="flex justify-between">
                <Button
                  variant="light"
                  onPress={onClose}
                  className="text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </Button>                <Button
                  onPress={handleDeleteMindMap}
                  isLoading={isDeleting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Delete Mind Map
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        )}

        {/* Floating Dock */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <FloatingDock
            mobileClassName="translate-y-20"
            items={dockLinks}
            activeItem="/mind-map"
          />
        </div>

        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl"></div>
        </div>
      </WavyBackground>
      
      {/* Delete Confirmation Modal */}
      <Modal isOpen={isOpen} onClose={onClose} backdrop="blur">
        <ModalContent className="bg-gray-900/95 border border-gray-700 text-white shadow-xl">
          <ModalHeader className="border-b border-gray-700">
            <h3 className="text-xl font-bold text-white">Delete Mind Map</h3>
          </ModalHeader>
          <ModalBody className="py-6">
            <p className="text-gray-300">
              Are you sure you want to delete <span className="text-orange-400 font-medium">{mindMapToDelete?.title}</span>?
            </p>
            <p className="text-gray-400 text-sm mt-2">
              This action cannot be undone. The mind map will be permanently removed from both your local storage and the server.
            </p>
          </ModalBody>
          <ModalFooter className="border-t border-gray-700">
            <Button
              variant="bordered"
              className="border-gray-600 text-gray-300 hover:border-gray-500"
              onPress={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onPress={handleDeleteMindMap}
              isLoading={isDeleting}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
