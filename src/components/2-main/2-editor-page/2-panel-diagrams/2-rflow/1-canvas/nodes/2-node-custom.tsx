import { type CSSProperties, memo } from 'react';
import { classNames } from '@/utils';
import { type NodeProps, Position } from 'reactflow';
import { ConnectionHandle } from './4-node-common';

export const CustomNode = memo(CustomNodeInner);

function CustomNodeInner(props: NodeProps<CustomNodeData>) {
    const { data, isConnectable } = props;
    const isImageNode = Boolean(data.imageUrl?.trim());
    const displayCaption = data.label?.trim() ? (data.label.length > 20 ? `${data.label.slice(0, 20)}...` : data.label) : '';
    const hasLongCaption = (data.label?.length || 0) > 20;

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

    return (
        <div
            className={classNames(
                containerClasses,
                data.shape === 'circle' && 'aspect-square rounded-full',
                data.shape === 'stadium' && 'rounded-[30px]',
                data.shape === 'round' && 'rounded-[15px]',
                isImageNode && 'p-0 min-w-10 min-h-10 overflow-visible bg-transparent border-none',
                data.locked && 'locked',
            )}
            onDoubleClick={data.onEdit}
            style={mergedStyle}
        >
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

            <div className={classNames('relative z-2 box-border p-3.5 w-full h-full overflow-hidden flex flex-col items-center justify-center', isImageNode && 'p-0 overflow-visible')}>
                {isImageNode
                    ? (<>
                        <div className="absolute inset-0" style={{ color: (data?.style as CSSProperties | undefined)?.color }}>
                            <img
                                src={data.imageUrl}
                                alt={data.label || 'Node image'}
                                className="w-full h-full object-contain block bg-transparent"
                            />
                        </div>

                        {data.label?.trim() && (
                            <div
                                className="absolute top-[calc(100%+8px)] left-1/2 z-1000 px-2 py-1 max-w-30 text-[10px] font-medium text-[#333] bg-white/90 rounded truncate -translate-x-1/2"
                                title={hasLongCaption ? data.label : data.label}
                                data-full-text={data.label}
                            >
                                {displayCaption}
                            </div>
                        )}
                    </>)
                    : (<>
                        <div className="mb-1 max-w-50 text-[clamp(10px,2vw,13px)] font-semibold leading-[1.4] text-[#2d3748] text-center wrap-break-word">
                            {renderLabel(data.label)}
                        </div>

                        {data.description && (
                            <div className="mt-1 max-w-50 text-[clamp(9px,1.5vw,12px)] leading-[1.3] text-[#718096] text-center overflow-hidden text-ellipsis" title={data.description}>
                                {data.description}
                            </div>
                        )}
                    </>)}
            </div>
        </div>
    );
}

const containerClasses = "relative \
box-border \
p-2.5 \
w-full \
h-full \
overflow-hidden \
text-center \
text-[#1f2937] \
bg-white \
wrap-break-word \
border-2 \
border-[#e5e7eb] \
rounded-lg \
flex \
items-center \
justify-center \
cursor-pointer transition-[border-color,box-shadow] duration-200 \
hover:border-[#d1d5db] \
";

type CustomNodeData = {
    label: string;
    description?: string;
    imageUrl?: string;
    shape?: 'rect' | 'circle' | 'diamond' | 'stadium' | 'round';
    style?: CSSProperties;
    isDragging?: boolean;
    locked?: boolean;
    onEdit?: () => void;
};
