import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { motion, useAnimate } from "motion/react";
import { classNames } from "@/utils";
import { AppLogo } from "./2-app-logo";
import { octopusLandedAtom, OctopusPhase, octopusPhaseAtom, resetSwampAtom } from "./3-swamp-atoms";

/**
 * Welcome page logo. When the swamp decides it is time (see respawnBubbleAtom), the octopus
 * stretches, crouches, hops and dives into the puddle, where it stays until the user enters the lab.
 * Must be rendered inside the `[data-swamp-hero]` element that also holds the puddle.
 */
export function JumpingOctopusLogo() {
    const phase = useAtomValue(octopusPhaseAtom);
    const landed = useSetAtom(octopusLandedAtom);
    const reset = useSetAtom(resetSwampAtom);
    const [scope, animate] = useAnimate<HTMLDivElement>();

    // The atoms are global: start over the next time the Welcome page is shown
    useEffect(
        () => () => reset(),
        [reset]);

    useEffect(
        () => {
            if (phase !== OctopusPhase.jumping) {
                return;
            }

            const logo = scope.current;
            const puddle = logo.closest("[data-swamp-hero]")?.querySelector("[data-swamp-puddle]");
            if (!puddle) {
                landed();
                return;
            }

            const logoBox = logo.getBoundingClientRect();
            const puddleBox = puddle.getBoundingClientRect();
            const diveY = puddleBox.top + puddleBox.height * 0.5 - logoBox.bottom;

            let cancelled = false;

            async function jump() {
                // stretch up
                await animate(logo, { scaleY: 1.12, scaleX: 0.94 }, { duration: 0.35, ease: "easeOut" });
                // anticipation: crouch
                await animate(logo, { scaleY: 0.86, scaleX: 1.07 }, { duration: 0.18, ease: "easeInOut" });
                // hop
                await animate(logo, { y: -36, scaleY: 1.1, scaleX: 0.93 }, { duration: 0.24, ease: "easeOut" });
                // fall to the water surface
                await animate(logo, { y: diveY }, { duration: 0.26, ease: [0.55, 0, 1, 0.45] });
                if (cancelled) {
                    return;
                }
                landed();
                // squash into the puddle
                await animate(logo, { scaleY: 0.05, scaleX: 0.85 }, { duration: 0.14, ease: "easeIn" });
                await animate(logo, { opacity: 0 }, { duration: 0.06 });
            }

            void jump();

            return () => { cancelled = true; };
        },
        [phase, animate, landed, scope]);

    return (
        <motion.div
            ref={scope}
            className={classNames("relative pointer-events-none", phase === OctopusPhase.onShore ? "z-10" : "z-20")}
            style={{ originY: 1 }}
        >
            <AppLogo className="size-40 text-primary" />
        </motion.div>
    );
}
