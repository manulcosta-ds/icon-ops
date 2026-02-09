import { AuditIssue, AuditReport, ImportOptions } from '../types';
import { sanitizeName } from './svg-parser';

export function runAudit(
  nodes: SceneNode[],
  scope: string,
  options: ImportOptions
): AuditReport {
  const runId = `audit-${Date.now()}`;
  const issues: AuditIssue[] = [];
  
  // Run all audit checks
  const duplicateIssues = findDuplicates(nodes);
  const strokeIssues = checkStrokeThickness(nodes, options.allowedStrokeWeights);
  const fillPolicyIssues = checkFillPolicy(nodes, options.outlineOnlyPolicy);
  const geometryIssues = checkGeometry(nodes);
  const namingIssues = checkNaming(nodes);
  
  issues.push.apply(issues, duplicateIssues);
  issues.push.apply(issues, strokeIssues);
  issues.push.apply(issues, fillPolicyIssues);
  issues.push.apply(issues, geometryIssues);
  issues.push.apply(issues, namingIssues);
  
  const duplicateGroups = new Set(duplicateIssues.map(i => i.groupId).filter(Boolean)).size;
  
  return {
    runId,
    timestamp: Date.now(),
    scope,
    totals: {
      nodesScanned: nodes.length,
      issuesFound: issues.length,
      duplicateGroups
    },
    issues
  };
}

