export const DEFAULT_MERMAID_SOURCE = `\
graph TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Ship it]
    B -->|No| D[Debug]
    D --> B
    C --> E[Celebrate]
`;

export const MERMAID_SAMPLES: { name: string; source: string; }[] = [
    {
        name: 'Flowchart',
        source: DEFAULT_MERMAID_SOURCE,
    },
    {
        name: 'Sequence',
        source: `\
sequenceDiagram
    Alice->>Bob: Hello Bob!
    Bob-->>Alice: Hi Alice!
    Alice->>Bob: How are you?
    Bob-->>Alice: Great, thanks!
`,
    },
    {
        name: 'State',
        source: `\
stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: start
    Processing --> Complete: done
    Processing --> Failed: error
    Failed --> Idle: retry
    Complete --> [*]
`,
    },
    {
        name: 'Class',
        source: `\
classDiagram
    Animal <|-- Duck
    Animal <|-- Fish
    Animal: +int age
    Animal: +String gender
    Animal: +isMammal() bool
    Duck: +String beakColor
    Duck: +swim()
    Duck: +quack()
`,
    },
    {
        name: 'ER',
        source: `\
erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    PRODUCT ||--o{ LINE_ITEM : "is in"
`,
    },
    {
        name: 'XY chart',
        source: `\
xychart-beta
    title "Monthly Revenue"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Revenue ($K)" 0 --> 500
    bar [180, 250, 310, 280, 350, 420]
    line [180, 230, 290, 300, 340, 400]
`,
    },
];
