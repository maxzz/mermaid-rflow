import { useSetAtom } from 'jotai';
import { Button } from '@/ui/shadcn/button';
import { IconAlignBottom, IconAlignCenterHorizontally, IconAlignCenterVertically, IconAlignLeft, IconAlignRight, IconAlignTop, IconDistributeHorizontally, IconDistributeVertically } from '@/ui/icons/normal/align';
import { rf_AlignNodesAtom, rf_DistributeNodesAtom } from '../8-store/a-3-rflow-arrange-atoms';

export function AlignHorizontalGroup() {
    const align = useSetAtom(rf_AlignNodesAtom);
    return (<>
        <Button className="size-4.5" variant="ghost" size="icon-xs" title="Align left" onClick={() => align('left')}>
            <IconAlignLeft className="size-3.5" />
        </Button>

        <Button className="size-4.5" variant="ghost" size="icon-xs" title="Align center" onClick={() => align('center-horizontal')}>
            <IconAlignCenterHorizontally className="size-3.5" />
        </Button>

        <Button className="size-4.5" variant="ghost" size="icon-xs" title="Align right" onClick={() => align('right')}>
            <IconAlignRight className="size-3.5" />
        </Button>
    </>);
}

export function AlignVerticalGroup() {
    const align = useSetAtom(rf_AlignNodesAtom);
    return (<>
        <Button className="size-4.5" variant="ghost" size="icon-xs" title="Align top" onClick={() => align('top')}>
            <IconAlignTop className="size-3.5" />
        </Button>

        <Button className="size-4.5" variant="ghost" size="icon-xs" title="Align middle" onClick={() => align('center-vertical')}>
            <IconAlignCenterVertically className="size-3.5" />
        </Button>

        <Button className="size-4.5" variant="ghost" size="icon-xs" title="Align bottom" onClick={() => align('bottom')}>
            <IconAlignBottom className="size-3.5" />
        </Button>
    </>);
}

export function DistributeGroup() {
    const distribute = useSetAtom(rf_DistributeNodesAtom);
    return (<>
        <Button className="size-4.5" variant="ghost" size="icon-xs" title="Distribute horizontally" onClick={() => distribute('horizontal')}>
            <IconDistributeHorizontally className="size-3.5" />
        </Button>
        
        <Button className="size-4.5" variant="ghost" size="icon-xs" title="Distribute vertically" onClick={() => distribute('vertical')}>
            <IconDistributeVertically className="size-3.5" />
        </Button>
    </>);
}
