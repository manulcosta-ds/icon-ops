import { AuditReport, AuditIssue, ImportOptions } from './types';

// State
let currentAuditReport: AuditReport | null = null;
let selectedIssueIds: Set<string> = new Set();
let ignoredIssueIds: Set<string> = new Set(); // Track ignored duplicate issues
let currentFilter: string = 'all';
let currentDuplicateGroup: { id: string; nodes: { id: string; name: string }[]; currentIndex: number } | null = null;

// Browse state
interface IconData {
  id: string;
  name: string;
  fullName?: string;
  style?: string;
  size?: string;
  preview: string; // base64 PNG
  iconType?: 'outline' | 'filled' | 'duo-tone' | 'mixed'; // NEW
  metadata?: {
    tags: string[];
    description: string;
    category: string;
  };
}

let allIcons: IconData[] = [];
let filteredIcons: IconData[] = [];
let editingIconId: string | null = null;

// Simplify long icon names for display
// "ad-advertisting-square-banner-interface" → "ad-advertisting"
// "user-check-validate--actions-close-checkmark-..." → "user-check-validate"
function simplifyIconName(fullName: string): string {
  let name = fullName.includes('/') ? fullName.split('/').pop()! : fullName;
  
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
  
  // Otherwise take first 3 meaningful words
  return meaningful.slice(0, 3).join('-');
}

// Screen navigation
function showScreen(screenId: string) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  const screen = document.getElementById(screenId);
  if (screen) screen.classList.remove('hidden');
}

// Home screen
const btnBrowse = document.getElementById('btn-browse');
if (btnBrowse) {
  btnBrowse.addEventListener('click', () => {
    showScreen('browse-screen');
    loadPublishedIcons();
  });
}

const btnImport = document.getElementById('btn-import');
if (btnImport) {
  btnImport.addEventListener('click', () => {
    showScreen('import-screen');
  });
}

const btnAudit = document.getElementById('btn-audit');
if (btnAudit) {
  btnAudit.addEventListener('click', () => {
    showScreen('audit-screen');
  });
}

// Back buttons
const btnBackFromBrowse = document.getElementById('btn-back-from-browse');
if (btnBackFromBrowse) {
  btnBackFromBrowse.addEventListener('click', () => {
    showScreen('home-screen');
  });
}

const btnBackFromImport = document.getElementById('btn-back-from-import');
if (btnBackFromImport) {
  btnBackFromImport.addEventListener('click', () => {
    showScreen('home-screen');
  });
}

const btnBackFromAudit = document.getElementById('btn-back-from-audit');
if (btnBackFromAudit) {
  btnBackFromAudit.addEventListener('click', () => {
    showScreen('home-screen');
  });
}

// Browse screen functions
function loadPublishedIcons() {
  parent.postMessage({
    pluginMessage: { type: 'load-published-icons' }
  }, '*');
}

function displayIcons(icons: IconData[]) {
  allIcons = icons;
  filteredIcons = icons;
  
  // Populate filter dropdowns
  populateFilters();
  
  // Render grid
  renderIconGrid();
}

function populateFilters() {
  const styles = new Set<string>();
  const sizes = new Set<string>();
  
  allIcons.forEach(icon => {
    if (icon.style) styles.add(icon.style);
    if (icon.size) sizes.add(icon.size);
  });
  
  const styleSelect = document.getElementById('filter-style') as HTMLSelectElement;
  if (styleSelect) {
    styleSelect.innerHTML = '<option value="">All Styles</option>';
    Array.from(styles).sort().forEach(style => {
      const option = document.createElement('option');
      option.value = style;
      option.textContent = style;
      styleSelect.appendChild(option);
    });
  }
  
  const sizeSelect = document.getElementById('filter-size') as HTMLSelectElement;
  if (sizeSelect) {
    sizeSelect.innerHTML = '<option value="">All Sizes</option>';
    Array.from(sizes).sort((a, b) => parseInt(a) - parseInt(b)).forEach(size => {
      const option = document.createElement('option');
      option.value = size;
      option.textContent = `${size}px`;
      sizeSelect.appendChild(option);
    });
  }
}

