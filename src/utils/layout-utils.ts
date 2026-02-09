export function createImportFrame(): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'Icon Guardian / Imported';
  
  // Horizontal auto-layout with wrap for grid
  frame.layoutMode = 'HORIZONTAL';
  frame.itemSpacing = 16;
  frame.counterAxisSpacing = 16;
  frame.paddingLeft = 24;
  frame.paddingRight = 24;
  frame.paddingTop = 24;
  frame.paddingBottom = 24;
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  
  // Fixed width of 1200px, hug height, wrap enabled
  frame.resize(1200, 100);
  frame.layoutSizingHorizontal = 'FIXED';
  frame.layoutSizingVertical = 'HUG';
  frame.layoutWrap = 'WRAP';
  
  return frame;
}

/**
 * Creates a labeled card for an icon with name below
 * NOTE: Fonts must be loaded before calling this function
 */
async function createIconCard(
  component: ComponentNode | ComponentSetNode,
  iconName: string
): Promise<FrameNode> {
  // Create container frame with vertical auto-layout
  const card = figma.createFrame();
  card.name = `Card: ${iconName}`;
  card.layoutMode = 'VERTICAL';
  card.itemSpacing = 8;
  card.paddingLeft = 12;
  card.paddingRight = 12;
  card.paddingTop = 12;
  card.paddingBottom = 12;
  
  // Hug contents
  card.layoutSizingHorizontal = 'HUG';
  card.layoutSizingVertical = 'HUG';
  
  // Background
  card.fills = [{ type: 'SOLID', color: { r: 0.97, g: 0.97, b: 0.97 } }];
  card.cornerRadius = 8;
  
  // Icon component in the center
  card.appendChild(component);
  
  // Icon name below (font already loaded by parent function)
  const nameText = figma.createText();
  nameText.name = 'Icon Name';
  nameText.characters = iconName;
  nameText.fontSize = 11;
  nameText.fills = [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }];
  
  card.appendChild(nameText);
  
  return card;
}

export async function layoutComponentsInFrame(
  frame: FrameNode,
  components: (ComponentNode | ComponentSetNode)[],
  styleInfo?: Map<string, number>
) {
  // Load fonts once at the beginning
  try {
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' });
  } catch (e) {
    try {
      await figma.loadFontAsync({ family: 'Roboto', style: 'Regular' });
    } catch (e2) {
      // Use default
    }
  }
  
  // Sort components alphabetically by base name
  const sortedComponents = components.sort((a, b) => {
    let nameA = a.name;
    let nameB = b.name;
    
    // Get clean base names
    if (a.type === 'COMPONENT' && a.parent && a.parent.type === 'COMPONENT_SET') {
      nameA = a.parent.name;
    } else if (a.type === 'COMPONENT') {
      nameA = a.name.replace(/Style=[^,]+,?\s*/g, '').replace(/Size=[^,]+,?\s*/g, '').trim() || a.name;
    }
    
    if (b.type === 'COMPONENT' && b.parent && b.parent.type === 'COMPONENT_SET') {
      nameB = b.parent.name;
    } else if (b.type === 'COMPONENT') {
      nameB = b.name.replace(/Style=[^,]+,?\s*/g, '').replace(/Size=[^,]+,?\s*/g, '').trim() || b.name;
    }
    
    return nameA.toLowerCase().localeCompare(nameB.toLowerCase());
  });
  
  // Add each icon card directly to frame
  for (const comp of sortedComponents) {
    let iconName = comp.name;
    
    if (comp.type === 'COMPONENT' && comp.parent && comp.parent.type === 'COMPONENT_SET') {
      iconName = comp.parent.name;
    } else if (comp.type === 'COMPONENT') {
      iconName = comp.name.replace(/Style=[^,]+,?\s*/g, '').replace(/Size=[^,]+,?\s*/g, '').trim() || comp.name;
    }
    
    const card = await createIconCard(comp, iconName);
    frame.appendChild(card);
  }
}

export function createAuditFrame(originalNodes: SceneNode[]): FrameNode {
  const frame = figma.createFrame();
  frame.name = 'Icon Guardian / Audited - Re-layout';
  frame.resize(1200, 100);
  
  // Basic auto-layout - avoid problematic properties
  frame.layoutMode = 'HORIZONTAL';
  frame.itemSpacing = 24;
  frame.paddingLeft = 24;
  frame.paddingRight = 24;
  frame.paddingTop = 24;
  frame.paddingBottom = 24;
  
  // Clone nodes
  originalNodes.forEach(node => {
    const clone = node.clone();
    frame.appendChild(clone);
  });
  
  return frame;
}

export function getNodesForAudit(scope: 'page' | 'selection' | 'all-components'): SceneNode[] {
  switch (scope) {
    case 'page':
      return figma.currentPage.findAll(node => 
        node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
      ) as SceneNode[];
    
    case 'selection':
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        return [];
      }
      
      // If a frame is selected, get its children
      if (selection.length === 1 && selection[0].type === 'FRAME') {
        return selection[0].findAll(node =>
          node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
        ) as SceneNode[];
      }
      
      return selection as SceneNode[];
    
    case 'all-components':
      return figma.currentPage.findAll(node =>
        node.type === 'COMPONENT' || node.type === 'COMPONENT_SET'
      ) as SceneNode[];
    
    default:
      return [];
  }
}
