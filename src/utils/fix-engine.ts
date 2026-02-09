import { AuditIssue, FixAction } from '../types';
import { sanitizeName } from './svg-parser';

export function applyFixes(issues: AuditIssue[], selectedIssueIds: string[]): {
  applied: number;
  failed: number;
  summary: string[];
} {
  const summary: string[] = [];
  let applied = 0;
  let failed = 0;
  
  // Group issues by type for efficient processing
  const selectedIssues = issues.filter(i => selectedIssueIds.includes(i.id));
  
  // Process duplicates first (delete operations)
  const duplicates = selectedIssues.filter(i => i.type === 'duplicate');
  const duplicateResult = fixDuplicates(duplicates);
  applied += duplicateResult.applied;
  failed += duplicateResult.failed;
  summary.push.apply(summary, duplicateResult.summary);
  
  // Process stroke thickness issues
  const strokeIssues = selectedIssues.filter(i => i.type === 'stroke-thickness');
  const strokeResult = fixStrokeThickness(strokeIssues);
  applied += strokeResult.applied;
  failed += strokeResult.failed;
  summary.push.apply(summary, strokeResult.summary);
  
  // Process fill policy violations
  const fillIssues = selectedIssues.filter(i => i.type === 'fill-policy');
  const fillResult = fixFillPolicy(fillIssues);
  applied += fillResult.applied;
  failed += fillResult.failed;
  summary.push.apply(summary, fillResult.summary);
  
  // Process geometry cleanup
  const geometryIssues = selectedIssues.filter(i => i.type === 'geometry');
  const geometryResult = fixGeometry(geometryIssues);
  applied += geometryResult.applied;
  failed += geometryResult.failed;
  summary.push.apply(summary, geometryResult.summary);
  
  // Process naming issues
  const namingIssues = selectedIssues.filter(i => i.type === 'naming');
  const namingResult = fixNaming(namingIssues);
  applied += namingResult.applied;
  failed += namingResult.failed;
  summary.push.apply(summary, namingResult.summary);
  
  return { applied, failed, summary };
}

function fixDuplicates(issues: AuditIssue[]): { applied: number; failed: number; summary: string[] } {
  const summary: string[] = [];
  let applied = 0;
  let failed = 0;
  
  // Group by groupId
  const groups = new Map<string, AuditIssue[]>();
  for (const issue of issues) {
    if (!issue.groupId) continue;
    const group = groups.get(issue.groupId) || [];
    group.push(issue);
    groups.set(issue.groupId, group);
  }
  
  // For each group, keep first and delete others
  const groupsArray = Array.from(groups);
  for (const [groupId, groupIssues] of groupsArray) {
    if (groupIssues.length <= 1) continue;
    
    const keep = groupIssues[0];
    const toDelete = groupIssues.slice(1);
    let deletedCount = 0;
    
    for (const issue of toDelete) {
      const node = figma.getNodeById(issue.nodeId);
      if (node) {
        try {
          // Check if node is inside a "Card: ..." frame
          // If so, delete the entire card instead of just the component
          let nodeToDelete: SceneNode = node;
          
          if (node.parent && node.parent.type === 'FRAME') {
            const parentFrame = node.parent as FrameNode;
            // Check if parent is a card (name starts with "Card:")
            if (parentFrame.name.startsWith('Card:')) {
              nodeToDelete = parentFrame;
              console.log(`Deleting card "${parentFrame.name}" containing duplicate "${node.name}"`);
            }
          }
          
          nodeToDelete.remove();
          deletedCount++;
          applied++;
        } catch (e) {
          failed++;
        }
      }
    }
    
    if (deletedCount > 0) {
      summary.push(`Removed ${deletedCount} duplicate(s) of "${keep.nodeName}"`);
    }
  }
  
  return { applied, failed, summary };
}

function fixStrokeThickness(issues: AuditIssue[]): { applied: number; failed: number; summary: string[] } {
  const summary: string[] = [];
  let applied = 0;
  let failed = 0;
  
  const issuesByNode = new Map<string, AuditIssue[]>();
  for (const issue of issues) {
    const nodeIssues = issuesByNode.get(issue.nodeId) || [];
    nodeIssues.push(issue);
    issuesByNode.set(issue.nodeId, nodeIssues);
  }
  
  const issuesByNodeArray = Array.from(issuesByNode);
  for (const [nodeId, nodeIssues] of issuesByNodeArray) {
    const node = figma.getNodeById(nodeId);
    if (!node || !('findAll' in node)) continue;
    
    // Get allowed weights from first issue
    const allowedWeights = nodeIssues[0].details && nodeIssues[0].details.allowedWeights || [];
    if (allowedWeights.length === 0) continue;
    
    const vectors = node.findAll(n => n.type === 'VECTOR') as VectorNode[];
    let fixedCount = 0;
    
    for (const vec of vectors) {
      if (typeof vec.strokeWeight === 'number') {
        const current = vec.strokeWeight;
        if (!allowedWeights.includes(current)) {
          const nearest = findNearestValue(current, allowedWeights);
          try {
            vec.strokeWeight = nearest;
            fixedCount++;
            applied++;
          } catch (e) {
            failed++;
          }
        }
      }
    }
    
    if (fixedCount > 0) {
      summary.push(`Fixed ${fixedCount} stroke weight(s) in "${node.name}"`);
    }
  }
  
  return { applied, failed, summary };
}

