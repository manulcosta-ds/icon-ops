// Polyfill for setImmediate (required by JSZip in Figma environment)
if (typeof setImmediate === 'undefined') {
  (globalThis as any).setImmediate = (fn: Function) => {
    return setTimeout(fn, 0);
  };
}

import { ImportOptions, AuditReport } from './types';
import { 
  extractSVGsFromZip, 
  groupByBaseIcon, 
  assignStyleNames 
} from './utils/svg-parser';
import { 
  createComponentSet, 
  createSingleComponent 
} from './utils/variant-utils';
import { 
  createImportFrame, 
  layoutComponentsInFrame, 
  getNodesForAudit 
} from './utils/layout-utils';
import { runAudit } from './utils/audit-engine';
import { applyFixes, generateFixPreview } from './utils/fix-engine';
import { generateMetadataFromName, analyzeIconGeometry } from './utils/metadata-generator';
import { analyzeIconStyle } from './utils/style-analyzer';

figma.showUI(__html__, { width: 480, height: 640, themeColors: true });

let currentAuditReport: AuditReport | null = null;

figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case 'import-zip':
        await handleImportZip(msg.payload.zipData, msg.payload.options);
        break;
      
      case 'run-audit':
        await handleRunAudit(msg.payload.scope, msg.payload.options);
        break;
      
      case 'zoom-to-node':
        await handleZoomToNode(msg.payload.nodeId);
        break;
      
      case 'select-nodes':
        await handleSelectNodes(msg.payload.nodeIds);
        break;
      
      case 'apply-fixes':
        await handleApplyFixes(msg.payload.issueIds);
        break;
      
      case 'generate-fix-preview':
        await handleGenerateFixPreview(msg.payload.issueIds);
        break;
      
      case 'load-published-icons':
        await handleLoadPublishedIcons();
        break;
      
      case 'insert-icon':
        await handleInsertIcon(msg.payload.iconId);
        break;
      
      case 'save-metadata':
        await handleSaveMetadata(msg.payload.iconId, msg.payload.metadata);
        break;
      
      case 'autofill-metadata':
        await handleAutofillMetadata(msg.payload.iconId);
        break;
      
      case 'autofill-all-metadata':
        await handleAutofillAllMetadata();
        break;
      
      case 'export-report':
        figma.ui.postMessage({
          type: 'report-exported',
          payload: currentAuditReport
        });
        break;
      
      default:
        console.log('Unknown message type:', msg.type);
    }
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Unknown error' }
    });
  }
};

