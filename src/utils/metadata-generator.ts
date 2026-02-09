/**
 * Auto-generate metadata from icon name and geometry
 */

interface IconMetadata {
  category: string;
  tags: string[];
  description: string;
}

// Category keywords mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'navigation': ['arrow', 'chevron', 'menu', 'hamburger', 'breadcrumb', 'nav', 'direction', 'pointer'],
  'ui': ['button', 'input', 'checkbox', 'radio', 'toggle', 'switch', 'slider', 'close', 'x', 'plus', 'minus', 'check'],
  'social': ['facebook', 'twitter', 'instagram', 'linkedin', 'youtube', 'tiktok', 'pinterest', 'snapchat', 'whatsapp'],
  'files': ['folder', 'file', 'document', 'pdf', 'doc', 'download', 'upload', 'attach'],
  'communication': ['mail', 'email', 'message', 'chat', 'comment', 'notification', 'bell', 'phone', 'call'],
  'media': ['play', 'pause', 'stop', 'video', 'audio', 'music', 'volume', 'speaker', 'microphone', 'camera'],
  'editing': ['pen', 'pencil', 'brush', 'edit', 'crop', 'cut', 'copy', 'paste', 'undo', 'redo'],
  'arrows': ['arrow', 'chevron', 'caret', 'triangle'],
  'shapes': ['circle', 'square', 'rectangle', 'triangle', 'star', 'heart', 'diamond'],
  'weather': ['sun', 'moon', 'cloud', 'rain', 'snow', 'storm', 'wind', 'lightning'],
  'business': ['chart', 'graph', 'money', 'dollar', 'briefcase', 'analytics', 'trending']
};

