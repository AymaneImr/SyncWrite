import React, { useState } from 'react';
import Cards from '../Components/Card.tsx';
import styles from '../css/Docs.module.css';
import text_left_icon from '../assets/file-alt-svgrepo-com.svg';
import text_right_icon from '../assets/file-cloud-svgrepo-com.svg';
import table_right_icon from '../assets/table-alt-svgrepo-com.svg';
import table_left_icon from '../assets/table-layout-svgrepo-com.svg';
import ExistingDocuments from './ExistingDocuments.tsx';
import OpenByLinkModal from './OpenByLinkModal.tsx';
import { useNavigate } from 'react-router-dom';
import CreateDocumentModal from './CreateDocModal.tsx';

type TipTapNode = {
  type: string;
  text?: string;
  content?: TipTapNode[];
};

type TipTapDocument = {
  type: 'doc';
  content: TipTapNode[];
};

function fileNameToTitle(fileName: string) {
  return fileName.trim() || 'Untitled';
}

function textToTipTapDocument(text: string): TipTapDocument {
  const normalized = text.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }],
    };
  }

  const paragraphs = normalized.split(/\n{2,}/).map((paragraph) => {
    const lines = paragraph.split('\n');
    const content: TipTapNode[] = [];

    lines.forEach((line, index) => {
      if (line.length > 0) {
        content.push({
          type: 'text',
          text: line,
        });
      }

      if (index < lines.length - 1) {
        content.push({ type: 'hardBreak' });
      }
    });

    return {
      type: 'paragraph',
      content: content.length > 0 ? content : undefined,
    };
  });

  return {
    type: 'doc',
    content: paragraphs,
  };
}

async function readFileAsText(file: File) {
  return await file.text();
}

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
      body: JSON.stringify({
        title,
        content,
      }),
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

    const isPlainText =
      file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isPlainText) {
      alert('Only .txt uploads are implemented for text documents right now.');
      return;
    }

    setUploadedFile(file);

    const text = await readFileAsText(file);
    const content = textToTipTapDocument(text);

    await createAndOpenDocument(fileNameToTitle(file.name), content);
  };

  const handleTableUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f) {
      setUploadedTable(f);
      alert(`Table uploaded: ${f.name} (demo) - backend integration left to you`);
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
      const err = await res.text();
      console.error(err);
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
              subtitle="Work with text files and PDF documents"
              accent="blue"
              iconBg="#d6d6ff"
              uploadAccept=".txt,.pdf"
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
              onCreate={undefined}
              leftIcon={table_left_icon}
              rightIcon={table_right_icon}
            />
          </div>

          <p className={styles.hint}>Click on a card to select your document type, then choose whether to upload an existing file or create a new one.</p>

          {uploadedFile && <div className={styles.uploadInfo}>Uploaded text file: {uploadedFile.name}</div>}
          {uploadedTable && <div className={styles.uploadInfo}>Uploaded table file: {uploadedTable.name}</div>}
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
