import styles from "../css/OpenByLinkModal.module.css";
import { useState } from "react";

type Props = {
  onClose: () => void;
  onOpen: (link: string) => void;
  error?: string;
  onErrorChange?: (value: string) => void;
};

export default function OpenByLinkModal({ onClose, onOpen, error: externalError, onErrorChange }: Props) {
  const [link, setLink] = useState("");
  const [error, setError] = useState("");

  const handleOpen = () => {
    const trimmedLink = link.trim();
    if (!trimmedLink) {
      setError('Please enter a valid link.');
      onErrorChange?.('');
      return;
    }

    setError("");
    onErrorChange?.("");
    onOpen(trimmedLink);
  };

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
          onChange={(e) => {
            setLink(e.target.value);
            setError("");
            onErrorChange?.("");
          }}
        />
        {(error || externalError) && (
          <p className={styles.error}>{error || externalError}</p>
        )}

        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.open}
            onClick={handleOpen}
            disabled={!link}
          >
            Open Document
          </button>
        </div>
      </div>
    </div>
  );
}
