import { useSnapshot } from 'valtio';
import { toast } from 'sonner';
import { CopyIcon, DownloadIcon } from 'lucide-react';
import { copyText, downloadText } from '@/components/4-dialogs/2-export/8-export-utils';
import { Button } from '@/ui/shadcn/button';
import { mmdDiagram } from '../store/1-mmd-diagram';
import { MmdOptionsPopover } from './MmdOptionsPopover';

export function PreviewToolbar_Mmd() {
    const { svg, error } = useSnapshot(mmdDiagram);

    return (
        <div className="flex items-center">
            <Button variant="ghost" size="xs" onClick={() => void copyOfficialSvg(svg, error)} title="Copy official Mermaid SVG">
                <CopyIcon />
            </Button>

            <MmdOptionsPopover />

            <Button variant="ghost" size="xs" onClick={() => downloadOfficialSvg(svg, error)} title="Download official Mermaid SVG">
                <DownloadIcon />
            </Button>
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
