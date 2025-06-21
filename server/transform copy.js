// Mind map data transformation utilities
// This file contains functions for transforming AI-generated mind map data to a format
// suitable for frontend visualization

/**
 * Transforms Groq AI response into a hierarchical mind map structure
 * @param {Object} groqData - Raw data from Groq AI response
 * @param {string} subjectName - Subject name for the mind map
 * @returns {Object} Transformed data ready for visualization
 */
const transformGroqResponse = (groqData, subjectName) => {
  try {
    // Handle the nested mind_map structure
    if (groqData.mind_map) {
      const mindMap = groqData.mind_map;
      const nodes = [];
      const edges = [];
      
      // Helper function to clean node titles - removes prefixes and metadata
      const cleanNodeTitle = (title) => {
        if (!title) return title;
        
        let cleanedTitle = title
          // First remove unit/module prefixes entirely
          .replace(/^(Unit|Module|Chapter|Section|Topic)[\s\-:]*([IVX0-9]+)?[.\s:]*/i, '')
          // Remove numbering at start
          .replace(/^\d+[\.\s]+/, '')
          // Remove bullet points
          .replace(/^[•\-\*]\s*/, '')
          // Clean various time/credit/marks references
          .replace(/\s*\d+\s*hours?\s*/i, '')
          .replace(/\s*\d+\s*marks?\s*/i, '')
          .replace(/\s*\d+\s*Lecture\s*Hours?\s*/i, '')
          .replace(/\s*\(\d+\s*hours?\)\s*/i, '')
          .replace(/\s*\(\d+\s*Lecture\s*Hours?\s*\)/i, '')
          // Clean up any remaining punctuation
          .replace(/^[:\s,;-]+|[:\s,;-]+$/g, '')
          .trim();
          
        // If after cleaning the title is empty, return a fallback
        if (!cleanedTitle || cleanedTitle.length < 2) {
          return title;
        }
        
        return cleanedTitle;
      };
        // Enhanced recursive processor for all types of child nodes with unlimited depth support
      const processChildNodes = (childNodes, parentNodeId, level, xPosition) => {
        if (!childNodes || !Array.isArray(childNodes) || childNodes.length === 0) return;
        
        // Clean all child nodes first
        const cleanedChildNodes = childNodes.map(node => {
          const cleanedNode = typeof node === 'string' ? { title: node } : { ...node };
          if (cleanedNode.title) {
            cleanedNode.title = cleanNodeTitle(cleanedNode.title);
          }
          return cleanedNode;
        });
        
        // Group nodes by parent if parent info is available
        const nodesByParent = {};
        if (!nodesByParent[parentNodeId]) {
          nodesByParent[parentNodeId] = [];
        }
        
        cleanedChildNodes.forEach((node, index) => {
          nodesByParent[parentNodeId].push({
            ...node,
            index
          });
        });
        
        // Add all child nodes to their parent
        Object.entries(nodesByParent).forEach(([parentId, childNodes]) => {
          // Find parent node to get its position
          const parentNode = nodes.find(n => n.id === parentId);
          const baseYPos = parentNode?.position?.y || 150;
          
          childNodes.forEach((node, childIndex) => {
            // Generate a unique ID based on level and parent hierarchy
            const levelPrefix = level > 2 ? `level${level}` : (level === 2 ? 'subtopic' : 'topic');
            const nodeId = `${levelPrefix}${parentId.replace(/topic|subtopic|level\d+_node/g, '')}_${childIndex + 1}`;
            
            // Calculate position - each level is 300px to the right of the parent
            // and arranged vertically based on index and spacing adjusted by level depth
            const spreadFactor = Math.max(1, 6 - level); // Give more vertical space to higher levels
            const yPos = baseYPos - (100 * spreadFactor) + (childIndex * (100 * spreadFactor));
            
            nodes.push({
              id: nodeId,
              label: node.title || `${levelPrefix.charAt(0).toUpperCase() + levelPrefix.slice(1)} ${childIndex + 1}`,
              type: level === 2 ? "subtopic" : `level${level}`,
              level: level,
              position: { x: xPosition, y: yPos },
              content: node.content || node.description || "",
              parentNode: parentId,
              hasChildren: false, // Will be updated if children exist
              children: []
            });
            
            // Add edge from parent to this node
            edges.push({
              id: `${parentId}-${nodeId}`,
              source: parentId,
              target: nodeId,
              type: "bezier"
            });
            
            // Update parent node's children array
            if (parentNode) {
              parentNode.children.push(nodeId);
              parentNode.hasChildren = true;
            }
            
            // Comprehensive approach to finding all nested children with any naming convention
            // This supports unlimited depth and various naming patterns
            const findNestedChildren = (nodeObj) => {
              if (!nodeObj || typeof nodeObj !== 'object') return null;
              
              // Check all possible property names for nested children
              // Ordered from most specific to most generic
              const possibleChildArrayProps = [
                // Multi-level explicit nesting
                `sub_sub_sub_sub_subtopics`,
                `sub_sub_sub_subtopics`,
                `sub_sub_subtopics`,
                `sub_subtopics`,
                
                // Camel case variants
                `subSubSubSubSubtopics`,
                `subSubSubSubtopics`,
                `subSubSubtopics`,
                `subSubtopics`,
                
                // Generic naming
                `subtopics`,
                `sub_topics`,
                `nested_topics`,
                `nested_subtopics`,
                `children`,
                `childTopics`,
                `child_topics`
              ];
              
              // Find the first non-empty child array
              for (const prop of possibleChildArrayProps) {
                if (Array.isArray(nodeObj[prop]) && nodeObj[prop].length > 0) {
                  return nodeObj[prop];
                }
              }
              
              return null;
            };
            
            // Find any nested children using our comprehensive search
            const childrenToProcess = findNestedChildren(node);
            
            if (childrenToProcess && childrenToProcess.length > 0) {
              // Update has children flag
              const thisNode = nodes.find(n => n.id === nodeId);
              if (thisNode) {
                thisNode.hasChildren = true;
              }
              
              // Next level's x position is 300px to the right, with no limit on depth
              processChildNodes(childrenToProcess, nodeId, level + 1, xPosition + 300);
            }
          });
        });
      };
      
      // Add central node - Always use the subject name for the central node
      nodes.push({
        id: "central",
        label: subjectName || "Central Topic",
        type: "root",
        level: 0,
        position: { x: 400, y: 300 },
        content: mindMap.central_node ? 
          (mindMap.central_node.content || mindMap.central_node.description || "") : 
          `This mind map provides a comprehensive overview of ${subjectName || "the subject"}. Explore the connected nodes to learn about specific topics and subtopics.`,
        isRoot: true,
        hasChildren: true,
        children: []
      });

      // Add module nodes (main topics)
      if (mindMap.module_nodes && Array.isArray(mindMap.module_nodes)) {
        // First ensure we have clean module titles without unit prefixes and lecture hours
        const cleanModules = mindMap.module_nodes.map(module => {
          // Create a deep copy to avoid mutating the original
          const cleanedModule = { ...module };
          
          // Clean the title from unit prefixes and lecture hours
          if (cleanedModule.title) {
            // Save the original unit/module number for reference
            const unitMatch = cleanedModule.title.match(/(?:Unit|Module)[\s\-:]*([IVX0-9]+)/i) || 
                              cleanedModule.title.match(/^([IVX]+)/i);
            const unitNum = unitMatch ? unitMatch[1] : '';
              
            // Clean excessive prefixes and preserve just the content
            if (unitMatch && unitNum) {
              // For academic unit titles, remove the prefix entirely
              const prefixRemoved = cleanedModule.title.replace(/^(Unit|Module|Chapter|Section)[\s\-:]*([IVX0-9]+)?[.\s:]*/i, '');
              cleanedModule.title = prefixRemoved;
            }
            
            // Clean up lecture hours and other metadata regardless
            cleanedModule.title = cleanedModule.title
              .replace(/\s*\d+\s*Lecture\s*Hours?\s*/i, '')
              .replace(/\s*\d+\s*hours?\s*/i, '')
              .replace(/\s*\(\s*\d+\s*hours?\s*\)/i, '')
              .replace(/\s*\d+\s*marks?\s*/i, '')
              // Clean up any remaining punctuation 
              .replace(/^[:\s,;-]+|[:\s,;-]+$/g, '')
              .trim();
                
            // If after cleaning the title is empty, fallback to a default title
            if (!cleanedModule.title || cleanedModule.title.length < 2) {
              // Use the original unit/module number if available
              const unitMatch = module.title.match(/(?:Unit|Module)[\s\-:]*([IVX0-9]+)/i) || 
                               module.title.match(/^([IVX]+)/i);
              const unitNum = unitMatch ? unitMatch[1] : `${index + 1}`;
              cleanedModule.title = `Topic ${unitNum} Content`;
            }
          }
          return cleanedModule;
        });
          
        // Now create separate nodes for each module with support for nested subtopics
        cleanModules.forEach((module, index) => {
          const nodeId = `topic${index + 1}`;
          const yPos = 150 + (index * 100);
          
          nodes.push({
            id: nodeId,
            label: module.title || `Topic ${index + 1}`,
            type: "topic", 
            level: 1,
            position: { x: 700, y: yPos },
            content: module.content || module.description || "",
            parentNode: "central",
            hasChildren: false,
            children: []
          });

          // Add edge from central to this topic
          edges.push({
            id: `central-${nodeId}`,
            source: "central",
            target: nodeId,
            type: "bezier"
          });

          // Update central node children
          nodes[0].children.push(nodeId);
          
          // Process subtopics immediately if they exist in the module
          // Check all possible subtopic property names
          const subtopicsArray = module.subtopics || module.children || module.sub_topics || [];
          
          if (subtopicsArray && subtopicsArray.length > 0) {
            // Mark this node as having children
            nodes[nodes.length - 1].hasChildren = true;
            
            // Process subtopics recursively at level 2, positioned 300px to the right
            processChildNodes(subtopicsArray, nodeId, 2, 1000);
          }
        });
      }

      // Process subtopic nodes if they exist
      if (mindMap.subtopic_nodes && Array.isArray(mindMap.subtopic_nodes)) {
        // Process them through our universal child processor
        const moduleCount = mindMap.module_nodes ? mindMap.module_nodes.length : 1;
        const subtopicsByParent = {};
        
        // Group by parent module if possible
        mindMap.subtopic_nodes.forEach((subtopic, index) => {
          const parentUnit = subtopic.parent_unit || subtopic.parent_module;
          let parentId = "topic1"; // Default to first topic
          
          if (parentUnit) {
            // Try to find matching parent by title
            const parentIndex = mindMap.module_nodes?.findIndex(
              module => module.title === parentUnit || module.id === parentUnit
            );
            
            if (parentIndex !== -1) {
              parentId = `topic${parentIndex + 1}`;
            }
          } else {
            // Distribute evenly if no explicit parent
            const parentIndex = Math.floor(index / Math.max(1, Math.ceil(mindMap.subtopic_nodes.length / moduleCount)));
            parentId = `topic${parentIndex + 1}`;
          }
          
          // Initialize array if needed
          if (!subtopicsByParent[parentId]) {
            subtopicsByParent[parentId] = [];
          }
          
          // Add to appropriate parent
          subtopicsByParent[parentId].push(subtopic);
        });
        
        // Process each group of subtopics
        Object.entries(subtopicsByParent).forEach(([parentId, subtopics]) => {
          processChildNodes(subtopics, parentId, 2, 1000);
        });
      }

      return {
        title: mindMap.central_node?.title || "Mind Map",
        subject: mindMap.central_node?.title || "Subject",
        nodes: nodes,
        edges: edges
      };
    }

    // If not the expected structure, return as-is
    return groqData;
  } catch (error) {
    console.error("Error transforming Groq response:", error);
    return groqData;
  }
};

module.exports = { transformGroqResponse };
