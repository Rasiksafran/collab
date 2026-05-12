import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import PDFToolbar from './PDFToolbar';
import { useRoom } from '../../context/RoomContext';
import { useSocket } from '../../context/SocketContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PDFViewer() {
  const room = useRoom();
  const socket = useSocket();
  const canvasRef = useRef(null);
  const [pdfUrl, setPdfUrl] = useState(room.pdfUrl || '');
  const [page, setPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [pdfError, setPdfError] = useState(null);

  const isAdmin = useMemo(() => room.currentUser?.isAdmin || socket?.id === room.adminSocketId, [room.adminSocketId, room.currentUser, socket]);

  useEffect(() => {
    setPdfUrl(room.pdfUrl || '');
  }, [room.pdfUrl]);

  useEffect(() => {
    const handleReceivePdf = ({ pdfUrl: nextUrl }) => {
      setPdfUrl(nextUrl || '');
      setPage(1);
    };

    const handleReceivePage = ({ page: nextPage }) => {
      setPage(nextPage);
    };

    socket?.on('receive-pdf', handleReceivePdf);
    socket?.on('receive-pdf-page', handleReceivePage);

    return () => {
      socket?.off('receive-pdf', handleReceivePdf);
      socket?.off('receive-pdf-page', handleReceivePage);
    };
  }, [socket]);

  useEffect(() => {
    const loadDocument = async () => {
      if (!pdfUrl) {
        setPdfDocument(null);
        setNumPages(0);
        setPdfError(null);
        return;
      }

      try {
        setPdfError(null);
        const loaded = await pdfjsLib.getDocument(pdfUrl).promise;
        setPdfDocument(loaded);
        setNumPages(loaded.numPages);
        setPage((current) => Math.min(current, loaded.numPages || 1));
      } catch (error) {
        console.error('Failed to load PDF:', error);
        setPdfError(`Failed to load PDF: ${error.message || 'Invalid PDF format'}`);
        setPdfDocument(null);
        setNumPages(0);
      }
    };

    loadDocument();
  }, [pdfUrl]);

  useEffect(() => {
    const renderPage = async () => {
      if (!pdfDocument || !canvasRef.current) {
        return;
      }

      try {
        const pdfPage = await pdfDocument.getPage(page);
        const viewport = pdfPage.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        await pdfPage.render({ canvasContext: context, viewport }).promise;
      } catch (error) {
        console.error('Failed to render PDF page:', error);
      }
    };

    renderPage();
  }, [page, pdfDocument]);

  const onUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('pdf', file);
      const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
      const response = await fetch(`${serverUrl}/api/upload/pdf`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) {
        setPdfError(`Upload failed: ${data.error || 'Unknown error'}`);
        return;
      }

      const absoluteUrl = data.fileUrl.startsWith('http') ? data.fileUrl : `${serverUrl}${data.fileUrl}`;
      setPdfUrl(absoluteUrl);
      setPdfError(null);
      room.setSelectedMode('split');
      socket.emit('pdf-shared', { roomId: room.roomId, pdfUrl: absoluteUrl, filename: data.filename });
    } catch (error) {
      console.error('PDF upload error:', error);
      setPdfError(`Upload error: ${error.message}`);
    }
  };

  const onPrev = () => {
    setPage((current) => {
      const next = Math.max(1, current - 1);
      if (next !== current) {
        socket.emit('pdf-page-change', { roomId: room.roomId, page: next });
      }
      return next;
    });
  };

  const onNext = () => {
    setPage((current) => {
      const next = Math.min(numPages, current + 1);
      if (next !== current) {
        socket.emit('pdf-page-change', { roomId: room.roomId, page: next });
      }
      return next;
    });
  };

  return (
    <section className="space-y-4">
      <PDFToolbar
        onUpload={onUpload}
        onPrev={onPrev}
        onNext={onNext}
        onDownload={() => window.open(pdfUrl, '_blank', 'noopener,noreferrer')}
        page={page}
        numPages={numPages}
        isAdmin={isAdmin}
      />
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-4">
        {pdfError ? (
          <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-dashed border-red-500/30 bg-red-950/20 p-6 text-center">
            <div>
              <p className="text-red-300 font-semibold">Failed to load PDF</p>
              <p className="text-sm text-red-200/70 mt-2">{pdfError}</p>
            </div>
          </div>
        ) : pdfUrl ? (
          <canvas ref={canvasRef} className="mx-auto block max-w-full rounded-2xl bg-white shadow-2xl" />
        ) : (
          <div className="grid min-h-[60vh] place-items-center rounded-2xl border border-dashed border-white/10 text-slate-400">No PDF loaded yet.</div>
        )}
        {pdfUrl ? (
          <a href={pdfUrl} download target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm text-indigo-200 underline decoration-indigo-400/60 underline-offset-4">
            Download file
          </a>
        ) : null}
      </div>
    </section>
  );
}

