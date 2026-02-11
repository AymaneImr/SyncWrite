import React, { useEffect, useState } from "react";
import styles from "../css/ExistingDocuments.module.css";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

export type DocumentItem = {
  id: string;
  title: string;
  Content: string;
  description: string;
  created_at: string;
  updated_at: string;
  size: string;
  last_edited_by: string;
  link: string;
};

type Props = {
  onBack: () => void;
};

export default function ExistingDocuments({ onBack }: Props) {

  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    const loadDocs = async () => {
      const res = await fetch("http://localhost:8080/api/documents/loadAll", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const data = await res.json();

      setDocuments(data.documents);
    };

    loadDocs();
  }, [token]);

  const handleDeleteDoc = async (
    id: string,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    const load = async () => {
      e.stopPropagation();
      e.preventDefault();

      const res = await fetch(`http://localhost:8080/api/documents/${id}/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });

      if (!res.ok) {
        console.error(await res.text());
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    };

    load()
  }

  const createdDate = (unixSeconds: string) =>
    new Date(Number(unixSeconds) * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const updatedAgo = (updatedAtSec: string) => {
    const sec = Number(updatedAtSec);
    const diffMs = Date.now() - sec * 1000;

    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <h1 className={styles.title}>My Text Documents</h1>
      </header>

      {/* TODO: implement a working search filter*/}
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          placeholder="Search documents..."
        />
        <button className={styles.filterBtn}>Filter</button>
      </div>

      <div className={styles.list}>
        {documents.map(doc => (
          <div
            role="button"
            className={styles.cardBtn}
            key={doc.id}
            onClick={() => navigate(`/editor/${doc.link}`)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                navigate(`/editor/${doc.link}`);
              }
            }}
            tabIndex={0}
          >
            <div className={styles.card}>
              <div className={styles.icon}>
                📄
              </div>

              <div className={styles.content}>
                <h3>{doc.title}</h3>

                {/* TODO: add description and size fields in DB */}
                <p>{doc.description}description</p>

                <div className={styles.meta}>
                  <span>{createdDate(doc.created_at)}</span>
                  <span>•</span>
                  <span>{updatedAgo(doc.updated_at)}</span>
                  <span>•</span>
                  <span>{doc.size}size</span>
                </div>
              </div>
              <div>
                <button type="button"
                  className={styles.delete}
                  onClick={(e) => handleDeleteDoc(doc.id, e)}
                >
                  <Trash2 />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div >
  );
}
