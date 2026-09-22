import { useCallback } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@/ui/shadcn/button';
import { IconAlignBottom, IconAlignCenterHorizontally, IconAlignCenterVertically, IconAlignLeft, IconAlignRight, IconAlignTop, IconDistributeHorizontally, IconDistributeVertically } from '@/ui/icons/normal/align';
import { type Node } from 'reactflow';
import { type AlignmentType, type DistributionType } from '../2-converter/constants';
import { alignNodes, distributeNodes } from '../1-canvas/8-diagram-editing-utils';
import { rflowDiagram, setRflowNodes } from '../8-store/2-flow-diagram';
import { rflowSelectedNodesAtom } from '../8-store/a-rflow-ui-atoms';

export function AlignHorizontalGroup() {
    const align = useAlignNodes();
    return (<>
        <Button variant="ghost" size="icon-xs" title="Align left" onClick={() => align('left')}>
            <IconAlignLeft className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" title="Align center" onClick={() => align('center-horizontal')}>
            <IconAlignCenterHorizontally className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" title="Align right" onClick={() => align('right')}>
            <IconAlignRight className="size-3.5" />
        </Button>
    </>);
}

export function AlignVerticalGroup() {
    const align = useAlignNodes();
    return (<>
        <Button variant="ghost" size="icon-xs" title="Align top" onClick={() => align('top')}>
            <IconAlignTop className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" title="Align middle" onClick={() => align('center-vertical')}>
            <IconAlignCenterVertically className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" title="Align bottom" onClick={() => align('bottom')}>
            <IconAlignBottom className="size-3.5" />
        </Button>
    </>);
}

export function DistributeGroup() {
    const distribute = useDistributeNodes();
    return (<>
        <Button variant="ghost" size="icon-xs" title="Distribute horizontally" onClick={() => distribute('horizontal')}>
            <IconDistributeHorizontally className="size-3.5" />
        </Button>
        <Button variant="ghost" size="icon-xs" title="Distribute vertically" onClick={() => distribute('vertical')}>
            <IconDistributeVertically className="size-3.5" />
        </Button>
    </>);
}

//---------------------------------------------------------------------------

function useCommitSelectedNodes() {
    const setSelectedNodes = useSetAtom(rflowSelectedNodesAtom);
    return useCallback(
        (next: Node[]) => {
            setRflowNodes(next);
            setSelectedNodes(next.filter((node) => node.selected));
        },
        [setSelectedNodes],
    );
}

function useAlignNodes() {
    const selectedNodes = useAtomValue(rflowSelectedNodesAtom);
    const commit = useCommitSelectedNodes();
    return useCallback(
        (alignment: AlignmentType) => {
            commit(alignNodes(rflowDiagram.nodes as Node[], selectedNodes, alignment));
        },
        [commit, selectedNodes],
    );
}

function useDistributeNodes() {
    const selectedNodes = useAtomValue(rflowSelectedNodesAtom);
    const commit = useCommitSelectedNodes();
    return useCallback(
        (direction: DistributionType) => {
            commit(distributeNodes(rflowDiagram.nodes as Node[], selectedNodes, direction));
        },
        [commit, selectedNodes],
    );
}
