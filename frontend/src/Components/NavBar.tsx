
import styles from '../css/Navbar.module.css';
import { Link } from 'react-router-dom';
import { isAuthenticated } from "@/common/ProtectedRoute";
import { FileText } from 'lucide-react';

export default function NavBar() {

  const loggedIn = isAuthenticated();

  return (
    <>
      <header>
        <nav className={styles.navBar} >
          <div className={styles.navContainer}>
            <div className={styles.logoDiv}>
              <Link className={styles.logoLink} to="/landing-page">
                <div className={styles.logo}>
                  <FileText size={22} />
                </div>
                SyncWrite
              </Link>
            </div>

            <ul className={styles.navLinks}>
              <li><Link to="/landing-page">Features</Link></li>
              <li><Link to="/docs">Docs</Link></li>
              <li><Link to="/about">About</Link></li>
            </ul>

            <div className={styles.navAuth}>

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

            </div>
          </div>
        </nav >
      </header >
    </>
  )

}
