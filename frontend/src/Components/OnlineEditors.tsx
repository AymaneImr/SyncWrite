//TODO: switch to a modern style

import styles from "../css/OnlineEditors.module.css";

export interface OnlineUser {
  id: string;
  name: string;
  status: "Editing" | "Viewing" | "Idle";
  color: string;
  avatar?: string;
}

interface Props {
  users: OnlineUser[];
}

export default function OnlineEditors({ users }: Props) {
  return (
    <div className={styles.sidebar}>
      <h3 className={styles.title}>{users.length} Online</h3>

      <div className={styles.userList}>
        {users.map((user) => (
          <div key={user.id} className={styles.userRow}>
            <div className={styles.avatarWrapper}>
              {user.avatar ? (
                <img src={user.avatar} className={styles.avatar} alt={user.name} />
              ) : (
                <div
                  className={styles.defaultAvatar}
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className={styles.info}>
              <p className={styles.name}>{user.name}</p>
              <p className={styles.status}>{user.status}</p>
            </div>

            <span
              className={styles.presenceDot}
              style={{ backgroundColor: user.color }}
            />
          </div>
        ))}
      </div>
    </div>

  );
}
