import { classNames } from '@/utils';
import { Handle, Position } from 'reactflow';

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
