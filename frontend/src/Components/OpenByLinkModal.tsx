import { useNavigate } from "react-router-dom";
import styles from "../css/OpenByLinkModal.module.css";
import { useState } from "react";

type Props = {
  onClose: () => void;
  onOpen: (link: string) => void;
};

export default function OpenByLinkModal({ onClose, onOpen }: Props) {
  const [link, setLink] = useState("");


  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.icon}>🔗</div>
          <h2>Open Text Document by Link</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <p className={styles.desc}>
          Enter the URL of the text document you want to open.
        </p>

        <label className={styles.label}>Document Link</label>
        <input
          className={styles.input}
          placeholder="https://example.com/document"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.open}
            onClick={() => onOpen(link)}
            disabled={!link}
          >
            Open Document
          </button>
        </div>
      </div>
    </div>
  );
}
