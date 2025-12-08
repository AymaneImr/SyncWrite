import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Share2, Copy } from "lucide-react";
import styles from "../css/ShareButton.module.css";
import { useState } from "react";

export default function ShareDialog() {
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<"Viewer" | "Editor">("Viewer");

  const [users, setUsers] = useState([
    // just for development
    { id: "1", email: "sarah@example.com", role: "Editor" },
    { id: "2", email: "mike@example.com", role: "Viewer" },
  ]);

  const shareLink = "https://docs.example.com/xxxx";

  const addUser = () => {
    if (!emailInput.trim()) return;

    setUsers([
      ...users,
      {
        id: crypto.randomUUID(),
        email: emailInput.trim(),
        role: roleInput,
      },
    ]);

    setEmailInput("");
  };

  return (
    <Dialog>

      <DialogTrigger asChild>
        <button className={styles.shareButton}>
          <Share2 size={18} />
        </button>
      </DialogTrigger>

      <DialogContent className={styles.dialog}>
        <DialogHeader>
          <DialogTitle className={styles.title}>
            Share "Project Proposal 2024"
          </DialogTitle>
        </DialogHeader>

        <div className={styles.inviteRow}>
          <input
            className={styles.emailInput}
            placeholder="Add people by email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <select
            className={styles.roleSelect}
            value={roleInput}
            onChange={(e) => setRoleInput(e.target.value as any)}
          >
            <option value="Viewer">Viewer</option>
            <option value="Editor">Editor</option>
          </select>
          <button className={styles.inviteButton} onClick={addUser}>
            Invite
          </button>
        </div>

        <div className={styles.accessList}>
          {users.map((u) => (
            <div key={u.id} className={styles.accessRow}>
              <div className={styles.initials}>{u.email[0].toUpperCase()}</div>
              <p className={styles.emailLabel}>{u.email}</p>
              <select
                className={styles.roleSelectSmall}
                value={u.role}
                onChange={(e) =>
                  setUsers(
                    users.map((x) =>
                      x.id === u.id ? { ...x, role: e.target.value as any } : x
                    )
                  )
                }
              >
                <option value="Viewer">Viewer</option>
                <option value="Editor">Editor</option>
              </select>
              <DialogClose asChild>
                <button className={styles.removeBtn}>×</button>
              </DialogClose>
            </div>
          ))}
        </div>

        <p className={styles.label}>Share link</p>
        <div className={styles.linkBox}>
          <input readOnly value={shareLink} />
          <button
            className={styles.copyBtn}
            onClick={() => navigator.clipboard.writeText(shareLink)}
          >
            <Copy size={18} />
          </button>
        </div>

        <DialogFooter className={styles.footer}>
          <DialogClose className={styles.cancelBtn}>Cancel</DialogClose>
          <DialogClose className={styles.doneBtn}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
