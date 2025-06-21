// Test file to fix common JSON errors in Groq responses

const fixBrokenJSON = (jsonString) => {
  console.log("Attempting to fix broken JSON structure");

  try {
    // Pre-processing: Strip markdown and comments
    let fixedJson = jsonString
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");

    console.log("Pre-processed JSON length:", fixedJson.length);

    // PHASE 1: Basic syntax fixes
    if (!fixedJson.trim().startsWith('{')) {
      const jsonMatch = fixedJson.match(/(\{[\s\S]*\})/);
      if (jsonMatch && jsonMatch[1]) {
        fixedJson = jsonMatch[1];
        console.log("Extracted JSON structure from text response");
      }
    }

    fixedJson = fixedJson
      .replace(/([{,]\s*)(title|content|description|subtopics|sub_subtopics|sub_sub_subtopics|sub_sub_sub_subtopics|mind_map|central_node|module_nodes|units|main_subject|parsed_structure)\s*:/g, '$1"$2":')
      .replace(/"\s*}\s*"/g, '", "')
      .replace(/"\s*\[\s*"/g, '", ["')
      .replace(/:(\s*)([^"{}\[\],\s][^,}\]]*?)(\s*[},\]])/g, ': "$2"$3')
      .replace(/,(\s*[}\]])/g, '$1')
      .replace(/}(\s*){/g, '},$1{')
      .replace(/:(\s*)"([^"]*?)(\s*[},])/g, ': "$2"$3')
      .replace(/:(\s*"(true|false|null)")/g, ': $2');

    // PHASE 2: Advanced syntax fixes
    fixedJson = fixedJson
      .replace(/"(sub_?)+subtopics"\s*:\s*([^[])/g, '"$1subtopics": [$2')
      .replace(/]([^,}\]]*?)}/g, ']}')
      .replace(/],\s*}/g, ']}')
      .replace(/],\s*]/g, ']]');

    // PHASE 3: Enhanced bracket balancing
    const countChar = (str, char) => (str.match(new RegExp(char, 'g')) || []).length;
    const openBraces = countChar(fixedJson, '{');
    const closeBraces = countChar(fixedJson, '}');
    const openBrackets = countChar(fixedJson, '\\[');
    const closeBrackets = countChar(fixedJson, '\\]');

    console.log(`JSON structure balance: { ${openBraces}:${closeBraces}, [ ${openBrackets}:${closeBrackets} }`);

    if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
      let chars = fixedJson.split('');
      let stack = [];
      let positions = [];

      for (let i = 0; i < chars.length; i++) {
        if (chars[i] === '{') {
          stack.push({ char: '{', index: i });
          positions.push(i);
        } else if (chars[i] === '[') {
          stack.push({ char: '[', index: i });
          positions.push(i);
        } else if (chars[i] === '}') {
          if (stack.length && stack[stack.length - 1].char === '{') {
            stack.pop();
            positions.pop();
          } else {
            console.warn(`Mismatched closing brace at position ${i}`);
            chars[i] = ''; // Remove unmatched closing brace
          }
        } else if (chars[i] === ']') {
          if (stack.length && stack[stack.length - 1].char === '[') {
            stack.pop();
            positions.pop();
          } else {
            console.warn(`Mismatched closing bracket at position ${i}`);
            chars[i] = ''; // Remove unmatched closing bracket
          }
        }
      }

      // Add missing closing brackets/braces
      if (stack.length) {
        console.log(`Found ${stack.length} unclosed brackets/braces`);
        const closings = stack.reverse().map(item => item.char === '{' ? '}' : ']');
        fixedJson = chars.join('') + closings.join('');
      } else {
        fixedJson = chars.join('');
      }
    }

    // PHASE 4: Try parsing
    try {
      JSON.parse(fixedJson);
      console.log("JSON fix successful!");
      return fixedJson;
    } catch (parseError) {
      console.error("Basic JSON fix failed:", parseError.message);

      // PHASE 5: Advanced reconstruction
      const isParsedStructure = jsonString.includes("parsed_structure") || jsonString.includes("main_subject");
      const centralNode = {};
      const titleMatch = fixedJson.match(/"title"\s*:\s*"([^"]+)"/);
      centralNode.title = titleMatch ? titleMatch[1] : "Unknown Subject";
      const contentMatch = fixedJson.match(/"content"\s*:\s*"([^"]+)"/);
      centralNode.content = contentMatch ? contentMatch[1] : `Mind map for ${centralNode.title}`;

      const moduleNodes = [];
      const topicMatches = fixedJson.matchAll(/"title"\s*:\s*"([^"]+)"/g);
      const titles = Array.from(topicMatches).map(match => match[1]).slice(1, 9); // Skip central node, limit to 8

      titles.forEach((title, i) => {
        moduleNodes.push({
          title,
          content: `Content related to ${title}`,
          subtopics: []
        });

        // Extract subtopics for this module
        const subtopicRegex = new RegExp(`"title"\\s*:\\s*"${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^{]*?{[^}]*?"subtopics"\\s*:\\s*\\[(.*?)\\]`, 's');
        const subtopicMatch = fixedJson.match(subtopicRegex);
        if (subtopicMatch && subtopicMatch[1]) {
          const subtopicTitles = subtopicMatch[1].match(/"title"\s*:\s*"([^"]+)"/g);
          if (subtopicTitles) {
            subtopicTitles.forEach(subtitleMatch => {
              const subtitle = subtitleMatch.match(/"title"\s*:\s*"([^"]+)"/)[1];
              moduleNodes[i].subtopics.push({
                title: subtitle,
                content: `Details about ${subtitle}`
              });
            });
          }
        }
      });

      const reconstructedStructure = isParsedStructure
        ? {
            parsed_structure: {
              main_subject: {
                title: centralNode.title,
                description: centralNode.content
              },
              units: moduleNodes.map(module => ({
                title: module.title,
                description: module.content,
                subtopics: module.subtopics
              }))
            }
          }
        : {
            mind_map: {
              central_node: centralNode,
              module_nodes: moduleNodes.length ? moduleNodes : [
                { title: "Topic 1", content: "Fallback content", subtopics: [] }
              ]
            }
          };

      return JSON.stringify(reconstructedStructure);
    }
  } catch (error) {
    console.error("Failed to fix JSON:", error.message);
    return JSON.stringify({
      mind_map: {
        central_node: {
          title: "Error Recovery",
          content: "An error occurred while parsing the mind map data.",
          description: "Fallback content"
        },
        module_nodes: [
          { title: "Topic 1", content: "Fallback content", subtopics: [] }
        ]
      }
    });
  }
};

module.exports = { fixBrokenJSON };