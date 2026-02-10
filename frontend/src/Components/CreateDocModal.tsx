import { FileText, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import styles from "../css/CreateDocModal.module.css";

type Props = {
  onClose: () => void;
  onCreate: (title: string) => void;
};

const MAX_TITLE_LENGTH = 100;

export default function CreateDocumentModal({ onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");

  const remaining = useMemo(() => MAX_TITLE_LENGTH - title.length, [title.length]);
  const isValid = title.trim().length > 0 && title.length <= MAX_TITLE_LENGTH;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} role="dialog" aria-modal="true">
        <div className={styles.header}>
          <div className={styles.icon}>
            <FileText size={22} />
          </div>
          <div>
            <h2 className={styles.title}>Create New Text Document</h2>
            <p className={styles.subtitle}>Give your new document a descriptive title to get started.</p>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <label className={styles.label} htmlFor="doc-title">
          Document Title
        </label>
        <input
          id="doc-title"
          className={styles.input}
          placeholder="e.g., Meeting Notes, Project Plan..."
          value={title}
          maxLength={MAX_TITLE_LENGTH}
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className={styles.counter}>
          {title.length}/{MAX_TITLE_LENGTH} characters
          <span className={styles.remaining}>{remaining} left</span>
        </div>

        <div className={styles.tip}>
          <Sparkles size={16} />
          <span>Tip: Choose a descriptive title that helps you quickly identify the document later.</span>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.create}
            onClick={() => onCreate(title.trim())}
            disabled={!isValid}
          >
            <Sparkles size={16} />
            Create Document
          </button>
        </div>
      </div>
    </div>
  );
}
