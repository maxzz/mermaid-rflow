import { type ComponentProps } from "react"; // 09.25.26
import { classNames } from "@/utils";
import { TabsList, TabsTrigger } from "@/ui/shadcn/tabs";
import { LayoutGroup, motion } from "motion/react";

type TabsListAnimatedProps = ComponentProps<typeof TabsList> & {
    layoutId: string; // Unique id for the sliding indicator within a LayoutGroup. For example, "animated-tab-outline".
};

export function TabsListAnimated({ layoutId, className, children, ...rest }: TabsListAnimatedProps) {
    return (
        <LayoutGroup id={layoutId}>
            <TabsList className={classNames("p-0.75 w-fit text-muted-foreground bg-muted rounded inline-flex items-center justify-center", className)} {...rest}>
                {children}
            </TabsList>
        </LayoutGroup>
    );
}

type AnimatedTabsTriggerProps = ComponentProps<typeof TabsTrigger> & {
    selectedValue: string;
};

export function TabsTriggerAnimated({ className, children, value, selectedValue, ...rest }: AnimatedTabsTriggerProps) {
    const isSelected = selectedValue === value;

    return (
        <TabsTrigger className={classNames(animatedTabsTriggerClasses, isSelected ? "text-foreground" : "text-foreground/60 hover:text-foreground", className)} value={value} {...rest}>
            {isSelected && (
                <motion.div
                    layoutId="animated-tab-outline"
                    className="absolute inset-0 bg-background border border-border rounded shadow-xs"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.45 }}
                />
            )}
            <span className="relative z-10">{children}</span>
        </TabsTrigger>
    );
}

const animatedTabsTriggerClasses = "\
relative \
h-[calc(100%-1px)] \
font-medium \
transition-none \
\
border-transparent \
bg-transparent \
shadow-none \
\
data-[state=active]:bg-transparent \
data-[state=active]:shadow-none \
\
dark:data-[state=active]:bg-transparent \
dark:data-[state=active]:border-transparent \
\
hover:bg-transparent \
";