function applyFilters() {
  const searchInput = document.getElementById('icon-search') as HTMLInputElement;
  const typeSelect = document.getElementById('filter-type') as HTMLSelectElement;
  const styleSelect = document.getElementById('filter-style') as HTMLSelectElement;
  const sizeSelect = document.getElementById('filter-size') as HTMLSelectElement;
  
  const searchTerm = searchInput?.value.toLowerCase() || '';
  const selectedType = typeSelect?.value || '';
  const selectedStyle = styleSelect?.value || '';
  const selectedSize = sizeSelect?.value || '';
  
  filteredIcons = allIcons.filter(icon => {
    // Search by name, fullName, tags, description, category
    const matchesSearch = !searchTerm || 
      icon.name.toLowerCase().includes(searchTerm) ||
      icon.fullName?.toLowerCase().includes(searchTerm) ||
      icon.metadata?.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
      icon.metadata?.description?.toLowerCase().includes(searchTerm) ||
      icon.metadata?.category?.toLowerCase().includes(searchTerm);
    
    const matchesType = !selectedType || icon.iconType === selectedType;
    const matchesStyle = !selectedStyle || icon.style === selectedStyle;
    const matchesSize = !selectedSize || icon.size === selectedSize;
    
    return matchesSearch && matchesType && matchesStyle && matchesSize;
  });
  
  renderIconGrid();
}

// Metadata editor functions
function openMetadataEditor(icon: IconData) {
  editingIconId = icon.id;
  
  const modal = document.getElementById('metadata-modal');
  const preview = document.getElementById('metadata-icon-preview');
  const nameEl = document.getElementById('metadata-icon-name');
  const categoryInput = document.getElementById('metadata-category') as HTMLSelectElement;
  const tagsInput = document.getElementById('metadata-tags') as HTMLInputElement;
  const descInput = document.getElementById('metadata-description') as HTMLTextAreaElement;
  
  if (!modal || !preview || !nameEl || !categoryInput || !tagsInput || !descInput) return;
  
  // Show modal
  modal.classList.remove('hidden');
  
  // Set preview
  preview.innerHTML = `<img src="${icon.preview}" alt="${icon.name}" />`;
  nameEl.textContent = icon.name;
  
  // Set current metadata
  categoryInput.value = icon.metadata?.category || '';
  tagsInput.value = icon.metadata?.tags?.join(', ') || '';
  descInput.value = icon.metadata?.description || '';
}

function closeMetadataEditor() {
  const modal = document.getElementById('metadata-modal');
  if (modal) modal.classList.add('hidden');
  editingIconId = null;
}

function saveMetadata() {
  if (!editingIconId) return;
  
  const categoryInput = document.getElementById('metadata-category') as HTMLSelectElement;
  const tagsInput = document.getElementById('metadata-tags') as HTMLInputElement;
  const descInput = document.getElementById('metadata-description') as HTMLTextAreaElement;
  
  if (!categoryInput || !tagsInput || !descInput) return;
  
  const metadata = {
    category: categoryInput.value,
    tags: tagsInput.value.split(',').map(t => t.trim()).filter(t => t.length > 0),
    description: descInput.value.trim()
  };
  
  // Send to plugin to save
  parent.postMessage({
    pluginMessage: {
      type: 'save-metadata',
      payload: {
        iconId: editingIconId,
        metadata
      }
    }
  }, '*');
  
  closeMetadataEditor();
}

// Metadata modal event listeners
const btnCloseMetadata = document.getElementById('btn-close-metadata');
if (btnCloseMetadata) {
  btnCloseMetadata.addEventListener('click', closeMetadataEditor);
}

const btnCancelMetadata = document.getElementById('btn-cancel-metadata');
if (btnCancelMetadata) {
  btnCancelMetadata.addEventListener('click', closeMetadataEditor);
}

const btnSaveMetadata = document.getElementById('btn-save-metadata');
if (btnSaveMetadata) {
  btnSaveMetadata.addEventListener('click', saveMetadata);
}

