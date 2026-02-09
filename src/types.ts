export interface ImportOptions {
  sizes: number[];
  allowedStrokeWeights: number[];
  outlineOnlyPolicy: boolean;
}

export interface StyleVariantInfo {
  baseIconName: string;
  style: string;
  originalFilename: string;
  svgContent: string;
  folderPath: string;
  isStrokeBased?: boolean;
}

export interface AuditIssue {
  id: string;
  type: 'duplicate' | 'stroke-thickness' | 'fill-policy' | 'geometry' | 'naming';
  severity: 'error' | 'warning' | 'info';
  nodeId: string;
  nodeName: string;
  message: string;
  details?: any;
  groupId?: string;
}

export interface AuditReport {
  runId: string;
  timestamp: number;
  scope: string;
  totals: {
    nodesScanned: number;
    issuesFound: number;
    duplicateGroups: number;
  };
  issues: AuditIssue[];
  metadata?: {
    importUsedSizes: boolean;
    importUsedStyles: boolean;
    variantProperties: string[];
  };
}

export interface DuplicateGroup {
  id: string;
  nodes: { id: string; name: string }[];
  currentIndex: number;
}

export interface FixAction {
  issueId: string;
  action: 'delete' | 'fix-stroke' | 'convert-fill-to-stroke' | 'cleanup' | 'rename';
  params?: any;
}
