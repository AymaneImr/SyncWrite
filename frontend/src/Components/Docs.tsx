import React, { useEffect, useState } from 'react';
import Cards from '../Components/Card.tsx';
import TextEditor from './TextEditor.tsx';
import styles from '../css/Docs.module.css';
import text_left_icon from '../assets/file-alt-svgrepo-com.svg'
import text_right_icon from '../assets/file-cloud-svgrepo-com.svg'
import table_right_icon from '../assets/table-alt-svgrepo-com.svg'
import table_left_icon from '../assets/table-layout-svgrepo-com.svg'
import ExistingDocuments from './ExistingDocuments.tsx';
import OpenByLinkModal from './OpenByLinkModal.tsx';
import { useNavigate } from 'react-router-dom';


export default function DocsPage() {
  const [showEditor, setShowEditor] = useState(false);
  const [showExistingDocuments, setShowExistingDocuments] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedTable, setUploadedTable] = useState<File | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const handleTextUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      setUploadedFile(f);
      // demo: read file content and open editor with content
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? '');
        setShowEditor(true);
      };
      reader.readAsText(f);
    }
  };

  const handleTableUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      setUploadedTable(f);
      alert(`Table uploaded: ${f.name} (demo) - backend integration left to you`);
    }
  };

  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();

  const handleOpenByDoc = async (link: string) => {

    if (!link || !token) return;
    const load = async () => {
      const res = await fetch(`http://localhost:8080/api/document/link/${link}/open`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(err);
      }

      navigate(`/editor/${link}`)
    }

    load()
    setShowLinkModal(false)
  }

  return (
    <div className={styles.pageWrap}>
      {!showEditor && !showExistingDocuments && (
        <>
          <h1 className={styles.heading}>What would you like to work with?</h1>
          <p className={styles.sub}>Choose the type of document you want to create or upload</p>


          <div className={styles.grid}>
            <Cards
              title="Text Document"
              subtitle="Work with text files and PDF documents"
              accent="blue"
              iconBg='#d6d6ff'
              uploadAccept=".txt,.pdf"
              onUpload={handleTextUpload}
              onCreate={() => setShowEditor(true)}
              onOpenExisting={() => setShowExistingDocuments(true)}
              onOpenByLink={() => setShowLinkModal(true)}
              leftIcon={text_left_icon}
              rightIcon={text_right_icon}
            />

            <Cards
              title="Table Document"
              subtitle="Work with spreadsheets and CSV files"
              accent="green"
              iconBg='#d1f9d5'
              uploadAccept=".xlsx,.csv"
              onUpload={handleTableUpload}
              onCreate={undefined} // disabled
              //onOpenByLink={() => setShowLinkModal(true)}
              leftIcon={table_left_icon}
              rightIcon={table_right_icon}
            />
          </div>


          <p className={styles.hint}>Click on a card to select your document type, then choose whether to upload an existing file or create a new one.</p>

          {uploadedFile && <div className={styles.uploadInfo}>Uploaded text file: {uploadedFile.name}</div>}
          {uploadedTable && <div className={styles.uploadInfo}>Uploaded table file: {uploadedTable.name}</div>}
        </>
      )}
      {showEditor && (
        <TextEditor
          onBack={() => {
            setShowEditor(false);
          }}
        />
      )}

      {showExistingDocuments && (
        <ExistingDocuments
          onBack={() => {
            setShowExistingDocuments(false);
          }}
        />
      )}

      {showLinkModal && (
        <OpenByLinkModal
          onClose={() => setShowLinkModal(false)}
          onOpen={(link) => {

            handleOpenByDoc(link)
          }}
        />
      )}
    </div>
  );
}
