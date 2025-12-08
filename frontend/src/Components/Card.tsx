import React from 'react';
import styles from '../css/Cards.module.css';


type CardProps = {
  title: string;
  subtitle: string;
  accent: 'blue' | 'green';
  iconBg: string;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCreate?: () => void;
  uploadAccept?: string;
  leftIcon: React.ReactNode;
  rightIcon: React.ReactNode;
};


export default function Cards({ title, subtitle, accent, onUpload, onCreate, uploadAccept, leftIcon, rightIcon, iconBg }: CardProps) {
  const colorClass = accent === 'blue' ? styles.blue : styles.green;

  return (
    <div className={`${styles.card} ${colorClass}`}>
      <div className={styles.icons}>
        <div className={styles.iconPlaceholder} style={{ backgroundColor: iconBg }} >
          <img src={leftIcon} alt='icon' />
        </div>
        <div className={styles.iconPlaceholder} style={{ backgroundColor: iconBg }} >
          <img src={rightIcon} alt='icon' />
        </div>
      </div>


      <h3 className={styles.title}>{title}</h3>
      <p className={styles.subtitle}>{subtitle}</p>


      <div className={styles.actions}>
        <label className={styles.uploadBtn}>
          Upload
          <input
            data-testid={`upload-${title}`}
            type="file"
            accept={uploadAccept}
            onChange={onUpload}
            style={{ display: 'none' }}
          />
        </label>


        <button className={styles.createBtn} onClick={onCreate} disabled={!onCreate}>
          Create New Document
        </button>
      </div>


      <div className={styles.footerExt}>{uploadAccept?.split(',').map(ext => <span key={ext} className={styles.ext}>{ext.replace('.', '')}</span>)}</div>
    </div >
  );
}
