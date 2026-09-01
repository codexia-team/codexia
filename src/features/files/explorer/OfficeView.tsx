import { renderAsync } from 'docx-preview';
import {
  FileCode,
  FileText,
  Loader2,
  Presentation,
  RotateCcw,
  Table,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { init as initPptxPreviewer } from 'pptx-preview';
import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { useThemeContext } from '@/contexts/ThemeContext';
import { readFile } from '@/services';
import { getErrorMessage } from '@/utils/errorUtils';
import { getFilename } from '@/utils/getFilename';

import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Bundled worker: no CDN fetch, so the viewer also works offline.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type SheetData = { name: string; data: unknown[][] };

const PPTX_SLIDE_WIDTH = 960;
const PPTX_SLIDE_HEIGHT = 540;
const PPTX_THUMB_WIDTH = 128;

function buildPptxThumbnails(mainEl: HTMLElement, thumbRail: HTMLElement | null) {
  if (!thumbRail) return;
  thumbRail.innerHTML = '';

  const thumbScale = PPTX_THUMB_WIDTH / PPTX_SLIDE_WIDTH;
  // Slides are nested inside a ".pptx-preview-wrapper" element, not direct children.
  const slideEls = Array.from(mainEl.querySelectorAll<HTMLElement>('.pptx-preview-slide-wrapper'));

  slideEls.forEach((slideEl, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className =
      'relative block w-full shrink-0 overflow-hidden rounded border bg-white shadow-sm';
    if (index === 0) {
      card.classList.add('ring-2', 'ring-primary');
    }
    card.style.height = `${PPTX_SLIDE_HEIGHT * thumbScale}px`;
    card.addEventListener('click', () => {
      for (const el of Array.from(thumbRail.children)) {
        el.classList.remove('ring-2', 'ring-primary');
      }
      card.classList.add('ring-2', 'ring-primary');
      slideEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const clone = slideEl.cloneNode(true) as HTMLElement;
    clone.style.width = `${PPTX_SLIDE_WIDTH}px`;
    clone.style.transform = `scale(${thumbScale})`;
    clone.style.transformOrigin = 'top left';
    clone.style.pointerEvents = 'none';
    card.appendChild(clone);

    const label = document.createElement('span');
    label.className =
      'absolute bottom-1 right-1 rounded bg-black/60 px-1 text-[10px] leading-tight text-white';
    label.textContent = String(index + 1);
    card.appendChild(label);

    thumbRail.appendChild(card);
  });
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface OfficeViewProps {
  filePath: string;
}

export function OfficeView({ filePath }: OfficeViewProps) {
  const { resolvedTheme } = useThemeContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pptxOuterRef = useRef<HTMLDivElement>(null);
  const pptxContainerRef = useRef<HTMLDivElement>(null);
  const pptxThumbRef = useRef<HTMLDivElement>(null);
  const [excelData, setExcelData] = useState<SheetData[]>([]);
  const [activeSheet, setActiveSheet] = useState(0);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [pptxScale, setPptxScale] = useState(1);

  const extension = getFilename(filePath).split('.').pop()?.toLowerCase() ?? '';

  useEffect(() => {
    let isActive = true;

    const loadFile = async () => {
      if (!filePath) return;
      setLoading(true);
      setError(null);
      setExcelData([]);
      setActiveSheet(0);
      setPdfBlob(null);
      setNumPages(null);
      setScale(1.0);

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
      if (pptxContainerRef.current) {
        pptxContainerRef.current.innerHTML = '';
      }
      if (pptxThumbRef.current) {
        pptxThumbRef.current.innerHTML = '';
      }

      try {
        const data = base64ToBytes(await readFile(filePath));
        if (!isActive) return;

        if (extension === 'docx' || extension === 'doc') {
          if (containerRef.current) {
            const blob = new Blob([data], {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            });
            await renderAsync(blob, containerRef.current, undefined, {
              className: 'docx-preview-container',
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              debug: false,
            });
          }
        } else if (extension === 'xlsx' || extension === 'xls') {
          const workbook = XLSX.read(data, { type: 'array' });
          setExcelData(
            workbook.SheetNames.map((name) => ({
              name,
              data: XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], { header: 1 }),
            }))
          );
        } else if (extension === 'pdf') {
          setPdfBlob(new Blob([data], { type: 'application/pdf' }));
        } else if (extension === 'pptx') {
          if (pptxContainerRef.current) {
            const previewer = initPptxPreviewer(pptxContainerRef.current, {
              width: PPTX_SLIDE_WIDTH,
              height: PPTX_SLIDE_HEIGHT,
              mode: 'list',
            });
            await previewer.preview(data.buffer as ArrayBuffer);
            if (isActive) {
              buildPptxThumbnails(pptxContainerRef.current, pptxThumbRef.current);
            }
          }
        }
      } catch (err) {
        if (isActive) {
          setError(getErrorMessage(err));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadFile();

    return () => {
      isActive = false;
    };
  }, [filePath, extension]);

  useEffect(() => {
    if (extension !== 'pptx') return;
    const outer = pptxOuterRef.current;
    if (!outer) return;

    const updateScale = () => {
      setPptxScale(outer.clientWidth / PPTX_SLIDE_WIDTH);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [extension]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center">
        <div className="max-w-md">
          <p className="mb-2 text-sm text-destructive">{error}</p>
          <p className="text-xs text-muted-foreground">Path: {filePath}</p>
        </div>
      </div>
    );
  }

  const activeRows = excelData[activeSheet]?.data ?? [];
  const columnCount = activeRows.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background"
      data-color-mode={resolvedTheme}
    >
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between border-b bg-muted/30 px-4 py-2">
        <div className="flex items-center gap-2">
          {(extension === 'docx' || extension === 'doc') && (
            <FileText className="h-4 w-4 text-primary" />
          )}
          {(extension === 'xlsx' || extension === 'xls') && (
            <Table className="h-4 w-4 text-primary" />
          )}
          {extension === 'pptx' && <Presentation className="h-4 w-4 text-primary" />}
          {extension === 'pdf' && <FileCode className="h-4 w-4 text-primary" />}
          <span className="max-w-[200px] truncate text-sm font-medium sm:max-w-sm">
            {getFilename(filePath)}
          </span>
        </div>

        {extension === 'pdf' && pdfBlob && (
          <div className="flex items-center gap-1 rounded-md border bg-background p-0.5 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setScale((prev) => Math.max(prev - 0.1, 0.5))}
              disabled={scale <= 0.5}
              title="Zoom out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[36px] select-none px-1 text-center font-mono text-xs">
              {Math.round(scale * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setScale((prev) => Math.min(prev + 0.1, 2.0))}
              disabled={scale >= 2.0}
              title="Zoom in"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="mx-0.5 h-3 w-px bg-border" />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setScale(1.0)}
              title="Reset zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {extension === 'pptx' && (
        <div className="flex min-h-0 flex-1">
          <div
            className="flex min-h-0 w-36 shrink-0 flex-col gap-2 overflow-y-auto border-r bg-muted/20 p-2"
            ref={pptxThumbRef}
          />
          <div className="min-h-0 flex-1 overflow-auto p-4">
            <div className="w-full" ref={pptxOuterRef}>
              <div
                className="bg-white shadow-sm"
                ref={pptxContainerRef}
                // `zoom` (unlike `transform: scale`) affects layout size, so the
                // scroll container's scrollHeight tracks the scaled content correctly.
                style={{ width: PPTX_SLIDE_WIDTH, zoom: pptxScale || 1 }}
              />
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-auto p-4 ${extension === 'pptx' ? 'hidden' : ''}`}>
        <div
          className={`${extension === 'docx' || extension === 'doc' ? 'block' : 'hidden'} docx-wrapper mx-auto min-h-full max-w-[816px] shadow-sm`}
          ref={containerRef}
        />

        {extension === 'pdf' && pdfBlob && (
          <div className="flex min-h-full flex-col items-center justify-start bg-muted/10 p-2">
            <Document
              file={pdfBlob}
              onLoadSuccess={({ numPages: total }) => setNumPages(total)}
              loading={
                <div className="flex items-center justify-center p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              }
              error={<p className="p-6 text-sm text-destructive">Failed to load PDF document.</p>}
              className="flex flex-col gap-4"
            >
              {Array.from({ length: numPages ?? 0 }, (_, index) => (
                <div
                  key={`page_${index + 1}`}
                  className="overflow-hidden rounded bg-white shadow-md"
                >
                  <Page
                    pageNumber={index + 1}
                    renderTextLayer
                    renderAnnotationLayer
                    scale={scale}
                  />
                </div>
              ))}
            </Document>
          </div>
        )}

        {(extension === 'xlsx' || extension === 'xls') && excelData.length > 0 && (
          <div className="flex h-full flex-col">
            <div className="flex-1 overflow-auto rounded-md border bg-card">
              <table className="w-full border-collapse text-xs">
                <tbody>
                  {activeRows.map((row, rowIndex) => (
                    <tr
                      // biome-ignore lint/suspicious/noArrayIndexKey: spreadsheet rows have no stable id
                      key={rowIndex}
                      className="border-b border-border/50 last:border-0 hover:bg-muted/30"
                    >
                      <td className="w-8 select-none border-r border-border/50 bg-muted/50 px-2 py-1 text-center font-mono text-muted-foreground">
                        {rowIndex + 1}
                      </td>
                      {Array.from({ length: columnCount }, (_, colIndex) => (
                        <td
                          // biome-ignore lint/suspicious/noArrayIndexKey: spreadsheet cells have no stable id
                          key={colIndex}
                          className="min-w-[80px] whitespace-nowrap border-r border-border/50 px-3 py-1 text-foreground last:border-0"
                        >
                          {row[colIndex] !== undefined ? String(row[colIndex]) : ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {excelData.length > 1 && (
              <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                {excelData.map((sheet, index) => (
                  <Button
                    key={sheet.name}
                    size="sm"
                    variant={activeSheet === index ? 'default' : 'secondary'}
                    className="h-7 whitespace-nowrap rounded-full px-3 text-xs"
                    onClick={() => setActiveSheet(index)}
                  >
                    {sheet.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .docx-wrapper {
          padding: 2rem !important;
          background: white !important;
          color: black !important;
        }
        .docx-preview-container {
          background: white !important;
          color: black !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        [data-color-mode='dark'] .docx-wrapper {
          filter: invert(0.9) hue-rotate(180deg);
        }
        [data-color-mode='dark'] .docx-wrapper img {
          filter: invert(1) hue-rotate(180deg);
        }
        [data-color-mode='dark'] .react-pdf__Page {
          filter: invert(0.9) hue-rotate(180deg);
        }
        [data-color-mode='dark'] .react-pdf__Page canvas {
          filter: none;
        }
        .pptx-preview-wrapper {
          background: transparent !important;
          height: auto !important;
          overflow: visible !important;
        }
        .pptx-preview-slide-wrapper {
          margin-bottom: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .pptx-preview-slide-wrapper:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
}
