import React, { useState, useRef } from 'react';
import { X, Camera, Upload, Trash2, Sparkles, FileText, Cpu, AlertCircle, Loader2 } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSolveWithAI: (data: { prompt: string; imageBase64: string; userNote?: string }) => void;
}

interface ImageStats {
  width: number;
  height: number;
  originalSizeKb: number;
  compressedSizeKb: number;
}

/**
 * Compresses an image in the browser using HTMLCanvasElement.
 * Scales down to a maximum dimension of 1600px and exports as JPEG quality 0.8.
 */
async function compressImage(file: File, maxDimension = 1600, quality = 0.8): Promise<{ dataUrl: string; stats: ImageStats }> {
  return new Promise((resolve, reject) => {
    const originalSizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('No se pudo leer el archivo seleccionado.'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida o compatible.'));

      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const fallbackData = e.target?.result as string;
          resolve({
            dataUrl: fallbackData,
            stats: { width, height, originalSizeKb, compressedSizeKb: originalSizeKb },
          });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const head = 'data:image/jpeg;base64,';
        const rawBase64 = dataUrl.slice(head.length);
        const compressedSizeKb = Math.round((rawBase64.length * 3) / 4 / 1024);

        resolve({
          dataUrl,
          stats: { width, height, originalSizeKb, compressedSizeKb },
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onSolveWithAI }) => {
  const [activeMode, setActiveMode] = useState<'formula' | 'diagram' | 'page'>('diagram');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<ImageStats | null>(null);
  const [userNote, setUserNote] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reject non-image files
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const { dataUrl, stats } = await compressImage(file, 1600, 0.8);
      setCustomImage(dataUrl);
      setImageStats(stats);
    } catch (err: any) {
      console.error('Error al procesar y comprimir imagen:', err);
      setErrorMessage(err?.message || 'Error al procesar la imagen seleccionada.');
    } finally {
      setIsCompressing(false);
      // Reset input values so taking another photo with same filename works
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  const handleClearImage = () => {
    setCustomImage(null);
    setImageStats(null);
    setErrorMessage(null);
  };

  const handleTriggerAnalysis = () => {
    if (!customImage) return;

    let modeDescription = 'diagrama o circuito';
    if (activeMode === 'formula') modeDescription = 'fórmula o ecuación';
    if (activeMode === 'page') modeDescription = 'página completa de apuntes';

    let prompt = `Analiza esta imagen escaneada (${modeDescription}) de mi cuaderno de Física Aplicada (UCSUR).`;
    if (userNote.trim()) {
      prompt += ` Consulta específica del estudiante: "${userNote.trim()}".`;
    }

    onSolveWithAI({
      prompt,
      imageBase64: customImage,
      userNote: userNote.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#FFFBD9] rounded-3xl p-5 border-2 border-[#546C37]/30 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#ADCA88]/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base text-[#941C2F]">🔬</span>
              <span className="text-[11px] font-semibold text-[#546C37] tracking-wider uppercase font-mono">
                Newton Lab: Inspector Óptico
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#546C37] font-['Pixelify_Sans'] mt-0.5">
              Escanear Ejercicio o Apunte
            </h2>
            <p className="text-xs text-[#546C37]/80 font-['Space_Grotesk'] mt-0.5">
              Toma una foto con tu cámara o sube una imagen de tu libreta, pizarra o examen de Física Aplicada.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#D6E3B1]/60 hover:bg-[#D6E3B1] flex items-center justify-center text-[#546C37] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-3 space-y-3 flex-1 pr-1">
          {/* Error notice if compression or format failed */}
          {errorMessage && (
            <div className="bg-[#FFF2EE] border border-[#FA8989] text-[#941C2F] p-3 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Camera Viewport / Preview Box */}
          <div className="relative aspect-[4/3] bg-[#0E1A0F] rounded-2xl overflow-hidden border-2 border-[#546C37]/80 shadow-inner flex flex-col justify-between p-3 select-none">
            {/* Top Bar inside Viewport */}
            <div className="flex items-center justify-between text-[#ADCA88] text-[11px] font-mono z-10">
              <span className="bg-black/60 px-2.5 py-1 rounded-full backdrop-blur-sm text-[10px]">
                {customImage ? 'FOTO ADJUNTA' : 'VISOR ÓPTICO'}
              </span>
              {customImage && (
                <button
                  onClick={handleClearImage}
                  title="Quitar imagen actual"
                  className="bg-black/60 hover:bg-red-950/80 text-[#FA8989] px-2.5 py-1 rounded-full backdrop-blur-sm text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Quitar</span>
                </button>
              )}
            </div>

            {/* Display Viewport Content */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              {isCompressing ? (
                <div className="flex flex-col items-center justify-center text-[#D6E3B1] space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FA8989]" />
                  <span className="text-xs font-mono">Optimizando y comprimiendo imagen...</span>
                </div>
              ) : customImage ? (
                <img
                  src={customImage}
                  alt="Ejercicio escaneado"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg border border-[#ADCA88]/30"
                />
              ) : (
                <div className="text-center p-6 text-[#ADCA88]/70 max-w-xs space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#182B18] border border-[#ADCA88]/30 mx-auto flex items-center justify-center text-[#ADCA88]">
                    <Camera className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-['Space_Grotesk'] text-[#D6E3B1]">
                    Ninguna imagen seleccionada todavía.
                  </p>
                  <p className="text-[11px] text-[#ADCA88]/60">
                    Pulsa &quot;Tomar foto&quot; para abrir la cámara de tu móvil o &quot;Subir imagen&quot; para elegir de tu galería.
                  </p>
                </div>
              )}
            </div>

            {/* Corner Alignment Targets */}
            <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-[#ADCA88]/60 pointer-events-none"></div>
            <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-[#ADCA88]/60 pointer-events-none"></div>
            <div className="absolute bottom-10 left-4 w-5 h-5 border-b-2 border-l-2 border-[#ADCA88]/60 pointer-events-none"></div>
            <div className="absolute bottom-10 right-4 w-5 h-5 border-b-2 border-r-2 border-[#ADCA88]/60 pointer-events-none"></div>

            {/* Bottom HUD bar */}
            <div className="text-center text-[10px] font-mono text-[#ADCA88]/90 z-10 bg-black/60 py-1 px-2 rounded-lg truncate">
              {customImage && imageStats ? (
                <span>
                  ✓ Imagen lista: {imageStats.width}×{imageStats.height}px • {imageStats.compressedSizeKb} KB (JPEG 0.8)
                </span>
              ) : (
                <span>ESPERANDO CAPTURA • ENFOCA CIRCUITOS, DIAGRAMAS O FÓRMULAS</span>
              )}
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div>
            <span className="text-[#546C37] font-semibold text-[11px] block mb-1">
              Tipo de contenido a analizar:
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveMode('diagram')}
                className={`py-2 px-2.5 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'diagram'
                    ? 'bg-[#546C37] text-white shadow-xs'
                    : 'bg-[#D6E3B1]/70 text-[#546C37] hover:bg-[#D6E3B1]'
                }`}
              >
                <Cpu className="w-3.5 h-3.5" />
                <span className="truncate">Circuito / Diagrama</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('formula')}
                className={`py-2 px-2.5 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'formula'
                    ? 'bg-[#546C37] text-white shadow-xs'
                    : 'bg-[#D6E3B1]/70 text-[#546C37] hover:bg-[#D6E3B1]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate">Fórmula / Ecuación</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveMode('page')}
                className={`py-2 px-2.5 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'page'
                    ? 'bg-[#546C37] text-white shadow-xs'
                    : 'bg-[#D6E3B1]/70 text-[#546C37] hover:bg-[#D6E3B1]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="truncate">Página Completa</span>
              </button>
            </div>
          </div>

          {/* Optional Observation / Custom Question Input */}
          <div className="bg-[#FFFBD9] p-3 rounded-2xl border border-[#ADCA88] shadow-xs">
            <label className="block text-[11px] font-semibold text-[#546C37] mb-1 font-mono">
              PREGUNTA U OBSERVACIÓN ADICIONAL (OPCIONAL):
            </label>
            <input
              type="text"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="Ej: Hallar la corriente en R2 o calcular el campo en la superficie..."
              className="w-full bg-white px-3 py-2 rounded-xl border border-[#ADCA88]/50 text-xs font-['Space_Grotesk'] text-[#546C37] placeholder:text-[#546C37]/40 focus:outline-none focus:ring-1 focus:ring-[#546C37]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#ADCA88]/40 flex flex-wrap items-center justify-between gap-2">
          {/* Hidden Inputs */}
          {/* 1. Camera input with capture="environment" for mobile back camera */}
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* 2. File upload input for picking images from gallery/disk */}
          <input
            type="file"
            ref={uploadInputRef}
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            {/* Tomar Foto Button */}
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="py-2.5 px-3 bg-[#FA8989]/20 hover:bg-[#FA8989]/30 text-[#941C2F] border border-[#FA8989] rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#941C2F]" />
              <span>Tomar foto</span>
            </button>

            {/* Subir Imagen Button */}
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="py-2.5 px-3 bg-white hover:bg-[#FFFBD9] text-[#546C37] border border-[#ADCA88] rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#546C37]" />
              <span>Subir imagen</span>
            </button>
          </div>

          {/* CTA: Analizar y Resolver (Strictly disabled until user uploads/takes a photo) */}
          <button
            type="button"
            disabled={!customImage || isCompressing}
            onClick={handleTriggerAnalysis}
            className={`py-2.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
              !customImage || isCompressing
                ? 'bg-[#941C2F]/40 text-white/70 cursor-not-allowed shadow-none'
                : 'bg-[#941C2F] hover:bg-[#941C2F]/90 text-white cursor-pointer'
            }`}
            title={!customImage ? 'Toma o sube una foto para activar el análisis' : 'Analizar con Newton AI'}
          >
            <span>Analizar y Resolver</span>
            <Sparkles className="w-4 h-4 text-[#FFFBD9]" />
          </button>
        </div>
      </div>
    </div>
  );
};
