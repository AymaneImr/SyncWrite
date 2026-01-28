import React, { useRef } from "react";
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
import OnlineEditors from "./OnlineEditors";
import MenuBar from "./MenuBar";
import { useParams } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import type { DocumentItem } from "./ExistingDocuments";


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
  const token = localStorage.getItem("access_token");
  if (!token) return null;

  try {
    return jwtDecode<DecodedToken>(token);
  } catch {
    return null;
  }
}

export default function TextEditor() {
  const [onlineColabs, setOnlineColabs] = useState([]);
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [content, setContent] = useState<any>(null)
  const [link, setLink] = useState("")

  const lastCursorSentRef = useRef<number>(0);
  const CURSOR_THROTTLE_MS = 80;

  const [remoteSelections, setRemoteSelections] = useState<
    Record<number, { from: number; to: number; username: string }>
  >({});

  const socketRef = useRef<WebSocket | null>(null);

  // get the document_id from the url
  const { id: doc_id } = useParams();

  useEffect(() => {
    const acc_token = localStorage.getItem("access_token") ?? null;
    setToken(acc_token);

  }, []);

  useEffect(() => {
    if (!doc?.link) return;
    setLink(doc.link)

  }, [doc?.link])


  useEffect(() => {
    if (!token) return;
    const load = async () => {

      const res = await fetch(`http://localhost:8080/api/documents/${doc_id}/load`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();
      setDoc(data.document)
    }

    load()
  }, [token, doc_id]);

  // get the current user 
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  useEffect(() => {
    if (!doc_id || !token) return;

    const ws = new WebSocket(`ws://localhost:8080/ws/document/${doc_id}?token=${encodeURIComponent(token)}`);

    socketRef.current = ws

    return () => {
      ws.close();
    };
  }, [doc_id, token]);

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.onmessage = (event) => {
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
    };
  }, [currentUser?.user_id]);

  useEffect(() => {
    if (!doc_id || !token) return;

    fetch(`http://localhost:8080/api/documents/${doc_id}/collaborators`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    })
      .then(res => res.json())
      .then(data => setOnlineColabs(data.collaborators));
  }, [doc_id, token]);

  const editor = useEditor({
    extensions,
    content: doc?.Content,
    onUpdate: ({ editor }) => {
      setContent(editor.getJSON())
    },
  });

  useEffect(() => {
    if (!editor || !doc?.Content) return;
    editor.commands.setContent(doc.Content);

  }, [editor, doc?.Content]);

  useEffect(() => {
    if (!editor || !socketRef.current) return

    const handleSelectionUpdate = ({ editor }: any) => {

      const now = Date.now();
      if (now - lastCursorSentRef.current < CURSOR_THROTTLE_MS) {
        return;
      }

      lastCursorSentRef.current = now;

      const { from, to } = editor.state.selection;

      socketRef.current?.send(
        JSON.stringify({
          event: "cursor",
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


  function RemoteSelections({ selections }: { selections: any }) {
    return (
      <>
        {Object.entries(selections).map(([userId, sel]: any) => {
          const isCursor = sel.from === sel.to;

          return (
            <div
              key={userId}
              style={{
                position: "absolute",
                left: `${sel.from % 500}px`,
                top: `${Math.floor(sel.from / 500) * 20}px`,
                pointerEvents: "none",
                zIndex: 20,
              }}
            >
              {isCursor && (
                <div
                  style={{
                    width: "2px",
                    height: "20px",
                    background: "#4f46e5",
                  }}
                />
              )}

              {!isCursor && (
                <div
                  style={{
                    width: Math.min(200, (sel.to - sel.from) * 2),
                    height: "20px",
                    background: "rgba(99,102,241,0.25)",
                    borderRadius: "4px",
                  }}
                />
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

  return (

    <div className={styles.pageWrapper}>
      <div className={styles.menuBarWrapper}>
        <MenuBar editor={editor} id={doc_id} token={token} link={link} />
      </div>

      <div className={styles.contentWrapper}>

        <div className={styles.editorScrollContainer} style={{ position: "relative" }}>
          <EditorContent editor={editor} className={styles.editorContent} />
          <RemoteSelections selections={remoteSelections} />
        </div>

        <OnlineEditors users={onlineColabs} />
      </div>
    </div>
  );
}