function fixFillPolicy(issues: AuditIssue[]): { applied: number; failed: number; summary: string[] } {
  const summary: string[] = [];
  let applied = 0;
  let failed = 0;
  
  const issuesByNode = new Map<string, AuditIssue[]>();
  for (const issue of issues) {
    const nodeIssues = issuesByNode.get(issue.nodeId) || [];
    nodeIssues.push(issue);
    issuesByNode.set(issue.nodeId, nodeIssues);
  }
  
  const issuesByNodeArray2 = Array.from(issuesByNode);
  for (const [nodeId, nodeIssues] of issuesByNodeArray2) {
    const node = figma.getNodeById(nodeId);
    if (!node || !('findAll' in node)) continue;
    
    let fixedCount = 0;
    
    for (const issue of nodeIssues) {
      const vecId = issue.details && issue.details.vectorId;
      if (!vecId) continue;
      
      const vec = figma.getNodeById(vecId) as VectorNode | null;
      if (!vec || vec.type !== 'VECTOR') continue;
      
      try {
        // Convert fill to stroke
        const fills = Array.isArray(vec.fills) ? vec.fills : [];
        const visibleFill = fills.find(f => f.visible !== false);
        
        if (visibleFill && visibleFill.type === 'SOLID') {
          // Create stroke object carefully to avoid extensibility issues
          const strokeObj = { type: 'SOLID' as const, color: visibleFill.color };
          const strokesArray = [strokeObj];
          vec.strokes = strokesArray;
          vec.strokeWeight = 1.5;
          
          // Clear fills carefully
          const emptyFills: Paint[] = [];
          vec.fills = emptyFills;
          
          fixedCount++;
          applied++;
        }
      } catch (e) {
        failed++;
      }
    }
    
    if (fixedCount > 0) {
      summary.push(`Converted ${fixedCount} fill(s) to stroke in "${node.name}"`);
    }
  }
  
  return { applied, failed, summary };
}

function fixGeometry(issues: AuditIssue[]): { applied: number; failed: number; summary: string[] } {
  const summary: string[] = [];
  let applied = 0;
  let failed = 0;
  
  for (const issue of issues) {
    const layerId = (issue.details && issue.details.layerId) || (issue.details && issue.details.groupId);
    if (!layerId) continue;
    
    const layer = figma.getNodeById(layerId);
    if (!layer) continue;
    
    try {
      // Remove hidden, opacity 0, empty groups, and tiny nodes
      layer.remove();
      applied++;
    } catch (e) {
      failed++;
    }
  }
  
  if (applied > 0) {
    summary.push(`Cleaned up ${applied} geometry issue(s)`);
  }
  
  return { applied, failed, summary };
}

function fixNaming(issues: AuditIssue[]): { applied: number; failed: number; summary: string[] } {
  const summary: string[] = [];
  let applied = 0;
  let failed = 0;
  
  // Handle naming convention issues
  const conventionIssues = issues.filter(i => !i.message.includes('collision'));
  for (const issue of conventionIssues) {
    const node = figma.getNodeById(issue.nodeId);
    if (!node) continue;
    
    const suggested = issue.details && issue.details.suggested;
    if (!suggested) continue;
    
    try {
      node.name = suggested;
      applied++;
      summary.push(`Renamed "${issue.nodeName}" to "${suggested}"`);
    } catch (e) {
      failed++;
    }
  }
  
  // Handle collisions by adding suffixes
  const collisionIssues = issues.filter(i => i.message.includes('collision'));
  const collisionGroups = new Map<string, AuditIssue[]>();
  
  for (const issue of collisionIssues) {
    const group = collisionGroups.get(issue.nodeName) || [];
    group.push(issue);
    collisionGroups.set(issue.nodeName, group);
  }
  
  const collisionGroupsArray = Array.from(collisionGroups);
  for (const [baseName, group] of collisionGroupsArray) {
    for (let i = 1; i < group.length; i++) {
      const issue = group[i];
      const node = figma.getNodeById(issue.nodeId);
      if (!node) continue;
      
      const newName = `${baseName}-${i + 1}`;
      try {
        node.name = newName;
        applied++;
        summary.push(`De-conflicted "${baseName}" to "${newName}"`);
      } catch (e) {
        failed++;
      }
    }
  }
  
  return { applied, failed, summary };
}

function findNearestValue(target: number, allowed: number[]): number {
  return allowed.reduce((prev, curr) => 
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
  );
}

export function generateFixPreview(issues: AuditIssue[], selectedIssueIds: string[]): string[] {
  const preview: string[] = [];
  const selectedIssues = issues.filter(i => selectedIssueIds.includes(i.id));
  
  // Count by type
  const counts = new Map<string, number>();
  for (const issue of selectedIssues) {
    counts.set(issue.type, (counts.get(issue.type) || 0) + 1);
  }
  
  if (counts.get('duplicate')) {
    const dupGroups = new Set(
      selectedIssues.filter(i => i.type === 'duplicate' && i.groupId).map(i => i.groupId)
    ).size;
    preview.push(`Delete ${counts.get('duplicate')} duplicate icons (${dupGroups} groups)`);
  }
  
  if (counts.get('stroke-thickness')) {
    preview.push(`Fix ${counts.get('stroke-thickness')} stroke thickness issues`);
  }
  
  if (counts.get('fill-policy')) {
    preview.push(`Convert ${counts.get('fill-policy')} fills to strokes`);
  }
  
  if (counts.get('geometry')) {
    preview.push(`Clean up ${counts.get('geometry')} geometry issues`);
  }
  
  if (counts.get('naming')) {
    preview.push(`Fix ${counts.get('naming')} naming issues`);
  }
  
  return preview;
}
