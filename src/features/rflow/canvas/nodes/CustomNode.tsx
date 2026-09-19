/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { memo, useMemo, type CSSProperties } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from 'reactflow';

type CustomNodeData = {
    label: string;
    description?: string;
    imageUrl?: string;
    shape?: 'rect' | 'circle' | 'diamond';
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

function CustomNodeInner(props: NodeProps<CustomNodeData>) {
    const { data, isConnectable, selected } = props;
    const isImageNode = Boolean(data.imageUrl?.trim());
    const displayCaption = data.label?.trim()
        ? (data.label.length > 20 ? `${data.label.slice(0, 20)}...` : data.label)
        : '';
    const hasLongCaption = (data.label?.length || 0) > 20;

    const nodeClassName = useMemo(
        () => {
            const classes = ['custom-node', `shape-${data.shape || 'rect'}`];
            if (data.imageUrl) {
                classes.push('has-image');
            }
            if (data.shape === 'diamond') {
                classes.push('diamond-node');
            }
            if (data.locked) {
                classes.push('locked');
            }
            if (selected) {
                classes.push('selected');
            }
            return classes.join(' ');
        },
        [data.shape, data.imageUrl, data.locked, selected],
    );

    const mergedStyle: CSSProperties = {
        width: '100%',
        height: '100%',
        position: 'relative',
        ...(data?.style || {}),
    };

    function renderLabel(label: string) {
        if (!label.includes('\n')) {
            return label;
        }
        return label.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
        ));
    }

    function ConnectionHandle({ type, position, id }: { type: 'source' | 'target'; position: Position; id: string; }) {
        return (
            <Handle
                type={type}
                position={position}
                isConnectable={isConnectable}
                id={id}
                className={`handle-${position.toLowerCase()}`}
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

    return (
        <div className={nodeClassName} onDoubleClick={data.onEdit} style={mergedStyle}>
            {!data.isDragging && (
                <NodeResizer
                    isVisible={selected}
                    minWidth={isImageNode ? 60 : 40}
                    minHeight={isImageNode ? 60 : 30}
                    maxWidth={500}
                    maxHeight={400}
                    keepAspectRatio={data.shape === 'circle' || isImageNode}
                    handleStyle={RESIZER_STYLES.handle}
                    lineStyle={RESIZER_STYLES.line}
                />
            )}

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

            <div className="node-content" style={{ position: 'relative' }}>
                {isImageNode
                    ? (
                        <>
                            <div className="node-image-container" style={{ color: (data?.style as CSSProperties | undefined)?.color }}>
                                <img
                                    src={data.imageUrl}
                                    alt={data.label || 'Node image'}
                                    className="node-image"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', background: 'transparent' }}
                                />
                            </div>
                            {data.label?.trim() && (
                                <div
                                    className="image-caption"
                                    title={hasLongCaption ? data.label : data.label}
                                    data-full-text={data.label}
                                >
                                    {displayCaption}
                                </div>
                            )}
                        </>
                    )
                    : (
                        <>
                            <div className="node-label">
                                {renderLabel(data.label)}
                            </div>
                            {data.description && (
                                <div className="node-description" title={data.description}>
                                    {data.description}
                                </div>
                            )}
                        </>
                    )}
            </div>
        </div>
    );
}

export const CustomNode = memo(CustomNodeInner);
