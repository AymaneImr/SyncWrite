
import React from "react";
import type { Editor } from "@tiptap/react";

type RemoteSelection = {
  from: number;
  to: number;
  username: string;
};

type RemoteSelectionsProps = {
  selections: Record<number, RemoteSelection>;
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
};

// RENDER: draw remote cursors and selection ranges as overlays
export default function RemoteSelections({
  selections,
  editor,
  editorContainerRef,
}: RemoteSelectionsProps) {
  if (!editor) return null;

  const containerRect = editorContainerRef.current?.getBoundingClientRect();
  const editorRect = editor.view.dom.getBoundingClientRect();
  const baseRect = containerRect ?? editorRect;

  return (
    <>
      {Object.entries(selections).map(([userId, sel]) => {
        const isCursor = sel.from === sel.to;
        const from = Math.min(sel.from, sel.to);
        const to = Math.max(sel.from, sel.to);

        let fromCoords: { left: number; top: number; bottom: number } | null = null;
        let rects: Array<{ left: number; top: number; width: number; height: number }> = [];

        try {
          fromCoords = editor.view.coordsAtPos(from);

          if (!isCursor) {
            const start = editor.view.domAtPos(from);
            const end = editor.view.domAtPos(to);
            const range = document.createRange();
            range.setStart(start.node, start.offset);
            range.setEnd(end.node, end.offset);

            rects = Array.from(range.getClientRects()).map(rect => ({
              left: rect.left - baseRect.left,
              top: rect.top - baseRect.top,
              width: Math.max(4, rect.width),
              height: Math.max(12, rect.height),
            }));
          }
        } catch {
          return null;
        }

        if (!fromCoords) return null;

        const left = fromCoords.left - baseRect.left;
        const top = fromCoords.top - baseRect.top;
        const cursorHeight = Math.max(12, fromCoords.bottom - fromCoords.top);

        if (!isCursor && rects.length === 0) {
          // Fallback: ensure at least one highlight if DOM range rects are empty
          rects = [
            {
              left,
              top,
              width: 4,
              height: cursorHeight,
            },
          ];
        }

        return (
          <div
            key={userId}
            style={{
              position: "absolute",
              left: `${left}px`,
              top: `${top}px`,
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            {isCursor && (
              <div
                style={{
                  width: "2px",
                  height: `${cursorHeight}px`,
                  background: "#4f46e5",
                }}
              />
            )}

            {!isCursor && (
              <>
                {rects.map((rect, index) => (
                  <div
                    key={`${userId}-${index}`}
                    style={{
                      width: `${Math.min(320, rect.width)}px`,
                      height: `${Math.min(24, rect.height)}px`,
                      left: `${rect.left - left}px`,
                      top: `${rect.top - top}px`,
                      position: "absolute",
                      background: "rgba(99,102,241,0.25)",
                      borderRadius: "4px",
                    }}
                  />
                ))}
              </>
            )}

            <div
              style={{
                fontSize: "10px",
                background: "#4f46e5",
                color: "#fff",
                padding: "2px 4px",
                borderRadius: "4px",
                marginTop: "2px",
              }}
            >
              {sel.username}
            </div>
          </div>
        );
      })}
    </>
  );
}
