"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ArrayValue = string | number;

export type ArrayStripProps = {
  data: ArrayValue[];
  disabledElements?: number[];
  visitedIndices?: number[];
  traversalTarget?: number;
  name?: string;
  nameHint?: string;
  accessExpression?: string;
  showIndex?: boolean;
  activeIndex?: number;
  dimElements?: boolean;
  dimIndices?: boolean;
  highlightElements?: boolean;
  highlightIndices?: boolean;
  className?: string;
};

const EMPTY_DISABLED_ELEMENTS: number[] = [];
const EMPTY_VISITED_INDICES: number[] = [];

// ── Springs ─────────────────────────────────────────────────────────────
const CELL_SPRING = {
  type: "spring" as const,
  stiffness: 240,
  damping: 22,
  mass: 0.8,
};
const RING_SPRING = {
  type: "spring" as const,
  stiffness: 280,
  damping: 24,
  mass: 0.7,
};
const VALUE_SPRING = {
  type: "spring" as const,
  stiffness: 200,
  damping: 18,
  mass: 0.5,
};

// ── Stable key system ───────────────────────────────────────────────────
// Detects push/pop/shift/unshift/set by diffing prev vs next data,
// so each element keeps a stable motion key across array mutations.
function useStableKeys(data: ArrayValue[]) {
  const stateRef = useRef({
    ids: [] as number[],
    data: [] as ArrayValue[],
    next: 0,
  });
  const s = stateRef.current;
  const prev = s.data;
  const prevIds = s.ids;
  const diff = data.length - prev.length;

  let ids: number[];

  if (prev.length === 0 || Math.abs(diff) > 1) {
    ids = data.map(() => s.next++);
  } else if (diff === 0) {
    ids = prevIds;
  } else {
    const point = findDiffPoint(prev, data, diff > 0);
    if (diff === 1) {
      ids = [...prevIds.slice(0, point), s.next++, ...prevIds.slice(point)];
    } else {
      ids = [...prevIds.slice(0, point), ...prevIds.slice(point + 1)];
    }
  }

  s.ids = ids;
  s.data = [...data];
  return ids;
}

function findDiffPoint(
  prev: ArrayValue[],
  next: ArrayValue[],
  isInsertion: boolean,
) {
  const shorter = isInsertion ? prev : next;
  const longer = isInsertion ? next : prev;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] !== longer[i]) return i;
  }
  return shorter.length;
}

