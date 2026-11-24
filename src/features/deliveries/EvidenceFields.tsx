import React, { useRef, useState } from 'react';
import { Link2, ImagePlus, Plus, X } from 'lucide-react';

export interface EvidenceValue {
  links: string[];
  files: string[]; // prints já comprimidos (data URL)
}

export const MAX_LINKS = 3;
export const MAX_PRINTS = 3;

export const emptyEvidence = (): EvidenceValue => ({ links: [''], files: [] });

export function cleanEvidence(value: EvidenceValue): EvidenceValue {
  return { links: value.links.map((l) => l.trim()).filter(Boolean), files: value.files };
}

export function hasEvidence(value: EvidenceValue) {
  const clean = cleanEvidence(value);
  return clean.links.length + clean.files.length > 0;
}

// Reduz o print para no máximo 1600 px e converte para JPG (cerca de 200 a 400 KB)
async function compressImage(file: Blob): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Não foi possível processar a imagem.');
  ctx.fillStyle = '#ffffff'; // fundo branco para imagens com transparência
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.85, 0.7, 0.55]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length < 2_600_000) return dataUrl; // cerca de 1,9 MB
  }
  throw new Error('Imagem muito grande, mesmo comprimida.');
}

const inputClass =
  'w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none';
const labelClass = 'block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1';

interface Props {
  value: EvidenceValue;
  setValue: React.Dispatch<React.SetStateAction<EvidenceValue>>;
}

export const EvidenceFields: React.FC<Props> = ({ value, setValue }) => {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const addImages = async (blobs: Blob[]) => {
    const room = MAX_PRINTS - value.files.length;
    if (room <= 0) {
      setError(`Use no máximo ${MAX_PRINTS} prints.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const added: string[] = [];
      for (const blob of blobs.slice(0, room)) added.push(await compressImage(blob));
      setValue((prev) => ({ ...prev, files: [...prev.files, ...added].slice(0, MAX_PRINTS) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler a imagem.');
    } finally {
      setBusy(false);
    }
  };

  // Ctrl+V com um print copiado
  const handlePaste = (e: React.ClipboardEvent) => {
    const images = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (images.length > 0) {
      e.preventDefault();
      void addImages(images);
    }
  };

  const setLink = (index: number, text: string) =>
    setValue((prev) => ({ ...prev, links: prev.links.map((l, i) => (i === index ? text : l)) }));

  const removeLink = (index: number) =>
    setValue((prev) => {
      const links = prev.links.filter((_, i) => i !== index);
      return { ...prev, links: links.length ? links : [''] };
    });

  return (
    <div onPaste={handlePaste} className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <span className={labelClass}>Evidência *</span>

      {/* Links */}
      <div className="space-y-2">
        {value.links.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={link}
              onChange={(e) => setLink(index, e.target.value)}
              className={inputClass}
            />
            {(value.links.length > 1 || link) && (
              <button
                type="button"
                onClick={() => removeLink(index)}
                aria-label="Remover link"
                className="p-2 text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {value.links.length < MAX_LINKS && (
          <button
            type="button"
            onClick={() => setValue((prev) => ({ ...prev, links: [...prev.links, ''] }))}
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar link
          </button>
        )}
      </div>

      {/* Prints */}
      <div
        tabIndex={0}
        className="rounded-xl border-2 border-dashed border-slate-300 px-4 py-3 text-center text-sm text-slate-500 focus:outline-none focus:border-blue-500"
      >
        {busy ? (
          'Processando imagem...'
        ) : (
          <>
            Cole um print aqui (Ctrl+V) ou{' '}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline cursor-pointer"
            >
              <ImagePlus className="w-4 h-4" />
              escolha uma imagem
            </button>
          </>
        )}
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          hidden
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = '';
            if (files.length) void addImages(files);
          }}
        />
      </div>

      {value.files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.files.map((src, index) => (
            <div key={index} className="relative">
              <img src={src} alt={`Print ${index + 1}`} className="w-20 h-20 object-cover rounded-lg border border-slate-200" />
              <button
                type="button"
                onClick={() => setValue((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }))}
                aria-label="Remover print"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-slate-300 flex items-center justify-center text-slate-500 hover:text-rose-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
};