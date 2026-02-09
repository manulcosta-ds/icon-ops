import JSZip from 'jszip';
import { StyleVariantInfo } from '../types';

const STYLE_KEYWORDS = [
  // Basic styles
  'outline', 'outlined', 'line', 'stroke',
  'filled', 'fill', 'solid', 'regular',
  'light', 'thin', 'bold', 'rounded', 'sharp',
  // Multi-tone styles
  'duotone', 'duo', 'two-tone', 'twotone', 'dual',
  // Weight variations
  'heavy', 'medium', 'extra-light', 'ultralight',
  // Special styles
  'tune', 'brand', 'color', 'gradient',
  // Line styles
  'dashed', 'dotted',
  // Size indicators (sometimes used as style)
  '16', '24', '32', '48', '64'
];

export async function extractSVGsFromZip(zipData: ArrayBuffer): Promise<StyleVariantInfo[]> {
  const zip = await JSZip.loadAsync(zipData);
  const svgFiles: StyleVariantInfo[] = [];
  
  // Collect all file paths first (skip macOS resource forks)
  const filePaths: string[] = [];
  zip.forEach((relativePath, file) => {
    if (!file.dir && relativePath.toLowerCase().endsWith('.svg')) {
      // Skip macOS resource forks and metadata files
      const filename = relativePath.split('/').pop() || '';
      if (relativePath.includes('__MACOSX') || filename.startsWith('._') || filename.startsWith('.DS')) {
        return;
      }
      filePaths.push(relativePath);
    }
  });
  
  // Process each file one by one
  for (let i = 0; i < filePaths.length; i++) {
    const relativePath = filePaths[i];
    const file = zip.file(relativePath);
    
    if (!file) continue;
    
    try {
      const content = await file.async('string');
      const filename = relativePath.split('/').pop() || relativePath;
      const folderPath = relativePath.substring(0, relativePath.lastIndexOf('/'));
      
      const parsed = parseIconNameAndStyle(filename, folderPath, content);
      const isStrokeBased = detectStrokeUsage(content);
      
      svgFiles.push({
        baseIconName: parsed.baseIconName,
        style: parsed.style,
        originalFilename: filename,
        svgContent: content,
        folderPath: folderPath,
        isStrokeBased: isStrokeBased
      });
      
      if (isStrokeBased) {
        console.log(`      🖊️  Stroke-based icon detected`);
      }
    } catch (e) {
      console.error('Error processing file:', relativePath, e);
    }
  }
  
  return svgFiles;
}

function parseIconNameAndStyle(filename: string, folderPath: string, svgContent?: string): { baseIconName: string; style: string } {
  // Remove .svg extension
  let name = filename.replace(/\.svg$/i, '');
  
  // PRIORITY 1: Check for style suffix in filename (most reliable!)
  const parts = name.split('-');
  const lastPart = parts.length > 0 ? parts[parts.length - 1].toLowerCase() : '';
  
  if (lastPart && STYLE_KEYWORDS.includes(lastPart)) {
    const style = lastPart;
    const baseIconName = parts.slice(0, -1).join('-');
    console.log(`      → Style from filename: "${style}"`);
    return { baseIconName: sanitizeName(baseIconName), style };
  }
  
  // PRIORITY 2: Check for style in folder path (also reliable!)
  const folders = folderPath.split('/').filter(f => f);
  for (const folder of folders.reverse()) {
    const folderLower = folder.toLowerCase();
    if (STYLE_KEYWORDS.includes(folderLower)) {
      console.log(`      → Style from folder: "${folderLower}"`);
      return { baseIconName: sanitizeName(name), style: folderLower };
    }
  }
  
  // PRIORITY 3: FALLBACK - If no name/folder indication, analyze SVG content
  if (svgContent) {
    const detectedStyle = detectStyleFromSVG(svgContent);
    if (detectedStyle !== 'regular') {
      console.log(`      → Style from SVG analysis: "${detectedStyle}"`);
      return { baseIconName: sanitizeName(name), style: detectedStyle };
    }
  }
  
  // Default: no style detected
  console.log(`      → No style detected, using: "regular"`);
  return { baseIconName: sanitizeName(name), style: 'regular' };
}

