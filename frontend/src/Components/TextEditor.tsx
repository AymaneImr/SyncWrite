
import { useRef } from "react";
import { FileText, LogOut } from "lucide-react";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import StarterKit from "@tiptap/starter-kit";
import { TextStyleKit } from "@tiptap/extension-text-style";
import styles from "../css/TextEditor.module.css";
import { useEffect, useState } from "react";
import OnlineEditors, { useCollaborators, type OnlineUser } from "./OnlineEditors";
import MenuBar from "./MenuBar";
import { useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { updatedAgo, type DocumentItem } from "./ExistingDocuments";
import RemoteSelections from "./RemoteSelections";

type ActivityToast = {
  id: number;
  message: string;
  accent: string;
};

// TipTap editor feature set used by the MenuBar + editor surface
const extensions = [TextStyleKit, StarterKit.configure({
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

export default function TextEditor() {
  // UI and collaboration state
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [id, setId] = useState("")
  const [showEndSessionModal, SetshowEndSessionModal] = useState(false)
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [activityToast, setActivityToast] = useState<ActivityToast | null>(null);
  const activityTimerRef = useRef<number | null>(null);

  // Throttling + remote-apply guard to prevent update loops
  const lastCursorSentRef = useRef<number>(0);
  const lastContentSentRef = useRef<number>(0);
  const lastEditingSentRef = useRef<number>(0);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const CURSOR_THROTTLE_MS = 80;
  const CONTENT_THROTTLE_MS = 120;
  const EDITING_ACTIVITY_THROTTLE_MS = 2000;
  const ACTIVITY_TOAST_MS = 3000;

  // Remote cursor/selection overlays, keyed by user id
  const [remoteSelections, setRemoteSelections] = useState<
    Record<number, { from: number; to: number; username: string }>
  >({});

  // Active WebSocket connection for live collaboration
  const socketRef = useRef<WebSocket | null>(null);

  // get the document_id from the url
  const { link } = useParams<{ link?: string }>();
  const collaborators = useCollaborators(id, token);
  const currentUser = getCurrentUser();
  const isOwner = currentUser?.user_id === doc?.owner_id;
  const currentCollaborator = collaborators.find(
    (entry) => entry.user_id === currentUser?.user_id
  );
  const canEdit = isOwner || currentCollaborator?.permission === "read-write";

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

  // EFFECT (API): load document data by share link
  useEffect(() => {
    if (!token || !link) return;
    const load = async () => {

      const res = await fetch(`http://localhost:8080/api/documents/link/${link?.trim()}/load`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        console.error(await res.text());
      }

      const data = await res.json();
      setDoc(data.document)
    }

    load()
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

  const broadcastPresenceEvent = (event: "editing" | "save") => {
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
  };

  const editor = useEditor({
    extensions,
    content: doc?.Content,
    editable: canEdit,
    // HANDLER: local edits -> throttle -> update local content and broadcast over WS
    onUpdate: ({ editor }) => {
      if (!canEdit) return;
      if (isApplyingRemoteRef.current) return;

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
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(canEdit);
  }, [editor, canEdit]);

  if (!currentUser) {
    return <div>Loading...</div>;
  }

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
        } finally {
          isApplyingRemoteRef.current = false;
        }
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
    };
  }, []);

  // EFFECT: when doc content arrives, seed editor content
  useEffect(() => {
    if (!editor || !doc?.Content) return;
    editor.commands.setContent(doc.Content);

  }, [editor, doc?.Content]);

  // EFFECT (WS): send cursor/selection updates over WebSocket
  useEffect(() => {
    if (!editor || !socketRef.current) return

    const handleSelectionUpdate = ({ editor }: any) => {

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

  return (

    <div className={styles.pageWrapper}>
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
          <div
            className={styles.btn}
            role="button"
            onClick={() => SetshowEndSessionModal(true)}
          >
            <LogOut size={17} /> End Session
          </div>
        )}

      </div>
      <div className={styles.menuBarWrapper}>
        <MenuBar
          editor={editor}
          id={id}
          token={token}
          link={link}
          canEdit={canEdit}
          onSave={() => broadcastPresenceEvent("save")}
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
            editor={editor}
            editorContainerRef={editorContainerRef}
          />
        </div>

        <OnlineEditors
          id={id}
          token={token}
          onlineUsers={onlineUsers}
          setOnlineUsers={setOnlineUsers}
          ownerId={doc?.owner_id}
          currentUserId={currentUser.user_id}
          collaborators={collaborators}
        />
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
