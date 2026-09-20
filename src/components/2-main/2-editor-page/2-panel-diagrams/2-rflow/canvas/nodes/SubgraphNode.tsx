/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { memo, useMemo } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from 'reactflow';

type SubgraphNodeData = {
    label: string;
    isDragging?: boolean;
};

const HANDLE_STYLES = {
    target: {
        background: '#64748b',
        width: 10,
        height: 10,
        borderRadius: '50%',
        border: '2px solid white',
        zIndex: 10,
        opacity: 0.8,
    },
    source: {
        background: '#2563eb',
        width: 10,
        height: 10,
        borderRadius: '50%',
        border: '2px solid white',
        zIndex: 11,
        opacity: 0.8,
    },
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

function ConnectionHandle({ type, position, id }: { type: 'source' | 'target'; position: Position; id: string; }) {
    const positionStyles = useMemo(
        () => {
            const offset = 18;
            switch (position) {
                case Position.Top:
                    return { top: -offset };
                case Position.Bottom:
                    return { bottom: -offset };
                case Position.Left:
                    return { left: -offset };
                case Position.Right:
                    return { right: -offset };
                default:
                    return {};
            }
        },
        [position],
    );

    return (
        <Handle
            type={type}
            position={position}
            id={id}
            style={{ ...HANDLE_STYLES[type], ...positionStyles }}
            className="subgraph-connection-handle"
            isConnectable
        />
    );
}

function SubgraphNodeInner({ data, selected, isConnectable }: NodeProps<SubgraphNodeData>) {
    const nodeClassName = `subgraph-node ${selected ? 'selected' : ''}`;

    const handlePositions = [
        { type: 'target' as const, position: Position.Top, id: 'top-target' },
        { type: 'source' as const, position: Position.Top, id: 'top-source' },
        { type: 'target' as const, position: Position.Bottom, id: 'bottom-target' },
        { type: 'source' as const, position: Position.Bottom, id: 'bottom-source' },
        { type: 'target' as const, position: Position.Left, id: 'left-target' },
        { type: 'source' as const, position: Position.Left, id: 'left-source' },
        { type: 'target' as const, position: Position.Right, id: 'right-target' },
        { type: 'source' as const, position: Position.Right, id: 'right-source' },
    ];

    return (
        <div className={nodeClassName} title={selected ? 'Drag corners to resize' : undefined}>
            {!data.isDragging && (
                <NodeResizer
                    isVisible={selected}
                    minWidth={60}
                    minHeight={40}
                    maxWidth={600}
                    maxHeight={500}
                    handleStyle={RESIZER_STYLES.handle}
                    lineStyle={RESIZER_STYLES.line}
                />
            )}

            {!data.isDragging && isConnectable && handlePositions.map(({ type, position, id }) => (
                <ConnectionHandle key={id} type={type} position={position} id={id} />
            ))}

            <div className="subgraph-header">
                <div className="subgraph-title">{data.label}</div>
            </div>

            <div className="subgraph-drag-handle" title="Drag to move container">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 9a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
            </div>
        </div>
    );
}

export const SubgraphNode = memo(SubgraphNodeInner);