function detectStyleFromSVG(svgContent: string): string {
  // Find ALL fill and stroke attributes in the entire SVG
  const fillRegex = /fill="([^"]+)"/gi;
  const strokeRegex = /stroke="([^"]+)"/gi;
  
  // Extract all fill colors
  const fillColors: string[] = [];
  let fillMatch;
  while ((fillMatch = fillRegex.exec(svgContent)) !== null) {
    const color = fillMatch[1];
    if (color && color.toLowerCase() !== 'none' && color.toLowerCase() !== 'transparent') {
      fillColors.push(normalizeColor(color));
    }
  }
  
  // Extract all stroke colors
  const strokeColors: string[] = [];
  let strokeMatch;
  while ((strokeMatch = strokeRegex.exec(svgContent)) !== null) {
    const color = strokeMatch[1];
    if (color && color.toLowerCase() !== 'none' && color.toLowerCase() !== 'transparent') {
      strokeColors.push(normalizeColor(color));
    }
  }
  
  // Count UNIQUE colors
  const uniqueFillColors = new Set(fillColors);
  const uniqueStrokeColors = new Set(strokeColors);
  
  const hasFills = uniqueFillColors.size > 0;
  const hasStrokes = uniqueStrokeColors.size > 0;
  
  console.log(`      [Style Detection] unique fill colors: ${uniqueFillColors.size}, unique stroke colors: ${uniqueStrokeColors.size}`);
  if (hasFills) {
    console.log(`      → Fill colors: ${Array.from(uniqueFillColors).join(', ')}`);
  }
  if (hasStrokes) {
    console.log(`      → Stroke colors: ${Array.from(uniqueStrokeColors).join(', ')}`);
  }
  
  // RULE 1: If has ANY fills → NOT outline!
  if (hasFills) {
    // RULE 2: If 2+ DIFFERENT fill colors → duotone
    if (uniqueFillColors.size >= 2) {
      console.log(`      → Detected: DUOTONE (${uniqueFillColors.size} different colors)`);
      return 'duotone';
    }
    
    // RULE 3: If has fills (single color) → filled
    console.log(`      → Detected: FILLED (single fill color)`);
    return 'filled';
  }
  
  // RULE 4: Only if NO fills at all AND has strokes → outline
  if (hasStrokes && !hasFills) {
    console.log(`      → Detected: OUTLINE (strokes only, no fills)`);
    return 'outline';
  }
  
  // Fallback: couldn't determine
  console.log(`      → Detected: REGULAR (fallback)`);
  return 'regular';
}

// Normalize color to lowercase hex format for comparison
function normalizeColor(color: string): string {
  const c = color.trim().toLowerCase();
  
  // Convert named colors to hex (basic ones)
  const namedColors: Record<string, string> = {
    'black': '#000000',
    'white': '#ffffff',
    'red': '#ff0000',
    'green': '#00ff00',
    'blue': '#0000ff',
    'gray': '#808080',
    'grey': '#808080'
  };
  
  if (namedColors[c]) {
    return namedColors[c];
  }
  
  // If it's already hex, normalize it
  if (c.startsWith('#')) {
    // Expand shorthand hex (#fff -> #ffffff)
    if (c.length === 4) {
      return '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
    }
    return c;
  }
  
  // If it's rgb/rgba, convert to hex
  const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return '#' + r + g + b;
  }
  
  // Return as-is if we can't normalize
  return c;
}

export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Detects if an SVG uses stroke instead of fill
 * Returns true if the SVG primarily uses stroke attributes
 */
export function detectStrokeUsage(svgContent: string): boolean {
  // Count stroke vs fill usage
  const strokeMatches = svgContent.match(/stroke\s*=\s*["'][^"']+["']/gi) || [];
  const fillMatches = svgContent.match(/fill\s*=\s*["'][^"']+["']/gi) || [];
  
  // Check for stroke-width (strong indicator of stroke-based icon)
  const hasStrokeWidth = /stroke-width\s*[:=]/i.test(svgContent);
  
  // Check for fill="none" (common in stroke icons)
  const hasFillNone = /fill\s*=\s*["']none["']/i.test(svgContent);
  
  // If has stroke-width and fill:none, it's definitely stroke-based
  if (hasStrokeWidth && hasFillNone) {
    return true;
  }
  
  // If more strokes than fills, likely stroke-based
  if (strokeMatches.length > fillMatches.length) {
    return true;
  }
  
  return false;
}

export function groupByBaseIcon(svgFiles: StyleVariantInfo[]): Map<string, StyleVariantInfo[]> {
  const grouped = new Map<string, StyleVariantInfo[]>();
  
  for (const file of svgFiles) {
    const existing = grouped.get(file.baseIconName) || [];
    existing.push(file);
    grouped.set(file.baseIconName, existing);
  }
  
  return grouped;
}

export function assignStyleNames(variants: StyleVariantInfo[]): StyleVariantInfo[] {
  if (variants.length === 1) {
    return variants;
  }
  
  // Count occurrences of each style
  const styleCounts = new Map<string, number>();
  variants.forEach(v => {
    styleCounts.set(v.style, (styleCounts.get(v.style) || 0) + 1);
  });
  
  // Check if ALL styles are 'regular' (completely undetected)
  const allRegular = variants.every(v => v.style === 'regular');
  
  if (allRegular) {
    // Only in this case, use generic style-1, style-2, etc
    return variants.map((v, i) => {
      return {
        baseIconName: v.baseIconName,
        style: `style-${i + 1}`,
        originalFilename: v.originalFilename,
        svgContent: v.svgContent,
        folderPath: v.folderPath,
        isStrokeBased: v.isStrokeBased
      };
    });
  }
  
  // For detected styles, only add suffix if there are duplicates of the SAME style
  const usedStyles = new Map<string, number>();
  
  return variants.map(v => {
    const currentCount = usedStyles.get(v.style) || 0;
    usedStyles.set(v.style, currentCount + 1);
    
    // Only add suffix if this style appears multiple times
    if (styleCounts.get(v.style)! > 1 && currentCount > 0) {
      return {
        baseIconName: v.baseIconName,
        style: `${v.style}-${currentCount + 1}`,
        originalFilename: v.originalFilename,
        svgContent: v.svgContent,
        folderPath: v.folderPath,
        isStrokeBased: v.isStrokeBased
      };
    }
    
    return v;
  });
}
