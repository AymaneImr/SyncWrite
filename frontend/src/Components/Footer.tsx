
import styles from "../css/Footer.module.css";
import { FileText, Github, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";

const footerGroups = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Security", href: "/security" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Documentation", href: "https://github.com/AymaneImr/SyncWrite" },
      { label: "Help Center", href: "https://github.com/AymaneImr/SyncWrite" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Licenses", href: "https://github.com/AymaneImr/SyncWrite/blob/main/LICENSE" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brandColumn}>
            <Link className={styles.logoLink} to="/">
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
                    <li key={item.label}>
                      {item.href ? (
                        <a
                          href={item.href}
                          className={styles.footerLink}
                          target={item.href.startsWith("http") ? "_blank" : undefined}
                          rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                        >
                          {item.label}
                        </a>
                      ) : (
                        <span className={styles.footerLink}>{item.label}</span>
                      )}
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
        </div>
      </div>
    </footer>
  );
}