const btnAutofillMetadata = document.getElementById('btn-autofill-metadata');
if (btnAutofillMetadata) {
  btnAutofillMetadata.addEventListener('click', autofillCurrentMetadata);
}

const btnAutofillAll = document.getElementById('btn-autofill-all');
if (btnAutofillAll) {
  btnAutofillAll.addEventListener('click', autofillAllMetadata);
}

function autofillCurrentMetadata() {
  if (!editingIconId) return;
  
  // Request auto-generated metadata
  parent.postMessage({
    pluginMessage: {
      type: 'autofill-metadata',
      payload: { iconId: editingIconId }
    }
  }, '*');
}

function autofillAllMetadata() {
  if (!confirm('Auto-fill metadata for all icons without metadata? This may take a moment.')) {
    return;
  }
  
  parent.postMessage({
    pluginMessage: {
      type: 'autofill-all-metadata'
    }
  }, '*');
}

function renderIconGrid() {
  const grid = document.getElementById('icon-grid');
  const countSpan = document.getElementById('browse-count');
  
  if (!grid) return;
  
  // Update count
  if (countSpan) {
    countSpan.textContent = `${filteredIcons.length} icon${filteredIcons.length !== 1 ? 's' : ''}`;
  }
  
  // Clear grid
  grid.innerHTML = '';
  
  if (filteredIcons.length === 0) {
    grid.innerHTML = '<div class="no-icons">No icons found</div>';
    return;
  }
  
  // Render icon cards
  filteredIcons.forEach(icon => {
    const card = document.createElement('div');
    card.className = 'icon-card-browse';
    card.dataset.iconId = icon.id;
    
    // Edit metadata button
    const actions = document.createElement('div');
    actions.className = 'icon-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'btn-edit-metadata';
    editBtn.textContent = '✏️';
    editBtn.title = 'Edit metadata';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMetadataEditor(icon);
    });
    actions.appendChild(editBtn);
    card.appendChild(actions);
    
    const preview = document.createElement('div');
    preview.className = 'icon-preview';
    preview.innerHTML = `<img src="${icon.preview}" alt="${icon.name}" />`;
    
    const info = document.createElement('div');
    info.className = 'icon-info';
    
    const name = document.createElement('div');
    name.className = 'icon-name';
    name.textContent = simplifyIconName(icon.name);
    name.title = icon.fullName || icon.name;
    
    const meta = document.createElement('div');
    meta.className = 'icon-meta';
    const metaParts = [];
    if (icon.style) metaParts.push(icon.style);
    if (icon.size) metaParts.push(`${icon.size}px`);
    meta.textContent = metaParts.join(' • ');
    
    info.appendChild(name);
    if (metaParts.length > 0) info.appendChild(meta);
    
    // Show icon type badge
    if (icon.iconType) {
      const typeBadge = document.createElement('div');
      typeBadge.className = `icon-type icon-type-${icon.iconType}`;
      typeBadge.textContent = icon.iconType;
      info.appendChild(typeBadge);
    }
    
    // Show category
    if (icon.metadata?.category) {
      const category = document.createElement('div');
      category.className = 'icon-category';
      category.textContent = icon.metadata.category;
      info.appendChild(category);
    }
    
    // Show tags
    if (icon.metadata?.tags && icon.metadata.tags.length > 0) {
      const tagsContainer = document.createElement('div');
      tagsContainer.className = 'icon-tags';
      icon.metadata.tags.slice(0, 3).forEach(tag => {
        const tagEl = document.createElement('span');
        tagEl.className = 'icon-tag';
        tagEl.textContent = tag;
        tagsContainer.appendChild(tagEl);
      });
      info.appendChild(tagsContainer);
    }
    
    card.appendChild(preview);
    card.appendChild(info);
    
    // Click to insert
    card.addEventListener('click', () => {
      parent.postMessage({
        pluginMessage: {
          type: 'insert-icon',
          payload: { iconId: icon.id }
        }
      }, '*');
    });
    
    grid.appendChild(card);
  });
}