// Comprehensive tag mappings with synonyms, translations, and contextual tags
const TAG_REPLACEMENTS: Record<string, string[]> = {
  // Navigation & Direction
  'arrow': ['direction', 'pointer', 'navigate', 'seta', 'direção', 'navigation'],
  'chevron': ['arrow', 'caret', 'direction', 'expand', 'collapse'],
  'menu': ['hamburger', 'navigation', 'nav', 'sidebar', 'drawer'],
  'home': ['house', 'homepage', 'start', 'main', 'início', 'casa', 'principal'],
  'back': ['return', 'previous', 'undo', 'voltar', 'anterior'],
  'forward': ['next', 'advance', 'continue', 'próximo', 'avançar'],
  
  // User & People
  'user': ['person', 'profile', 'account', 'avatar', 'usuário', 'perfil', 'conta'],
  'users': ['people', 'group', 'team', 'community', 'pessoas', 'grupo', 'equipe'],
  'profile': ['user', 'account', 'avatar', 'identity', 'perfil'],
  
  // Communication
  'mail': ['email', 'message', 'envelope', 'inbox', 'correio', 'mensagem'],
  'message': ['chat', 'comment', 'conversation', 'text', 'mensagem', 'conversa'],
  'notification': ['bell', 'alert', 'reminder', 'notificação', 'alerta', 'lembrete'],
  'phone': ['call', 'telephone', 'mobile', 'contact', 'telefone', 'celular'],
  'chat': ['message', 'conversation', 'talk', 'messenger', 'conversa'],
  
  // Time & Calendar
  'calendar': ['date', 'schedule', 'event', 'agenda', 'calendário', 'data', 'compromisso'],
  'time': ['clock', 'hour', 'watch', 'timer', 'hora', 'relógio', 'tempo'],
  'clock': ['time', 'hour', 'watch', 'timer', 'relógio'],
  
  // Files & Documents
  'file': ['document', 'doc', 'paper', 'arquivo', 'documento'],
  'folder': ['directory', 'collection', 'pasta', 'diretório'],
  'document': ['file', 'paper', 'text', 'doc', 'documento', 'arquivo'],
  'download': ['save', 'export', 'get', 'baixar', 'salvar'],
  'upload': ['import', 'send', 'add', 'enviar', 'carregar'],
  
  // Actions
  'search': ['find', 'magnify', 'lookup', 'query', 'buscar', 'procurar', 'pesquisar'],
  'add': ['plus', 'new', 'create', 'insert', 'adicionar', 'novo', 'criar'],
  'delete': ['trash', 'remove', 'bin', 'erase', 'deletar', 'remover', 'lixo'],
  'edit': ['pencil', 'modify', 'change', 'write', 'editar', 'modificar', 'escrever'],
  'save': ['disk', 'store', 'keep', 'salvar', 'guardar'],
  'close': ['x', 'exit', 'cancel', 'dismiss', 'fechar', 'sair', 'cancelar'],
  'check': ['checkmark', 'tick', 'confirm', 'yes', 'approve', 'confirmar', 'sim'],
  'settings': ['config', 'preferences', 'gear', 'options', 'configurações', 'opções'],
  
  // Media
  'image': ['photo', 'picture', 'gallery', 'imagem', 'foto'],
  'video': ['play', 'movie', 'film', 'vídeo', 'filme'],
  'camera': ['photo', 'picture', 'lens', 'câmera', 'foto'],
  'music': ['audio', 'sound', 'song', 'música', 'som'],
  
  // Status & Feedback
  'star': ['favorite', 'bookmark', 'rating', 'featured', 'estrela', 'favorito'],
  'heart': ['like', 'love', 'favorite', 'coração', 'curtir'],
  'warning': ['alert', 'caution', 'danger', 'error', 'aviso', 'alerta', 'perigo'],
  'info': ['information', 'help', 'question', 'informação', 'ajuda'],
  'error': ['warning', 'alert', 'problem', 'issue', 'erro', 'problema'],
  'success': ['check', 'confirm', 'done', 'complete', 'sucesso', 'concluído'],
  
  // Location
  'location': ['map', 'pin', 'marker', 'place', 'gps', 'localização', 'lugar'],
  'map': ['location', 'geography', 'navigation', 'gps', 'mapa'],
  
  // Social
  'share': ['export', 'send', 'distribute', 'compartilhar', 'enviar'],
  'like': ['heart', 'favorite', 'thumbs-up', 'curtir', 'gostar'],
  
  // Shopping & Commerce
  'cart': ['shopping', 'basket', 'checkout', 'carrinho', 'compras'],
  'price': ['money', 'cost', 'payment', 'preço', 'dinheiro'],
  'credit-card': ['payment', 'card', 'checkout', 'cartão', 'pagamento'],
  
  // Security
  'lock': ['secure', 'private', 'protected', 'password', 'cadeado', 'seguro'],
  'unlock': ['open', 'access', 'public', 'desbloquear', 'abrir'],
  'key': ['password', 'access', 'security', 'chave', 'senha'],
  
  // UI Elements
  'button': ['click', 'action', 'control', 'botão', 'ação'],
  'toggle': ['switch', 'on-off', 'enable', 'disable', 'alternar'],
  'slider': ['range', 'adjust', 'control', 'controle'],
  'dropdown': ['select', 'menu', 'options', 'menu-suspenso', 'seleção'],
  
  // Weather
  'sun': ['sunny', 'day', 'weather', 'sol', 'ensolarado'],
  'moon': ['night', 'dark', 'lunar', 'lua', 'noite'],
  'cloud': ['cloudy', 'weather', 'sky', 'nuvem', 'tempo'],
  'rain': ['weather', 'storm', 'water', 'chuva', 'tempo']
};

/**
 * Generate metadata from icon name
 */
export function generateMetadataFromName(iconName: string): IconMetadata {
  // Clean name: remove numbers, dashes, underscores
  const cleanName = iconName
    .toLowerCase()
    .replace(/[-_]/g, ' ')
    .replace(/\d+/g, '')
    .trim();
  
  // Extract words
  const words = cleanName.split(/\s+/).filter(w => w.length > 0);
  
  // Generate tags from words + synonyms + contextual tags
  const tags = new Set<string>();
  words.forEach(word => {
    tags.add(word);
    
    // Add synonyms/related words
    if (TAG_REPLACEMENTS[word]) {
      TAG_REPLACEMENTS[word].forEach(synonym => tags.add(synonym));
    }
  });
  
  // Add contextual tags based on icon type
  addContextualTags(words, tags);
  
  // Detect category
  let category = detectCategory(words);
  
  // Generate description
  const description = generateDescription(words, iconName);
  
  return {
    category,
    tags: Array.from(tags).slice(0, 15), // Max 15 tags for quality
    description
  };
}

/**
 * Add contextual usage tags
 */