async function handleImportZip(zipData: ArrayBuffer, options: ImportOptions) {
  try {
    console.log('Starting ZIP import...');
    
    // Extract SVGs from ZIP
    console.log('Extracting SVGs from ZIP...');
    const svgFiles = await extractSVGsFromZip(zipData);
    console.log('Extracted', svgFiles.length, 'SVG files');
    
    if (svgFiles.length === 0) {
      figma.ui.postMessage({
        type: 'error',
        payload: { message: 'No SVG files found in ZIP' }
      });
      return;
    }
    
    // Group by base icon name
    console.log('Grouping icons...');
    const grouped = groupByBaseIcon(svgFiles);
    console.log('Grouped into', grouped.size, 'icon families');
    
    // Create import frame
    console.log('Creating import frame...');
    const importFrame = createImportFrame();
    figma.currentPage.appendChild(importFrame);
    
    const components: (ComponentNode | ComponentSetNode)[] = [];
    const totalIcons = grouped.size;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    
    const hasMultipleSizes = options.sizes.length > 1;
    const usedStyles = new Set<string>();
    const usedSizes = new Set<number>();
    
    // Process each icon group
    console.log('[6/8] Processing', totalIcons, 'icon groups...');
    const groupedArray = Array.from(grouped);
    
    for (let idx = 0; idx < groupedArray.length; idx++) {
      const [baseIconName, variants] = groupedArray[idx];
      console.log(`  [${idx + 1}/${totalIcons}] Processing:`, baseIconName, `(${variants.length} variants)`);
      
      try {
        // Assign style names if needed
        const processedVariants = assignStyleNames(variants);
        
        // Track what's being used
        processedVariants.forEach(v => usedStyles.add(v.style));
        options.sizes.forEach(s => usedSizes.add(s));
        
        // Determine if we need a component set
        const hasMultipleStyles = processedVariants.length > 1;
        const needsComponentSet = hasMultipleStyles || hasMultipleSizes;
        
        if (needsComponentSet) {
          console.log(`    → Creating ComponentSet`);
          // Create component set with variants
          const componentSet = await createComponentSet(
            baseIconName,
            processedVariants,
            options.sizes,
            options
          );
          
          if (componentSet) {
            components.push(componentSet);
            succeeded++;
            console.log(`    ✅ ComponentSet created`);
          } else {
            failed++;
            console.log(`    ❌ ComponentSet failed - all variants invalid`);
          }
        } else {
          console.log(`    → Creating single Component`);
          // Single component
          const targetSize = options.sizes.length === 1 ? options.sizes[0] : undefined;
          const component = await createSingleComponent(processedVariants[0], targetSize);
          
          if (component) {
            components.push(component);
            succeeded++;
            console.log(`    ✅ Component created`);
          } else {
            failed++;
            console.log(`    ❌ Component failed - invalid SVG`);
          }
        }
        
      } catch (err) {
        console.error(`    ❌ Failed to create component for "${baseIconName}"`);
        console.error(`       Error:`, err);
        failed++;
        // Don't throw - continue with other icons
      }
      
      processed++;
      
      // Send progress update every 10 icons or at the end
      if (processed % 10 === 0 || processed === totalIcons) {
        figma.ui.postMessage({
          type: 'import-progress',
          payload: { current: processed, total: totalIcons }
        });
      }
    }
    
    // Log summary
    console.log(`\n📊 Import Summary:`);
    console.log(`   Total: ${totalIcons} icon groups`);
    console.log(`   ✅ Succeeded: ${succeeded}`);
    console.log(`   ❌ Failed: ${failed}`);
    
    // Layout components in frame
    await layoutComponentsInFrame(importFrame, components);
    
    // Select the import frame
    figma.currentPage.selection = [importFrame];
    figma.viewport.scrollAndZoomIntoView([importFrame]);
    
    // Automatically run audit
    const auditOptions: ImportOptions = {
      sizes: options.sizes,
      allowedStrokeWeights: options.allowedStrokeWeights,
      outlineOnlyPolicy: options.outlineOnlyPolicy
    };
    
    const auditReport = runAudit(components, 'imported-icons', auditOptions);
    
    // Add metadata about what was used
    const variantProps = [];
    if (usedStyles.size > 1) variantProps.push('Style');
    if (hasMultipleSizes) variantProps.push('Size');
    
    auditReport.metadata = {
      importUsedSizes: options.sizes.length > 0,
      importUsedStyles: usedStyles.size > 1,
      variantProperties: variantProps
    };
    
    currentAuditReport = auditReport;
    
    figma.ui.postMessage({
      type: 'import-complete',
      payload: {
        totalIcons: components.length,
        auditReport
      }
    });
    
  } catch (error) {
    console.error('Import error:', error);
    figma.ui.postMessage({
      type: 'error',
      payload: { 
        message: error instanceof Error 
          ? `Import failed: ${error.message}` 
          : 'Import failed: Unknown error'
      }
    });
  }
}

async function handleRunAudit(scope: 'page' | 'selection' | 'all-components', options: ImportOptions) {
  try {
    const nodes = getNodesForAudit(scope);
    
    if (nodes.length === 0) {
      figma.ui.postMessage({
        type: 'error',
        payload: { message: 'No nodes found to audit' }
      });
      return;
    }
    
    const auditReport = runAudit(nodes, scope, options);
    currentAuditReport = auditReport;
    
    figma.ui.postMessage({
      type: 'audit-complete',
      payload: auditReport
    });
    
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Audit failed' }
    });
  }
}

async function handleZoomToNode(nodeId: string) {
  const node = figma.getNodeById(nodeId);
  if (node) {
    figma.currentPage.selection = [node as SceneNode];
    figma.viewport.scrollAndZoomIntoView([node]);
  }
}

