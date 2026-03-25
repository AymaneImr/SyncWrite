
import React, { useEffect, useState } from "react";
import styles from "../css/OnlineEditors.module.css";
import { Users, Crown, Eye, Pencil, EllipsisVertical, UserRoundX } from "lucide-react";
import { getCollaboratorTheme } from "../common/collabTheme";

export interface OnlineUser {
  id: number;
  username: string;
}

interface Collaborators {
  user_id: number;
  username?: string;
  email?: string;
  permission: string;
  invited_by?: number;
  invited_at?: number;
  joined_at?: number;
}

export function useCollaborators(id?: string, token?: string | null) {
  const [collaborators, setCollaborators] = useState<Collaborators[]>([]);

  useEffect(() => {
    if (!id || !token) return;

    const load = async () => {
      const res = await fetch(`http://localhost:8080/api/documents/${id}/collaborators`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const err = await res.text();
        console.log("err collaborators:", err);
        return;
      }

      const data = await res.json();
      setCollaborators(data.collaborators ?? []);
    };

    load();
  }, [id, token]);

  return collaborators;
}

interface Props {
  id?: string;
  token: string | null;
  onlineUsers: OnlineUser[];
  setOnlineUsers: React.Dispatch<React.SetStateAction<OnlineUser[]>>;
  collaborators: Collaborators[];
  ownerId?: string;
  currentUserId?: number;
}

export default function OnlineEditors({
  id,
  token,
  onlineUsers,
  setOnlineUsers,
  collaborators,
  ownerId,
  currentUserId,
}: Props) {
  const [openMenuUserId, setOpenMenuUserId] = useState<number | null>(null);
  const [permissionOverrides, setPermissionOverrides] = useState<Record<number, string>>({});
  const [removedUserIds, setRemovedUserIds] = useState<number[]>([]);

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
        const err = await res.text();
        console.log("errr: ", err);
        return;
      }

      const data = await res.json();
      setOnlineUsers(data.online_users ?? []);
    };

    load();
  }, [id, token, setOnlineUsers]);

  const permissionForUser = (userId: number) => {
    if (String(userId) === String(ownerId)) return "owner";
    if (permissionOverrides[userId]) return permissionOverrides[userId];

    const collaborator = collaborators.find((entry) => entry.user_id === userId);
    return collaborator?.permission ?? "read-only";
  };

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

  const handlePermissionChange = async (
    userId: number,
    permission: "read-write" | "read-only"
  ) => {
    if (!id || !token) return;

    const res = await fetch(`http://localhost:8080/api/documents/${id}/${userId}/collaborator`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ permission }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.log("update collaborator permission error:", err);
      return;
    }

    setPermissionOverrides((prev) => ({
      ...prev,
      [userId]: permission,
    }));
    setOpenMenuUserId(null);
  };

  const handleRemoveCollaborator = async (userId: number) => {
    if (!id || !token) return;

    const res = await fetch(`http://localhost:8080/api/documents/${id}/${userId}/collaborator`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.log("remove collaborator error:", err);
      return;
    }

    setOpenMenuUserId(null);
    setRemovedUserIds((prev) => [...prev, userId]);
    setOnlineUsers((prev) => prev.filter((user) => user.id !== userId));
  };

  return (
    <aside className={styles.sidebar}>
      <h3 className={styles.title}>
        <Users size={18} />
        {onlineUsers.length} Online
      </h3>
      <div className={styles.divider} />

      <div className={styles.userList}>
        {onlineUsers
          .filter((user) => !removedUserIds.includes(user.id))
          .map((user) => {
            const theme = getCollaboratorTheme(user.id);
            const permission = permissionForUser(user.id);
            const meta = metaForPermission(permission);
            const isCurrentUser = user.id === currentUserId;
            const canManageCollaborator =
              String(currentUserId) === String(ownerId) &&
              !isCurrentUser &&
              permission !== "owner";
            const isMenuOpen = openMenuUserId === user.id;
            const canEditSelected = permission === "read-write";

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

                <div className={styles.rowActions}>
                  {canManageCollaborator && (
                    <div className={styles.menuWrap}>
                      <button
                        type="button"
                        className={`${styles.menuButton} ${isMenuOpen ? styles.menuButtonVisible : ""}`}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        aria-label={`Open actions for ${user.username}`}
                        onClick={() =>
                          setOpenMenuUserId((prev) => (prev === user.id ? null : user.id))
                        }
                      >
                        <EllipsisVertical size={18} />
                      </button>

                      {isMenuOpen && (
                        <div className={styles.dropdownMenu} role="menu">
                          <div className={styles.menuSectionLabel}>Change permission</div>

                          <button
                            type="button"
                            className={styles.menuItem}
                            role="menuitem"
                            onClick={() => handlePermissionChange(user.id, "read-write")}
                          >
                            <span className={styles.menuItemLeft}>
                              <Pencil size={18} />
                              Can edit
                            </span>
                            {canEditSelected && <span className={styles.menuSelectionDot} />}
                          </button>

                          <button
                            type="button"
                            className={styles.menuItem}
                            role="menuitem"
                            onClick={() => handlePermissionChange(user.id, "read-only")}
                          >
                            <span className={styles.menuItemLeft}>
                              <Eye size={18} />
                              Can view
                            </span>
                            {!canEditSelected && <span className={styles.menuSelectionDot} />}
                          </button>

                          <div className={styles.menuDivider} />

                          <button
                            type="button"
                            className={`${styles.menuItem} ${styles.menuItemDanger}`}
                            role="menuitem"
                            onClick={() => handleRemoveCollaborator(user.id)}
                          >
                            <span className={styles.menuItemLeft}>
                              <UserRoundX size={18} />
                              Remove
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <span
                    className={styles.presenceDot}
                    style={{ backgroundColor: theme.dot }}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </aside>
  );
}
