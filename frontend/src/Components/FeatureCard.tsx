
import type { LucideIcon } from "lucide-react";
import styles from "../css/FeatureCard.module.css";

interface Props {
  title: string;
  description: string;
  accentClass: string;
  cardToneClass: string;
  icon: LucideIcon;
}

export default function FeatureCard({
  title,
  description,
  accentClass,
  cardToneClass,
  icon: Icon,
}: Props) {
  return (
    <article className={`${styles.card} ${cardToneClass}`}>
      <div className={`${styles.iconWrap} ${accentClass}`}>
        <Icon size={28} strokeWidth={2.1} />
      </div>

      <h3 className={styles.cardTitle}>{title}</h3>
      <p className={styles.cardDescription}>{description}</p>
    </article>
  );
}