async function handleSelectNodes(nodeIds: string[]) {
  const nodes = nodeIds
    .map(id => figma.getNodeById(id))
    .filter(n => n !== null) as SceneNode[];
  
  if (nodes.length > 0) {
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }
}

async function handleApplyFixes(issueIds: string[]) {
  if (!currentAuditReport) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: 'No audit report available' }
    });
    return;
  }
  
  try {
    const result = applyFixes(currentAuditReport.issues, issueIds);
    
    figma.ui.postMessage({
      type: 'fixes-applied',
      payload: result
    });
    
    // Re-run audit to update
    const scope = currentAuditReport.scope as 'page' | 'selection' | 'all-components';
    const nodes = getNodesForAudit(scope);
    const options: ImportOptions = {
      sizes: [],
      allowedStrokeWeights: [],
      outlineOnlyPolicy: false
    };
    const newReport = runAudit(nodes, scope, options);
    currentAuditReport = newReport;
    
    figma.ui.postMessage({
      type: 'audit-complete',
      payload: newReport
    });
    
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Fix failed' }
    });
  }
}

async function handleGenerateFixPreview(issueIds: string[]) {
  if (!currentAuditReport) {
    return;
  }
  
  const preview = generateFixPreview(currentAuditReport.issues, issueIds);
  
  figma.ui.postMessage({
    type: 'fix-preview',
    payload: { preview }
  });
}

async function handleLoadPublishedIcons() {
  try {
    console.log('📚 Loading published icons...');
    
    // Find all ComponentSets in the current page
    const componentSets = figma.currentPage.findAll(node => 
      node.type === 'COMPONENT_SET'
    ) as ComponentSetNode[];
    
    console.log(`Found ${componentSets.length} component sets`);
    
    const icons = [];
    
    for (const componentSet of componentSets) {
      try {
        // Get first variant for preview
        const firstVariant = componentSet.children[0] as ComponentNode;
        if (!firstVariant) continue;
        
        // Export preview as PNG
        const preview = await firstVariant.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 2 }
        });
        
        const base64 = figma.base64Encode(preview);
        
        // Extract metadata from component set properties
        const variantProps = componentSet.componentPropertyDefinitions;
        let style = '';
        let size = '';
        
        Object.entries(variantProps).forEach(([key, prop]) => {
          if (key.toLowerCase() === 'style' && prop.type === 'VARIANT') {
            style = prop.defaultValue;
          } else if (key.toLowerCase() === 'size' && prop.type === 'VARIANT') {
            size = prop.defaultValue;
          }
        });
        
        // Load saved metadata from pluginData
        let metadata = undefined;
        try {
          const savedMetadata = componentSet.getPluginData('icon-metadata');
          if (savedMetadata) {
            metadata = JSON.parse(savedMetadata);
          }
        } catch (err) {
          console.log(`No metadata for ${componentSet.name}`);
        }
        
        // Analyze icon style (outline/filled/duo-tone)
        const styleAnalysis = analyzeIconStyle(componentSet);
        console.log(`${componentSet.name} type: ${styleAnalysis.type} (confidence: ${styleAnalysis.confidence})`);
        
        icons.push({
          id: componentSet.id,
          name: componentSet.name,
          fullName: componentSet.description || componentSet.name,
          style,
          size,
          preview: `data:image/png;base64,${base64}`,
          iconType: styleAnalysis.type,
          metadata
        });
        
      } catch (err) {
        console.error(`Failed to process ${componentSet.name}:`, err);
      }
    }
    
    console.log(`✅ Loaded ${icons.length} icons`);
    
    figma.ui.postMessage({
      type: 'icons-loaded',
      payload: { icons }
    });
    
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Failed to load icons' }
    });
  }
}

async function handleSaveMetadata(iconId: string, metadata: any) {
  try {
    const componentSet = figma.getNodeById(iconId) as ComponentSetNode;
    
    if (!componentSet || componentSet.type !== 'COMPONENT_SET') {
      throw new Error('Icon not found');
    }
    
    // Save metadata to pluginData
    componentSet.setPluginData('icon-metadata', JSON.stringify(metadata));
    
    console.log(`✅ Saved metadata for ${componentSet.name}:`, metadata);
    
    figma.ui.postMessage({
      type: 'metadata-saved',
      payload: { iconId, metadata }
    });
    
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Failed to save metadata' }
    });
  }
}

