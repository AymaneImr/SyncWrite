
import { useState } from 'react';
import styles from '../css/Navbar.module.css';
import { Link, useNavigate } from 'react-router-dom';
import { isAuthenticated } from "@/common/ProtectedRoute";
import { FileText } from 'lucide-react';
import { logoutUser } from '@/common/logout';
import ConfirmLogoutModal from './ConfirmLogoutModal.tsx';

export default function NavBar() {
  const loggedIn = isAuthenticated();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    const token = localStorage.getItem("access_token");
    await logoutUser(token);
    setShowLogoutModal(false);
    navigate("/login", { replace: true });
  };

  const handleFeaturesClick = () => {
    if (window.location.pathname === "/") {
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState(null, "", "/#features");
      return;
    }

    navigate("/#features");
  };

  return (
    <>
      <header>
        <nav className={styles.navBar} >
          <div className={styles.navContainer}>
            <div className={styles.logoDiv}>
              <Link className={styles.logoLink} to="/">
                <div className={styles.logo}>
                  <FileText size={22} />
                </div>
                SyncWrite
              </Link>
            </div>

            <ul className={styles.navLinks}>
              <li>
                <button type="button" className={styles.navLinkButton} onClick={handleFeaturesClick}>
                  Features
                </button>
              </li>
              <li><Link to="/docs">Docs</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>

            <div className={styles.navAuth}>
              {loggedIn && (
                <Link className={styles.workspaceLink} to="/documents">
                  Open Workspace
                </Link>
              )}

              {
                !loggedIn && (
                  <>
                    <div className={styles.signIn}>
                      <Link to="/login"> Sign In</Link>
                    </div>

                    <div className={styles.signUp}>
                      <Link to="/login">Sign Up</Link>
                    </div>
                  </>
                )}

              {loggedIn && (
                <button
                  type="button"
                  className={styles.logoutButton}
                  onClick={() => setShowLogoutModal(true)}
                >
                  Log Out
                </button>
              )}

            </div>
          </div>
        </nav >
      </header >
      <ConfirmLogoutModal
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
      />
    </>
  )

}
