
import React from "react";
import styles from "../css/Hero.module.css";
import { useNavigate } from "react-router-dom";
import { isAuthenticated } from "@/common/ProtectedRoute";
import {
  FileUp,
  History,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import FeatureCard from "./FeatureCard";

const Hero: React.FC = () => {
  const loggedIn = isAuthenticated();
  const navigate = useNavigate();
  const featureCards = [
    {
      title: "Real-time Collaboration",
      description:
        "Work together seamlessly with your team. See edits as they happen, with live cursors and instant synchronization.",
      accentClass: styles.blueAccent,
      cardToneClass: styles.blueCard,
      icon: Users,
    },
    {
      title: "Document Import/Export",
      description:
        "Import existing documents or export your work while format support continues to expand.",
      badge: "Beta",
      accentClass: styles.purpleAccent,
      cardToneClass: styles.purpleCard,
      icon: FileUp,
    },
    {
      title: "Secure Sharing & Permissions",
      description:
        "Control who has access to your documents. Set granular permissions and keep collaboration safe and organized.",
      accentClass: styles.greenAccent,
      cardToneClass: styles.greenCard,
      icon: ShieldCheck,
    },
    {
      title: "Version History & Autosave",
      description:
        "Never lose your work. Automatic saving and complete version history help your team move forward with confidence.",
      accentClass: styles.goldAccent,
      cardToneClass: styles.goldCard,
      icon: History,
    },
  ];

  const handleStartEditing = () => {
    if (loggedIn) {
      navigate("/document-type");
    } else {
      navigate("/login");
    }
  };

  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <div className={styles.badge}>
          <Zap size={15} color="#1d59e7" /> Real-time collaboration at lightning speed
        </div>

        <h1 className={styles.title}>
          Write Together.
          <br />
          <span>In Real Time.</span>
        </h1>

        <p className={styles.subtitle}>
          Experience seamless collaboration with your team. Edit documents
          together, see changes instantly, and never lose track of your work.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleStartEditing}
          >
            Start Editing
            <Zap size={19} color="white" />
          </button>
        </div>

        <h1 className={styles.featureTitle}>
          Everything you need to collaborate
        </h1>

        <p className={styles.featSubtitle}>
          Powerful features designed to make team collaboration effortless and
          <br />
          <span>productive.</span>
        </p>

        <div className={styles.featureCards}>
          {featureCards.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              badge={feature.badge}
              accentClass={feature.accentClass}
              cardToneClass={feature.cardToneClass}
              icon={feature.icon}
            />
          ))}
        </div>

        <section className={styles.ctaBanner}>
          <div className={styles.ctaGlow} />
          <div className={styles.ctaContent}>
            <h2 className={styles.ctaTitle}>Ready to transform your workflow?</h2>
            <p className={styles.ctaText}>
              Join thousands of teams already collaborating in real-time with
              SyncWrite.
            </p>
            <button
              type="button"
              className={styles.ctaButton}
              onClick={handleStartEditing}
            >
              Get Started for Free
            </button>
          </div>
        </section>
      </div>
    </section>
  );
};

export default Hero;