function addContextualTags(words: string[], tags: Set<string>) {
  const wordSet = new Set(words);
  
  // Navigation context
  if (wordSet.has('arrow') || wordSet.has('chevron') || wordSet.has('menu')) {
    tags.add('navigation');
    tags.add('ui-control');
  }
  
  // Action context
  if (wordSet.has('add') || wordSet.has('delete') || wordSet.has('edit') || wordSet.has('save')) {
    tags.add('action');
    tags.add('button');
    tags.add('interactive');
  }
  
  // Communication context
  if (wordSet.has('mail') || wordSet.has('message') || wordSet.has('chat') || wordSet.has('phone')) {
    tags.add('communication');
    tags.add('messaging');
    tags.add('contact');
  }
  
  // Media context
  if (wordSet.has('image') || wordSet.has('video') || wordSet.has('camera') || wordSet.has('music')) {
    tags.add('media');
    tags.add('content');
  }
  
  // File/Document context
  if (wordSet.has('file') || wordSet.has('folder') || wordSet.has('document')) {
    tags.add('file-system');
    tags.add('storage');
    tags.add('organization');
  }
  
  // Status/Feedback context
  if (wordSet.has('check') || wordSet.has('warning') || wordSet.has('error') || wordSet.has('success')) {
    tags.add('status');
    tags.add('feedback');
    tags.add('indicator');
  }
  
  // Social context
  if (wordSet.has('share') || wordSet.has('like') || wordSet.has('heart') || wordSet.has('star')) {
    tags.add('social');
    tags.add('engagement');
    tags.add('interaction');
  }
  
  // Time/Calendar context
  if (wordSet.has('calendar') || wordSet.has('time') || wordSet.has('clock')) {
    tags.add('scheduling');
    tags.add('temporal');
    tags.add('planning');
  }
  
  // E-commerce context
  if (wordSet.has('cart') || wordSet.has('price') || wordSet.has('card')) {
    tags.add('commerce');
    tags.add('shopping');
    tags.add('payment');
  }
  
  // Security context
  if (wordSet.has('lock') || wordSet.has('key') || wordSet.has('unlock')) {
    tags.add('security');
    tags.add('privacy');
    tags.add('authentication');
  }
  
  // User/Account context
  if (wordSet.has('user') || wordSet.has('profile') || wordSet.has('account')) {
    tags.add('account');
    tags.add('identity');
    tags.add('personalization');
  }
}

/**
 * Detect category from words
 */
function detectCategory(words: string[]): string {
  const wordSet = new Set(words);
  
  // Check each category
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (wordSet.has(keyword)) {
        return category;
      }
    }
  }
  
  return 'other';
}

/**
 * Generate description from words
 */