// Search and filter event listeners
const iconSearch = document.getElementById('icon-search');
if (iconSearch) {
  iconSearch.addEventListener('input', applyFilters);
}

const filterType = document.getElementById('filter-type');
if (filterType) {
  filterType.addEventListener('change', applyFilters);
}

const filterStyle = document.getElementById('filter-style');
if (filterStyle) {
  filterStyle.addEventListener('change', applyFilters);
}

const filterSize = document.getElementById('filter-size');
if (filterSize) {
  filterSize.addEventListener('change', applyFilters);
}

// Import screen
const btnRunImport = document.getElementById('btn-run-import');
if (btnRunImport) {
  btnRunImport.addEventListener('click', async () => {
    const zipInput = document.getElementById('zip-input') as HTMLInputElement;
    const sizesInput = document.getElementById('sizes-input') as HTMLInputElement;
    const strokeWeightsInput = document.getElementById('stroke-weights-input') as HTMLInputElement;
    const outlinePolicyCheckbox = document.getElementById('outline-policy') as HTMLInputElement;
    
    if (!zipInput.files || zipInput.files.length === 0) {
      alert('Please select a ZIP file');
      return;
    }
    
    const file = zipInput.files[0];
    const zipData = await file.arrayBuffer();
    
    // Parse options
    const sizesText = sizesInput.value.trim();
    const sizes = sizesText 
      ? sizesText.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
      : [];
    
    const strokeWeightsText = strokeWeightsInput.value.trim();
    const allowedStrokeWeights = strokeWeightsText
      ? strokeWeightsText.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
      : [];
    
    const options: ImportOptions = {
      sizes,
      allowedStrokeWeights,
      outlineOnlyPolicy: outlinePolicyCheckbox.checked
    };
    
    // Show progress
    const progressSection = document.getElementById('import-progress');
    if (progressSection) progressSection.classList.remove('hidden');
    
    // Send to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'import-zip',
        payload: { zipData, options }
      }
    }, '*');
  });
}

// Audit screen
const btnRunAudit = document.getElementById('btn-run-audit');
if (btnRunAudit) {
  btnRunAudit.addEventListener('click', () => {
    const scopeSelect = document.getElementById('audit-scope') as HTMLSelectElement;
    const strokeWeightsInput = document.getElementById('audit-stroke-weights') as HTMLInputElement;
    const outlinePolicyCheckbox = document.getElementById('audit-outline-policy') as HTMLInputElement;
    
    const strokeWeightsText = strokeWeightsInput.value.trim();
    const allowedStrokeWeights = strokeWeightsText
      ? strokeWeightsText.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
      : [];
    
    const options: ImportOptions = {
      sizes: [],
      allowedStrokeWeights,
      outlineOnlyPolicy: outlinePolicyCheckbox.checked
    };
    
    parent.postMessage({
      pluginMessage: {
        type: 'run-audit',
        payload: { 
          scope: scopeSelect.value,
          options
        }
      }
    }, '*');
  });
}


// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const target = e.target as HTMLButtonElement;
    const filter = target.dataset.filter || 'all';
    
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    target.classList.add('active');
    
    currentFilter = filter;
    renderIssues();
  });
});

// Issue selection
const btnSelectAllIssues = document.getElementById('btn-select-all-issues');
if (btnSelectAllIssues) {
  btnSelectAllIssues.addEventListener('click', () => {
    if (!currentAuditReport) return;
    
    const filteredIssues = getFilteredIssues();
    filteredIssues.forEach(issue => selectedIssueIds.add(issue.id));
    renderIssues();
  });
}

const btnDeselectAllIssues = document.getElementById('btn-deselect-all-issues');
if (btnDeselectAllIssues) {
  btnDeselectAllIssues.addEventListener('click', () => {
    selectedIssueIds.clear();
    renderIssues();
  });
}

// Fix selected
const btnFixSelected = document.getElementById('btn-fix-selected');
if (btnFixSelected) {
  btnFixSelected.addEventListener('click', () => {
    if (selectedIssueIds.size === 0) {
      alert('No issues selected');
      return;
    }
    
    // Request preview
    parent.postMessage({
      pluginMessage: {
        type: 'generate-fix-preview',
        payload: { issueIds: Array.from(selectedIssueIds) }
      }
    }, '*');
  });
}

