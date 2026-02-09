import { StyleVariantInfo, ImportOptions } from '../types';

// Simplify long icon names for Figma components
// "ad-advertisting-square-banner-interface" → "ad-advertisting"
// "user-check-validate--actions-close-checkmark-..." → "user-check-validate"
// "add-1-expand-cross-buttons-button-more-..." → "add-1-expand"
export function simplifyIconName(fullName: string): string {
  let name = fullName;
  
  // Remove file extensions
  name = name.replace(/\.\w+$/, '');
  
  // Handle double-dash separator: name--tags
  if (name.includes('--')) {
    name = name.split('--')[0];
  }
  
  // Split by common separators
  const parts = name.split(/[-_\s,]+/).filter(Boolean);
  
  // Remove common noise words
  const noise = new Set(['icon', 'ic', 'ico', 'svg', 'img', 'asset', 'copy', 'final', 'v2', 'v3', 'new', 'old']);
  const cleaned = parts.filter(p => !noise.has(p.toLowerCase()));
  
  const meaningful = cleaned.length > 0 ? cleaned : parts;
  
  // 3 words or fewer — keep as-is
  if (meaningful.length <= 3) {
    return meaningful.join('-');
  }
  
  // Otherwise take first 2-3 words (2 if first word is very descriptive, 3 otherwise)
  return meaningful.slice(0, 3).join('-');
}

