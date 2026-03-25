
import ShareDialog from "./ShareButton";
import styles from "../css/TextEditor.module.css";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  List,
  ListOrdered,
  Italic,
  Undo,
  Redo,
  Trash2,
  Save,
  Strikethrough,
} from "lucide-react";

type MenuBarProps = {
  editor: Editor | null;
  id?: string;
  token: string | null;
  link: string | undefined;
  canEdit: boolean;
  onSave?: () => void;
};

export default function MenuBar({ editor, id, token, link, canEdit, onSave }: MenuBarProps) {

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
    if (!canEdit) return;

    const content_js = editor.getJSON();
    const saveContent = async () => {
      const res = await fetch(`http://localhost:8080/api/documents/${id}/updateContent`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content_js
        })
      });

      if (!res.ok) {
        const err = await res.text();
        console.log("err: ", err);
        return;
      }

      onSave?.();
    }

    saveContent()
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.toolbarGroup}>
        <button
          className={styles.toolButton}
          disabled={!canEdit || !state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
          title="Undo"
        >
          <Undo size={18} />
        </button>
        <button
          className={styles.toolButton}
          disabled={!canEdit || !state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
          title="Redo"
        >
          <Redo size={18} />
        </button>
      </div>

      <div className={styles.toolbarDivider} />

      <div className={styles.toolbarGroup}>
        <button
          className={`${styles.toolButton} ${state.isBold ? styles.active : ""}`}
          disabled={!canEdit || !state.canBold}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Bold"
        >
          <Bold size={18} />
        </button>
        <button
          className={`${styles.toolButton} ${state.isItalic ? styles.active : ""}`}
          disabled={!canEdit || !state.canItalic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Italic"
        >
          <Italic size={18} />
        </button>
        <button
          className={`${styles.toolButton} ${state.isStrike ? styles.active : ""}`}
          disabled={!canEdit || !state.canStrike}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Strike"
        >
          <Strikethrough size={18} />
        </button>
        <button
          className={`${styles.toolButton} ${state.isCode ? styles.active : ""}`}
          disabled={!canEdit || !state.canCode}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Inline code"
        >
          <Code size={18} />
        </button>
      </div>

      <div className={styles.toolbarDivider} />

      <div className={styles.toolbarGroup}>
        <button
          className={`${styles.toolButton} ${state.isBulletList ? styles.active : ""}`}
          disabled={!canEdit}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Bullet list"
        >
          <List size={18} />
        </button>
        <button
          className={`${styles.toolButton} ${state.isOrderedList ? styles.active : ""}`}
          disabled={!canEdit}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Ordered list"
        >
          <ListOrdered size={18} />
        </button>
      </div>

      <div className={styles.toolbarDivider} />

      <div className={styles.toolbarGroup}>
        <button
          className={styles.toolButton}
          disabled={!canEdit}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Align left"
        >
          <AlignLeft size={18} />
        </button>
        <button
          className={styles.toolButton}
          disabled={!canEdit}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Align center"
        >
          <AlignCenter size={18} />
        </button>
        <button
          className={styles.toolButton}
          disabled={!canEdit}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Align right"
        >
          <AlignRight size={18} />
        </button>
      </div>

      <div className={styles.toolbarDivider} />

      <div className={styles.toolbarGroup}>
        <label className={styles.selectWrap}>
          <span className={styles.selectLabel}>Size</span>
          <select
            className={styles.select}
            disabled={!canEdit}
            defaultValue="16px"
            onChange={(e) => editor.chain().focus().setMark('textStyle', { fontSize: e.target.value }).run()}
            title="Font size"
          >
            <option value="12px">12</option>
            <option value="14px">14</option>
            <option value="16px">16</option>
            <option value="18px">18</option>
            <option value="24px">24</option>
          </select>
        </label>

        <label className={styles.selectWrap}>
          <span className={styles.selectLabel}>Color</span>
          <select
            className={styles.select}
            disabled={!canEdit}
            defaultValue="#0f172a"
            onChange={(e) =>
              editor.chain().focus().setColor(e.target.value).run()
            }
            title="Text color"
          >
            <option value="#0f172a">Default</option>
            <option value="#dc2626">Red</option>
            <option value="#2563eb">Blue</option>
            <option value="#16a34a">Green</option>
            <option value="#9333ea">Purple</option>
            <option value="#ea580c">Orange</option>
          </select>
        </label>

        <label className={styles.selectWrap}>
          <span className={styles.selectLabel}>Highlight</span>
          <select
            className={styles.select}
            disabled={!canEdit}
            defaultValue="yellow"
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
        </label>

        <button
          className={styles.toolButton}
          disabled={!canEdit}
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          title="Clear formatting"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className={styles.toolbarActions}>
        {!canEdit && <div className={styles.readOnlyBadge}>View only</div>}

        <button
          className={styles.saveButton}
          disabled={!canEdit}
          onClick={handleSave}
          title="Save document"
        >
          <Save size={18} />
          <span>Save</span>
          <ChevronDown size={16} />
        </button>

        <div className={styles.shareButtonWrap}>
          <ShareDialog id={id} token={token} link={link ?? ""} />
        </div>
      </div>
    </div>
  );
}
