const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_API_BASE_URL || 'https://adhyayan-ai.onrender.com/api'
  : 'http://localhost:5000/api';

class ApiService {
  // Properties to track API call status and prevent duplicate calls
  private _lastRequestTime: Record<string, number> = {};
  private _lastResponse: Record<string, any> = {};
  private _pendingRequests: Record<string, Promise<any>> = {};
  
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      // Check if token exists and is not expired (basic validation)
      if (token) {
        try {
          // Simple check if token looks like a JWT (3 parts separated by dots)
          if (token.split('.').length !== 3) {
            console.warn('Invalid token format detected');
            localStorage.removeItem('authToken'); // Clear invalid token
            return null;
          }
          return token;
        } catch (e) {
          console.warn('Error processing token:', e);
          return null;
        }
      }
    }
    return null;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }  async post(endpoint: string, data: any) {
    // Generate a request ID for deduplication
    const requestKey = `${endpoint}-${JSON.stringify(data)}`;
    
    // Check for duplicate requests within a 2-second window
    if (this._lastRequestTime[requestKey] && Date.now() - this._lastRequestTime[requestKey] < 2000) {
      console.log(`Preventing duplicate API call to ${endpoint} within 2 seconds`);
      return this._lastResponse[requestKey];
    }    // Check for pending requests to the same endpoint with same data
    if (requestKey in this._pendingRequests) {
      console.log(`Using existing pending request for ${endpoint}`);
      return await this._pendingRequests[requestKey];
    }
    
    // Create and store the promise for this request
    this._pendingRequests[requestKey] = (async () => {
      let retryCount = 0;
      const MAX_RETRIES = 2;
      
      try {
        console.log(`Making POST request to: ${API_BASE_URL}${endpoint}`);
        console.log('Request data:', data);
        
        // Wrap the fetch in a try-catch to handle any connection issues
        let response;
        
        while (retryCount <= MAX_RETRIES) {          try {
            // Use a longer timeout for podcast generation (120 seconds) and shorter for other requests
            const isPodcastRequest = endpoint.includes('podcast');
            const baseTimeout = isPodcastRequest ? 120000 : 30000; // 120 seconds for podcast, 30 seconds for others
            
            response = await fetch(`${API_BASE_URL}${endpoint}`, {
              method: 'POST',
              headers: this.getHeaders(),
              body: JSON.stringify(data),
              // Adding signal support for better abort handling
              signal: AbortSignal.timeout(baseTimeout - (retryCount * 5000)), // Reduce timeout on retries
            });
            
            // If successful, break out of the retry loop
            break;
            
          } catch (error) {
            const fetchError = error as Error;
            console.error(`Fetch error (attempt ${retryCount + 1}/${MAX_RETRIES + 1}):`, fetchError);
            
            // If it's a message port closed error or other connection issue, try again
            if ((fetchError.message?.includes('port closed') || 
                fetchError.name === 'AbortError' || 
                fetchError.name === 'TypeError') && 
                retryCount < MAX_RETRIES) {
              
              retryCount++;
              console.log(`Retrying request (${retryCount}/${MAX_RETRIES}) after connection error...`);
              // Exponential backoff for retry
              await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
              continue;
            } else {
              throw fetchError;
            }
          }        }

      // Ensure response is defined before accessing properties
      if (!response) {
        throw new Error('Failed to get response from server');
      }

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      if (!response.ok) {
        let error;
        try {
          error = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          throw new Error(`API request failed with status ${response.status}: ${responseText}`);
        }
        
        // If we get an invalid token error, clear the stored token and redirect to login
        if (response.status === 401 && (error.error === 'Invalid token' || error.details === 'invalid signature')) {
          console.log('Token is invalid, clearing stored authentication...');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/';
          return;
        }
        
        throw new Error(error.error || 'API request failed');
      }      try {
        const result = JSON.parse(responseText);
        
        // Store the successful response and timestamp
        this._lastResponse[requestKey] = result;
        this._lastRequestTime[requestKey] = Date.now();
        
        return result;
      } catch (parseError) {
        console.error('Failed to parse success response:', parseError);
        throw new Error(`Invalid JSON response: ${responseText}`);
      }
    } catch (error) {
      console.error('API POST Error:', error);
      throw error;
    } finally {
      // Clean up the pending request
      delete this._pendingRequests[requestKey];
      
      // Clean up old cache entries after 5 minutes
      setTimeout(() => {
        delete this._lastResponse[requestKey];
        delete this._lastRequestTime[requestKey];
      }, 5 * 60 * 1000);
    }
  })();
  
  return this._pendingRequests[requestKey];
}

  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  // Authentication methods
  async authenticateWithGoogle(idToken: string, user: any) {
    console.log('Authenticating with Google:', { uid: user?.uid });
    const response = await this.post('/auth/google', { idToken, user });
    
    if (response.token) {
      console.log('Auth successful, saving token (first 10 chars):', response.token.substring(0, 10) + '...');
      localStorage.setItem('authToken', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    } else {
      console.error('No token received from server during authentication');
    }
    
    return response;
  }  async getUserProfile() {
    return this.get('/user');
  }

  async logout() {
    const response = await this.post('/auth/logout', {});
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    return response;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }
  // Get stored user data
  getStoredUser() {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          // Validate that the user object has required fields
          if (parsedUser && parsedUser.uid && (parsedUser.email || parsedUser.displayName)) {
            return parsedUser;
          } else {
            console.warn('Invalid user data found in localStorage, clearing...');
            localStorage.removeItem('user');
            localStorage.removeItem('authToken');
          }
        } catch (error) {
          console.error('Error parsing user data from localStorage:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('authToken');
        }
      }
    }
    return null;
  }

  // Refresh user profile data from server
  async refreshUserProfile() {
    try {
      const profile = await this.getUserProfile();
      if (profile && profile.user) {
        // Update stored user data with fresh data from server
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(profile.user));
        }
        return profile.user;
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }
    return null;
  }  // Mind Map API methods
  async generateMindMap(subjectName: string, syllabus: string) {
    // Use the generic post method which already has duplicate prevention
    return this.post('/mindmap/generate', { subjectName, syllabus });
  }

  // Gyan Points API methods
  async getUserGyanPoints() {
    return this.get('/user/gyan-points');
  }  async getMindMaps() {    
    try {
      return this.get('/mindmap/list');
    } catch (error) {
      console.error('Error fetching mind maps:', error);
      return { success: false, error: 'Failed to fetch mind maps', mindMaps: [] };
    }
  }
  async getMindMap(id: string) {
    // Extract the MongoDB ObjectId if it's in the format ObjectId('id')
    let mongoId = id;
    const objectIdMatch = id.match(/ObjectId\('([0-9a-fA-F]{24})'\)/);
    if (objectIdMatch && objectIdMatch[1]) {
      mongoId = objectIdMatch[1];
      console.log(`Extracted MongoDB ID ${mongoId} from ${id}`);
    }
    return this.get(`/mindmap/${mongoId}`);
  }
  
  // New method for getting detailed node descriptions
  async getMindMapNodeDescription(nodeId: string, nodeLabel: string, syllabus?: string, parentNodes?: any[], childNodes?: any[]) {
    return this.post('/mindmap/node-description', { 
      nodeId, 
      nodeLabel, 
      syllabus,
      parentNodes,
      childNodes
    });
  }
  // Method for getting node-specific questions
  async getMindMapNodeQuestions(nodeId: string, nodeDescription: string) {
    return this.post('/mindmap/node-questions', { 
      nodeId, 
      nodeDescription 
    });
  }
  // Method for getting AI responses to user questions
  async getMindMapChatResponse(nodeId: string, nodeDescription: string, userMessage: string) {
    return this.post('/mindmap/chat-response', { 
      nodeId, 
      nodeDescription,
      userMessage 
    });
  }
  // File upload method for syllabus
  async uploadSyllabusFile(file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = this.getToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      console.log(`Uploading file to: ${API_BASE_URL}/upload/syllabus`);
      
      const response = await fetch(`${API_BASE_URL}/upload/syllabus`, {
        method: 'POST',
        headers: headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'File upload failed');
      }

      return response.json();
    } catch (error) {
      console.error('File upload error:', error);
      throw error;
    }
  }
  // Node read status methods
  async updateNodeReadStatus(mindMapId: string, nodeId: string, isRead: boolean) {
    const response = await fetch(`${API_BASE_URL}/mindmap/${mindMapId}/node/${nodeId}/read-status`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ isRead }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update read status');
    }

    return response.json();
  }
  async getNodeReadStatus(mindMapId: string) {
    return this.get(`/mindmap/${mindMapId}/read-status`);
  }  // Delete a mind map  // Helper method to track a deleted mind map ID
  private trackDeletedMindMap(id: string): void {
    if (typeof window === 'undefined') return;
    
    try {
      const existingData = localStorage.getItem('deleted_mindmaps') || '[]';
      const deletedIds = JSON.parse(existingData);
      
      if (!Array.isArray(deletedIds)) {
        localStorage.setItem('deleted_mindmaps', JSON.stringify([id]));
        return;
      }
      
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('deleted_mindmaps', JSON.stringify(deletedIds));
        console.log(`Added ${id} to deleted mind maps tracking list`);
      }
    } catch (e) {
      console.error('Error tracking deleted mind map:', e);
      localStorage.setItem('deleted_mindmaps', JSON.stringify([id]));
    }
  }

  async deleteMindMap(id: string) {
    try {
      // Always try to remove from localStorage first, regardless of API call success
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`mindmap_${id}`);
        console.log(`Removed mindmap_${id} from localStorage`);
        
        // Track the deletion
        this.trackDeletedMindMap(id);
      }
      
      // Extract the MongoDB ObjectId if it's in the format ObjectId('id')
      let mongoId = id;
      const objectIdMatch = id.match(/ObjectId\('([0-9a-fA-F]{24})'\)/);
      if (objectIdMatch && objectIdMatch[1]) {
        mongoId = objectIdMatch[1];
        console.log(`Extracted MongoDB ID ${mongoId} from ${id}`);
        
        // Also track the extracted ID to ensure it doesn't reappear
        if (mongoId !== id) {
          this.trackDeletedMindMap(mongoId);
        }
      }
      
      // Check if this is a MongoDB ObjectId (24 hex chars)
      const isMongoId = mongoId && /^[0-9a-fA-F]{24}$/.test(mongoId);
      
      if (!isMongoId) {
        console.log(`Mind map with ID ${mongoId} has a non-MongoDB ID format, only removed from localStorage`);
        return { success: true, message: "Mind map removed from local storage" };
      }

      // Try to delete from backend if it exists there and has valid MongoDB ID format
      const response = await fetch(`${API_BASE_URL}/mindmap/${mongoId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      // If the ID is not found or invalid format, we'll still consider it a success
      // since we've already removed it from localStorage
      if (response.status === 400 || response.status === 404) {
        console.log(`Mind map with ID ${mongoId} not found on server or has invalid format, but was removed from localStorage`);
        return { success: true, message: "Mind map removed from local storage" };
      }

      if (!response.ok) {
        const error = await response.json();
        console.error("Server error:", error);
        // Even if server deletion fails, we've removed from localStorage
        return { success: true, message: "Mind map removed from local storage" };
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error('Error in deleteMindMap:', error);
      // Even if there's an error, we consider it a partial success if we removed it from localStorage
      return { success: true, message: "Mind map removed from local storage only" };
    }
  }
  // Not needed - we're using trackDeletedMindMap instead
  // This is a duplicate of the private method defined above, so we'll remove it
}

// Ensure we're exporting the service properly
const apiServiceInstance = new ApiService();
export { apiServiceInstance as apiService };