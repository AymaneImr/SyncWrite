
import { useCallback, useRef } from "react";
import { FileText, LogOut, Users } from "lucide-react";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import styles from "../css/TextEditor.module.css";
import { useEffect, useState } from "react";
import OnlineEditors, { useCollaborators, type OnlineUser } from "./OnlineEditors";
import MenuBar from "./MenuBar";
import { useNavigate, useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { updatedAgo, type DocumentItem } from "./ExistingDocuments";
import RemoteSelections from "./RemoteSelections";
import Color from "@tiptap/extension-color";
import { logoutUser } from "../common/logout";
import ConfirmLogoutModal from "./ConfirmLogoutModal";

type ActivityToast = {
  id: number;
  message: string;
  accent: string;
};

type RemotePointerState = {
  x: number;
  y: number;
  username: string;
  updatedAt: number;
};

type TipTapNode = {
  type: string;
  text?: string;
  content?: TipTapNode[];
};

type TipTapDocument = {
  type: "doc";
  content: TipTapNode[];
};

// TipTap editor feature set used by the MenuBar + editor surface
const extensions = [TextStyleKit, Color, Link, StarterKit.configure({
  bulletList: false,
  orderedList: false,
  listItem: false,
}), TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Highlight.configure({ multicolor: true }),
  BulletList,
  OrderedList,
  ListItem
];

export interface DecodedToken {
  user_id: number;
  username: string;
  exp: number;
}

function getCurrentUser(): DecodedToken | null {
  // Pulls the JWT from localStorage and safely decodes it into user info
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
}

function textToTipTapDocument(text: string): TipTapDocument {
  const normalized = text.replace(/\r\n/g, "\n").trim();

  if (!normalized) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  return {
    type: "doc",
    content: normalized.split(/\n{2,}/).map((paragraph) => {
      const lines = paragraph.split("\n");
      const content: TipTapNode[] = [];

      lines.forEach((line, index) => {
        if (line.length > 0) {
          content.push({
            type: "text",
            text: line,
          });
        }

        if (index < lines.length - 1) {
          content.push({ type: "hardBreak" });
        }
      });

      return {
        type: "paragraph",
        content: content.length > 0 ? content : undefined,
      };
    }),
  };
}

function isTipTapNode(value: unknown): value is TipTapNode {
  if (!value || typeof value !== "object") return false;

  const node = value as TipTapNode;
  if (typeof node.type !== "string") return false;

  if (node.text !== undefined && typeof node.text !== "string") {
    return false;
  }

  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) return false;
    if (!node.content.every(isTipTapNode)) return false;
  }

  return true;
}

function isTipTapDocument(value: unknown): value is TipTapDocument {
  if (!value || typeof value !== "object") return false;

  const doc = value as TipTapDocument;
  return doc.type === "doc" && Array.isArray(doc.content) && doc.content.every(isTipTapNode);
}

function normalizeEditorContent(content: unknown): TipTapDocument {
  if (!content) {
    return textToTipTapDocument("");
  }

  if (typeof content === "string") {
    const trimmed = content.trim();

    if (!trimmed) {
      return textToTipTapDocument("");
    }

    try {
      const parsed = JSON.parse(trimmed);
      return normalizeEditorContent(parsed);
    } catch {
      return textToTipTapDocument(content);
    }
  }

  if (isTipTapDocument(content)) {
    return content;
  }

  if (typeof content === "object") {
    return textToTipTapDocument(JSON.stringify(content));
  }

  return textToTipTapDocument(String(content));
}

