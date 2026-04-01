
import React from "react";
import type { Editor } from "@tiptap/react";
import { getCollaboratorTheme } from "../common/collabTheme";

type RemoteSelection = {
  from: number;
  to: number;
  username: string;
};

type RemotePointer = {
  x: number;
  y: number;
  username: string;
};

type RemoteSelectionsProps = {
  selections: Record<number, RemoteSelection>;
  pointers: Record<number, RemotePointer>;
  editor: Editor | null;
  editorContainerRef: React.RefObject<HTMLDivElement | null>;
};

// RENDER: draw remote cursors and selection ranges as overlays
export default function RemoteSelections({
  selections,
  pointers,
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
        const theme = getCollaboratorTheme(Number(userId));
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
                  background: theme.cursor,
                }}
              />
            )}

            {rects.map((rect, index) => (
              <div
                key={`${userId}-${index}`}
                style={{
                  width: `${Math.min(320, rect.width)}px`,
                  height: `${Math.min(24, rect.height)}px`,
                  left: `${rect.left - left}px`,
                  top: `${rect.top - top}px`,
                  position: "absolute",
                  background: theme.soft,
                  borderRadius: "4px",
                }}
              />
            ))}

          </div>
        );
      })}

      {Object.entries(pointers).map(([userId, pointer]) => {
        const theme = getCollaboratorTheme(Number(userId));

        return (
          <div
            key={`pointer-${userId}`}
            style={{
              position: "absolute",
              left: `${pointer.x}px`,
              top: `${pointer.y}px`,
              pointerEvents: "none",
              zIndex: 30,
              transform: "translate(-2px, -2px)",
            }}
          >
            <svg
              width="22"
              height="28"
              viewBox="0 0 22 28"
              style={{
                display: "block",
                overflow: "visible",
                filter: "drop-shadow(0 4px 8px rgba(15, 23, 42, 0.22))",
              }}
            >
              <path
                d="M3 2L3 21L8.3 16.4L11.6 24L15.2 22.3L11.9 14.8L19 14.2L3 2Z"
                fill={theme.cursor}
                stroke="#ffffff"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                marginTop: "-1px",
                marginLeft: "10px",
                fontSize: "10px",
                background: theme.labelBg,
                color: "#fff",
                padding: "3px 6px",
                borderRadius: "999px",
                whiteSpace: "nowrap",
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.12)",
              }}
            >
              {pointer.username}
            </div>
          </div>
        );
      })}
    </>
  );
}
