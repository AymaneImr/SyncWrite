import FeatureCard from "@/Components/FeatureCard";
import Footer from "@/Components/Footer";
import NavBar from "@/Components/NavBar";
import styles from "@/css/AboutPage.module.css";
import heroStyles from "@/css/Hero.module.css";
import { Clock3, Code2, Sparkles, Users } from "lucide-react";

const pillars = [
  {
    title: "Built for live teamwork",
    description:
      "SyncWrite focuses on the drafting flow where multiple people need to read, edit, and coordinate in one shared space.",
    icon: Users,
    accentClass: heroStyles.blueAccent,
    cardToneClass: heroStyles.blueCard,
  },
  {
    title: "Fast by default",
    description:
      "The product combines real-time updates with autosave so teams can keep moving without thinking about file state.",
    icon: Clock3,
    accentClass: heroStyles.goldAccent,
    cardToneClass: heroStyles.goldCard,
  },
  {
    title: "Practical feature set",
    description:
      "Sharing controls, collaboration presence, import paths, and text editing tools cover the core day-to-day writing workflow.",
    icon: Sparkles,
    accentClass: heroStyles.purpleAccent,
    cardToneClass: heroStyles.purpleCard,
  },
  {
    title: "Modern web stack",
    description:
      "The app is built with a React and Vite frontend, a Go backend, PostgreSQL, and WebSocket-based collaboration flows.",
    icon: Code2,
    accentClass: heroStyles.greenAccent,
    cardToneClass: heroStyles.greenCard,
  },
];

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <NavBar />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.badge}>About</div>
          <h1 className={styles.title}>A collaborative editor designed for focused team writing</h1>
          <p className={styles.subtitle}>
            SyncWrite is a document workspace for teams that want live collaboration, simple sharing,
            and a smoother drafting process than passing files around.
          </p>
        </section>

        <section className={styles.story}>
          <div className={styles.storyCard}>
            <h2 className={styles.sectionTitle}>What it solves</h2>
            <p className={styles.bodyText}>
              Instead of switching between isolated drafts, chat messages, and manual save cycles,
              SyncWrite keeps writing, reviewing, and collaborative editing in a single browser-based flow.
            </p>
          </div>

          <div className={styles.storyCard}>
            <h2 className={styles.sectionTitle}>Who it is for</h2>
            <p className={styles.bodyText}>
              Small teams, student groups, project partners, and anyone who needs shared text editing
              without the friction of disconnected documents.
            </p>
          </div>
        </section>

        <section className={styles.grid}>
          {pillars.map((pillar) => (
            <FeatureCard
              key={pillar.title}
              title={pillar.title}
              description={pillar.description}
              icon={pillar.icon}
              accentClass={pillar.accentClass}
              cardToneClass={pillar.cardToneClass}
            />
          ))}
        </section>
      </main>

      <Footer />
    </div>
  );
}