// Fix preview modal
const btnCancelFix = document.getElementById('btn-cancel-fix');
if (btnCancelFix) {
  btnCancelFix.addEventListener('click', () => {
    const modal = document.getElementById('fix-preview-modal');
    if (modal) modal.classList.add('hidden');
  });
}

const btnConfirmFix = document.getElementById('btn-confirm-fix');
if (btnConfirmFix) {
  btnConfirmFix.addEventListener('click', () => {
    parent.postMessage({
      pluginMessage: {
        type: 'apply-fixes',
        payload: { issueIds: Array.from(selectedIssueIds) }
      }
    }, '*');
    
    const modal = document.getElementById('fix-preview-modal');
    if (modal) modal.classList.add('hidden');
  });
}

// Export report
const btnExportReport = document.getElementById('btn-export-report');
if (btnExportReport) {
  btnExportReport.addEventListener('click', () => {
    if (!currentAuditReport) return;
    
    const json = JSON.stringify(currentAuditReport, null, 2);
    const textarea = document.createElement('textarea');
    textarea.value = json;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    alert('Report copied to clipboard!');
  });
}

// Duplicate viewer
const btnCloseDuplicateViewer = document.getElementById('btn-close-duplicate-viewer');
if (btnCloseDuplicateViewer) {
  btnCloseDuplicateViewer.addEventListener('click', () => {
    const viewer = document.getElementById('duplicate-viewer');
    if (viewer) viewer.classList.add('hidden');
    currentDuplicateGroup = null;
  });
}

const btnZoomCurrent = document.getElementById('btn-zoom-current');
if (btnZoomCurrent) {
  btnZoomCurrent.addEventListener('click', () => {
    if (!currentDuplicateGroup) return;
    
    const node = currentDuplicateGroup.nodes[currentDuplicateGroup.currentIndex];
    parent.postMessage({
      pluginMessage: {
        type: 'zoom-to-node',
        payload: { nodeId: node.id }
      }
    }, '*');
  });
}

const btnNextDuplicate = document.getElementById('btn-next-duplicate');
if (btnNextDuplicate) {
  btnNextDuplicate.addEventListener('click', () => {
    if (!currentDuplicateGroup) return;
    
    currentDuplicateGroup.currentIndex = 
      (currentDuplicateGroup.currentIndex + 1) % currentDuplicateGroup.nodes.length;
    
    updateDuplicateViewer();
    
    const node = currentDuplicateGroup.nodes[currentDuplicateGroup.currentIndex];
    parent.postMessage({
      pluginMessage: {
        type: 'zoom-to-node',
        payload: { nodeId: node.id }
      }
    }, '*');
  });
}

// Render functions
function getFilteredIssues(): AuditIssue[] {
  if (!currentAuditReport) return [];
  
  let issues = currentAuditReport.issues;
  
  // Filter out ignored issues
  issues = issues.filter(issue => !ignoredIssueIds.has(issue.id));
  
  if (currentFilter === 'all') {
    return issues;
  }
  
  return issues.filter(issue => issue.type === currentFilter);
}