async function handleAutofillMetadata(iconId: string) {
  try {
    const componentSet = figma.getNodeById(iconId) as ComponentSetNode;
    
    if (!componentSet || componentSet.type !== 'COMPONENT_SET') {
      throw new Error('Icon not found');
    }
    
    // Generate metadata from name
    const metadata = generateMetadataFromName(componentSet.name);
    
    // Enhance with geometry analysis
    const geometryEnhancements = analyzeIconGeometry(componentSet);
    
    // Merge tags
    if (geometryEnhancements.tags) {
      metadata.tags = [...new Set([...metadata.tags, ...geometryEnhancements.tags])];
    }
    
    // Use geometry category if more specific
    if (geometryEnhancements.category && metadata.category === 'other') {
      metadata.category = geometryEnhancements.category;
    }
    
    console.log(`🪄 Auto-generated metadata for ${componentSet.name}:`, metadata);
    
    figma.ui.postMessage({
      type: 'metadata-autofilled',
      payload: { iconId, metadata }
    });
    
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Failed to autofill metadata' }
    });
  }
}

async function handleAutofillAllMetadata() {
  try {
    console.log('🪄 Auto-filling metadata for all icons...');
    
    // Find all ComponentSets
    const componentSets = figma.currentPage.findAll(node => 
      node.type === 'COMPONENT_SET'
    ) as ComponentSetNode[];
    
    let count = 0;
    
    for (const componentSet of componentSets) {
      try {
        // Check if already has metadata
        const existingMetadata = componentSet.getPluginData('icon-metadata');
        if (existingMetadata) {
          console.log(`⊘ Skipping ${componentSet.name} (already has metadata)`);
          continue;
        }
        
        // Generate metadata from name
        const metadata = generateMetadataFromName(componentSet.name);
        
        // Enhance with geometry analysis
        const geometryEnhancements = analyzeIconGeometry(componentSet);
        
        // Merge tags
        if (geometryEnhancements.tags) {
          metadata.tags = [...new Set([...metadata.tags, ...geometryEnhancements.tags])];
        }
        
        // Use geometry category if more specific
        if (geometryEnhancements.category && metadata.category === 'other') {
          metadata.category = geometryEnhancements.category;
        }
        
        // Save metadata
        componentSet.setPluginData('icon-metadata', JSON.stringify(metadata));
        count++;
        
        console.log(`✅ Auto-filled ${componentSet.name}`);
        
      } catch (err) {
        console.error(`Failed to autofill ${componentSet.name}:`, err);
      }
    }
    
    console.log(`🎉 Auto-filled metadata for ${count} icons!`);
    
    figma.ui.postMessage({
      type: 'autofill-all-complete',
      payload: { count }
    });
    
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Failed to autofill all metadata' }
    });
  }
}

async function handleInsertIcon(iconId: string) {
  try {
    const componentSet = figma.getNodeById(iconId) as ComponentSetNode;
    
    if (!componentSet || componentSet.type !== 'COMPONENT_SET') {
      throw new Error('Icon not found');
    }
    
    // Get the default variant (first child)
    const defaultVariant = componentSet.defaultVariant || componentSet.children[0] as ComponentNode;
    
    if (!defaultVariant) {
      throw new Error('No variant found');
    }
    
    // Create instance at center of viewport
    const instance = defaultVariant.createInstance();
    
    // Position at center of viewport
    const bounds = figma.viewport.bounds;
    instance.x = bounds.x + bounds.width / 2;
    instance.y = bounds.y + bounds.height / 2;
    
    // Select the new instance
    figma.currentPage.selection = [instance];
    figma.viewport.scrollAndZoomIntoView([instance]);
    
    console.log(`✅ Inserted icon: ${componentSet.name}`);
    
  } catch (error) {
    figma.ui.postMessage({
      type: 'error',
      payload: { message: error instanceof Error ? error.message : 'Failed to insert icon' }
    });
  }
}
