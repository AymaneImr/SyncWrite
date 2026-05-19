import Footer from "@/Components/Footer";
import NavBar from "@/Components/NavBar";
import styles from "@/css/SecurityPage.module.css";
import { Lock, KeyRound, ShieldCheck, FileLock } from "lucide-react";

const securityCards = [
  {
    title: "Passwords Are Not Stored In Plain Text",
    description:
      "User passwords are hashed before they are saved, so the application does not keep raw passwords in the database.",
    icon: Lock,
  },
  {
    title: "Reset Tokens Are Protected",
    description:
      "Password reset tokens are generated for limited use and their stored values are hashed before persistence.",
    icon: KeyRound,
  },
  {
    title: "Authenticated Access Controls",
    description:
      "Documents and collaboration routes are protected by token-based authentication and permission checks for owners and collaborators.",
    icon: ShieldCheck,
  },
  {
    title: "Document Safety Practices",
    description:
      "Autosave reduces accidental loss, and production deployments should use HTTPS and secure WebSocket transport to protect data in transit.",
    icon: FileLock,
  },
];

export default function SecurityPage() {
  return (
    <div className={styles.page}>
      <NavBar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.title}>How SyncWrite protects accounts and documents</h1>
          <p className={styles.subtitle}>
            SyncWrite is built with password hashing, reset-token protection, access controls,
            and collaboration safeguards. Sensitive credentials are protected before storage,
            and document access is scoped to authenticated users and approved collaborators.
          </p>
        </section>

        <section className={styles.grid}>
          {securityCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.title} className={styles.card}>
                <div className={styles.iconWrap}>
                  <Icon size={22} />
                </div>
                <h2 className={styles.cardTitle}>{card.title}</h2>
                <p className={styles.cardText}>{card.description}</p>
              </article>
            );
          })}
        </section>
      </main>

      <Footer />
    </div>
  );
}
