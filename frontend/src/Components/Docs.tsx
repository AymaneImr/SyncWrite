import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import text_left_icon from '../assets/file-alt-svgrepo-com.svg';
import text_right_icon from '../assets/file-cloud-svgrepo-com.svg';
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
import NavBar from './NavBar.tsx';

export default function DocsPage() {
  const [showExistingDocuments, setShowExistingDocuments] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [status, setStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [linkModalError, setLinkModalError] = useState('');

  const token = localStorage.getItem('access_token');
  const navigate = useNavigate();

  const createAndOpenDocument = async (title: string, content?: TipTapDocument) => {
    if (!token) {
      throw new Error('You must be signed in to create a document.');
    }

    const res = await fetch('http://localhost:8080/api/documents/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, content }),
    });

    if (!res.ok) {
      const errText = (await res.text()) || res.statusText;
      throw new Error(errText || 'Unable to create a new document.');
    }

    const data = await res.json();
    const link = data?.document?.link;

    if (!link) {
      throw new Error('Document created but no link was returned.');
    }

    navigate(`/editor/${link}`);
  };

  const handleTextUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    setStatus(null);

    if (!file) return;

    try {
      setUploadedFile(file);
      const content = await parseUploadedTextDocument(file);
      await createAndOpenDocument(fileNameToTitle(file.name), content);
    } catch (error) {
      console.error(error);
      setUploadedFile(null);
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'The file could not be parsed. Please try a .txt, .pdf, or .docx file.',
      });
    }
  };

  const handleOpenByDoc = async (link: string) => {
    const trimmedLink = link.trim();
    setLinkModalError('');
    setStatus(null);

    if (!trimmedLink) {
      setLinkModalError('Please enter a valid document link.');
      return;
    }

    if (!token) {
      setStatus({ type: 'error', message: 'Unable to open the document. Please sign in again.' });
      return;
    }

    const res = await fetch(`http://localhost:8080/api/documents/link/${trimmedLink}/open`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      let errText = res.statusText;

      try {
        const text = await res.text();
        if (text) {
          try {
            const data = JSON.parse(text);
            if (typeof data === 'object' && data !== null) {
              errText =
                typeof data.error === 'string'
                  ? data.error
                  : typeof data.message === 'string'
                    ? data.message
                    : text;
            }
          } catch {
            errText = text;
          }
        }
      } catch {
        // fallback to status text
        // implement later 
      }

      setLinkModalError(errText || 'Unable to open that document link.');
      console.error(errText);
      return;
    }

    navigate(`/editor/${trimmedLink}`);
    setShowLinkModal(false);
  };

  const handleCreateDocument = async (title: string) => {
    setStatus(null);

    try {
      await createAndOpenDocument(title, {
        type: 'doc' as const,
        content: [{ type: 'paragraph' }],
      });
      setShowCreateModal(false);
    } catch (error) {
      console.error(error);
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to create a new document. Please try again.',
      });
    }
  };

  return (
    <>
      <NavBar />
      <div className={styles.pageWrap}>
        {!showExistingDocuments && (
          <>
            <section className={styles.heroPanel}>
              <div className={styles.heroText}>
                <span className={styles.eyebrow}>Workspace</span>
                <h1 className={styles.heading}>Start your next document with less friction</h1>
                <p className={styles.sub}>
                  Create a fresh draft, bring in an existing file, or jump back into a shared
                  document from a link.
                </p>
              </div>

              <div className={styles.quickStats}>
                <div className={styles.statBox}>
                  <strong>Import</strong>
                  <span>TXT, PDF, DOCX, DOC</span>
                </div>
                <div className={styles.statBox}>
                  <strong>Create</strong>
                  <span>Blank collaborative drafts</span>
                </div>
                <div className={styles.statBox}>
                  <strong>Open</strong>
                  <span>Existing docs or shared links</span>
                </div>
              </div>
            </section>

            <p className={styles.hint}>
              Pick a workflow below to create, import, reopen, or join a document instantly.
            </p>

            {status && (
              <div className={`${styles.status} ${status.type === 'error' ? styles.statusError : styles.statusSuccess}`}>
                {status.message}
              </div>
            )}

            <div className={styles.grid}>
              <Cards
                title="Text Document"
                subtitle="Work with text, PDF, and Word documents"
                accent="blue"
                iconBg="#dbeafe"
                uploadAccept=".txt,.pdf,.docx,.doc"
                onUpload={handleTextUpload}
                onCreate={() => setShowCreateModal(true)}
                onOpenExisting={() => setShowExistingDocuments(true)}
                onOpenByLink={() => setShowLinkModal(true)}
                leftIcon={text_left_icon}
                rightIcon={text_right_icon}
              />
            </div>

            {uploadedFile && (
              <div className={styles.uploadInfo}>Uploaded text file: {uploadedFile.name}</div>
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
            error={linkModalError}
            onErrorChange={setLinkModalError}
          />
        )}

        {showCreateModal && (
          <CreateDocumentModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateDocument}
          />
        )}
      </div>
    </>
  );
}
