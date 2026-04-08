import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import text_left_icon from '../assets/file-alt-svgrepo-com.svg';
import text_right_icon from '../assets/file-cloud-svgrepo-com.svg';
import table_right_icon from '../assets/table-alt-svgrepo-com.svg';
import table_left_icon from '../assets/table-layout-svgrepo-com.svg';
import styles from '../css/Docs.module.css';
import {
  fileNameToTitle,
  parseUploadedTextDocument,
  type TipTapDocument,
} from '../lib/documentImport';
import Cards from './Card.tsx';
import CreateDocumentModal from './CreateDocModal.tsx';
import ExistingDocuments from './ExistingDocuments.tsx';
import OpenByLinkModal from './OpenByLinkModal.tsx';

export default function DocsPage() {
  const [showExistingDocuments, setShowExistingDocuments] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedTable, setUploadedTable] = useState<File | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();

  const createAndOpenDocument = async (title: string, content?: TipTapDocument) => {
    if (!token) return;

    const res = await fetch('http://localhost:8080/api/documents/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, content }),
    });

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    const data = await res.json();
    const link = data?.document?.link;

    if (!link) {
      console.error('Document created but no link was returned');
      return;
    }

    navigate(`/editor/${link}`);
  };

  const handleTextUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';

    if (!file) return;

    try {
      setUploadedFile(file);
      const content = await parseUploadedTextDocument(file);
      await createAndOpenDocument(fileNameToTitle(file.name), content);
    } catch (error) {
      console.error(error);
      setUploadedFile(null);
      alert(
        error instanceof Error
          ? error.message
          : 'The file could not be parsed. Please try a .txt, .pdf, or .docx file.'
      );
    }
  };

  const handleTableUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;

    if (file) {
      setUploadedTable(file);
      alert(`Table uploaded: ${file.name} (demo) - backend integration left to you`);
    }
  };

  const handleOpenByDoc = async (link: string) => {
    if (!link || !token) return;

    const res = await fetch(`http://localhost:8080/api/documents/link/${link}/open`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    navigate(`/editor/${link}`);
    setShowLinkModal(false);
  };

  const handleCreateDocument = async (title: string) => {
    await createAndOpenDocument(title, {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });

    setShowCreateModal(false);
  };

  return (
    <div className={styles.pageWrap}>
      {!showExistingDocuments && (
        <>
          <h1 className={styles.heading}>What would you like to work with?</h1>
          <p className={styles.sub}>Choose the type of document you want to create or upload</p>

          <div className={styles.grid}>
            <Cards
              title="Text Document"
              subtitle="Work with text, PDF, and Word documents"
              accent="blue"
              iconBg="#d6d6ff"
              uploadAccept=".txt,.pdf,.docx,.doc"
              onUpload={handleTextUpload}
              onCreate={() => setShowCreateModal(true)}
              onOpenExisting={() => setShowExistingDocuments(true)}
              onOpenByLink={() => setShowLinkModal(true)}
              leftIcon={text_left_icon}
              rightIcon={text_right_icon}
            />

            <Cards
              title="Table Document"
              subtitle="Work with spreadsheets and CSV files"
              accent="green"
              iconBg="#d1f9d5"
              uploadAccept=".xlsx,.csv"
              onUpload={handleTableUpload}
              leftIcon={table_left_icon}
              rightIcon={table_right_icon}
            />
          </div>

          <p className={styles.hint}>
            Click on a card to select your document type, then choose whether to upload an
            existing file or create a new one.
          </p>

          {uploadedFile && (
            <div className={styles.uploadInfo}>Uploaded text file: {uploadedFile.name}</div>
          )}
          {uploadedTable && (
            <div className={styles.uploadInfo}>Uploaded table file: {uploadedTable.name}</div>
          )}
        </>
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
            handleOpenByDoc(link);
          }}
        />
      )}

      {showCreateModal && (
        <CreateDocumentModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateDocument}
        />
      )}
    </div>
  );
}
