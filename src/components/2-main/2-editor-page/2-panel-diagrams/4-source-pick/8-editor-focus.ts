import { proxy } from 'valtio';

/** True while the source editor's text area has focus. Diagram captions follow this. */
export const editorFocus = proxy({ focused: false });

export function setEditorFocused(focused: boolean) {
    if (editorFocus.focused === focused) {
        return;
    }
    editorFocus.focused = focused;
}
