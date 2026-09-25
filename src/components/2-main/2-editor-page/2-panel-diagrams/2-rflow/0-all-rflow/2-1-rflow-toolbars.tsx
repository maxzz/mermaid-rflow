import { EditingToolbar } from './8-1-1-0-toolbar-rflow';
import { PaletteToolbar } from './8-1-3-palette-toolbar';

export function RflowToolbars() {
    return (
        <div className="px-2 py-1.5 border-b border-border bg-muted/20 shrink-0 flex flex-col gap-1.5">
            <EditingToolbar />
            <PaletteToolbar />
        </div>
    );
}
