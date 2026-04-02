
import styles from "../css/Footer.module.css";
import { FileText, Github, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const footerGroups = [
  {
    title: "Product",
    links: ["Features", "Security", "Roadmap"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Help Center", "Community"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Cookies", "Licenses"],
  },
];

const legalLinks = ["Privacy Policy", "Terms of Service", "Cookie Settings"];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandColumn}>
            <Link className={styles.logoLink} to="/landing-page">
              <span className={styles.logoMark}>
                <FileText size={22} />
              </span>
              <span className={styles.logoText}>SyncWrite</span>
            </Link>

            <p className={styles.description}>
              The modern collaborative text editor for teams who want to work
              together, in real-time.
            </p>

            <div className={styles.socials}>
              <a className={styles.socialLink} href="https://github.com/AymaneImr/SyncWrite" aria-label="GitHub">
                <Github size={22} />
              </a>
              <a className={styles.socialLink} href="/" aria-label="LinkedIn">
                <Linkedin size={22} />
              </a>
            </div>
          </div>

          <div className={styles.linkGrid}>
            {footerGroups.map((group) => (
              <div key={group.title} className={styles.linkGroup}>
                <h3 className={styles.groupTitle}>{group.title}</h3>
                <ul className={styles.linkList}>
                  {group.links.map((item) => (
                    <li key={item}>
                      <a href="/" className={styles.footerLink}>
                        {item}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © 2025 SyncWrite. All rights reserved.
          </p>

          <div className={styles.bottomLinks}>
            {legalLinks.map((item) => (
              <a key={item} href="/" className={styles.bottomLink}>
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
