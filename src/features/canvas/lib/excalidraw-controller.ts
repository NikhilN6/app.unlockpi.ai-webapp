/** Public methods used by this controller; avoids depending on an internal type export. */
export type ExcalidrawControllerApi = {
  getSceneElementsIncludingDeleted: () => readonly Record<string, unknown>[];
  updateScene: (scene: { elements: readonly Record<string, unknown>[] }) => void;
  scrollToContent: (elements: readonly Record<string, unknown>[], options: { fitToContent: true }) => void;
};

export type ExcalidrawCommand = { type: "excalidraw.command"; version: 1; operations?: Array<Record<string, unknown>>; viewport?: { action: string; zoom?: number; focusIds?: string[] } };

export async function applyExcalidrawCommand(api: ExcalidrawControllerApi, command: ExcalidrawCommand) {
  if (command.type !== "excalidraw.command" || command.version !== 1) throw new Error("Unsupported Excalidraw command.");
  // Excalidraw reads `navigator` while its module is evaluated. Import it only
  // when a browser-side RPC needs to change the scene, never during SSR.
  const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");
  const elements = [...api.getSceneElementsIncludingDeleted()] as Array<Record<string, unknown>>;
  const find = (id: unknown) => elements.find((item) => item.id === id && !item.isDeleted);
  for (const op of command.operations ?? []) {
    if (op.type === "insert") {
      const element = op.element as Record<string, unknown>;
      if (!element?.id || find(element.id)) throw new Error("Invalid or duplicate element.");
      const { label, ...skeleton } = element;
      const created = convertToExcalidrawElements([{
        ...skeleton,
        label: typeof label === "string" && label ? { text: label } : undefined,
      } as never]) as unknown as Array<Record<string, unknown>>;
      elements.push(...created);
    } else if (op.type === "update") {
      const item = find(op.id), changes = op.changes as Record<string, unknown>;
      if (!item || !changes) throw new Error("Element not found.");
      Object.assign(item, changes);
    } else if (op.type === "delete") {
      const item = find(op.id); if (!item) throw new Error("Element not found.");
      item.isDeleted = true;
      elements.filter((candidate) => candidate.sourceId === op.id || candidate.targetId === op.id).forEach((candidate) => { candidate.isDeleted = true; });
    } else if (op.type === "move") {
      const item = find(op.id), target = find(op.relativeTo);
      if (!item || !target) throw new Error("Element not found.");
      const gap = 80, position = op.position;
      if (position === "left") { item.x = Number(target.x) - Number(item.width) - gap; item.y = target.y; }
      else if (position === "right") { item.x = Number(target.x) + Number(target.width) + gap; item.y = target.y; }
      else if (position === "above") { item.x = target.x; item.y = Number(target.y) - Number(item.height) - gap; }
      else if (position === "below") { item.x = target.x; item.y = Number(target.y) + Number(target.height) + gap; }
      else throw new Error("Unsupported relative position.");
    } else if (op.type === "connect") {
      const source = find(op.sourceId), target = find(op.targetId), id = `${op.sourceId}-to-${op.targetId}`;
      if (!source || !target) throw new Error("Connection element not found.");
      if (!find(id)) {
        const x = Number(source.x) + Number(source.width) / 2, y = Number(source.y) + Number(source.height) / 2;
        const created = convertToExcalidrawElements([{
          id,
          type: "arrow",
          x,
          y,
          points: [[0, 0], [Number(target.x) + Number(target.width) / 2 - x, Number(target.y) + Number(target.height) / 2 - y]],
          label: typeof op.label === "string" && op.label ? { text: op.label } : undefined,
        } as never]) as unknown as Array<Record<string, unknown>>;
        created.forEach((arrow) => { arrow.sourceId = op.sourceId; arrow.targetId = op.targetId; });
        elements.push(...created);
      }
    } else if (op.type === "disconnect") {
      elements.filter((candidate) => candidate.type === "arrow" && candidate.sourceId === op.sourceId && candidate.targetId === op.targetId).forEach((candidate) => { candidate.isDeleted = true; });
    } else throw new Error("Unsupported operation.");
  }
  elements.filter((item) => item.type === "arrow" && !item.isDeleted).forEach((arrow) => {
    const source = find(arrow.sourceId), target = find(arrow.targetId);
    if (!source || !target) return;
    const x = Number(source.x) + Number(source.width) / 2, y = Number(source.y) + Number(source.height) / 2;
    arrow.x = x; arrow.y = y;
    arrow.points = [[0, 0], [Number(target.x) + Number(target.width) / 2 - x, Number(target.y) + Number(target.height) / 2 - y]];
  });
  api.updateScene({ elements: elements as never });
  if (command.viewport?.action === "scroll_to_content") api.scrollToContent((command.viewport.focusIds ?? []).map(find).filter(Boolean) as never, { fitToContent: true });
  return { success: true, scene: elements.filter((item) => !item.isDeleted), summary: `${elements.filter((item) => !item.isDeleted).length} Excalidraw elements` };
}
