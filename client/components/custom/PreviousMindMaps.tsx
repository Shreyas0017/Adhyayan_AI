"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiService } from '@/lib/api';
import { Card, CardBody, Button, Skeleton, Chip, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/react";
import { IconMap, IconCalendar, IconEye, IconChevronRight, IconBrain, IconPlus, IconTrash } from "@tabler/icons-react";
import toast from 'react-hot-toast';

interface MindMap {
  id: string;
  title: string;
  subject: string;
  created_at: string;
  updated_at: string;
  nodes_count?: number;
  fromServer?: boolean;
  fromLocal?: boolean;
}

interface PreviousMindMapsProps {
  onCreateNew?: () => void;
}

export default function PreviousMindMaps({ onCreateNew }: PreviousMindMapsProps) {
  const [mindMaps, setMindMaps] = useState<MindMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mindMapToDelete, setMindMapToDelete] = useState<MindMap | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const router = useRouter();

  useEffect(() => {
    fetchMindMaps();
  }, []);  const fetchMindMaps = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First, load the list of deleted mind map IDs
      const deletedMindMapIds = new Set<string>();
      try {
        const deletedIds = localStorage.getItem('deleted_mindmaps');
        if (deletedIds) {
          const parsedIds = JSON.parse(deletedIds);
          if (Array.isArray(parsedIds)) {
            parsedIds.forEach(id => deletedMindMapIds.add(id));
            console.log(`Loaded ${parsedIds.length} deleted mind map IDs to filter out`);
          }
        }
      } catch (error) {
        console.error('Error loading deleted mind maps:', error);
      }
      
      // Get local mind maps first
      const localMindMaps = getLocalMindMaps();
      console.log(`Found ${localMindMaps.length} local mind maps`);
      
      // Try to get mind maps from API
      let serverMindMaps: MindMap[] = [];
      try {
        const response = await apiService.getMindMaps();
        
        // Get server mindmaps if API call succeeded
        if (response.success && response.mindMaps) {
          // Process server mind maps and filter out any that are in the deleted list
          const filteredServerMaps = response.mindMaps.filter((map: any) => {
            const id = map.id || map._id;
            
            // Check if this mind map is in the deleted list
            if (deletedMindMapIds.has(id)) {
              console.log(`Filtering out deleted server mind map: ${id}`);
              return false;
            }
            return true;
          });
          
          serverMindMaps = filteredServerMaps.map((map: any) => ({
            id: map.id || map._id,
            title: map.title || 'Untitled Mind Map',
            subject: map.subject || 'Unknown Subject',
            created_at: map.created_at || new Date().toISOString(),
            updated_at: map.updated_at || map.created_at || new Date().toISOString(),
            nodes_count: map.nodes ? map.nodes.length : 0,
            fromServer: true // Mark as server mindmap
          }));
          console.log(`Found ${serverMindMaps.length} mind maps from server after filtering deleted ones`);
        }
      } catch (apiError) {
        console.error('API error when fetching mind maps:', apiError);
        // Continue with local mind maps on API error
      }
      
      // Combine server and local mind maps
      // If a mind map exists both in server and locally, prefer the server version
      const serverMindMapIds = new Set(serverMindMaps.map(map => map.id));
      
      // Filter out any local mind maps that were deleted (double-check)
      const filteredLocalMindMaps = localMindMaps.filter(map => {
        if (deletedMindMapIds.has(map.id)) {
          console.log(`Filtering out deleted local mind map: ${map.id}`);
          return false;
        }
        return !serverMindMapIds.has(map.id);
      });
      
      const combinedMindMaps = [
        ...serverMindMaps,
        ...filteredLocalMindMaps
      ];
      
      if (combinedMindMaps.length > 0) {
        console.log(`Showing ${combinedMindMaps.length} mind maps in total`);
        setMindMaps(combinedMindMaps);
      } else {
        setError('No mind maps found');
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
      setLoading(false);
    }
  };  const getLocalMindMaps = (): MindMap[] => {
    if (typeof window === 'undefined') return [];
    
    const localMindMaps: MindMap[] = [];
    const deletedMindMapIds = new Set<string>();
    
    // First check for any deleted mind map IDs stored in local storage
    try {
      // Force clean up of any stale data in localStorage first
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('mindmap_')) {
          try {
            const data = localStorage.getItem(key);
            if (!data || data === 'null' || data === 'undefined' || data === '{}') {
              console.log(`Removing invalid mind map data: ${key}`);
              localStorage.removeItem(key);
            }
          } catch (e) {
            console.error('Error checking localStorage item:', e);
          }
        }
      }
      
      const deletedIds = localStorage.getItem('deleted_mindmaps');
      if (deletedIds) {
        const parsedIds = JSON.parse(deletedIds);
        if (Array.isArray(parsedIds)) {
          console.log(`Found ${parsedIds.length} deleted mind maps to filter out`);
          
          // Add various formats of each ID to ensure comprehensive filtering
          parsedIds.forEach(id => {
            if (!id) return; // Skip null/undefined IDs
            
            // Base ID
            deletedMindMapIds.add(id);
            
            // Add variant with ObjectId format
            if (typeof id === 'string') {
              if (/^[0-9a-fA-F]{24}$/.test(id)) {
                deletedMindMapIds.add(`ObjectId('${id}')`);
              }
              
              // Extract ID if it's in ObjectId format
              const objectIdMatch = id.match(/ObjectId\('([0-9a-fA-F]{24})'\)/);
              if (objectIdMatch && objectIdMatch[1]) {
                deletedMindMapIds.add(objectIdMatch[1]);
              }
              
              // For local mindmaps with timestamp format
              if (id.includes('mindmap_')) {
                deletedMindMapIds.add(id.replace('mindmap_', ''));
              } else {
                deletedMindMapIds.add(`mindmap_${id}`);
              }
            }
          });
        }
      }
      
      console.log(`Total deleted mind map ID variants to filter: ${deletedMindMapIds.size}`);
    } catch (error) {
      console.error('Error parsing deleted mind maps:', error);
    }
    
    // Get all localStorage keys that start with 'mindmap_'
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('mindmap_')) {
        try {
          const mindMapId = key.replace('mindmap_', '');
          
          // Skip if this mindmap was deleted
          if (deletedMindMapIds.has(mindMapId)) {
            console.log(`Skipping deleted mind map: ${mindMapId}`);
            continue;
          }          // Extract the MongoDB ObjectId if it's in the format ObjectId('id')
          let mongoId = mindMapId;
          const objectIdMatch = mindMapId.match(/ObjectId\('([0-9a-fA-F]{24})'\)/);
          if (objectIdMatch && objectIdMatch[1]) {
            mongoId = objectIdMatch[1];
            console.log(`Extracted MongoDB ID ${mongoId} from ${mindMapId}`);
          }
          
          // We want to include both MongoDB ObjectIDs and local mind maps
          // No need to skip local mind maps, we'll show everything
          // Since we're now handling both types of IDs properly in the delete function
          
          const data = localStorage.getItem(key);
          if (data) {
            const mindMapData = JSON.parse(data);
            
            // Skip if the data is invalid
            if (!mindMapData) continue;
              const isMongoFormat = /^[0-9a-fA-F]{24}$/.test(mindMapId) || 
                              (mindMapData.id && /^[0-9a-fA-F]{24}$/.test(mindMapData.id));
            
            localMindMaps.push({
              id: mindMapData.id || mindMapId,
              title: mindMapData.title || mindMapData.subject || 'Untitled Mind Map',
              subject: mindMapData.subject || mindMapData.title || 'Unknown Subject',
              created_at: mindMapData.created_at || new Date().toISOString(),
              updated_at: mindMapData.updated_at || mindMapData.created_at || new Date().toISOString(),
              nodes_count: mindMapData.nodes ? mindMapData.nodes.length : 0,
              fromLocal: true,
              fromServer: isMongoFormat // Might be from server if it has a MongoDB format ID
            });
          }
        } catch (error) {
          console.error('Error parsing localStorage mind map:', error);
        }
      }
    }
    
    console.log(`Found ${localMindMaps.length} local mind maps after filtering`);
    
    // Sort by creation date (newest first)
    return localMindMaps.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
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
  };  const handleDeleteMindMap = async () => {
    if (!mindMapToDelete) return;
    
    try {
      setIsDeleting(true);
      console.log(`Deleting mind map with ID: ${mindMapToDelete.id}`);
      
      let isServerMindMap = false;
      let idToUse = mindMapToDelete.id;
      
      // Process different ID formats
      if (mindMapToDelete.fromServer === true) {
        // This is definitely a server mindmap
        isServerMindMap = true;
      } else if (/^[0-9a-fA-F]{24}$/.test(mindMapToDelete.id)) {
        // This looks like a MongoDB ObjectId
        isServerMindMap = true;
      } else {
        // Extract the MongoDB ObjectId if it's in the format ObjectId('id')
        const objectIdMatch = mindMapToDelete.id.match(/ObjectId\('([0-9a-fA-F]{24})'\)/);
        if (objectIdMatch && objectIdMatch[1]) {
          idToUse = objectIdMatch[1];
          isServerMindMap = true;
          console.log(`Extracted MongoDB ID ${idToUse} from ${mindMapToDelete.id}`);
        }
      }
      
      // Always remove from local state first
      setMindMaps(prev => prev.filter(map => map.id !== mindMapToDelete.id));
      
      // Add to persistent deletion tracking list to prevent reappearance after refresh
      const trackDeletedMindMap = (id: string) => {
        try {
          if (!id) return; // Skip null/undefined IDs
          
          const deletedMindMaps = JSON.parse(localStorage.getItem('deleted_mindmaps') || '[]');
          if (!Array.isArray(deletedMindMaps)) {
            localStorage.setItem('deleted_mindmaps', JSON.stringify([id]));
          } else if (!deletedMindMaps.includes(id)) {
            deletedMindMaps.push(id);
            localStorage.setItem('deleted_mindmaps', JSON.stringify(deletedMindMaps));
          }
          console.log(`Added mind map ID ${id} to deletion tracking list`);
          
          // Also track variants to ensure comprehensive cleanup
          if (typeof id === 'string') {
            // If it's a MongoDB ObjectId, also track the ObjectId format
            if (/^[0-9a-fA-F]{24}$/.test(id) && !id.includes("ObjectId(")) {
              trackDeletedMindMap(`ObjectId('${id}')`);
            }
            
            // If it's in ObjectId format, extract and track the ID
            const objectIdMatch = id.match(/ObjectId\('([0-9a-fA-F]{24})'\)/);
            if (objectIdMatch && objectIdMatch[1]) {
              trackDeletedMindMap(objectIdMatch[1]);
            }
          }
        } catch (e) {
          console.error('Error updating deleted mind maps list:', e);
          localStorage.setItem('deleted_mindmaps', JSON.stringify([id]));
        }
      };
      
      // Always track the deletion regardless of type
      trackDeletedMindMap(mindMapToDelete.id);
      
      // If we have a different ID to use, track that too
      if (idToUse !== mindMapToDelete.id) {
        trackDeletedMindMap(idToUse);
      }
      
      // Remove all possible localStorage keys for this mind map
      if (typeof window !== 'undefined') {
        // Try with direct ID
        localStorage.removeItem(`mindmap_${mindMapToDelete.id}`);
        
        // Try with extracted ID if different
        if (idToUse !== mindMapToDelete.id) {
          localStorage.removeItem(`mindmap_${idToUse}`);
        }
        
        // Also try with MongoDB ObjectId format
        if (/^[0-9a-fA-F]{24}$/.test(mindMapToDelete.id)) {
          localStorage.removeItem(`mindmap_ObjectId('${mindMapToDelete.id}')`);
        }
      }
      
      // Handle local-only mindmaps
      if (!isServerMindMap) {
        console.log(`Mind map with ID ${mindMapToDelete.id} is local only`);
        onClose();
        
        toast.success('Mind map removed successfully', {
          duration: 3000,
          style: {
            background: '#1a1a1a',
            color: '#ffffff',
            border: '1px solid #10b981',
            fontWeight: '500',
            borderRadius: '8px',
          },
        });
        
        return;
      }// For server mind maps, call the API to delete from database
      const result = await apiService.deleteMindMap(idToUse);
      
      if (result.success) {
        // Also make sure to remove from localStorage if it exists there
        // This handles the case where a mind map is both in the server and localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`mindmap_${mindMapToDelete.id}`);
          
          // Also check with the mongo ID format
          if (mindMapToDelete.id !== idToUse) {
            localStorage.removeItem(`mindmap_${idToUse}`);
          }
        }
        
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
        
        // IMPORTANT: We need to completely refresh the mind maps list to ensure deleted items don't reappear
        setTimeout(() => {
          // Force a complete refresh by clearing any cached results
          console.log("Performing complete mind map refresh...");
          fetchMindMaps();
        }, 1000);
      } else {
        throw new Error(result.error || "Failed to delete mind map");
      }
    } catch (error) {
      console.error('Error deleting mind map:', error);
      
      // Even if there's an error, the mind map might have been removed from localStorage
      // Let's check if it still exists
      if (typeof window !== 'undefined' && !localStorage.getItem(`mindmap_${mindMapToDelete.id}`)) {
        // It was removed from localStorage, so update the UI
        setMindMaps(prev => prev.filter(map => map.id !== mindMapToDelete.id));
        
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

  const handleForceRefresh = () => {
    // Force reload all mind maps
    console.log("Forcing complete refresh of mind maps...");
      // Clear mind map cache in localStorage if needed
    const clearMindMapCache = () => {
      try {
        // Get the deleted mind maps list
        const deletedMindMaps = JSON.parse(localStorage.getItem('deleted_mindmaps') || '[]');
        
        // For each deleted mind map, ensure it's removed from localStorage in all formats
        if (Array.isArray(deletedMindMaps)) {
          deletedMindMaps.forEach(id => {
            if (!id) return; // Skip null/undefined IDs
            
            // Try removing with direct ID
            localStorage.removeItem(`mindmap_${id}`);
            
            // Try with MongoDB ObjectId format
            if (typeof id === 'string') {
              // If it's a MongoDB ObjectId in string format
              if (/^[0-9a-fA-F]{24}$/.test(id)) {
                localStorage.removeItem(`mindmap_ObjectId('${id}')`);
              }
              
              // If it's in ObjectId format, extract the ID
              const objectIdMatch = id.match(/ObjectId\('([0-9a-fA-F]{24})'\)/);
              if (objectIdMatch && objectIdMatch[1]) {
                const extractedId = objectIdMatch[1];
                localStorage.removeItem(`mindmap_${extractedId}`);
              }
            }
            
            console.log(`Ensured mind map ${id} is removed from localStorage in all formats`);
          });
        }
        
        // Also scan all localStorage keys for any mindmaps that might be invalid or problematic
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('mindmap_')) {
            try {
              const data = localStorage.getItem(key);
              if (!data || data === 'null' || data === 'undefined' || data === '{}') {
                console.log(`Removing invalid mind map data: ${key}`);
                localStorage.removeItem(key);
              }
            } catch (e) {
              // If we have trouble parsing, just remove it to be safe
              console.error('Error checking localStorage item:', e);
              localStorage.removeItem(key);
            }
          }
        }
        
        toast.success('Mind map cache cleared', { 
          duration: 2000,
          style: { background: '#1a1a1a', color: '#ffffff', border: '1px solid #10b981' }
        });
      } catch (e) {
        console.error('Error clearing mind map cache:', e);
      }
    };
    
    // Clear the cache
    clearMindMapCache();
    
    // Fetch fresh data
    fetchMindMaps();
  };

  if (loading) {
    return (
      <div className="w-full space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <IconBrain className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Your Mind Maps</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
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
      </div>
    );
  }

  if (error && mindMaps.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <IconBrain className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Your Mind Maps</h2>
        </div>
        <Card className="bg-gray-800/50 border border-gray-700/50">
          <CardBody className="p-6 text-center">
            <p className="text-gray-400">Unable to load mind maps at the moment.</p>
            <Button 
              size="sm" 
              variant="light" 
              onPress={fetchMindMaps}
              className="mt-3 text-orange-400 hover:text-orange-300"
            >
              Try Again
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (mindMaps.length === 0) {
    return (
      <div className="w-full">
        <div className="flex items-center gap-3 mb-6">
          <IconBrain className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Your Mind Maps</h2>
        </div>
        <Card className="bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-gray-700/50 backdrop-blur-sm hover:border-gray-600/50 transition-all duration-300">
          <CardBody className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                <IconMap className="w-10 h-10 text-orange-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-200 mb-2">No Mind Maps Yet</h3>
                <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                  Create your first mind map to see it here! Transform your learning materials into 
                  interactive visual knowledge maps that help you understand and remember better.
                </p>
              </div>
              <div className="mt-2 texttext-gray-500">
                💡 Tip: Upload a file or paste your syllabus to get started quickly
              </div>
              {onCreateNew && (
                <Button
                  className="mt-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-medium transform hover:scale-105 transition-all duration-300"
                  onPress={onCreateNew}
                  startContent={<IconPlus className="w-4 h-4" />}
                >
                  Create Your First Mind Map
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <IconBrain className="w-6 h-6 text-orange-400" />
          <h2 className="text-xl font-bold text-white">Your Mind Maps</h2>
          <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded-full font-medium">
            {mindMaps.length}
          </span>
        </div>
        <Button
          size="sm"
          variant="light"
          className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
          onPress={handleForceRefresh}
        >
          Refresh
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mindMaps.slice(0, 8).map((mindMap, index) => (
          <Card 
            key={mindMap.id}
            className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 border border-gray-700/50 hover:border-orange-500/50 backdrop-blur-sm transition-all duration-300 hover:transform hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/10 group cursor-pointer animate-mindmap-fade-in"
            isPressable
            onPress={() => handleViewMindMap(mindMap.id)}
            style={{
              animationDelay: `${index * 100}ms`
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
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <IconCalendar className="w-3 h-3" />
                  <span>{formatDate(mindMap.created_at)}</span>
                </div>
                {mindMap.nodes_count && mindMap.nodes_count > 0 && (
                  <div className="flex items-center gap-1">
                    <IconMap className="w-3 h-3" />
                    <span>{mindMap.nodes_count} nodes</span>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-700/50">
                <div className="flex space-x-2">
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
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {mindMaps.length > 8 && (
        <div className="mt-6 text-center">
          <Button
            variant="bordered"
            className="border-gray-600/50 text-gray-400 hover:border-orange-500/50 hover:text-orange-300 bg-gray-800/20 hover:bg-orange-500/5 transition-all duration-300"
            onPress={() => router.push('/mind-map/all')}
          >
            View All Mind Maps ({mindMaps.length})
          </Button>
        </div>
      )}
      
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