// ── Component ───────────────────────────────────────────────────────────
export function ArrayStrip({
  data,
  disabledElements = EMPTY_DISABLED_ELEMENTS,
  visitedIndices = EMPTY_VISITED_INDICES,
  traversalTarget,
  name,
  nameHint,
  accessExpression,
  showIndex = true,
  activeIndex,
  dimElements,
  dimIndices,
  highlightElements,
  highlightIndices,
  className,
}: ArrayStripProps) {
  const isTraversing = traversalTarget !== undefined;
  const containerRef = useRef<HTMLDivElement>(null);
  const cellRefsMap = useRef(new Map<number, HTMLDivElement>());
  const stableKeys = useStableKeys(data);

  const setCellRef = useCallback((index: number, el: HTMLDivElement | null) => {
    if (el) cellRefsMap.current.set(index, el);
    else cellRefsMap.current.delete(index);
  }, []);

  return (
    <div
      className={cn(
        "canvas-array-strip relative flex w-full max-w-5xl items-start justify-center pt-4",
        className,
      )}
    >
      <div className="relative flex items-center gap-4">
        {name ? (
          <motion.div
            layout
            transition={CELL_SPRING}
            className="canvas-array-strip-name mr-1 grid min-w-16 justify-items-end text-2xl font-semibold tracking-tight text-foreground md:text-2xl"
          >
            <span className="leading-none">{name} =</span>
            <AnimatePresence mode="wait">
              {nameHint ? (
                <motion.span
                  key={nameHint}
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -2 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm font-normal text-muted-foreground"
                >
                  {nameHint}
                </motion.span>
              ) : null}
            </AnimatePresence>
          </motion.div>
        ) : null}

        <div className="relative" ref={containerRef}>
          {accessExpression ? (
            <AccessExpressionLabel
              expression={accessExpression}
              activeIndex={activeIndex ?? 0}
              cellRefsMap={cellRefsMap}
              containerRef={containerRef}
            />
          ) : null}

          <AnimatePresence>
            {highlightElements ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute left-[-10px] right-[-10px] top-[-8px] rounded-xl border-2 border-dashed border-border/60 bg-background/10"
                style={{ bottom: showIndex ? "28px" : "-8px" }}
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {highlightIndices && showIndex ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-[-6px] left-[-10px] right-[-10px] h-8 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5"
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {highlightElements ? (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.25 }}
                className="absolute left-[calc(100%+16px)]  border-2 top-[calc(50%-22px)] whitespace-nowrap text-lg font-medium tracking-tight text-foreground md:text-xl"
              >
                elements
              </motion.span>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {highlightIndices ? (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }}
                transition={{ duration: 0.25 }}
                className="absolute bottom-[-4px] left-[calc(100%+16px)] whitespace-nowrap text-lg font-medium tracking-tight text-foreground md:text-xl"
              >
                indices
              </motion.span>
            ) : null}
          </AnimatePresence>

          {/*
            Discrete plates with a gap, matching StackStrip — same border,
            surface, radius and drop shadow, so an array cell and a stack
            cell read as the same physical object seen from two angles.
          */}
          <motion.div
            layout
            transition={CELL_SPRING}
            className="canvas-array-strip-plates flex gap-2 border-2 px-3 py-2 bg-muted/40 border-dashed border-foreground/25 rounded-2xl"
          >
            <AnimatePresence initial={false} mode="popLayout">
              {data.map((item, index) => {
                const isDisabled = disabledElements.includes(index);
                const isActive = activeIndex === index;
                const isVisited = visitedIndices.includes(index) || isActive;
                const isTargetHit =
                  isTraversing && isVisited && index === traversalTarget;
                const isTraversalMiss =
                  isTraversing && isVisited && !isTargetHit;
                const isPlainActive = !isTraversing && isActive;
                const shouldDim = dimElements && !isPlainActive && !isTargetHit;

                return (
                  <motion.div
                    key={stableKeys[index]}
                    layout
                    initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    transition={CELL_SPRING}
                    className="flex flex-col items-center  "
                  >
                    <motion.div
                      ref={(el) => setCellRef(index, el)}
                      layout
                      transition={CELL_SPRING}
                      className={cn(
                        "canvas-array-strip-cell relative flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-sm border border-border bg-[#4C4C4C] text-base tracking-tight text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-colors duration-300 sm:h-14 sm:w-14 sm:text-lg md:h-16 md:w-16 md:text-xl",
                        isTraversalMiss &&
                          "border-border bg-muted/50 text-muted-foreground opacity-40",
                        isTargetHit &&
                          "border-emerald-500/60 bg-emerald-500 text-white",
                        isPlainActive &&
                          "border-primary/50 bg-primary text-primary-foreground",
                        isDisabled && "opacity-30",
                        shouldDim && "opacity-40",
                      )}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={String(item)}
                          initial={{
                            opacity: 0,
                            scale: 0.7,
                            filter: "blur(2px)",
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            filter: "blur(0px)",
                          }}
                          exit={{ opacity: 0, scale: 0.7, filter: "blur(2px)" }}
                          transition={VALUE_SPRING}
                          className="pointer-events-none select-none"
                        >
                          {item}
                        </motion.span>
                      </AnimatePresence>
                    </motion.div>

                    {/* {showIndex ? (
                      <motion.span
                        layout
                        transition={CELL_SPRING}
                        className={cn(
                          "mt-1.5 text-xs font-medium tabular-nums text-muted-foreground transition-opacity duration-300 md:text-sm",
                          dimIndices && "opacity-35",
                        )}
                      >
                        {index}
                      </motion.span>
                    ) : null} */}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
          <motion.div
            layout
            transition={CELL_SPRING}
            className="flex gap-2  px-3 py-1 "
          >
            <AnimatePresence initial={false} mode="popLayout">
              {data.map((item, index) => {

                return (
                  <motion.div
                    key={stableKeys[index]}
                    layout
                    initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                    transition={CELL_SPRING}
                    className="flex flex-col items-center  w-[4rem]  "
                  >
                    {/* <motion.div
                      ref={(el) => setCellRef(index, el)}
                      layout
                      transition={CELL_SPRING}
                      className={cn(
                        "relative flex items-center justify-center rounded-sm border border-border bg-[#4C4C4C] text-base tracking-tight text-white shadow-[0_10px_24px_rgba(0,0,0,0.24)] transition-colors duration-300 sm:h-14 sm:w-14 sm:text-lg md:h-16 md:w-16 md:text-xl",
                        isTraversalMiss &&
                          "border-border bg-muted/50 text-muted-foreground opacity-40",
                        isTargetHit &&
                          "border-emerald-500/60 bg-emerald-500 text-white",
                        isPlainActive &&
                          "border-primary/50 bg-primary text-primary-foreground",
                        isDisabled && "opacity-30",
                        shouldDim && "opacity-40",
                      )}
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.span
                          key={String(item)}
                          initial={{
                            opacity: 0,
                            scale: 0.7,
                            filter: "blur(2px)",
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            filter: "blur(0px)",
                          }}
                          exit={{ opacity: 0, scale: 0.7, filter: "blur(2px)" }}
                          transition={VALUE_SPRING}
                          className="pointer-events-none select-none"
                        >
                          {item}
                        </motion.span>
                      </AnimatePresence>
                    </motion.div> */}

                    {showIndex ? (
                      <motion.span
                        layout
                        transition={CELL_SPRING}
                        className={cn(
                          "mt-1.5 text-xs font-medium tabular-nums text-muted-foreground transition-opacity duration-300 md:text-sm",
                          dimIndices && "opacity-35",
                        )}
                      >
                        {index}
                      </motion.span>
                    ) : null}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function AccessExpressionLabel({
  expression,
  activeIndex,
  cellRefsMap,
  containerRef,
}: {
  expression: string;
  activeIndex: number;
  cellRefsMap: React.RefObject<Map<number, HTMLDivElement> | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [leftPx, setLeftPx] = useState<number | null>(null);

  useLayoutEffect(() => {
    const cell = cellRefsMap.current?.get(activeIndex);
    const container = containerRef.current;
    if (!cell || !container) return;

    const cellRect = cell.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setLeftPx(cellRect.left + cellRect.width / 2 - containerRect.left);
  }, [activeIndex, cellRefsMap, containerRef]);

  const left = leftPx !== null ? `${leftPx}px` : `${activeIndex * 64 + 32}px`;

  return (
    <motion.div
      layout
      transition={RING_SPRING}
      className="absolute -top-12 -translate-x-1/2 text-center text-xl font-semibold tracking-tight text-foreground md:-top-14 md:text-2xl"
      style={{ left }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={expression}
          initial={{ opacity: 0, y: 4, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -4, filter: "blur(2px)" }}
          transition={VALUE_SPRING}
        >
          {expression}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
}
