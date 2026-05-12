import { useEffect, useRef, useState } from 'react';
import WhiteboardCanvas from '../Whiteboard/WhiteboardCanvas';
import PDFViewer from '../PDF/PDFViewer';

export default function SplitView({ canDraw }) {
  const containerRef = useRef(null);
  const [split, setSplit] = useState(50);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const handleMove = (event) => {
      if (!dragging || !containerRef.current) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((event.clientX - rect.left) / rect.width) * 100;
      setSplit(Math.min(80, Math.max(20, ratio)));
    };

    const stopDrag = () => setDragging(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [dragging]);

  return (
    <section ref={containerRef} className="relative min-h-[76vh] overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70">
      <div className="flex min-h-[76vh] flex-col md:flex-row">
        <div style={{ flexBasis: `${split}%`, flexGrow: 0, flexShrink: 0 }} className="min-h-[38vh] md:min-h-[76vh] md:border-r md:border-white/10">
          <WhiteboardCanvas canDraw={canDraw} />
        </div>
        <div
          onMouseDown={() => setDragging(true)}
          className="hidden w-1 cursor-col-resize bg-white/10 md:block"
          role="separator"
          aria-orientation="vertical"
        />
        <div className="min-h-[38vh] flex-1 border-t border-white/10 md:min-h-[76vh] md:border-t-0 md:border-l md:border-white/10">
          <PDFViewer />
        </div>
      </div>
    </section>
  );
}
