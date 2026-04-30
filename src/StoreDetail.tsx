import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
} from 'react-native';

type ViewMode = 'table' | 'json';

type SelectionPressEvent = {
  nativeEvent?: {
    shiftKey?: boolean;
  };
};

type Props = {
  storeName: string;
  state: Record<string, unknown>;
  onEditField?: (storeName: string, keyPath: string[], value: unknown) => void;
  onDeleteKeys?: (storeName: string, keys: string[]) => void;
  onRefresh?: () => void;
};

function renderValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return JSON.stringify(value, null, 2);
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function getValueColor(value: unknown): string {
  if (value === null || value === undefined) return '#6b7280';
  if (typeof value === 'string') return '#a5d6a7';
  if (typeof value === 'boolean') return '#ce93d8';
  if (typeof value === 'number') return '#90caf9';
  return '#d1d5db';
}

function getEditableString(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return JSON.stringify(value, null, 2);
}

function parseEditValue(input: string, originalValue: unknown): unknown {
  const trimmed = input.trim();
  if (trimmed === 'null') return null;
  if (trimmed === 'undefined') return undefined;
  if (typeof originalValue === 'number') {
    const n = Number(trimmed);
    return isNaN(n) ? trimmed : n;
  }
  if (typeof originalValue === 'boolean') {
    return trimmed.toLowerCase() === 'true';
  }
  if (originalValue !== null && typeof originalValue === 'object') {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return input;
}

type TableRowProps = {
  keyName: string;
  value: unknown;
  depth?: number;
  keyPath?: string[];
  onEdit?: (keyPath: string[], value: unknown) => void;
  isSelected?: boolean;
  onToggleSelect?: (key: string, event?: SelectionPressEvent) => void;
};

function TableRow({
  keyName,
  value,
  depth = 0,
  keyPath = [],
  onEdit,
  isSelected,
  onToggleSelect,
}: TableRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const isExpandable = value !== null && typeof value === 'object';
  const paddingLeft = 12 + depth * 16;
  const currentKeyPath = [...keyPath, keyName];

  const startEdit = () => {
    setEditValue(getEditableString(value));
    setEditing(true);
  };

  const commitEdit = () => {
    if (!onEdit) return;
    onEdit(currentKeyPath, parseEditValue(editValue, value));
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  return (
    <>
      <View
        style={[
          styles.tableRow,
          editing && styles.tableRowEditing,
          isSelected && depth === 0 && styles.selectedTableRow,
          { paddingLeft },
        ]}
      >
        {depth === 0 && (
          <Pressable
            onPress={(event) =>
              onToggleSelect?.(keyName, event as unknown as SelectionPressEvent)
            }
            style={styles.checkboxCell}
            hitSlop={6}
            accessibilityRole="checkbox"
            accessibilityLabel={isSelected ? `Deselect ${keyName}` : `Select ${keyName}`}
            accessibilityHint="Hold Shift while selecting another key to select the full range."
            accessibilityState={{ checked: isSelected }}
          >
            <View style={[styles.checkboxBox, isSelected && styles.checkboxBoxSelected]}>
              {isSelected && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
          </Pressable>
        )}
        <Pressable
          onPress={isExpandable ? () => setExpanded((prev) => !prev) : undefined}
          style={styles.keyCell}
        >
          {isExpandable ? (
            <View style={styles.expandIconSlot}>
              <Text style={styles.expandIcon}>{expanded ? '\u25BC' : '\u25B6'}</Text>
            </View>
          ) : (
            <View style={styles.expandIconSlot} />
          )}
          <Text style={styles.keyText}>{keyName}</Text>
        </Pressable>
        <View style={styles.valueCell}>
          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={[styles.editInput, isExpandable && styles.editInputMultiline]}
                value={editValue}
                onChangeText={setEditValue}
                onSubmitEditing={isExpandable ? undefined : commitEdit}
                autoFocus
                multiline={isExpandable}
                accessibilityLabel={`Edit value for ${keyName}`}
              />
              <Pressable
                onPress={commitEdit}
                hitSlop={6}
                style={styles.editActionBtn}
                accessibilityRole="button"
                accessibilityLabel="Confirm edit"
              >
                <Text style={styles.editConfirmText}>✓</Text>
              </Pressable>
              <Pressable
                onPress={cancelEdit}
                hitSlop={6}
                style={styles.editActionBtn}
                accessibilityRole="button"
                accessibilityLabel="Cancel edit"
              >
                <Text style={styles.editCancelText}>✕</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.valueRow}>
              <View style={styles.valuePrimary}>
                {isExpandable && !expanded ? (
                  <Text style={styles.collapsedPreview}>
                    {Array.isArray(value)
                      ? `Array(${(value as unknown[]).length})`
                      : `Object(${Object.keys(value as Record<string, unknown>).length})`}
                  </Text>
                ) : !isExpandable ? (
                  <Text style={[styles.valueText, { color: getValueColor(value) }]}>
                    {renderValue(value)}
                  </Text>
                ) : null}
              </View>
              {onEdit && (
                <Pressable
                  onPress={startEdit}
                  hitSlop={6}
                  style={styles.editButton}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit field ${keyName}`}
                >
                  <Text style={styles.editButtonText}>✎</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
      {isExpandable &&
        expanded &&
        Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <TableRow
            key={k}
            keyName={k}
            value={v}
            depth={depth + 1}
            keyPath={currentKeyPath}
            onEdit={onEdit}
          />
        ))}
    </>
  );
}

function isShiftSelectionEvent(event?: SelectionPressEvent): boolean {
  return event?.nativeEvent?.shiftKey === true;
}

export function StoreDetail({
  storeName,
  state,
  onEditField,
  onDeleteKeys,
  onRefresh,
}: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [selectionAnchorKey, setSelectionAnchorKey] = useState<string | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const topLevelKeys = useMemo(() => Object.keys(state), [state]);

  useEffect(() => {
    setSelectedKeys([]);
    setSelectionAnchorKey(null);
  }, [storeName]);

  useEffect(() => {
    setSelectedKeys((prev) => prev.filter((key) => topLevelKeys.includes(key)));
    setSelectionAnchorKey((prev) =>
      prev && topLevelKeys.includes(prev) ? prev : null
    );
  }, [topLevelKeys]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    const handleBlur = () => {
      setIsShiftPressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(state, null, 2));
  };

  const handleToggleSelect = (key: string, event?: SelectionPressEvent) => {
    const shouldSelectRange =
      (isShiftPressed || isShiftSelectionEvent(event)) && selectionAnchorKey;

    if (shouldSelectRange) {
      const anchorIndex = topLevelKeys.indexOf(selectionAnchorKey);
      const currentIndex = topLevelKeys.indexOf(key);

      if (anchorIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(anchorIndex, currentIndex);
        const end = Math.max(anchorIndex, currentIndex);
        const rangeKeys = topLevelKeys.slice(start, end + 1);

        setSelectedKeys((prev) => Array.from(new Set([...prev, ...rangeKeys])));
        return;
      }
    }

    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
    setSelectionAnchorKey(key);
  };

  const handleBulkDelete = () => {
    if (selectedKeys.length === 0) return;
    onDeleteKeys?.(storeName, selectedKeys);
    setSelectedKeys([]);
    setSelectionAnchorKey(null);
  };

  const handleDeleteAll = () => {
    if (topLevelKeys.length === 0) return;
    onDeleteKeys?.(storeName, topLevelKeys);
    setSelectedKeys([]);
    setSelectionAnchorKey(null);
  };

  const handleEditField = onEditField
    ? (keyPath: string[], value: unknown) => onEditField(storeName, keyPath, value)
    : undefined;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{storeName}</Text>
        <View style={styles.headerActions}>
          {onDeleteKeys && selectedKeys.length > 0 && (
            <Pressable onPress={handleBulkDelete} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>
                Delete ({selectedKeys.length})
              </Text>
            </Pressable>
          )}
          {onDeleteKeys && topLevelKeys.length > 0 && (
            <Pressable onPress={handleDeleteAll} style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>
                Delete All ({topLevelKeys.length})
              </Text>
            </Pressable>
          )}
          <View style={styles.toggleGroup}>
            <Pressable
              onPress={() => setViewMode('table')}
              style={[styles.toggleButton, viewMode === 'table' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, viewMode === 'table' && styles.toggleTextActive]}>
                Table
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setViewMode('json')}
              style={[styles.toggleButton, viewMode === 'json' && styles.toggleActive]}
            >
              <Text style={[styles.toggleText, viewMode === 'json' && styles.toggleTextActive]}>
                JSON
              </Text>
            </Pressable>
          </View>
          <Pressable onPress={handleCopy} style={styles.copyButton}>
            <Text style={styles.copyButtonText}>Copy JSON</Text>
          </Pressable>
          {onRefresh && (
            <Pressable
              onPress={onRefresh}
              style={styles.refreshButton}
              accessibilityRole="button"
              accessibilityLabel="Refresh store snapshots"
            >
              <Text style={styles.refreshButtonText}>Refresh</Text>
            </Pressable>
          )}
        </View>
      </View>
      <ScrollView style={styles.contentArea}>
        {viewMode === 'json' ? (
          <View style={styles.jsonContainer}>
            <Text style={styles.jsonText}>
              {JSON.stringify(state, null, 2)}
            </Text>
          </View>
        ) : (
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <View style={styles.checkboxCell} aria-hidden />
              <Text style={[styles.tableHeaderText, styles.keyHeaderText]}>Key</Text>
              <Text style={[styles.tableHeaderText, styles.valueHeaderText]}>Value</Text>
            </View>
            {topLevelKeys.map((key) => (
              <TableRow
                key={key}
                keyName={key}
                value={state[key]}
                onEdit={handleEditField}
                isSelected={selectedKeys.includes(key)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: '#e5e7eb',
    fontWeight: 'bold',
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleGroup: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 4,
    overflow: 'hidden',
  },
  toggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#1f2937',
  },
  toggleActive: {
    backgroundColor: '#3b82f6',
  },
  toggleText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  toggleTextActive: {
    color: '#fff',
  },
  copyButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#4b5563',
    borderRadius: 4,
    backgroundColor: '#1f2937',
  },
  copyButtonText: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  refreshButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2563eb',
    borderRadius: 4,
    backgroundColor: '#1e3a8a',
  },
  refreshButtonText: {
    color: '#bfdbfe',
    fontSize: 12,
  },
  deleteButton: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 4,
    backgroundColor: '#7f1d1d',
  },
  deleteButtonText: {
    color: '#fca5a5',
    fontSize: 12,
  },
  contentArea: {
    flex: 1,
  },
  jsonContainer: {
    backgroundColor: '#111827',
    borderRadius: 6,
    padding: 12,
  },
  jsonText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
    color: '#d1d5db',
  },
  tableContainer: {
    backgroundColor: '#111827',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1f2937',
    minHeight: 32,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    alignItems: 'center',
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  keyHeaderText: {
    flex: 1,
  },
  valueHeaderText: {
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    minHeight: 32,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    alignItems: 'center',
  },
  tableRowEditing: {
    alignItems: 'flex-start',
  },
  selectedTableRow: {
    backgroundColor: '#172554',
  },
  checkboxCell: {
    width: 28,
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBox: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: '#6b7280',
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  checkboxBoxSelected: {
    borderColor: '#60a5fa',
    backgroundColor: '#2563eb',
  },
  checkboxCheck: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  keyCell: {
    flex: 1,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIconSlot: {
    width: 14,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  expandIcon: {
    fontSize: 8,
    lineHeight: 12,
    color: '#6b7280',
  },
  keyText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
    color: '#93c5fd',
  },
  valueCell: {
    flex: 1,
    minHeight: 24,
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 24,
  },
  valuePrimary: {
    flex: 1,
  },
  valueText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  collapsedPreview: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
    color: '#6b7280',
    fontStyle: 'italic',
  },
  editButton: {
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  editButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  editInput: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#e5e7eb',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    minHeight: 24,
  },
  editInputMultiline: {
    minHeight: 60,
  },
  editActionBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  editConfirmText: {
    fontSize: 13,
    color: '#4ade80',
  },
  editCancelText: {
    fontSize: 13,
    color: '#f87171',
  },
});
