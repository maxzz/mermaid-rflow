import { useSnapshot } from 'valtio';
import { toast } from 'sonner';
import { CopyIcon, DownloadIcon } from 'lucide-react';
import { copyText, downloadText } from '@/components/4-dialogs/2-export/8-export-utils';
import { DropdownMenuItem } from '@/ui/shadcn/dropdown-menu';
import { TabDropdownMenu } from '../../../../../../ui/local-ui/8-tab-dropdown-menu';
import { mmdDiagram } from '../8-store/1-mmd-diagram';
import { MmdOptionsPopover } from './8-1-1-mmd-options-popover';

export function PreviewToolbar_Mmd() {
    const { svg, error } = useSnapshot(mmdDiagram);

    return (
        <div className="flex items-center">
            <MmdOptionsPopover />

            <TabDropdownMenu>
                <DropdownMenuItem onSelect={() => void copyOfficialSvg(svg, error)}>
                    <CopyIcon />
                    Copy SVG
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => downloadOfficialSvg(svg, error)}>
                    <DownloadIcon />
                    Download SVG
                </DropdownMenuItem>
            </TabDropdownMenu>
        </div>
    );
}

async function copyOfficialSvg(svg: string, error: string | null) {
    if (error) {
        toast.error(`Cannot copy: ${error}`);
        return;
    }
    if (!svg) {
        toast.message('Nothing to copy: the diagram is empty.');
        return;
    }

    await copyText(svg);
    toast.success('SVG copied to clipboard');
}

function downloadOfficialSvg(svg: string, error: string | null) {
    if (error) {
        toast.error(`Cannot download: ${error}`);
        return;
    }
    if (!svg) {
        toast.message('Nothing to download: the diagram is empty.');
        return;
    }

    downloadText(svg, 'diagram.svg', 'image/svg+xml');
    toast.success('Downloaded SVG');
}
