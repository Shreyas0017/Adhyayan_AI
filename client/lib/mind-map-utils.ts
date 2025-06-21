// Utility functions for mind map data handling
import { ReactFlowInstance } from '@xyflow/react';

export interface SidebarTopic {
  id: string;
  title: string;
  isRead: boolean;
  subtopics: SidebarSubtopic[];
}

export interface SidebarSubtopic {
  id: string;
  title: string;
  isRead: boolean;
}

export interface BackendNode {
  id: string;
  label: string;
  content?: string;
  type?: string;
  level?: number;
  isRoot?: boolean;
  parentNode?: string;
  parent?: string;
  position?: { x: number; y: number };
  children?: string[];
}

export interface BackendData {
  title?: string;
  subject?: string;
  nodes?: BackendNode[];
  edges?: Array<{ source: string; target: string; id: string; type?: string }>;
  created_at?: string;
  updated_at?: string;
  id?: number | string;
}

/**
 * Converts mind map data from backend format to sidebar format
 */
export function convertBackendDataToSidebarFormat(backendData: BackendData): SidebarTopic[] {
  console.log('Converting mind map data to sidebar format...');
  
  if (!backendData || !backendData.nodes || !Array.isArray(backendData.nodes) || backendData.nodes.length === 0) {
    console.warn('Invalid mind map data format:', backendData);
    return [];
  }

  try {
    // Debug the data structure
    console.log(`Processing ${backendData.nodes.length} nodes`);
    
    // Find the root node with multiple strategies
    const rootNode = findRootNode(backendData.nodes);
    
    if (!rootNode) {
      console.warn('No root node found in mind map data');
      return [];
    }

    console.log('Found root node:', rootNode.id, rootNode.label);
    
    // Find main topics using different strategies
    const mainTopics = findMainTopics(backendData.nodes, rootNode, backendData.edges);
    
    if (mainTopics.length === 0) {
      console.warn('No main topics found for mind map');
      return [];
    }

    console.log(`Found ${mainTopics.length} main topics`);
    
    // Convert main topics to sidebar format
    const sidebarTopics: SidebarTopic[] = mainTopics.map(topic => {
      // Find subtopics for this main topic
      const subtopics = findSubtopics(backendData.nodes, topic, backendData.edges);
      
      return {
        id: topic.id,
        title: topic.label || topic.id,
        isRead: false,
        subtopics: subtopics.map(subtopic => ({
          id: subtopic.id,
          title: subtopic.label || subtopic.id,
          isRead: false
        }))
      };
    });

    return sidebarTopics;
  } catch (error) {
    console.error('Error converting mind map data:', error);
    return [];
  }
}

/**
 * Find the root node in the mind map data
 */
function findRootNode(nodes: BackendNode[]): BackendNode | undefined {
  // Strategy 1: Look for node with type='root' or isRoot=true
  let rootNode = nodes.find(node => 
    node.type === 'root' || node.isRoot === true
  );
  
  // Strategy 2: Look for node with level=0
  if (!rootNode) {
    rootNode = nodes.find(node => node.level === 0);
  }
  
  // Strategy 3: Look for node with id='central' or id='root'
  if (!rootNode) {
    rootNode = nodes.find(node => 
      node.id === 'central' || node.id === 'root'
    );
  }
  
  // Strategy 4: Look for node that has no parentNode but has children
  if (!rootNode) {
    rootNode = nodes.find(node => 
      (!node.parentNode && !node.parent) && 
      (node.children && node.children.length > 0)
    );
  }
  
  return rootNode;
}

/**
 * Find main topics for the mind map
 */
function findMainTopics(
  nodes: BackendNode[], 
  rootNode: BackendNode,
  edges?: Array<{ source: string; target: string; id: string; type?: string }>
): BackendNode[] {
  let mainTopics: BackendNode[] = [];
  
  // Strategy 1: Use children array of root node
  if (rootNode.children && rootNode.children.length > 0) {
    mainTopics = nodes.filter(node => 
      rootNode.children!.includes(node.id)
    );
  }
  
  // Strategy 2: If no results, use parentNode references
  if (mainTopics.length === 0) {
    mainTopics = nodes.filter(node => 
      node.parentNode === rootNode.id || node.parent === rootNode.id
    );
  }
  
  // Strategy 3: If no results, use level property
  if (mainTopics.length === 0) {
    mainTopics = nodes.filter(node => 
      node.level === 1
    );
  }
  
  // Strategy 4: Use edges to find connections from root
  if (mainTopics.length === 0 && edges && edges.length > 0) {
    const topicIds = edges
      .filter(edge => edge.source === rootNode.id)
      .map(edge => edge.target);
      
    mainTopics = nodes.filter(node => 
      topicIds.includes(node.id)
    );
  }
  
  return mainTopics;
}

/**
 * Find subtopics for a main topic
 */