export default function TextEditor() {
  // UI and collaboration state
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [id, setId] = useState("")
  const [showEndSessionModal, SetshowEndSessionModal] = useState(false)
  const [loadError, setLoadError] = useState("");
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [showOnlinePanel, setShowOnlinePanel] = useState(true);
  const [activityToast, setActivityToast] = useState<ActivityToast | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const activityTimerRef = useRef<number | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const saveInFlightRef = useRef(false);
  const queuedAutosaveRef = useRef(false);
  const saveDocumentRef = useRef<
    ((reason: "auto" | "manual" | "flush", options?: { keepalive?: boolean }) => Promise<boolean>) | null
  >(null);
  const latestContentRef = useRef<string>("");
  const lastSavedContentRef = useRef<string>("");

  // Throttling + remote-apply guard to prevent update loops
  const lastCursorSentRef = useRef<number>(0);
  const lastMouseSentRef = useRef<number>(0);
  const lastContentSentRef = useRef<number>(0);
  const lastEditingSentRef = useRef<number>(0);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const CURSOR_THROTTLE_MS = 80;
  const MOUSE_THROTTLE_MS = 40;
  const CONTENT_THROTTLE_MS = 120;
  const EDITING_ACTIVITY_THROTTLE_MS = 2000;
  const ACTIVITY_TOAST_MS = 3000;
  const POINTER_TTL_MS = 6000;
  const AUTOSAVE_DELAY_MS = 1500;

  // Remote cursor/selection overlays, keyed by user id
  const [remoteSelections, setRemoteSelections] = useState<
    Record<number, { from: number; to: number; username: string }>
  >({});
  const [remotePointers, setRemotePointers] = useState<Record<number, RemotePointerState>>({});

  // Active WebSocket connection for live collaboration
  const socketRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();

  // get the document_id from the url
  const { link } = useParams<{ link?: string }>();
  const collaborators = useCollaborators(id, token);
  const currentUser = getCurrentUser();
  const isOwner = currentUser?.user_id === doc?.owner_id;
  const currentCollaborator = collaborators.find(
    (entry) => entry.user_id === currentUser?.user_id
  );
  const canEdit = isOwner || currentCollaborator?.permission === "read-write";
  const normalizedDocContent = normalizeEditorContent(doc?.Content);

  const scheduleAutosave = () => {
    if (!canEdit || !id || !token) return;

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(() => {
      void saveDocumentRef.current?.("auto");
    }, AUTOSAVE_DELAY_MS);
  };

  const saveDocument = async (
    reason: "auto" | "manual" | "flush",
    options?: { keepalive?: boolean }
  ) => {
    if (!canEdit || !id || !token) return false;

    const content = latestContentRef.current;
    if (content === lastSavedContentRef.current) {
      return true;
    }

    if (saveInFlightRef.current) {
      queuedAutosaveRef.current = true;
      return false;
    }

    saveInFlightRef.current = true;

    try {
      const res = await fetch(`http://localhost:8080/api/documents/${id}/updateContent`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: JSON.parse(content),
        }),
        keepalive: options?.keepalive,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Unable to save document.");
      }

      const data = await res.json();
      lastSavedContentRef.current = content;
      setDoc((prev) => (prev ? { ...prev, ...data.document } : data.document));

      if (latestContentRef.current !== content) {
        queuedAutosaveRef.current = true;
      }

      if (reason === "manual") {
        broadcastPresenceEvent("save");
      }

      return true;
    } catch (error) {
      console.error(error);
      return false;
    } finally {
      saveInFlightRef.current = false;

      if (queuedAutosaveRef.current) {
        queuedAutosaveRef.current = false;
        scheduleAutosave();
      }
    }
  };

  saveDocumentRef.current = saveDocument;

  // EFFECT: read auth token from localStorage on mount
  useEffect(() => {
    const acc_token = localStorage.getItem("access_token") ?? null;
    setToken(acc_token);

  }, []);

  // EFFECT: mirror doc id into local state for convenience
  useEffect(() => {
    if (!doc?.id) return;
    setId(doc.id)

  }, [doc?.id])

  useEffect(() => {
    const serialized = JSON.stringify(normalizedDocContent);
    latestContentRef.current = serialized;
    lastSavedContentRef.current = serialized;
  }, [doc?.id, normalizedDocContent]);

  // EFFECT (API): load document data by share link
  useEffect(() => {
    if (!token || !link) return;
    const load = async () => {
      setLoadError("");

      try {
        const res = await fetch(`http://localhost:8080/api/documents/link/${link?.trim()}/load`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const errText = (await res.text()) || res.statusText;
          throw new Error(errText || 'Unable to load the shared document.');
        }

        const data = await res.json();
        setDoc(data.document);
      } catch (error) {
        console.error(error);
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Unable to load this document right now. Please try again.'
        );
      }
    };

    load();
  }, [token, link]);
  const pushActivityToast = (message: string, accent: string) => {
    if (activityTimerRef.current) {
      window.clearTimeout(activityTimerRef.current);
    }

    setActivityToast({
      id: Date.now(),
      message,
      accent,
    });

    activityTimerRef.current = window.setTimeout(() => {
      setActivityToast(null);
      activityTimerRef.current = null;
    }, ACTIVITY_TOAST_MS);
  };

  const broadcastPresenceEvent = useCallback((event: "editing" | "save") => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        event,
        user_id: currentUser?.user_id,
        username: currentUser?.username,
      })
    );
  }, [currentUser?.user_id, currentUser?.username]);

  const broadcastMouseEvent = useCallback((event: "mouse_move" | "mouse_leave", x?: number, y?: number) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    const normalizedX = typeof x === "number" ? Math.round(x) : undefined;
    const normalizedY = typeof y === "number" ? Math.round(y) : undefined;

    socketRef.current.send(
      JSON.stringify({
        event,
        user_id: currentUser?.user_id,
        username: currentUser?.username,
        x: normalizedX,
        y: normalizedY,
        // Backward-compatible fallback for older backend processes that only
        // rebroadcast the existing numeric fields.
        from: normalizedX,
        to: normalizedY,
      })
    );
  }, [currentUser?.user_id, currentUser?.username]);

  const editor = useEditor({
    extensions,
    content: normalizedDocContent,
    editable: canEdit,
    // HANDLER: local edits -> throttle -> update local content and broadcast over WS
    onUpdate: ({ editor }) => {
      if (!canEdit) return;
      if (isApplyingRemoteRef.current) return;

      latestContentRef.current = JSON.stringify(editor.getJSON());
      if (latestContentRef.current !== lastSavedContentRef.current) {
        scheduleAutosave();
      }

      const now = Date.now();
      if (now - lastContentSentRef.current < CONTENT_THROTTLE_MS) {
        return;
      }

      lastContentSentRef.current = now;
      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
        return;
      }

      socketRef.current.send(
        JSON.stringify({
          event: "content",
          user_id: currentUser?.user_id,
          username: currentUser?.username,
          content: editor.getJSON()
        })
      );

      if (now - lastEditingSentRef.current >= EDITING_ACTIVITY_THROTTLE_MS) {
        lastEditingSentRef.current = now;
        broadcastPresenceEvent("editing");
      }
    },
  }, [doc?.id, JSON.stringify(normalizedDocContent)]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(canEdit);
  }, [editor, canEdit]);

  // EFFECT (WS): connect to document WebSocket + handle incoming messages
  useEffect(() => {
    if (!id || !token) return;

    const ws = new WebSocket(`ws://localhost:8080/ws/document/${id}?token=${encodeURIComponent(token)}`);
    socketRef.current = ws;

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.event === "selection") {
        // ignore user's cursor
        if (data.user_id === currentUser?.user_id) return;

        setRemoteSelections(prev => ({
          ...prev,
          [data.user_id]: {
            from: data.from,
            to: data.to,
            username: data.username,
          }
        }));
      }

      if (data.event === "content") {
        if (!editor) return;
        if (data.user_id === currentUser?.user_id) return;
        if (!data.content) return;

        try {
          isApplyingRemoteRef.current = true;
          editor.commands.setContent(data.content);
          const serializedRemoteContent = JSON.stringify(normalizeEditorContent(data.content));
          latestContentRef.current = serializedRemoteContent;
          lastSavedContentRef.current = serializedRemoteContent;
        } finally {
          isApplyingRemoteRef.current = false;
        }
      }

      if (data.event === "mouse_move") {
        if (data.user_id === currentUser?.user_id) return;

        const pointerX = typeof data.x === "number" ? data.x : data.from;
        const pointerY = typeof data.y === "number" ? data.y : data.to;
        if (typeof pointerX !== "number" || typeof pointerY !== "number") return;

        setRemotePointers((prev) => ({
          ...prev,
          [data.user_id]: {
            x: pointerX,
            y: pointerY,
            username: data.username,
            updatedAt: Date.now(),
          },
        }));
      }

      if (data.event === "mouse_leave") {
        if (data.user_id === currentUser?.user_id) return;

        setRemotePointers((prev) => {
          const next = { ...prev };
          delete next[data.user_id];
          return next;
        });
      }

      if (data.event === "user joined") {
        setOnlineUsers((prev) => {
          const exists = prev.some((user) => user.id === data.user_id);
          if (exists) return prev;

          return [
            ...prev,
            {
              id: data.user_id,
              username: data.username,
            }
          ];
        });

        if (data.user_id !== currentUser?.user_id) {
          pushActivityToast(`${data.username} joined the document`, "#8b5cf6");
        }
      }

      if (data.event === "user left") {
        setRemoteSelections(prev => {
          const next = { ...prev };
          delete next[data.user_id];
          return next;
        });
        setRemotePointers((prev) => {
          const next = { ...prev };
          delete next[data.user_id];
          return next;
        });

        setOnlineUsers((prev) => prev.filter((user) => user.id !== data.user_id))

        if (data.user_id !== currentUser?.user_id) {
          pushActivityToast(`${data.username} left the document`, "#ef4444");
        }
      }

      if (data.event === "editing" && data.user_id !== currentUser?.user_id) {
        pushActivityToast(`${data.username} is editing`, "#10b981");
      }

      if (data.event === "save" && data.user_id !== currentUser?.user_id) {
        pushActivityToast(`${data.username} saved the document`, "#2563eb");

      }
    };

    ws.onerror = () => {
      console.log("websocket error");
    };

    return () => {
      ws.close();
    };
  }, [id, token, currentUser?.user_id, editor]);

  useEffect(() => {
    return () => {
      if (activityTimerRef.current) {
        window.clearTimeout(activityTimerRef.current);
      }

      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  // EFFECT: when doc content arrives, seed editor content
  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(normalizedDocContent);

  }, [editor, normalizedDocContent]);

  useEffect(() => {
    if (!canEdit || !id || !token) return;

    const flushPendingChanges = () => {
      if (latestContentRef.current === lastSavedContentRef.current) return;
      void saveDocumentRef.current?.("flush", { keepalive: true });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingChanges();
      }
    };

    window.addEventListener("pagehide", flushPendingChanges);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushPendingChanges);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canEdit, id, token]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const cutoff = Date.now() - POINTER_TTL_MS;

      setRemotePointers((prev) => {
        let changed = false;
        const next: Record<number, RemotePointerState> = {};

        Object.entries(prev).forEach(([userId, pointer]) => {
          if (pointer.updatedAt >= cutoff) {
            next[Number(userId)] = pointer;
            return;
          }

          changed = true;
        });

        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  // EFFECT (WS): send cursor/selection updates over WebSocket
  useEffect(() => {
    if (!editor || !socketRef.current) return

    const handleSelectionUpdate = ({ editor }: { editor: Editor }) => {

      const now = Date.now();
      if (now - lastCursorSentRef.current < CURSOR_THROTTLE_MS) return;

      lastCursorSentRef.current = now;

      const { from, to } = editor.state.selection;

      if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) return;
      socketRef.current.send(
        JSON.stringify({
          event: "selection",
          user_id: currentUser?.user_id,
          username: currentUser?.username,
          from,
          to
        }))
    }

    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, currentUser]
  )

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const handleMouseMove = (event: MouseEvent) => {
      const now = Date.now();
      if (now - lastMouseSentRef.current < MOUSE_THROTTLE_MS) return;

      lastMouseSentRef.current = now;

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left + container.scrollLeft;
      const y = event.clientY - rect.top + container.scrollTop;

      broadcastMouseEvent("mouse_move", x, y);
    };

    const handleMouseLeave = () => {
      broadcastMouseEvent("mouse_leave");
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      broadcastMouseEvent("mouse_leave");
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [broadcastMouseEvent, id]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  const handleEndSession = async () => {
    if (!id || !token) return;

    const res = await fetch(
      `http://localhost:8080/api/documents/${id}/session/end`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.log("err session:", err);
      return;
    }

    socketRef.current?.close();

  };

  const handleLogout = async () => {
    socketRef.current?.close();
    await logoutUser(token);
    setShowLogoutModal(false);
    navigate("/login", { replace: true });
  };

  return (

    <div className={styles.pageWrapper}>
      {loadError && (
        <div className={styles.errorBanner}>{loadError}</div>
      )}
      <div className={styles.docInfoMenu}>

        <div className={styles.docInfo}>
          <div className={styles.icon}>
            <FileText size={22} />
          </div>

          <div className={styles.docName}>
            {doc?.title}
          </div>

          <div className={styles.lastEdited}>
            Last edited {updatedAgo(doc?.updated_at)}
          </div>
        </div>

        {isOwner && (
          <>
            <div
              className={styles.btn}
              role="button"
              onClick={() => SetshowEndSessionModal(true)}
            >
              <LogOut size={17} /> End Session
            </div>
            <button
              type="button"
              className={styles.logoutBtn}
              onClick={() => setShowLogoutModal(true)}
            >
              Log out
            </button>
          </>
        )}

        {!isOwner && (
          <button
            type="button"
            className={styles.logoutBtn}
            onClick={() => setShowLogoutModal(true)}
          >
            Log out
          </button>
        )}

      </div>
      <div className={styles.menuBarWrapper}>
        <MenuBar
          editor={editor}
          link={link}
          canEdit={canEdit}
          onManualSave={() => {
            if (autosaveTimerRef.current) {
              window.clearTimeout(autosaveTimerRef.current);
              autosaveTimerRef.current = null;
            }

            void saveDocumentRef.current?.("manual");
          }}
        />
      </div>

      <div className={styles.contentWrapper}>

        <div
          className={styles.editorScrollContainer}
          style={{ position: "relative" }}
          ref={editorContainerRef}
        >
          <EditorContent
            editor={editor}
            className={`${styles.editorContent} ${!canEdit ? styles.readOnlyEditor : ""}`}
          />
          <RemoteSelections
            selections={remoteSelections}
            pointers={remotePointers}
            editor={editor}
            editorContainerRef={editorContainerRef}
          />
        </div>

        <div
          className={`${styles.onlinePanel} ${!showOnlinePanel ? styles.onlinePanelClosed : ""}`}
          aria-hidden={!showOnlinePanel}
        >
          <OnlineEditors
            id={id}
            token={token}
            onlineUsers={onlineUsers}
            setOnlineUsers={setOnlineUsers}
            ownerId={doc?.owner_id}
            currentUserId={currentUser.user_id}
            collaborators={collaborators}
            onClose={() => setShowOnlinePanel(false)}
          />
        </div>

        {!showOnlinePanel && (
          <button
            type="button"
            className={styles.showOnlineButton}
            aria-label="Show online users"
            onClick={() => setShowOnlinePanel(true)}
          >
            <Users size={18} />
            {onlineUsers.length}
          </button>
        )}
      </div>

      {showEndSessionModal && (
        <div
          className={styles.overlay}
          onClick={() => SetshowEndSessionModal(false)}
        >
          <div
            className={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >

            <h2 className={styles.title}>
              End collaborative session?
            </h2>

            <p className={styles.description}>
              You will leave this document session. Your changes have been saved,
              but you won't see live updates from other collaborators until you rejoin.
            </p>

            <div className={styles.btns}>
              <button
                className={styles.cancel}
                onClick={() => SetshowEndSessionModal(false)}
              >
                Cancel
              </button>
              <button
                className={styles.end}
                onClick={() => {
                  handleEndSession();
                  SetshowEndSessionModal(false)
                }}
              >
                End Session</button>
            </div>

          </div>
        </div>
      )}

      <ConfirmLogoutModal
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />

      {activityToast && (
        <div className={styles.activityToast} key={activityToast.id}>
          <span
            className={styles.activityToastDot}
            style={{ backgroundColor: activityToast.accent }}
          />
          <span>{activityToast.message}</span>
        </div>
      )}
    </div>
  );
}
