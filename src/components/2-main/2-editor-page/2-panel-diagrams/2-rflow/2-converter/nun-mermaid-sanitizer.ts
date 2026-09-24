/**
 * Extract and sanitize Mermaid source from fenced or mixed text.
 */

export function extractMermaidFromFences(content: string) {
    if (!content) {
        return content;
    }

    const fencedRegex = /```(?:\s*mermaid\b)?\s*\n([\s\S]*?)```/im;
    const m = content.match(fencedRegex);
    if (m && m[1]) {
        return m[1].trim();
    }

    const genericFenced = /```([\s\S]*?)```/m;
    const mg = content.match(genericFenced);
    if (mg && mg[1]) {
        const inner = mg[1].trim();
        if (/\b(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i.test(inner)) {
            return inner;
        }
    }

    const rawStartRegex = /\b(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i;
    const mr = content.match(rawStartRegex);
    if (mr) {
        const idx = content.indexOf(mr[0]);
        if (idx !== -1) {
            const nextFence = content.indexOf('```', idx);
            if (nextFence !== -1) {
                return content.slice(idx, nextFence).trim();
            }
            return content.slice(idx).trim();
        }
    }

    return content.trim();
}

export function sanitizeMermaidLabels(src: string) {
    if (!src) {
        return src;
    }
    
    const replaced = src.replace(/([A-Za-z0-9_]+)\[((?:(?![\"']).)*?)\]/g, (m, id, label) => {
        if (/^[\"']/.test(label)) {
            return m;
        }
        if (/[()\"\[\],:;]/.test(label)) {
            const esc = String(label).replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
            return `${id}[\"${esc}\"]`;
        }
        return m;
    });

    const subgraphFixed = replaced.replace(/^([ \t]*subgraph\s+)([^\n\r]+)(\|[^\n\r]*)?$/gmi, (m, pre, title, rest) => {
        const t = String(title).trim();
        if (/^[\"']/.test(t)) {
            return m;
        }
        if (/[()\"\[\],:;]/.test(t)) {
            const esc = t.replace(/\\/g, "\\\\").replace(/\"/g, '\\\"');
            return `${pre}\"${esc}\"${rest || ""}`;
        }
        return m;
    });

    const diagRegex = /\b(graph|flowchart|sequenceDiagram|stateDiagram|classDiagram|gantt|journey|erDiagram|gitGraph|pie|timeline|infoDiagram)\b/i;
    const allStarts: number[] = [];
    let mm: RegExpExecArray | null;
    const globalRegex = new RegExp(diagRegex.source, 'gim');
    while ((mm = globalRegex.exec(subgraphFixed)) !== null) {
        allStarts.push(mm.index);
        if (globalRegex.lastIndex === mm.index) {
            globalRegex.lastIndex++;
        }
    }

    if (allStarts.length <= 1) {
        return subgraphFixed;
    }

    const first = allStarts[0];
    const second = allStarts[1];
    return subgraphFixed.slice(first, second).trim();
}