function findSubtopics(
  nodes: BackendNode[], 
  topic: BackendNode,
  edges?: Array<{ source: string; target: string; id: string; type?: string }>
): BackendNode[] {
  let subtopics: BackendNode[] = [];
  
  // Strategy 1: Use children array of topic
  if (topic.children && topic.children.length > 0) {
    subtopics = nodes.filter(node => 
      topic.children!.includes(node.id)
    );
  }
  
  // Strategy 2: If no results, use parentNode references
  if (subtopics.length === 0) {
    subtopics = nodes.filter(node => 
      node.parentNode === topic.id || node.parent === topic.id
    );
  }
  
  // Strategy 3: If no results, use level property and parent reference
  if (subtopics.length === 0) {
    subtopics = nodes.filter(node => 
      node.level === 2 && (node.parentNode === topic.id || node.parent === topic.id)
    );
  }
  
  // Strategy 4: Use edges to find connections from topic
  if (subtopics.length === 0 && edges && edges.length > 0) {
    const subtopicIds = edges
      .filter(edge => edge.source === topic.id)
      .map(edge => edge.target);
      
    subtopics = nodes.filter(node => 
      subtopicIds.includes(node.id)
    );
  }
  
  return subtopics;
}

/**
 * Generate fallback mind map data if loading fails
 */
export function getFallbackData(): SidebarTopic[] {
  return [
    {
      id: 'photosynthesis',
      title: 'Photosynthesis Overview',
      isRead: true,
      subtopics: [
        { id: 'light-dependent', title: 'Light-Dependent Reactions', isRead: true },
        { id: 'light-independent', title: 'Light-Independent Reactions (Calvin Cycle)', isRead: false },
        { id: 'factors', title: 'Factors Affecting Photosynthesis', isRead: false },
      ]
    },
    {
      id: 'factors-affecting',
      title: 'Factors Affecting Photosynthesis',
      isRead: false,
      subtopics: [
        { id: 'light-intensity', title: 'Light Intensity', isRead: false },
        { id: 'temperature', title: 'Temperature', isRead: false },
        { id: 'carbon-dioxide', title: 'CO2 Concentration', isRead: false },
        { id: 'water-availability', title: 'Water Availability', isRead: false },
      ]
    },
    {
      id: 'products-reactants',
      title: 'Products and Reactants',
      isRead: false,
      subtopics: [
        { id: 'glucose', title: 'Glucose Production', isRead: false },
        { id: 'oxygen', title: 'Oxygen Release', isRead: false },
        { id: 'water-consumption', title: 'Water Consumption', isRead: false },
        { id: 'co2-absorption', title: 'CO2 Absorption', isRead: false },
      ]
    }
  ];
}

/**
 * Generate fallback mind map data for visualization
 */
export function generateFallbackMindMapData(): BackendData {
  return {
    title: "Photosynthesis",
    subject: "Photosynthesis",
    nodes: [
      {
        id: "central",
        label: "Photosynthesis",
        type: "root",
        level: 0,
        position: { x: 300, y: 200 },
        content: "The process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll.",
        isRoot: true,
        children: ["light_reactions", "dark_reactions", "factors"]
      },
      {
        id: "light_reactions",
        label: "Light-Dependent Reactions",
        type: "topic",
        level: 1,
        position: { x: 600, y: 100 },
        content: "The first stage of photosynthesis where light energy is converted to chemical energy.",
        parentNode: "central",
        children: []
      },
      {
        id: "dark_reactions",
        label: "Light-Independent Reactions",
        type: "topic",
        level: 1,
        position: { x: 600, y: 200 },
        content: "The second stage of photosynthesis, also known as the Calvin Cycle, where ATP and NADPH are used to produce glucose.",
        parentNode: "central",
        children: []
      },
      {
        id: "factors",
        label: "Factors Affecting Photosynthesis",
        type: "topic",
        level: 1,
        position: { x: 600, y: 300 },
        content: "Various environmental factors that affect the rate of photosynthesis.",
        parentNode: "central",
        children: ["light", "temperature", "co2"]
      },
      {
        id: "light",
        label: "Light Intensity",
        type: "subtopic",
        level: 2,
        position: { x: 900, y: 250 },
        content: "The rate of photosynthesis increases with increasing light intensity up to a point.",
        parentNode: "factors",
        children: []
      },
      {
        id: "temperature",
        label: "Temperature",
        type: "subtopic",
        level: 2,
        position: { x: 900, y: 300 },
        content: "The rate of photosynthesis increases with increasing temperature up to an optimum level.",
        parentNode: "factors",
        children: []
      },
      {
        id: "co2",
        label: "CO2 Concentration",
        type: "subtopic",
        level: 2,
        position: { x: 900, y: 350 },
        content: "The rate of photosynthesis increases with increasing CO2 concentration up to a point.",
        parentNode: "factors",
        children: []
      }
    ],
    edges: [
      { id: "central-light_reactions", source: "central", target: "light_reactions", type: "bezier" },
      { id: "central-dark_reactions", source: "central", target: "dark_reactions", type: "bezier" },
      { id: "central-factors", source: "central", target: "factors", type: "bezier" },
      { id: "factors-light", source: "factors", target: "light", type: "bezier" },
      { id: "factors-temperature", source: "factors", target: "temperature", type: "bezier" },
      { id: "factors-co2", source: "factors", target: "co2", type: "bezier" }
    ]
  };
}



