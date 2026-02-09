/**
 * Analyze icon to detect if it's outline, filled, or duo-tone
 */

export interface IconStyleAnalysis {
  type: 'outline' | 'filled' | 'duo-tone' | 'mixed';
  hasFills: boolean;
  hasStrokes: boolean;
  fillColors: string[]; // Hex colors found
  strokeColors: string[]; // Hex colors found
  strokeWeights: number[];
  confidence: number; // 0-1
}

/**
 * Analyze a component to determine its icon style
 */
export function analyzeIconStyle(node: ComponentNode | ComponentSetNode): IconStyleAnalysis {
  let nodeToAnalyze: SceneNode;
  
  if (node.type === 'COMPONENT_SET') {
    nodeToAnalyze = node.children[0] as ComponentNode;
  } else {
    nodeToAnalyze = node;
  }
  
  if (!nodeToAnalyze || nodeToAnalyze.type !== 'COMPONENT') {
    return {
      type: 'mixed',
      hasFills: false,
      hasStrokes: false,
      fillColors: [],
      strokeColors: [],
      strokeWeights: [],
      confidence: 0
    };
  }
  
  const analysis = analyzeNode(nodeToAnalyze);
  
  // Determine type based on what we found
  const type = determineIconType(analysis);
  const confidence = calculateConfidence(analysis, type);
  
  return {
    hasFills: analysis.hasFills,
    hasStrokes: analysis.hasStrokes,
    fillColors: analysis.fillColors,
    strokeColors: analysis.strokeColors,
    strokeWeights: analysis.strokeWeights,
    type,
    confidence
  };
}

function analyzeNode(node: SceneNode): Omit<IconStyleAnalysis, 'type' | 'confidence'> {
  const fillColors = new Set<string>();
  const strokeColors = new Set<string>();
  const strokeWeights = new Set<number>();
  let hasFills = false;
  let hasStrokes = false;
  
  function traverse(n: SceneNode) {
    // Check for fills
    if ('fills' in n && Array.isArray(n.fills)) {
      const visibleFills = n.fills.filter(f => 
        f.type === 'SOLID' && f.visible !== false && f.opacity !== 0
      );
      
      if (visibleFills.length > 0) {
        hasFills = true;
        visibleFills.forEach(fill => {
          if (fill.type === 'SOLID') {
            const hex = rgbToHex(fill.color);
            fillColors.add(hex);
          }
        });
      }
    }
    
    // Check for strokes
    if ('strokes' in n && Array.isArray(n.strokes)) {
      const visibleStrokes = n.strokes.filter(s => 
        s.type === 'SOLID' && s.visible !== false && s.opacity !== 0
      );
      
      if (visibleStrokes.length > 0) {
        hasStrokes = true;
        visibleStrokes.forEach(stroke => {
          if (stroke.type === 'SOLID') {
            const hex = rgbToHex(stroke.color);
            strokeColors.add(hex);
          }
        });
        
        if ('strokeWeight' in n && typeof n.strokeWeight === 'number') {
          strokeWeights.add(n.strokeWeight);
        }
      }
    }
    
    // Traverse children
    if ('children' in n) {
      n.children.forEach(child => traverse(child));
    }
  }
  
  traverse(node);
  
  return {
    hasFills,
    hasStrokes,
    fillColors: Array.from(fillColors),
    strokeColors: Array.from(strokeColors),
    strokeWeights: Array.from(strokeWeights)
  };
}

function determineIconType(analysis: Omit<IconStyleAnalysis, 'type' | 'confidence'>): IconStyleAnalysis['type'] {
  const { hasFills, hasStrokes, fillColors, strokeColors } = analysis;
  
  // Duo-tone: Multiple fill colors OR both fills and strokes
  if (fillColors.length >= 2 || (fillColors.length >= 1 && strokeColors.length >= 1)) {
    return 'duo-tone';
  }
  
  // Filled: Has fills, minimal/no strokes
  if (hasFills && !hasStrokes) {
    return 'filled';
  }
  
  // Outline: Has strokes, minimal/no fills
  if (hasStrokes && !hasFills) {
    return 'outline';
  }
  
  // Both fills and strokes with single color each
  if (hasFills && hasStrokes && fillColors.length === 1 && strokeColors.length === 1) {
    // If same color, probably outline with background
    if (fillColors[0] === strokeColors[0]) {
      return 'outline';
    }
    return 'duo-tone';
  }
  
  return 'mixed';
}

function calculateConfidence(
  analysis: Omit<IconStyleAnalysis, 'type' | 'confidence'>, 
  type: IconStyleAnalysis['type']
): number {
  const { hasFills, hasStrokes, fillColors, strokeColors } = analysis;
  
  // High confidence for clear cases
  if (type === 'outline' && hasStrokes && !hasFills) return 1.0;
  if (type === 'filled' && hasFills && !hasStrokes) return 1.0;
  if (type === 'duo-tone' && fillColors.length >= 2) return 0.9;
  
  // Medium confidence for mixed cases
  if (type === 'duo-tone' && hasFills && hasStrokes) return 0.7;
  
  // Lower confidence for ambiguous
  return 0.5;
}

function rgbToHex(color: RGB): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Apply a color variable to all fills/strokes in an icon
 */
export function applyColorVariable(
  node: ComponentNode | ComponentSetNode,
  variableId: string,
  target: 'fills' | 'strokes' | 'both'
) {
  let nodeToProcess: SceneNode;
  
  if (node.type === 'COMPONENT_SET') {
    // Apply to all variants
    node.children.forEach(child => {
      if (child.type === 'COMPONENT') {
        applyToNode(child, variableId, target);
      }
    });
    return;
  } else {
    nodeToProcess = node;
  }
  
  applyToNode(nodeToProcess, variableId, target);
}

function applyToNode(node: SceneNode, variableId: string, target: 'fills' | 'strokes' | 'both') {
  function traverse(n: SceneNode) {
    // Apply to fills
    if ((target === 'fills' || target === 'both') && 'fills' in n) {
      if (Array.isArray(n.fills) && n.fills.length > 0) {
        const fill = n.fills[0];
        if (fill.type === 'SOLID') {
          try {
            n.fillStyleId = variableId;
          } catch (e) {
            console.log('Could not apply fill variable:', e);
          }
        }
      }
    }
    
    // Apply to strokes
    if ((target === 'strokes' || target === 'both') && 'strokes' in n) {
      if (Array.isArray(n.strokes) && n.strokes.length > 0) {
        const stroke = n.strokes[0];
        if (stroke.type === 'SOLID') {
          try {
            n.strokeStyleId = variableId;
          } catch (e) {
            console.log('Could not apply stroke variable:', e);
          }
        }
      }
    }
    
    // Traverse children
    if ('children' in n) {
      n.children.forEach(child => traverse(child));
    }
  }
  
  traverse(node);
}
