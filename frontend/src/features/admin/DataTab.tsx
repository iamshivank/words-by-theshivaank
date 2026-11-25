import { Copy, Download, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { EXPORT_URL, useDeleteMedia, useImport, useMedia } from '@/api/admin';
import { errorMessage } from '@/api/client';
import { Button, Hairline, LoadingLine, Notice, SectionLabel, toast } from '@/design';
import { cn } from '@/lib/cn';
import { formatBytes, formatDate } from '@/lib/format';

/** Export and import, and the uploads library. */
export function DataTab() {
  const importer = useImport();
  const media = useMedia();
  const deleteMedia = useDeleteMedia();
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const send = (files: File[]) => {
    if (!files.length) return;
    importer.mutate(files, {
      onSuccess: (r) => {
        toast(`Imported ${r.imported}, skipped ${r.skipped}`);
      },
    });
  };

  return (
    <div className="flex flex-col gap-16">
      <div className="grid gap-16 lg:grid-cols-2">
        <section className="flex flex-col gap-6">
          <SectionLabel index="01">Export</SectionLabel>
          <p className="text-ui text-muted">
            Everything you have written, as Markdown files with front matter, plus quotes, prompts,
            decisions, goals and settings as JSON, in one zip. Your words are yours; keep a copy
            somewhere safe.
          </p>
          <a
            href={EXPORT_URL}
            download
            className="group relative inline-flex h-12 items-center gap-2.5 self-start rounded-hair border-hair border-hairline-strong px-7 meta text-ink transition-colors hover:border-muted"
          >
            <Download aria-hidden className="size-3.5" strokeWidth={1.25} /> Download everything
            <span className="absolute inset-x-0 -bottom-px h-hair origin-left scale-x-0 bg-accent transition-transform duration-700 group-hover:scale-x-100" />
          </a>
        </section>
        <section className="flex flex-col gap-6">
          <SectionLabel index="02">Import</SectionLabel>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => {
              setDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              send([...e.dataTransfer.files]);
            }}
            className={cn(
              'flex flex-col items-center justify-center gap-3 border-hair border-dashed px-6 py-12 text-center transition-colors duration-500',
              dragging
                ? 'border-accent bg-accent-soft'
                : 'border-hairline-strong hover:border-muted',
            )}
          >
            <Upload aria-hidden className="size-5 text-muted" strokeWidth={1.25} />
            <p className="text-ui text-ink">Drop Markdown files or a zip here</p>
            <p className="text-ui text-muted">
              Front matter (title, type, status, visibility, date, tags) is read if present. Entries
              already here are skipped.
            </p>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".md,.markdown,.txt,.zip"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              send([...(e.target.files ?? [])]);
              e.target.value = '';
            }}
          />
          {importer.isPending && <LoadingLine label="Importing" />}
          {importer.isError && <Notice tone="error">{errorMessage(importer.error)}</Notice>}
          {importer.data && (
            <div className="text-ui">
              <p className="text-ink">
                Imported <span className="num">{importer.data.imported}</span>, skipped{' '}
                <span className="num">{importer.data.skipped}</span>.
              </p>
              {importer.data.errors.map((err) => (
                <p key={err} className="text-accent">
                  {err}
                </p>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-6">
        <SectionLabel index="03">Uploads</SectionLabel>
        {media.isPending && <LoadingLine />}
        {media.data?.length === 0 && (
          <p className="text-ui text-muted">
            No uploads yet. Images you add to entries appear here.
          </p>
        )}
        <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          {media.data?.map((m) => (
            <li key={m.id} className="flex flex-col gap-2">
              <img
                src={m.url}
                alt={m.originalName ?? ''}
                loading="lazy"
                className="aspect-square w-full border-hair border-hairline object-cover"
              />
              <p className="truncate text-ui text-ink" title={m.originalName ?? ''}>
                {m.originalName ?? 'image'}
              </p>
              <div className="flex items-center justify-between">
                <span className="num meta">
                  {formatBytes(m.sizeBytes)} · {formatDate(m.createdAt)}
                </span>
                <span className="flex gap-2">
                  <button
                    type="button"
                    aria-label="Copy address"
                    className="text-muted hover:text-ink"
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(new URL(m.url, window.location.origin).href)
                        .then(() => {
                          toast('Address copied');
                        });
                    }}
                  >
                    <Copy aria-hidden className="size-3.5" strokeWidth={1.25} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete upload"
                    className="text-muted hover:text-accent"
                    onClick={() => {
                      deleteMedia.mutate(m.id);
                    }}
                  >
                    <Trash2 aria-hidden className="size-3.5" strokeWidth={1.25} />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <Hairline />
        <Button
          variant="text"
          size="sm"
          className="self-start"
          onClick={() => void media.refetch()}
        >
          Refresh
        </Button>
      </section>
    </div>
  );
}
