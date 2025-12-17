import ShareDialog from "./ShareButton";
import styles from "../css/TextEditor.module.css";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Type,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Minus,
  Trash2,
  Save,
} from "lucide-react";

export default function MenuBar({ editor }: { editor: Editor | null }) {

  if (!editor) return null;

  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      isBold: ctx.editor.isActive("bold") ?? false,
      canBold: ctx.editor.can().chain().toggleBold().run() ?? false,
      isItalic: ctx.editor.isActive("italic") ?? false,
      canItalic: ctx.editor.can().chain().toggleItalic().run() ?? false,
      isStrike: ctx.editor.isActive("strike") ?? false,
      canStrike: ctx.editor.can().chain().toggleStrike().run() ?? false,
      isCode: ctx.editor.isActive("code") ?? false,
      canCode: ctx.editor.can().chain().toggleCode().run() ?? false,
      isBulletList: ctx.editor.isActive("bulletList") ?? false,
      isOrderedList: ctx.editor.isActive("orderedList") ?? false,
      isBlockquote: ctx.editor.isActive("blockquote") ?? false,
      isCodeBlock: ctx.editor.isActive("codeBlock") ?? false,
      canUndo: ctx.editor.can().chain().undo().run() ?? false,
      canRedo: ctx.editor.can().chain().redo().run() ?? false,
    }),
  });

  const handleSave = () => {
    const content = editor.getHTML();
    localStorage.setItem("document-content", content);
    alert("Document saved locally 💾");
  };

  return (
    <div className={styles.toolbar}>

      <div className={styles.group}>
        <button
          className={styles.button}
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo size={18} />
        </button>
        <button
          className={styles.button}
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo size={18} />
        </button>
      </div>
      <div className={styles.group}>
        <button
          className={`${styles.button} ${state.isBold ? styles.active : ""}`}
          disabled={!state.canBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={18} />
        </button>
        <button
          className={`${styles.button} ${state.isItalic ? styles.active : ""}`}
          disabled={!state.canItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={18} />
        </button>
        <button
          className={`${styles.button} ${state.isStrike ? styles.active : ""}`}
          disabled={!state.canStrike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strike"
        >
          <Strikethrough size={18} />
        </button>
        <button
          className={`${styles.button} ${state.isCode ? styles.active : ""}`}
          disabled={!state.canCode}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline code"
        >
          <Code size={18} />
        </button>
      </div>

      <div className={styles.group}>
        <button
          className={`${styles.button} ${state.isBulletList ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List size={18} />
        </button>
        <button
          className={`${styles.button} ${state.isOrderedList ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered size={18} />
        </button>
        <button
          className={`${styles.button} ${state.isBlockquote ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Blockquote"
        >
          <Quote size={18} />
        </button>
        <button
          className={`${styles.button} ${state.isCodeBlock ? styles.active : ""}`}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          title="Code block"
        >
          <Type size={18} />
        </button>
      </div>

      <div className={styles.group}>
        <button
          className={styles.button}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align left"
        >
          L
        </button>
        <button
          className={styles.button}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align center"
        >
          C
        </button>
        <button
          className={styles.button}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align right"
        >
          R
        </button>


        {/* TODO: implement better option styles later */}

        <div className={styles.group}>
          <select
            className={styles.select}
            onChange={(e) =>
              editor.chain().focus().toggleHighlight({ color: e.target.value }).run()
            }
            title="Highlight color"
          >
            <option value="yellow">Yellow</option>
            <option value="lightgreen">Green</option>
            <option value="pink">Pink</option>
            <option value="cyan">Cyan</option>
          </select>
        </div>


        <select
          className={styles.select}
          onChange={(e) => editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run()}
        >
          <option value="12px">12</option>
          <option value="14px">14</option>
          <option value="16px">16</option>
          <option value="18px">18</option>
          <option value="24px">24</option>
        </select>
      </div>

      <div className={styles.group}>
        <button
          className={styles.button}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal line"
        >
          <Minus size={18} />
        </button>
        <button
          className={styles.button}
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Clear formatting"
        >
          <Trash2 size={18} />
        </button>
      </div>
      <div className={styles.group}>
        <button
          className={styles.button}
          onClick={handleSave}
          title="Save document"
        >
          <Save size={18} />
        </button>

        <div className={styles.button}>
          <ShareDialog />
        </div>
      </div>


    </div>
  );
}