function sanitizeSVG(svgContent: string): string {
  // Remove BOM and trim whitespace
  let cleaned = svgContent.replace(/^\uFEFF/, '').trim();
  
  // Ensure SVG tag exists
  if (!cleaned.toLowerCase().includes('<svg')) {
    throw new Error('Invalid SVG: missing <svg> tag');
  }
  
  // Extract SVG if it's wrapped in other content
  const svgMatch = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    cleaned = svgMatch[0];
  }
  
  // Ensure xmlns attribute exists
  if (!cleaned.includes('xmlns=')) {
    cleaned = cleaned.replace(/<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  
  // Remove any XML declarations
  cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
  
  // Remove any DOCTYPE declarations
  cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
  
  // Remove any comments
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove metadata and title tags (Figma doesn't need these)
  cleaned = cleaned.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
  cleaned = cleaned.replace(/<title[\s\S]*?<\/title>/gi, '');
  
  // Remove any script tags (security)
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

export async function createComponentFromSVG(
  svgContent: string,
  name: string,
  targetSize?: number
): Promise<ComponentNode | null> {
  try {
    // Validate and sanitize SVG
    if (!svgContent || svgContent.trim().length === 0) {
      throw new Error('SVG content is empty');
    }
    
    console.log(`\n      [SVG] Processing "${name}"`);
    console.log(`      → Original length: ${svgContent.length} chars`);
    console.log(`      → First 500 chars:\n${svgContent.substring(0, 500)}\n`);
    
    const cleanedSVG = sanitizeSVG(svgContent);
    
    console.log(`      → Cleaned length: ${cleanedSVG.length} chars`);
    console.log(`      → Has xmlns: ${cleanedSVG.includes('xmlns=')}`);
    console.log(`      → Cleaned first 500 chars:\n${cleanedSVG.substring(0, 500)}\n`);
    
    // Create node from SVG with explicit error handling
    console.log(`      → Attempting createNodeFromSvg...`);
    let svgNode: FrameNode;
    try {
      svgNode = figma.createNodeFromSvg(cleanedSVG);
      console.log(`      ✅ SVG node created successfully`);
    } catch (svgError) {
      console.error(`      ❌ createNodeFromSvg FAILED for "${name}"`);
      console.error(`      → Error: ${svgError instanceof Error ? svgError.message : String(svgError)}`);
      console.error(`      → This SVG will be SKIPPED`);
      console.error(`      → Full cleaned SVG:\n${cleanedSVG}\n`);
      
      // Return null to skip this SVG
      return null;
    }
    
    // Get original dimensions before any modifications
    const origWidth = svgNode.width;
    const origHeight = svgNode.height;
    
    // Calculate target dimensions
    let finalWidth = origWidth;
    let finalHeight = origHeight;
    
    if (targetSize) {
      const maxDim = Math.max(origWidth, origHeight);
      if (maxDim > 0) {
        const scale = targetSize / maxDim;
        finalWidth = origWidth * scale;
        finalHeight = origHeight * scale;
        
        // Apply scaling
        svgNode.resize(finalWidth, finalHeight);
      }
    }
    
    // Create component
    const component = figma.createComponent();
    component.name = name;
    component.resize(finalWidth, finalHeight);
    
    // Reset position and add to component
    svgNode.x = 0;
    svgNode.y = 0;
    component.appendChild(svgNode);
    
    console.log(`      ✅ Component created: ${finalWidth}x${finalHeight}`);
    
    return component;
    
  } catch (err) {
    console.error(`\n❌ Error creating component "${name}"`);
    console.error(`   SVG length: ${svgContent ? svgContent.length : 0}`);
    console.error(`   Error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

export async function createComponentSet(
  baseIconName: string,
  variants: StyleVariantInfo[],
  sizes: number[],
  options: ImportOptions
): Promise<ComponentSetNode | null> {
  const components: ComponentNode[] = [];
  const hasMultipleSizes = sizes.length > 1;
  const hasMultipleStyles = variants.length > 1;
  
  // Create all variant combinations
  for (const variant of variants) {
    if (sizes.length === 0) {
      // No sizes specified, use original dimensions
      const comp = await createComponentFromSVG(
        variant.svgContent,
        baseIconName
      );
      
      if (comp) { // Only add if not null (not skipped)
        if (hasMultipleStyles) {
          comp.name = `Style=${variant.style}`;
        }
        components.push(comp);
      }
    } else {
      for (const size of sizes) {
        const comp = await createComponentFromSVG(
          variant.svgContent,
          baseIconName,
          size
        );
        
        if (comp) { // Only add if not null (not skipped)
          // Set variant property name
          if (hasMultipleStyles && hasMultipleSizes) {
            comp.name = `Style=${variant.style}, Size=${size}`;
          } else if (hasMultipleStyles) {
            comp.name = `Style=${variant.style}`;
          } else if (hasMultipleSizes) {
            comp.name = `Size=${size}`;
          }
          
          components.push(comp);
        }
      }
    }
  }
  
  // If all SVGs failed, return null
  if (components.length === 0) {
    console.error(`      ❌ All variants failed for "${baseIconName}" - skipping`);
    return null;
  }
  
  // Position components in grid
  layoutComponentsInGrid(components, variants.length, sizes.length || 1);
  
  // Combine into component set
  const componentSet = figma.combineAsVariants(components, figma.currentPage);
  const simplified = simplifyIconName(baseIconName);
  componentSet.name = simplified;
  // Store full original name in description for searchability
  if (simplified !== baseIconName) {
    componentSet.description = baseIconName;
  }
  
  return componentSet;
}

function layoutComponentsInGrid(
  components: ComponentNode[],
  numStyles: number,
  numSizes: number
) {
  const GAP = 24;
  let x = 0;
  let y = 0;
  let rowHeight = 0;
  
  for (let i = 0; i < components.length; i++) {
    const comp = components[i];
    const col = i % numSizes;
    const row = Math.floor(i / numSizes);
    
    if (col === 0 && i > 0) {
      // New row
      x = 0;
      y += rowHeight + GAP;
      rowHeight = 0;
    }
    
    comp.x = x;
    comp.y = y;
    
    x += comp.width + GAP;
    rowHeight = Math.max(rowHeight, comp.height);
  }
}

export async function createSingleComponent(
  variant: StyleVariantInfo,
  targetSize?: number
): Promise<ComponentNode | null> {
  const comp = await createComponentFromSVG(
    variant.svgContent,
    variant.baseIconName,
    targetSize
  );
  if (comp) {
    const simplified = simplifyIconName(variant.baseIconName);
    // Store full name in description before renaming
    if (simplified !== variant.baseIconName) {
      comp.description = variant.baseIconName;
    }
    comp.name = simplified;
  }
  return comp;
}
