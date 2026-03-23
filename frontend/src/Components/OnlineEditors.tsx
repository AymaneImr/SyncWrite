//TODO: switch to a modern style

import React, { useEffect, useState } from "react";
import styles from "../css/OnlineEditors.module.css";
import { Users, Crown, Eye, Pencil } from "lucide-react";
import { getCollaboratorTheme } from "../common/collabTheme";

export interface OnlineUser {
  id: string;
  username: string;
}

interface Collaborators {
  userID: string,
  username: string,
  email: string,
  permission: string,
  invitedBy: string,
  invitedAt: string,
  joinedAt: string,
}

interface Props {
  id?: string,
  token: string | null,
  onlineUsers: OnlineUser[],
  setOnlineUsers: React.Dispatch<React.SetStateAction<OnlineUser[]>>
  refreshCollaborators: number,
  ownerId?: string,
  currentUserId?: number;
}

const green = "green";

export default function OnlineEditors({
  id,
  token,
  onlineUsers,
  setOnlineUsers,
  ownerId,
  currentUserId,
}: Props) {

  const [collaborators, setCollaborators] = useState<Collaborators[]>([])

  // EFFECT (API): fetch online collaborators for the document
  useEffect(() => {
    if (!id || !token) return;

    const load = async () => {
      const res = await fetch(`http://localhost:8080/api/documents/${id}/session/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });

      if (!res.ok) {
        const err = await res.text()
        console.log("errr: ", err);
        return;
      }

      const data = await res.json();
      setOnlineUsers(data.online_users ?? [])
    }

    load()
  }, [id, token, setOnlineUsers]);


  // EFFECT (API): fetch collaborators for the document
  useEffect(() => {
    if (!id || !token) return;

    const load = async () => {
      const res = await fetch(`http://localhost:8080/api/documents/${id}/collaborators`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });

      if (!res.ok) {
        const err = await res.text()
        console.log("ere: ", err);
        return;
      }
      const data = await res.json();
      setCollaborators(data.collaborators)
    }

    load()
  }, [id, token, onlineUsers.length]);

  // check collaborator's permission
  const permissionForUser = (userId: number) => {
    if (Number(userId) === Number(ownerId)) return "owner";

    const collaborator = collaborators.find((entry) => Number(entry.userID) === userId);
    return collaborator?.permission ?? "read-only";
  };

  // labels for each permission
  const metaForPermission = (permission: string) => {
    if (permission === "owner") {
      return {
        label: "Owner",
        status: "Editing",
        Icon: Crown,
      };
    }

    if (permission === "read-write") {
      return {
        label: "Editor",
        status: "Editing",
        Icon: Pencil,
      };
    }

    return {
      label: "Viewer",
      status: "Viewing",
      Icon: Eye,
    };
  };

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.title}>
        <Users size={18} />
        {onlineUsers.length} Online
      </h3>
      <div className={styles.divider} />

      <div className={styles.userList}>
        {onlineUsers.map((user) => {
          const theme = getCollaboratorTheme(user.id);
          const permission = permissionForUser(Number(user.id));
          const meta = metaForPermission(permission);
          const isCurrentUser = Number(user.id) === currentUserId;

          return (
            <div key={user.id} className={styles.userRow}>
              <div className={styles.identityBlock}>
                <div
                  className={styles.defaultAvatar}
                  style={{
                    borderColor: theme.ring,
                    color: theme.ring,
                    background: theme.soft,
                  }}
                >
                  {user.username.slice(0, 2).toUpperCase()}
                  <span
                    className={styles.avatarStatusDot}
                    style={{ backgroundColor: "#22c55e" }}
                  />
                </div>

                <div className={styles.info}>
                  <p className={styles.name}>
                    {user.username}
                    {isCurrentUser && <span className={styles.selfTag}> (You)</span>}
                  </p>

                  <div className={styles.metaRow}>
                    <span className={styles.metaItem}>
                      <meta.Icon size={14} />
                      {meta.label}
                    </span>
                    <span className={styles.metaDivider}>•</span>
                    <span className={styles.metaStatus}>{meta.status}</span>
                  </div>
                </div>
              </div>

              <span
                className={styles.presenceDot}
                style={{ backgroundColor: theme.dot }}
              />
            </div>
          );
        })}
      </div>
    </aside>
  );
}
