
import type { LucideIcon } from "lucide-react";
import styles from "../css/FeatureCard.module.css";

interface Props {
  title: string;
  description: string;
  badge?: string;
  accentClass: string;
  cardToneClass: string;
  icon: LucideIcon;
}

export default function FeatureCard({
  title,
  description,
  badge,
  accentClass,
  cardToneClass,
  icon: Icon,
}: Props) {
  return (
    <article className={`${styles.card} ${cardToneClass}`}>
      <div className={`${styles.iconWrap} ${accentClass}`}>
        <Icon size={28} strokeWidth={2.1} />
      </div>

      <div className={styles.titleRow}>
        <h3 className={styles.cardTitle}>{title}</h3>
        {badge ? <span className={styles.betaBadge}>{badge}</span> : null}
      </div>
      <p className={styles.cardDescription}>{description}</p>
    </article>
  );
}
