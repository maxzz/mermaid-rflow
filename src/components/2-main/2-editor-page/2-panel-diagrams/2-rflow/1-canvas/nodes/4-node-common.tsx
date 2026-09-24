import { classNames } from '@/utils';
import { Handle, Position, type Node, type XYPosition } from 'reactflow';
import { nextRfId } from '../../2-converter/8-mermaid-ids';

export function ConnectionHandle({ type, position, id, isConnectable }: { type: 'source' | 'target'; position: Position; id: string; isConnectable?: boolean; }) {
    return (
        <Handle
            className={classNames(`handle-${position.toLowerCase()}`, 'absolute! z-12 bg-[#555] border-2 border-white shadow-[0_0_4px_rgba(0,0,0,0.3)]',)}
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
            type={type}
            position={position}
            isConnectable={isConnectable}
            id={id}
        />
    );
}

export function createPaletteNode(type: string, position: XYPosition, existing: Node[]): Node | undefined {
    if (type === 'node') {
        return {
            id: nextRfId(existing, 'n'),
            type: 'custom',
            position,
            data: { label: 'New Node', shape: 'rect' },
            style: { width: 150, height: 50 },
        };
    }
    if (type === 'subgraph') {
        return {
            id: nextRfId(existing, 'sg'),
            type: 'group',
            position,
            data: { label: 'New Subgraph', isSubgraph: true },
            style: { width: 220, height: 120, background: '#e3f2fd', border: '2px dashed #1976D2' },
        };
    }
    if (type === 'diamond') {
        return {
            id: nextRfId(existing, 'd'),
            type: 'diamond',
            position,
            data: { label: 'Conditional', shape: 'diamond' },
            style: { width: 120, height: 120, backgroundColor: '#FFF3E0', borderColor: '#F57C00' },
        };
    }
}
