
import React from "react";
import styles from "../css/Hero.module.css";
import { useLocation, useNavigate } from "react-router-dom";
import { isAuthenticated } from "@/common/ProtectedRoute";
import {
  ArrowRight,
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
  const location = useLocation();
  const stats = [
    { value: "Live", label: "multiplayer syncing" },
    { value: "Fast", label: "autosave and recovery" },
    { value: "Secure", label: "sharing controls" },
  ];
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
      navigate("/documents");
    } else {
      navigate("/login");
    }
  };

  React.useEffect(() => {
    if (location.hash !== "#features") return;

    window.requestAnimationFrame(() => {
      document.getElementById("features")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [location.hash]);

  return (
    <section className={styles.hero}>
      <div className={styles.content}>
        <div className={styles.heroTop}>
          <div className={styles.heroCopy}>
            <div className={styles.badge}>
              <Zap size={15} color="#2563eb" /> Real-time collaboration at lightning speed
            </div>

            <h1 className={styles.title}>
              Collaborative writing
              <br />
              <span>with a sharper workflow.</span>
            </h1>

            <p className={styles.subtitle}>
              SyncWrite brings your team into one elegant workspace for drafting,
              reviewing, and shipping documents together without friction.
            </p>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={handleStartEditing}
              >
                Start Editing
                <ArrowRight size={18} />
              </button>
            </div>

            <div className={styles.statRow}>
              {stats.map((stat) => (
                <div key={stat.label} className={styles.statCard}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.previewShell}>
            <div className={styles.previewHeader}>
              <span className={styles.previewPill}>Team Draft</span>
              <span className={styles.previewMeta}>12 collaborators online</span>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewLineWide} />
              <div className={styles.previewLine} />
              <div className={styles.previewLineMuted} />
              <div className={styles.previewCard}>
                <div className={styles.previewAvatarRow}>
                  <span className={styles.avatarBlue}>A</span>
                  <span className={styles.avatarPurple}>K</span>
                  <span className={styles.avatarGold}>M</span>
                </div>
                <p>
                  Live cursors, version history, and instant sharing keep your
                  whole drafting flow in one calm place.
                </p>
              </div>
            </div>
          </div>
        </div>

        <h1 id="features" className={styles.featureTitle}>
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
