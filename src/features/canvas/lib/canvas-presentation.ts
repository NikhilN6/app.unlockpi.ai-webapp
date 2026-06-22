import type { CanvasDocument } from "@/features/canvas/types/canvas-types";

export type CanvasPresentationFrame = {
  document: CanvasDocument;
  id: string;
  index: number;
  searchText: string;
  title: string;
};

export function getCanvasPresentationFrames(
  document: CanvasDocument,
): CanvasPresentationFrame[] {
  return document.content
    .filter((item) => item.type === "SlideBlock")
    .map((item, index) => {
      const title = item.props.title || `Frame ${index + 1}`;

      return {
        document: {
          ...document,
          content: [
            {
              ...item,
              props: {
                ...item.props,
                frameLabel: `Frame ${index + 1}`,
              },
            },
          ],
        },
        id: item.props.id,
        index,
        searchText: collectSearchText(item.props).toLowerCase(),
        title,
      };
    });
}

export function describePresentationFrames(document: CanvasDocument) {
  return getCanvasPresentationFrames(document).map((frame) => ({
    frame_number: frame.index + 1,
    title: frame.title,
    searchable_content: frame.searchText.slice(0, 1200),
  }));
}

function collectSearchText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(collectSearchText).join(" ");
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => key !== "id")
      .map(([, child]) => collectSearchText(child))
      .join(" ");
  }

  return "";
}
