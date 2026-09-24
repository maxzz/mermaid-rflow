import { type CSSProperties, memo } from 'react';
import { type NodeProps, Position } from 'reactflow';
import { classNames } from '@/utils';
import { ConnectionHandle } from './4-node-common';

export const DiamondNode = memo(DiamondNodeInner);

function DiamondNodeInner(props: NodeProps<DiamondNodeData>) {
    const { data, isConnectable } = props;

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
        <div
            className={classNames("relative size-full bg-transparent border-none", data.locked && 'locked')}
            onDoubleClick={data.onEdit}
        >
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                <polygon points="50,2 98,50 50,98 2,50" fill={String(bgColor)} stroke={String(borderColor)} strokeWidth={borderWidth} />
            </svg>

            <div className="absolute inset-0 p-1.5 text-center bg-transparent border-none shadow-none rounded-none flex flex-col items-center justify-center pointer-events-none">
                {data.label && (
                    <div className="max-w-[80%] text-[11px] font-bold leading-[1.2] truncate" title={data.label}>
                        {data.label}
                    </div>
                )}
                {data.description && (
                    <div className="mt-1 max-w-[80%] text-[10px] text-[#475569] truncate" title={data.description}>
                        {data.description}
                    </div>
                )}
            </div>

            {!data.isDragging && (<>
                <ConnectionHandle type="target" position={Position.Top} id="top-target" isConnectable={isConnectable} />
                <ConnectionHandle type="source" position={Position.Top} id="top-source" isConnectable={isConnectable} />
                <ConnectionHandle type="target" position={Position.Bottom} id="bottom-target" isConnectable={isConnectable} />
                <ConnectionHandle type="source" position={Position.Bottom} id="bottom-source" isConnectable={isConnectable} />
                <ConnectionHandle type="target" position={Position.Left} id="left-target" isConnectable={isConnectable} />
                <ConnectionHandle type="source" position={Position.Left} id="left-source" isConnectable={isConnectable} />
                <ConnectionHandle type="target" position={Position.Right} id="right-target" isConnectable={isConnectable} />
                <ConnectionHandle type="source" position={Position.Right} id="right-source" isConnectable={isConnectable} />
            </>)}
        </div>
    );
}

type DiamondNodeData = {
    label: string;
    description?: string;
    style?: CSSProperties;
    isDragging?: boolean;
    locked?: boolean;
    onEdit?: () => void;
};

