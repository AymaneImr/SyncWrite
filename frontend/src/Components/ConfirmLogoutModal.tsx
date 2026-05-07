import styles from "../css/ConfirmLogoutModal.module.css";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function ConfirmLogoutModal({ open, onCancel, onConfirm }: Props) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
      >
        <h2 id="logout-modal-title" className={styles.title}>
          Log out of your account?
        </h2>
        <p className={styles.description}>
          You are about to log out of this account on this device. You will need to sign in
          again to continue working.
        </p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancelButton} onClick={onCancel}>
            Stay Logged In
          </button>
          <button type="button" className={styles.confirmButton} onClick={onConfirm}>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