function findDuplicates(nodes: SceneNode[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  
  // Step 1: Detect duplicates by NAME (e.g., "icon 2", "icon copy")
  const nameBasedDuplicates = findNameBasedDuplicates(nodes);
  issues.push(...nameBasedDuplicates);
  
  // Step 2: Detect duplicates by GEOMETRY (same structure/appearance)
  const geometryBasedDuplicates = findGeometryBasedDuplicates(nodes);
  issues.push(...geometryBasedDuplicates);
  
  return issues;
}

/**
 * Detect duplicates by name patterns like "icon 2", "icon copy", "icon (2)"
 * These are accidental Figma duplicates that should be flagged
 */
function findNameBasedDuplicates(nodes: SceneNode[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const baseNameGroups = new Map<string, string[]>();
  
  for (const node of nodes) {
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') continue;
    
    // Skip variant components
    if (node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET') {
      continue;
    }
    
    const name = node.name;
    const baseName = getBaseName(name);
    
    const existing = baseNameGroups.get(baseName) || [];
    existing.push(node.id);
    baseNameGroups.set(baseName, existing);
  }
  
  // Create issues for name-based duplicates
  let groupIndex = 0;
  for (const [baseName, nodeIds] of baseNameGroups) {
    if (nodeIds.length > 1) {
      const groupId = `dup-name-${groupIndex++}`;
      
      for (const nodeId of nodeIds) {
        const node = figma.getNodeById(nodeId);
        if (node) {
          issues.push({
            id: `duplicate-name-${nodeId}`,
            type: 'duplicate',
            severity: 'warning',
            nodeId,
            nodeName: node.name,
            message: `Duplicate name found (${nodeIds.length} icons named "${baseName}" or similar)`,
            groupId,
            details: { totalInGroup: nodeIds.length, baseName, reason: 'name-pattern' }
          });
        }
      }
    }
  }
  
  return issues;
}

/**
 * Remove Figma duplicate suffixes like " 2", " copy", " (2)" to find base name
 * Also handles edge cases like "copy of X", "X-copy", "X-2-copy", etc
 */
function getBaseName(name: string): string {
  let baseName = name;
  
  // Remove "copy of X" prefix
  baseName = baseName.replace(/^copy\s+of\s+/i, '');
  
  // Remove "-\d+-copy" or "-\d+_copy" patterns: "icon-2-copy", "icon-3-copy"
  baseName = baseName.replace(/[-_]\d+[-_]copy$/i, '');
  
  // Remove "-copy" or "_copy" suffix: "icon-copy", "icon_copy"
  baseName = baseName.replace(/[-_]copy(\s+\d+)?$/i, '');
  
  // Remove " copy" suffix: "icon copy", "icon copy 2"
  baseName = baseName.replace(/\s+copy(\s+\d+)?$/i, '');
  
  // Remove (number) suffix: "icon (2)", "icon (3)"
  baseName = baseName.replace(/\s*\(\d+\)$/, '');
  
  // Remove "-\d+" or "_\d+" suffix: "icon-2", "icon_3"
  baseName = baseName.replace(/[-_]\d+$/, '');
  
  // Remove " \d+" suffix: "icon 2", "icon 3"
  baseName = baseName.replace(/\s+\d+$/, '');
  
  // Remove trailing whitespace and dashes/underscores
  baseName = baseName.replace(/[-_\s]+$/, '').trim();
  
  return baseName;
}

/**
 * Detect duplicates by geometry (same structure/appearance)
 */
function findGeometryBasedDuplicates(nodes: SceneNode[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const signatures = new Map<string, string[]>();
  
  for (const node of nodes) {
    if (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET') continue;
    
    // Skip variant components (children of ComponentSets)
    // Variants are not duplicates - they're different styles of the same icon!
    if (node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET') {
      continue;
    }
    
    const sig = getNodeSignature(node);
    const existing = signatures.get(sig) || [];
    existing.push(node.id);
    signatures.set(sig, existing);
  }
  
  // Find groups with duplicates
  let groupIndex = 0;
  const signaturesArray = Array.from(signatures);
  for (const [sig, nodeIds] of signaturesArray) {
    if (nodeIds.length > 1) {
      const groupId = `dup-geo-${groupIndex++}`;
      
      // Get base name from first node for the message
      const firstNode = figma.getNodeById(nodeIds[0]);
      let baseName = 'Unknown';
      if (firstNode) {
        if (firstNode.type === 'COMPONENT' && firstNode.parent && firstNode.parent.type === 'COMPONENT_SET') {
          baseName = firstNode.parent.name;
        } else if (firstNode.type === 'COMPONENT_SET') {
          baseName = firstNode.name;
        } else {
          baseName = firstNode.name
            .replace(/Style=[^,]+,?\s*/g, '')
            .replace(/Size=[^,]+,?\s*/g, '')
            .trim() || firstNode.name;
        }
      }
      
      for (const nodeId of nodeIds) {
        const node = figma.getNodeById(nodeId);
        if (node) {
          issues.push({
            id: `duplicate-geo-${nodeId}`,
            type: 'duplicate',
            severity: 'warning',
            nodeId,
            nodeName: node.name,
            message: `Exact duplicate found (${nodeIds.length} identical "${baseName}" icons)`,
            groupId,
            details: { totalInGroup: nodeIds.length, baseName, reason: 'geometry' }
          });
        }
      }
    }
  }
  
  return issues;
}

function getNodeSignature(node: SceneNode): string {
  const parts: string[] = [];
  
  // Get base icon name (not variant properties)
  let baseName = node.name;
  
  if (node.type === 'COMPONENT') {
    // For components in a set, get parent name (the ComponentSet name)
    if (node.parent && node.parent.type === 'COMPONENT_SET') {
      baseName = node.parent.name;
    } else {
      // For standalone components, remove variant properties from name
      baseName = node.name
        .replace(/Style=[^,]+,?\s*/g, '')
        .replace(/Size=[^,]+,?\s*/g, '')
        .trim() || node.name;
    }
  } else if (node.type === 'COMPONENT_SET') {
    // For component sets, use the set name directly
    baseName = node.name;
  }
  
  // IMPORTANT: Use BASE name to avoid false positives
  // Only icons with the SAME base name and similar structure are duplicates
  parts.push(baseName.toLowerCase());
  
  // Node type
  parts.push(node.type);
  
  // Dimensions (rounded to avoid float precision issues)
  if ('width' in node && 'height' in node) {
    parts.push(`${Math.round(node.width)}`);
    parts.push(`${Math.round(node.height)}`);
  }
  
  // Vector count
  if ('findAll' in node) {
    const vectors = node.findAll(n => n.type === 'VECTOR');
    parts.push(`v${vectors.length}`);
  }
  
  // Fills/strokes signature
  if ('fills' in node && node.fills !== figma.mixed) {
    const fills = Array.isArray(node.fills) ? node.fills : [];
    parts.push(`f${fills.filter(f => f.visible !== false).length}`);
  }
  
  if ('strokes' in node && node.strokes !== figma.mixed) {
    const strokes = Array.isArray(node.strokes) ? node.strokes : [];
    parts.push(`s${strokes.filter(s => s.visible !== false).length}`);
  }
  
  return parts.join('-');
}

function checkStrokeThickness(nodes: SceneNode[], allowedWeights: number[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  
  if (allowedWeights.length === 0) return issues;
  
  for (const node of nodes) {
    if (!('findAll' in node)) continue;
    
    const vectors = node.findAll(n => n.type === 'VECTOR') as VectorNode[];
    const weights = new Set<number>();
    
    // Only check icons that are predominantly outline-based
    // (have strokes and minimal fills)
    let hasStrokes = false;
    let hasManyFills = false;
    let fillCount = 0;
    let strokeCount = 0;
    
    for (const vec of vectors) {
      // Count strokes
      if (vec.strokes !== figma.mixed && Array.isArray(vec.strokes)) {
        const visibleStrokes = vec.strokes.filter(s => s.visible !== false);
        if (visibleStrokes.length > 0) {
          hasStrokes = true;
          strokeCount++;
          if (vec.strokeWeight && typeof vec.strokeWeight === 'number') {
            weights.add(vec.strokeWeight);
          }
        }
      }
      
      // Count fills
      if (vec.fills !== figma.mixed && Array.isArray(vec.fills)) {
        const visibleFills = vec.fills.filter(f => f.visible !== false);
        if (visibleFills.length > 0) {
          fillCount++;
        }
      }
    }
    
    hasManyFills = fillCount > strokeCount;
    
    // Skip filled icons (they're not outline-based)
    if (hasManyFills || !hasStrokes) continue;
    
    // Check for disallowed weights (only for outline icons)
    for (const weight of weights) {
      if (!allowedWeights.includes(weight)) {
        issues.push({
          id: `stroke-${node.id}-${weight}`,
          type: 'stroke-thickness',
          severity: 'warning',
          nodeId: node.id,
          nodeName: node.name,
          message: `Stroke weight ${weight}px not in allowed list (expected: ${allowedWeights.join(', ')}px)`,
          details: { weight, allowedWeights }
        });
      }
    }
    
    // Check for mixed weights
    if (weights.size > 1) {
      issues.push({
        id: `stroke-mixed-${node.id}`,
        type: 'stroke-thickness',
        severity: 'info',
        nodeId: node.id,
        nodeName: node.name,
        message: `Mixed stroke weights: ${Array.from(weights).join(', ')}px`,
        details: { weights: Array.from(weights) }
      });
    }
  }
  
  return issues;
}

function checkFillPolicy(nodes: SceneNode[], outlineOnly: boolean): AuditIssue[] {
  const issues: AuditIssue[] = [];
  
  if (!outlineOnly) return issues;
  
  for (const node of nodes) {
    if (!('findAll' in node)) continue;
    
    const vectors = node.findAll(n => n.type === 'VECTOR') as VectorNode[];
    
    for (const vec of vectors) {
      const hasFill = vec.fills !== figma.mixed && 
        Array.isArray(vec.fills) && 
        vec.fills.some(f => f.visible !== false);
      
      const hasStroke = vec.strokes !== figma.mixed &&
        Array.isArray(vec.strokes) &&
        vec.strokes.some(s => s.visible !== false);
      
      if (hasFill && !hasStroke) {
        issues.push({
          id: `fill-policy-${vec.id}`,
          type: 'fill-policy',
          severity: 'error',
          nodeId: node.id,
          nodeName: node.name,
          message: `Filled vector found (outline-only policy)`,
          details: { vectorId: vec.id, vectorName: vec.name }
        });
      }
    }
  }
  
  return issues;
}

function checkGeometry(nodes: SceneNode[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  
  for (const node of nodes) {
    if (!('findAll' in node)) continue;
    
    const descendants = node.findAll();
    
    for (const desc of descendants) {
      // Hidden layers
      if ('visible' in desc && desc.visible === false) {
        issues.push({
          id: `hidden-${desc.id}`,
          type: 'geometry',
          severity: 'info',
          nodeId: node.id,
          nodeName: node.name,
          message: `Hidden layer: ${desc.name}`,
          details: { layerId: desc.id, layerName: desc.name }
        });
      }
      
      // Opacity 0
      if ('opacity' in desc && desc.opacity === 0) {
        issues.push({
          id: `opacity-${desc.id}`,
          type: 'geometry',
          severity: 'info',
          nodeId: node.id,
          nodeName: node.name,
          message: `Zero opacity layer: ${desc.name}`,
          details: { layerId: desc.id, layerName: desc.name }
        });
      }
      
      // Empty groups
      if (desc.type === 'GROUP' && 'children' in desc && desc.children.length === 0) {
        issues.push({
          id: `empty-${desc.id}`,
          type: 'geometry',
          severity: 'warning',
          nodeId: node.id,
          nodeName: node.name,
          message: `Empty group: ${desc.name}`,
          details: { groupId: desc.id, groupName: desc.name }
        });
      }
      
      // Note: Removed "tiny nodes" check (<1px)
      // Small nodes are often intentional design details (dots, points, etc)
      // and shouldn't be flagged as errors
    }
  }
  
  return issues;
}

function checkNaming(nodes: SceneNode[]): AuditIssue[] {
  const issues: AuditIssue[] = [];
  const names = new Map<string, string[]>();
  
  for (const node of nodes) {
    // Skip variant components (children of ComponentSets)
    // Variant names like "Style=duotone, Size=16" are correct and should not be checked
    if (node.type === 'COMPONENT' && node.parent && node.parent.type === 'COMPONENT_SET') {
      continue;
    }
    
    const name = node.name;
    const sanitized = sanitizeName(name);
    
    // Check naming convention
    if (name !== sanitized) {
      issues.push({
        id: `naming-${node.id}`,
        type: 'naming',
        severity: 'warning',
        nodeId: node.id,
        nodeName: name,
        message: `Name doesn't follow convention: should be "${sanitized}"`,
        details: { current: name, suggested: sanitized }
      });
    }
    
    // Track for collision detection
    const existing = names.get(name) || [];
    existing.push(node.id);
    names.set(name, existing);
  }
  
  // Check for collisions
  const namesArray = Array.from(names);
  for (const [name, nodeIds] of namesArray) {
    if (nodeIds.length > 1) {
      for (let i = 0; i < nodeIds.length; i++) {
        const nodeId = nodeIds[i];
        const node = figma.getNodeById(nodeId);
        if (node) {
          issues.push({
            id: `collision-${nodeId}`,
            type: 'naming',
            severity: 'error',
            nodeId,
            nodeName: name,
            message: `Name collision (${nodeIds.length} nodes with same name)`,
            details: { totalCollisions: nodeIds.length }
          });
        }
      }
    }
  }
  
  return issues;
}