function renderIssues() {
  const issuesList = document.getElementById('issues-list');
  if (!issuesList || !currentAuditReport) return;
  
  const filteredIssues = getFilteredIssues();
  
  if (filteredIssues.length === 0) {
    issuesList.innerHTML = '<p class="no-issues">No issues found</p>';
    return;
  }
  
  issuesList.innerHTML = '';
  
  filteredIssues.forEach(issue => {
    const issueEl = document.createElement('div');
    issueEl.className = `issue-item severity-${issue.severity}`;
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedIssueIds.has(issue.id);
    checkbox.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.checked) {
        selectedIssueIds.add(issue.id);
      } else {
        selectedIssueIds.delete(issue.id);
      }
    });
    
    const content = document.createElement('div');
    content.className = 'issue-content';
    content.innerHTML = `
      <div class="issue-header">
        <span class="issue-type">${issue.type}</span>
        <span class="issue-severity">${issue.severity}</span>
      </div>
      <div class="issue-message">${issue.message}</div>
      <div class="issue-node">${issue.nodeName}</div>
    `;
    
    content.addEventListener('click', () => {
      // Handle duplicate group click
      if (issue.type === 'duplicate' && issue.groupId) {
        showDuplicateGroup(issue.groupId);
      } else {
        // Zoom to node
        parent.postMessage({
          pluginMessage: {
            type: 'zoom-to-node',
            payload: { nodeId: issue.nodeId }
          }
        }, '*');
      }
    });
    
    issueEl.appendChild(checkbox);
    issueEl.appendChild(content);
    
    // Add Ignore button for duplicate issues
    if (issue.type === 'duplicate' && issue.groupId) {
      const ignoreBtn = document.createElement('button');
      ignoreBtn.className = 'btn-ignore';
      ignoreBtn.textContent = 'Ignore';
      ignoreBtn.title = 'Ignore this duplicate warning (sometimes duplicates are intentional)';
      ignoreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Ignore all issues in this duplicate group
        if (currentAuditReport) {
          const groupIssues = currentAuditReport.issues.filter(
            i => i.groupId === issue.groupId
          );
          groupIssues.forEach(i => ignoredIssueIds.add(i.id));
        }
        
        renderIssues();
        updateAuditSummary();
      });
      issueEl.appendChild(ignoreBtn);
    }
    
    issuesList.appendChild(issueEl);
  });
}

function showDuplicateGroup(groupId: string) {
  if (!currentAuditReport) return;
  
  const groupIssues = currentAuditReport.issues.filter(
    issue => issue.groupId === groupId
  );
  
  if (groupIssues.length === 0) return;
  
  currentDuplicateGroup = {
    id: groupId,
    nodes: groupIssues.map(issue => ({
      id: issue.nodeId,
      name: issue.nodeName
    })),
    currentIndex: 0
  };
  
  const viewer = document.getElementById('duplicate-viewer');
  if (viewer) viewer.classList.remove('hidden');
  updateDuplicateViewer();
  
  // Zoom to first duplicate
  const firstNode = currentDuplicateGroup.nodes[0];
  parent.postMessage({
    pluginMessage: {
      type: 'zoom-to-node',
      payload: { nodeId: firstNode.id }
    }
  }, '*');
}

function updateDuplicateViewer() {
  if (!currentDuplicateGroup) return;
  
  const info = document.getElementById('duplicate-info');
  if (info) {
    info.textContent = `Viewing ${currentDuplicateGroup.currentIndex + 1}/${currentDuplicateGroup.nodes.length}`;
  }
}

function displayAuditResults(report: AuditReport) {
  currentAuditReport = report;
  selectedIssueIds.clear();
  
  // Show results section
  const resultsSection = document.getElementById('audit-results');
  if (resultsSection) resultsSection.classList.remove('hidden');
  
  updateAuditSummary();
  
  // Render issues
  renderIssues();
}

function updateAuditSummary() {
  if (!currentAuditReport) return;
  
  // Filter out ignored issues for stats
  const activeIssues = currentAuditReport.issues.filter(i => !ignoredIssueIds.has(i.id));
  
  // Update stats
  const statScanned = document.getElementById('stat-scanned');
  const statIssues = document.getElementById('stat-issues');
  const statDuplicates = document.getElementById('stat-duplicates');
  
  if (statScanned) statScanned.textContent = currentAuditReport.totals.nodesScanned.toString();
  if (statIssues) statIssues.textContent = activeIssues.length.toString();
  
  // Count non-ignored duplicate groups
  const activeDuplicateGroups = new Set(
    activeIssues
      .filter(i => i.type === 'duplicate' && i.groupId)
      .map(i => i.groupId)
  );
  if (statDuplicates) statDuplicates.textContent = activeDuplicateGroups.size.toString();
  
  // Calculate health score
  const score = calculateHealthScore(currentAuditReport, activeIssues);
  const scoreValue = document.getElementById('score-value');
  if (scoreValue) {
    scoreValue.textContent = `${score}%`;
    scoreValue.className = `score-value score-${getScoreClass(score)}`;
  }
}

