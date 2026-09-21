/**
 * Adapted from mermaid-reactflow-editor (MIT).
 */
import { memo, type CSSProperties } from 'react';
import { Handle, Position, NodeResizer, type NodeProps } from 'reactflow';
import { classNames } from '@/utils';

export const SubgraphNode = memo(SubgraphNodeInner);

function SubgraphNodeInner({ data, selected, isConnectable }: NodeProps<{ label: string; isDragging?: boolean; }>) {
    return (
        <div className={classNames('relative w-full h-full', selected && 'outline-2 outline-[#2563eb] -outline-offset-1 shadow-[0_0_0_4px_rgba(37,99,235,0.1)]')} title={selected ? 'Drag corners to resize' : undefined}>
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

            <div className="absolute top-0 left-0 z-60 max-w-[calc(100%-40px)] overflow-hidden whitespace-nowrap text-ellipsis flex items-center pointer-events-auto">
                <div className="m-0 px-1.5 py-1 text-xs font-bold text-[#2d3748] bg-white/95 rounded-[10px] shadow-[0_1px_4px_rgba(0,0,0,0.15)]">
                    {data.label}
                </div>
            </div>

            <div className="absolute top-0 right-0 z-60 size-6 text-[#718096] bg-white/95 rounded flex items-center justify-center cursor-move" title="Drag to move container">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M10 13a1 1 0 100-2 1 1 0 000 2zM10 9a1 1 0 100-2 1 1 0 000 2zM10 5a1 1 0 100-2 1 1 0 000 2zM6 13a1 1 0 100-2 1 1 0 000 2zM6 9a1 1 0 100-2 1 1 0 000 2zM6 5a1 1 0 100-2 1 1 0 000 2z" />
                </svg>
            </div>
        </div>
    );
}

// --------------------------------------------------------------------------

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
    return (
        <Handle
            className="subgraph-connection-handle"
            style={{ ...HANDLE_STYLES[type], ...handleOffset(position) }}
            position={position}
            type={type}
            id={id}
            isConnectable
        />
    );
}

function handleOffset(position: Position): CSSProperties {
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
}

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
