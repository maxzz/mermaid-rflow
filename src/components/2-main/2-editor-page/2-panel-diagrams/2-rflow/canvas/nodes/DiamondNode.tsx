/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { memo, useMemo, type CSSProperties } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from 'reactflow';

type DiamondNodeData = {
    label: string;
    description?: string;
    style?: CSSProperties;
    isDragging?: boolean;
    locked?: boolean;
    onEdit?: () => void;
};

const RESIZER_STYLES = {
    handle: {
        backgroundColor: '#2563eb',
        border: '2px solid white',
        width: 12,
        height: 12,
        borderRadius: '3px',
        boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
    },
    line: {
        borderColor: '#2563eb',
        borderWidth: 2,
        opacity: 0.6,
    },
};

function DiamondNodeInner(props: NodeProps<DiamondNodeData>) {
    const { data, isConnectable, selected } = props;

    const nodeClassName = useMemo(
        () => {
            const classes = ['diamond-node'];
            if (selected) {
                classes.push('selected');
            }
            if (data.locked) {
                classes.push('locked');
            }
            return classes.join(' ');
        },
        [selected, data.locked],
    );

    const mergedStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative',
        background: 'transparent',
        border: 'none',
    };

    function ConnectionHandle({ type, position, id }: { type: 'source' | 'target'; position: Position; id: string; }) {
        return (
            <Handle
                type={type}
                position={position}
                isConnectable={isConnectable}
                id={id}
                style={{
                    left: position === Position.Left ? 0 : position === Position.Right ? undefined : '50%',
                    right: position === Position.Right ? 0 : undefined,
                    top: position === Position.Top ? 0 : position === Position.Bottom ? undefined : '50%',
                    bottom: position === Position.Bottom ? 0 : undefined,
                    transform:
                        position === Position.Top ? 'translate(-50%, -50%)' :
                            position === Position.Bottom ? 'translate(-50%, 50%)' :
                                position === Position.Left ? 'translate(-50%, -50%)' :
                                    'translate(50%, -50%)',
                }}
            />
        );
    }

    const style = data?.style as (CSSProperties & { borderColor?: string; borderWidth?: string | number; }) | undefined;
    const bgColor = style?.backgroundColor || '#FFF3E0';
    const borderColor = style?.borderColor || '#F57C00';
    const borderWidth = style?.borderWidth
        ? Number(style.borderWidth) || 2
        : (() => {
            const b = style?.border as string | undefined;
            if (!b) {
                return 2;
            }
            const m = b.match(/(\d+(?:\.\d+)?)px/);
            return m ? Number(m[1]) : 2;
        })();

    return (
        <div className={nodeClassName} onDoubleClick={data.onEdit} style={mergedStyle}>
            {!data.isDragging && (
                <NodeResizer
                    isVisible={selected}
                    keepAspectRatio
                    minWidth={60}
                    minHeight={60}
                    maxWidth={500}
                    maxHeight={500}
                    handleStyle={RESIZER_STYLES.handle}
                    lineStyle={RESIZER_STYLES.line}
                />
            )}

            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <polygon points="50,2 98,50 50,98 2,50" fill={String(bgColor)} stroke={String(borderColor)} strokeWidth={borderWidth} />
            </svg>

            <div
                className="node-content"
                style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    textAlign: 'center',
                    pointerEvents: 'none',
                    background: 'transparent',
                    border: 'none',
                    boxShadow: 'none',
                    borderRadius: 0,
                }}
            >
                {data.label && (
                    <div className="node-label" title={data.label} style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {data.label}
                    </div>
                )}
                {data.description && (
                    <div className="node-description" title={data.description} style={{ marginTop: 4, fontSize: 10, color: '#475569', maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {data.description}
                    </div>
                )}
            </div>

            {!data.isDragging && (
                <>
                    <ConnectionHandle type="target" position={Position.Top} id="top-target" />
                    <ConnectionHandle type="source" position={Position.Top} id="top-source" />
                    <ConnectionHandle type="target" position={Position.Bottom} id="bottom-target" />
                    <ConnectionHandle type="source" position={Position.Bottom} id="bottom-source" />
                    <ConnectionHandle type="target" position={Position.Left} id="left-target" />
                    <ConnectionHandle type="source" position={Position.Left} id="left-source" />
                    <ConnectionHandle type="target" position={Position.Right} id="right-target" />
                    <ConnectionHandle type="source" position={Position.Right} id="right-source" />
                </>
            )}
        </div>
    );
}

export const DiamondNode = memo(DiamondNodeInner);
