//TODO: switch to a modern style

import styles from "../css/OnlineEditors.module.css";

export interface OnlineUser {
  user_id: string;
  username: string;
  status: "Editing" | "Viewing" | "Idle";
  color: string;
  avatar?: string;
  permission: string;
}

interface Props {
  users: OnlineUser[];
}
const green = "green";

export default function OnlineEditors({ users }: Props) {
  return (
    <div className={styles.sidebar}>
      <h3 className={styles.title}>{users.length} Online</h3>

      <div className={styles.userList}>
        {users.map((user) => (
          <div key={user.user_id} className={styles.userRow}>
            <div className={styles.avatarWrapper}>
              {user.avatar ? (
                <img src={user.avatar} className={styles.avatar} alt={user.username} />
              ) : (
                <div
                  className={styles.defaultAvatar}
                  style={{ backgroundColor: green }}
                >
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className={styles.info}>
              <p className={styles.name}>{user.username}</p>
              <p className={styles.status}>{user.status}</p>
            </div>

            <span
              className={styles.presenceDot}
              style={{ backgroundColor: green }}
            />
          </div>
        ))}
      </div>
    </div>

  );
}