function calculateHealthScore(report: AuditReport, issues: AuditIssue[]): number {
  if (report.totals.nodesScanned === 0) return 100;
  
  const errorWeight = 2;
  const warningWeight = 1;
  const infoWeight = 0.5;
  
  let totalWeight = 0;
  issues.forEach(issue => {
    if (issue.severity === 'error') totalWeight += errorWeight;
    else if (issue.severity === 'warning') totalWeight += warningWeight;
    else totalWeight += infoWeight;
  });
  
  const maxPossibleWeight = report.totals.nodesScanned * errorWeight;
  const score = Math.max(0, 100 - (totalWeight / maxPossibleWeight * 100));
  
  return Math.round(score);
}

function getScoreClass(score: number): string {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

// Message handling
window.onmessage = (event) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;
  
  switch (msg.type) {
    case 'import-progress':
      updateImportProgress(msg.payload.current, msg.payload.total);
      break;
    
    case 'import-complete':
      handleImportComplete(msg.payload);
      break;
    
    case 'audit-complete':
      displayAuditResults(msg.payload);
      break;
    
    case 'fix-preview':
      showFixPreview(msg.payload.preview);
      break;
    
    case 'fixes-applied':
      handleFixesApplied(msg.payload);
      break;
    
    case 'icons-loaded':
      displayIcons(msg.payload.icons);
      break;
    
    case 'metadata-saved':
      // Update icon in allIcons
      const updatedIcon = allIcons.find(i => i.id === msg.payload.iconId);
      if (updatedIcon) {
        updatedIcon.metadata = msg.payload.metadata;
        applyFilters(); // Re-render
      }
      break;
    
    case 'metadata-autofilled':
      // Fill the form with auto-generated metadata
      const categoryInput = document.getElementById('metadata-category') as HTMLSelectElement;
      const tagsInput = document.getElementById('metadata-tags') as HTMLInputElement;
      const descInput = document.getElementById('metadata-description') as HTMLTextAreaElement;
      
      if (categoryInput && msg.payload.metadata.category) {
        categoryInput.value = msg.payload.metadata.category;
      }
      if (tagsInput && msg.payload.metadata.tags) {
        tagsInput.value = msg.payload.metadata.tags.join(', ');
      }
      if (descInput && msg.payload.metadata.description) {
        descInput.value = msg.payload.metadata.description;
      }
      break;
    
    case 'autofill-all-complete':
      alert(`Auto-filled metadata for ${msg.payload.count} icons!`);
      loadPublishedIcons(); // Reload to show new metadata
      break;
    
    case 'error':
      alert(`Error: ${msg.payload.message}`);
      break;
  }
};

function updateImportProgress(current: number, total: number) {
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  
  const percent = (current / total) * 100;
  
  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }
  
  if (progressText) {
    progressText.textContent = `Processing ${current}/${total} icons...`;
  }
}

function handleImportComplete(payload: any) {
  const progressSection = document.getElementById('import-progress');
  if (progressSection) progressSection.classList.add('hidden');
  
  alert(`Import complete! ${payload.totalIcons} icons imported.`);
  
  // Show audit screen with results
  showScreen('audit-screen');
  displayAuditResults(payload.auditReport);
}

function showFixPreview(preview: string[]) {
  const previewList = document.getElementById('fix-preview-list');
  if (!previewList) return;
  
  previewList.innerHTML = '';
  preview.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    previewList.appendChild(li);
  });
  
  const modal = document.getElementById('fix-preview-modal');
  if (modal) modal.classList.remove('hidden');
}

function handleFixesApplied(result: { applied: number; failed: number; summary: string[] }) {
  alert(`Fixes applied: ${result.applied} successful, ${result.failed} failed\n\n${result.summary.join('\n')}`);
  selectedIssueIds.clear();
}
