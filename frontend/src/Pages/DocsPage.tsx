import Footer from "@/Components/Footer";
import NavBar from "@/Components/NavBar";
import styles from "@/css/DocsPage.module.css";
import { BookOpen, FileText, Save, ShieldCheck, Users, Wrench } from "lucide-react";

const sections = [
  {
    title: "Getting started",
    description: "Sign in, create a document, or open an existing shared link from the workspace.",
    icon: BookOpen,
    items: [
      "Open `Workspace` after signing in.",
      "Create a blank document or open a shared link.",
      "Start editing immediately if you have write access.",
    ],
  },
  {
    title: "Collaboration",
    description: "Invite collaborators, assign permissions, and edit together in real time.",
    icon: Users,
    items: [
      "Owners can invite collaborators from the editor.",
      "Permissions support read-only and read-write access.",
      "Live cursors and editing activity keep everyone in sync.",
    ],
  },
  {
    title: "Saving and recovery",
    description: "Changes are saved automatically after editing pauses and are flushed again when the page is hidden or closed.",
    icon: Save,
    items: [
      "Autosave runs after a short editing pause.",
      "A manual save button is still available in the editor toolbar.",
      "Page hide and close events trigger a last save attempt.",
    ],
  },
  {
    title: "Access and security",
    description: "Account access is authenticated and document access is scoped to owners and approved collaborators.",
    icon: ShieldCheck,
    items: [
      "Passwords are hashed before storage.",
      "Protected routes require a valid session token.",
      "Document access checks run on API and collaboration endpoints.",
    ],
  },
];

const quickLinks = [
  { label: "Open workspace", href: "/workspace" },
  { label: "View security", href: "/security" },
  { label: "GitHub repository", href: "https://github.com/AymaneImr/SyncWrite" },
];

export default function DocsPage() {
  return (
    <div className={styles.page}>
      <NavBar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.badge}>Docs</div>
          <h1 className={styles.title}>Use SyncWrite without guesswork</h1>
          <p className={styles.subtitle}>
            This guide covers the current product flow: creating documents, collaborating live,
            sharing access, and understanding how autosave and account protection work.
          </p>
        </section>

        <section className={styles.linksRow}>
          {quickLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={styles.quickLink}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              rel={link.href.startsWith("http") ? "noreferrer" : undefined}
            >
              <FileText size={18} />
              {link.label}
            </a>
          ))}
        </section>

        <section className={styles.grid}>
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <article key={section.title} className={styles.card}>
                <div className={styles.iconWrap}>
                  <Icon size={22} />
                </div>
                <h2 className={styles.cardTitle}>{section.title}</h2>
                <p className={styles.cardDescription}>{section.description}</p>
                <ul className={styles.list}>
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>

        <section className={styles.support}>
          <div className={styles.supportIcon}>
            <Wrench size={22} />
          </div>
          <div>
            <h2 className={styles.supportTitle}>Need implementation details?</h2>
            <p className={styles.supportText}>
              For lower-level project details, open the GitHub repository and review the frontend,
              backend, and route structure directly.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
