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

  // get the document_id from the url
  const { id: document_id } = useParams();

  // get the current user 
  const currentUser = getCurrentUser();
  if (!currentUser) {
    //return <div>Loading...</div>;
  }

  const lastCursorSentRef = useRef<number>(0);
  const CURSOR_THROTTLE_MS = 80;

  const [remoteCursors, setRemoteCursors] = useState<
    Record<number, { position: number; username: string }>
  >({});

  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.event === "cursor") {

        // ignore user's cursor
        if (data.user_id === currentUser?.user_id) return;

        setRemoteCursors(prev => ({
          ...prev,
          [data.user_id]: {
            position: data.position,
            username: data.username,
          }
        }));
      }
    };
  }, [currentUser?.user_id]);



  useEffect(() => {
    fetch(`http://localhost:8080/api/documents/${document_id}/collaborators`)
      .then(res => res.json())
      .then(data => setOnlineColabs(data));
  }, []);

  const mockUsers = [
    { id: "u1", name: "Aymane", color: "#4f46e5" },
    { id: "u2", name: "Sarah", color: "green" },
    { id: "u3", name: "Leo", color: "#f59e0b" },
    { id: "u4", name: "Maya", color: "yellow" }
  ];

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    //if (!document_id) return;

    const token = localStorage.getItem("access_token");
    const ws = new WebSocket(`ws://localhost:8080/ws/document/${document_id}?token=${token}`);

    socketRef.current = ws

    return () => {
      ws.close();
    };
  }, [document_id]
  );

  const editor = useEditor({
    extensions,
    content: ``,
  });

  useEffect(() => {
    if (!editor || !socketRef.current) return

    const handleSelectionUpdate = ({ editor }: any) => {

      const now = Date.now();
      if (now - lastCursorSentRef.current < CURSOR_THROTTLE_MS) {
        return;
      }

      lastCursorSentRef.current = now;

      const cursor_position = editor.state.selection.from

      socketRef.current?.send(
        JSON.stringify({
          event: "cursor",
          user_id: currentUser?.user_id,
          username: currentUser?.username,
          position: cursor_position
        }))
    }

    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, currentUser]
  )

  function RemoteCursors({ cursors }: { cursors: any }) {
    return (
      <>
        {Object.entries(cursors).map(([userId, cursor]: any) => (
          <div
            key={userId}
            style={{
              position: "absolute",
              left: `${cursor.position % 500}px`, // TEMP positioning
              top: `${Math.floor(cursor.position / 500) * 20}px`,
              pointerEvents: "none",
              zIndex: 20,
            }}
          >
            <div
              style={{
                width: "2px",
                height: "20px",
                background: "#4f46e5",
              }}
            />
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
              {cursor.username}
            </div>
          </div>
        ))}
      </>
    );
  }


  return (

    <div className={styles.pageWrapper}>
      <div className={styles.menuBarWrapper}>
        <MenuBar editor={editor} />
      </div>

      <div className={styles.contentWrapper}>

        <div className={styles.editorScrollContainer} style={{ position: "relative" }}>
          <EditorContent editor={editor} className={styles.editorContent} />
          <RemoteCursors cursors={remoteCursors} />
        </div>

        <OnlineEditors users={onlineColabs} />
      </div>
    </div>
  );
}