function generateDescription(words: string[], originalName: string): string {
  if (words.length === 0) {
    return `${originalName} icon`;
  }
  
  // Special cases for common patterns
  if (words.includes('arrow') || words.includes('chevron')) {
    const direction = words.find(w => ['up', 'down', 'left', 'right', 'north', 'south', 'east', 'west'].includes(w));
    if (direction) {
      return `${capitalize(direction)}ward arrow icon for navigation`;
    }
    return 'Arrow icon for navigation and direction';
  }
  
  if (words.includes('calendar')) {
    return 'Calendar icon for date selection and scheduling';
  }
  
  if (words.includes('user') || words.includes('person') || words.includes('profile')) {
    return 'User profile icon for account and settings';
  }
  
  if (words.includes('home') || words.includes('house')) {
    return 'Home icon for navigation to main page';
  }
  
  if (words.includes('search') || words.includes('magnify')) {
    return 'Search icon for find and lookup functionality';
  }
  
  if (words.includes('settings') || words.includes('gear') || words.includes('config')) {
    return 'Settings icon for configuration and preferences';
  }
  
  if (words.includes('star')) {
    return 'Star icon for favorites and ratings';
  }
  
  if (words.includes('heart')) {
    return 'Heart icon for likes and favorites';
  }
  
  if (words.includes('trash') || words.includes('delete')) {
    return 'Delete icon for removing items';
  }
  
  if (words.includes('mail') || words.includes('email') || words.includes('envelope')) {
    return 'Email icon for messaging and communication';
  }
  
  if (words.includes('bell') || words.includes('notification')) {
    return 'Notification icon for alerts and updates';
  }
  
  // Default: join words
  const description = words.join(' ');
  return `${capitalize(description)} icon`;
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Analyze icon geometry to enhance metadata
 * This analyzes the ComponentSet structure
 */
export function analyzeIconGeometry(node: ComponentSetNode | ComponentNode): Partial<IconMetadata> {
  const enhancements: Partial<IconMetadata> = {};
  const additionalTags: string[] = [];
  
  // Get first child for analysis
  let nodeToAnalyze: SceneNode;
  if (node.type === 'COMPONENT_SET') {
    nodeToAnalyze = node.children[0];
  } else {
    nodeToAnalyze = node;
  }
  
  if (!nodeToAnalyze) return enhancements;
  
  // Analyze children
  const children = nodeToAnalyze.type === 'COMPONENT' ? (nodeToAnalyze as ComponentNode).children : [];
  
  // Detect visual characteristics
  let hasCircles = false;
  let hasRectangles = false;
  let hasLines = false;
  let hasComplexPaths = false;
  let hasFills = false;
  let hasStrokes = false;
  
  for (const child of children) {
    if (child.type === 'VECTOR') {
      // Check for common shapes
      const bounds = child;
      const width = bounds.width;
      const height = bounds.height;
      const aspectRatio = width / height;
      
      // Circle-ish
      if (Math.abs(aspectRatio - 1) < 0.1 && child.name.toLowerCase().includes('circle')) {
        hasCircles = true;
        additionalTags.push('circle', 'round', 'circular');
      }
      
      // Ellipse
      if (child.name.toLowerCase().includes('ellipse') || child.name.toLowerCase().includes('oval')) {
        additionalTags.push('ellipse', 'oval', 'rounded');
      }
      
      // Square-ish
      if (Math.abs(aspectRatio - 1) < 0.1 && !child.name.toLowerCase().includes('circle')) {
        hasRectangles = true;
        additionalTags.push('square', 'box');
      }
      
      // Rectangle
      if (Math.abs(aspectRatio - 1) > 0.3) {
        hasRectangles = true;
        additionalTags.push('rectangle', 'rectangular');
      }
      
      // Detect arrows by name
      if (child.name.toLowerCase().includes('arrow')) {
        additionalTags.push('arrow', 'direction', 'pointer', 'navigate');
        if (!enhancements.category) {
          enhancements.category = 'arrows';
        }
      }
      
      // Detect by layer names
      if (child.name.toLowerCase().includes('star')) {
        additionalTags.push('star', 'rating', 'favorite');
      }
      
      if (child.name.toLowerCase().includes('heart')) {
        additionalTags.push('heart', 'like', 'love');
      }
      
      // Check for fills/strokes
      if ('fills' in child && Array.isArray(child.fills) && child.fills.length > 0) {
        const visibleFills = child.fills.filter(f => f.visible !== false);
        if (visibleFills.length > 0) {
          hasFills = true;
        }
      }
      
      if ('strokes' in child && Array.isArray(child.strokes) && child.strokes.length > 0) {
        const visibleStrokes = child.strokes.filter(s => s.visible !== false);
        if (visibleStrokes.length > 0) {
          hasStrokes = true;
        }
      }
      
      // Detect complex paths
      if (child.type === 'VECTOR' && width > 5 && height > 5) {
        hasComplexPaths = true;
      }
    }
    
    if (child.type === 'LINE') {
      hasLines = true;
      additionalTags.push('line', 'stroke', 'linear');
    }
    
    if (child.type === 'ELLIPSE') {
      hasCircles = true;
      additionalTags.push('circle', 'ellipse', 'round');
    }
    
    if (child.type === 'RECTANGLE') {
      hasRectangles = true;
      additionalTags.push('rectangle', 'box', 'square');
    }
    
    if (child.type === 'STAR') {
      additionalTags.push('star', 'rating', 'favorite', 'polygon');
    }
    
    if (child.type === 'POLYGON') {
      additionalTags.push('polygon', 'geometric', 'shape');
    }
  }
  
  // Add style-based tags
  if (hasFills && !hasStrokes) {
    additionalTags.push('filled', 'solid');
  }
  
  if (hasStrokes && !hasFills) {
    additionalTags.push('outline', 'stroke', 'line-art');
  }
  
  // Add complexity tags
  if (hasCircles && hasRectangles) {
    additionalTags.push('composite', 'combined-shapes');
  }
  
  if (hasComplexPaths) {
    additionalTags.push('detailed', 'complex');
  }
  
  if (hasLines) {
    additionalTags.push('minimal', 'simple');
  }
  
  if (additionalTags.length > 0) {
    enhancements.tags = additionalTags;
  }
  
  return enhancements;
}
