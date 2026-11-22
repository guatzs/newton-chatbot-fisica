import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, Trash2, Sparkles, FileText, Cpu, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSolveWithAI: (data: { prompt: string; imageBase64: string; thumbnailBase64?: string; userNote?: string }) => void;
}

interface ImageStats {
  width: number;
  height: number;
  originalSizeKb: number;
  compressedSizeKb: number;
}

async function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality: number): Promise<string> {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('No se pudo codificar la imagen comprimida.'));
      },
      'image/jpeg',
      quality
    );
  });

  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('No se pudo leer la imagen comprimida.'));
    };
    reader.onerror = () => reject(new Error('Error leyendo la imagen comprimida.'));
    reader.readAsDataURL(blob);
  });
}

function drawScaledBitmap(
  source: ImageBitmap | HTMLImageElement,
  srcWidth: number,
  srcHeight: number,
  maxDimension: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  let width = srcWidth;
  let height = srcHeight;
  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.max(1, Math.round((height * maxDimension) / width));
      width = maxDimension;
    } else {
      width = Math.max(1, Math.round((width * maxDimension) / height));
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el lienzo para procesar la imagen.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);

  return { canvas, width, height };
}

/**
 * Compresses an image asynchronously using createImageBitmap (fallback to HTMLImageElement).
 * Scales down to max 1280px JPEG quality 0.75, plus generates a ~200px thumbnail for storage.
 */
async function compressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.75
): Promise<{ dataUrl: string; thumbnailDataUrl: string; stats: ImageStats }> {
  const originalSizeKb = Math.round(file.size / 1024);
  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;

  try {
    let source: ImageBitmap | HTMLImageElement;
    let srcWidth: number;
    let srcHeight: number;

    if (typeof createImageBitmap === 'function') {
      try {
        bitmap = await createImageBitmap(file);
        source = bitmap;
        srcWidth = bitmap.width;
        srcHeight = bitmap.height;
      } catch {
        objectUrl = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => reject(new Error('El archivo no es una imagen válida o compatible.'));
          el.src = objectUrl!;
        });
        source = img;
        srcWidth = img.naturalWidth || img.width;
        srcHeight = img.naturalHeight || img.height;
      }
    } else {
      objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('El archivo no es una imagen válida o compatible.'));
        el.src = objectUrl!;
      });
      source = img;
      srcWidth = img.naturalWidth || img.width;
      srcHeight = img.naturalHeight || img.height;
    }

    const main = drawScaledBitmap(source, srcWidth, srcHeight, maxDimension);
    const thumb = drawScaledBitmap(source, srcWidth, srcHeight, 200);

    const [dataUrl, thumbnailDataUrl] = await Promise.all([
      canvasToJpegDataUrl(main.canvas, quality),
      canvasToJpegDataUrl(thumb.canvas, 0.65),
    ]);

    const head = 'data:image/jpeg;base64,';
    const rawBase64 = dataUrl.startsWith(head) ? dataUrl.slice(head.length) : dataUrl;
    const compressedSizeKb = Math.round((rawBase64.length * 3) / 4 / 1024);

    return {
      dataUrl,
      thumbnailDataUrl,
      stats: {
        width: main.width,
        height: main.height,
        originalSizeKb,
        compressedSizeKb,
      },
    };
  } finally {
    bitmap?.close();
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onSolveWithAI }) => {
  const [activeMode, setActiveMode] = useState<'formula' | 'diagram' | 'page'>('diagram');
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const [imageStats, setImageStats] = useState<ImageStats | null>(null);
  const [userNote, setUserNote] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const lastActionRef = useRef<'camera' | 'upload'>('camera');
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);

  const stopCamera = () => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };

  // Apaga la cámara al cerrar el escáner o al desmontar el componente
  useEffect(() => {
    if (!isOpen) stopCamera();
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
      }
    };
  }, [isOpen]);

  // Conecta el video en vivo cuando la cámara está abierta
  useEffect(() => {
    if (isCameraOpen && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
      videoRef.current.play().catch(() => {
        // Algunos navegadores reproducen solo con autoPlay; se ignora
      });
    }
  }, [isCameraOpen]);

  if (!isOpen) return null;

  const handleOpenCamera = async () => {
    lastActionRef.current = 'camera';
    setErrorMessage(null);

    const canUseLiveCamera =
      window.isSecureContext &&
      !!navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    // Sin cámara en vivo: usar el selector nativo (en el celular abre la cámara)
    if (!canUseLiveCamera) {
      cameraInputRef.current?.click();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCustomImage(null);
      setThumbnailImage(null);
      setImageStats(null);
      setIsCameraOpen(true);
    } catch (err: any) {
      console.warn('Error al abrir la cámara:', err);
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        setErrorMessage(
          'No se pudo usar la cámara: el permiso está bloqueado. Toca el ícono de candado junto a la dirección, habilita "Cámara" y pulsa Reintentar. Si estás dentro de Google AI Studio, abre la app en una pestaña nueva. También puedes usar "Subir imagen".'
        );
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError' || name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ninguna cámara en este dispositivo. Usa "Subir imagen" para elegir una foto.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        setErrorMessage('La cámara está ocupada por otra aplicación (por ejemplo, Zoom o Meet). Ciérrala y pulsa Reintentar.');
      } else {
        setErrorMessage(`No se pudo abrir la cámara (${err?.message || name || 'error desconocido'}). Usa "Subir imagen".`);
      }
    }
  };

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setErrorMessage('La cámara todavía se está iniciando. Espera un segundo y vuelve a intentarlo.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setErrorMessage('No se pudo capturar la foto. Usa "Subir imagen".');
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    stopCamera();
    if (!blob) {
      setErrorMessage('No se pudo capturar la foto. Usa "Subir imagen".');
      return;
    }
    await processImageFile(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
  };

  const handleOpenUpload = () => {
    stopCamera();
    lastActionRef.current = 'upload';
    setErrorMessage(null);
    uploadInputRef.current?.click();
  };

  const handleRetryAction = () => {
    if (lastActionRef.current === 'camera') {
      handleOpenCamera();
    } else {
      handleOpenUpload();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processImageFile(file);
  };

  const processImageFile = async (file: File) => {
    // Reject non-image files
    if (file.type && !file.type.startsWith('image/')) {
      setErrorMessage('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (uploadInputRef.current) uploadInputRef.current.value = '';
      return;
    }

    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const { dataUrl, thumbnailDataUrl, stats } = await compressImage(file, 1280, 0.75);
      setCustomImage(dataUrl);
      setThumbnailImage(thumbnailDataUrl);
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
    setThumbnailImage(null);
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
      thumbnailBase64: thumbnailImage || undefined,
      userNote: userNote.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-3xl p-5 border-2 border-[#546C37]/30 dark:border-[#3C5A40]/50 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-start justify-between pb-3 border-b border-[#ADCA88]/40 dark:border-[#3C5A40]/40">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base text-[#941C2F] dark:text-[#FF9FAE]">🔬</span>
              <span className="text-[11px] font-semibold text-[#546C37] dark:text-[#CFE3A8] tracking-wider uppercase font-mono">
                Newton Lab: Inspector Óptico
              </span>
            </div>
            <h2 className="text-xl font-bold text-[#546C37] dark:text-[#CFE3A8] font-['Pixelify_Sans'] mt-0.5">
              Escanear Ejercicio o Apunte
            </h2>
            <p className="text-xs text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-['Space_Grotesk'] mt-0.5">
              Toma una foto con tu cámara o sube una imagen de tu libreta, pizarra o examen de Física Aplicada.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#D6E3B1]/60 dark:bg-[#24402B]/60 hover:bg-[#D6E3B1] dark:hover:bg-[#24402B] flex items-center justify-center text-[#546C37] dark:text-[#CFE3A8] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-3 space-y-3 flex-1 pr-1">
          {/* Error notice if compression, permissions or format failed */}
          {errorMessage && (
            <div className="bg-[#FFF2EE] dark:bg-[#3A1820] border border-[#FA8989] dark:border-[#8A3A4A] text-[#941C2F] dark:text-[#FF9FAE] p-3 rounded-2xl text-xs flex items-start justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleRetryAction}
                className="shrink-0 py-1 px-2.5 bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Reintentar</span>
              </button>
            </div>
          )}

          {/* Camera Viewport / Preview Box (kept #0E1A0F dark viewport) */}
          <div className="relative aspect-[4/3] bg-[#0E1A0F] rounded-2xl overflow-hidden border-2 border-[#546C37]/80 dark:border-[#3C5A40] shadow-inner flex flex-col justify-between p-3 select-none">
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
              {isCameraOpen ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-h-full max-w-full object-contain rounded-lg"
                  />
                  <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-2 z-20">
                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="py-2 px-4 bg-[#941C2F] hover:bg-[#941C2F]/90 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Capturar</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="py-2 px-3 bg-black/60 hover:bg-black/80 text-white rounded-full text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : isCompressing ? (
                <div className="flex flex-col items-center justify-center text-[#D6E3B1] space-y-2">
                  <Loader2 className="w-8 h-8 animate-spin text-[#FA8989]" />
                  <span className="text-xs font-mono">Procesando imagen…</span>
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
                  ✓ Imagen lista: {imageStats.width}×{imageStats.height}px • {imageStats.compressedSizeKb} KB (JPEG 0.75)
                </span>
              ) : (
                <span>ESPERANDO CAPTURA • ENFOCA CIRCUITOS, DIAGRAMAS O FÓRMULAS</span>
              )}
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div>
            <span className="text-[#546C37] dark:text-[#CFE3A8] font-semibold text-[11px] block mb-1">
              Tipo de contenido a analizar:
            </span>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveMode('diagram')}
                className={`py-2 px-2.5 rounded-xl font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeMode === 'diagram'
                    ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-xs'
                    : 'bg-[#D6E3B1]/70 dark:bg-[#24402B]/70 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B]'
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
                    ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-xs'
                    : 'bg-[#D6E3B1]/70 dark:bg-[#24402B]/70 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B]'
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
                    ? 'bg-[#546C37] dark:bg-[#6E8F47] text-white shadow-xs'
                    : 'bg-[#D6E3B1]/70 dark:bg-[#24402B]/70 text-[#546C37] dark:text-[#CFE3A8] hover:bg-[#D6E3B1] dark:hover:bg-[#24402B]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span className="truncate">Página Completa</span>
              </button>
            </div>
          </div>

          {/* Optional Observation / Custom Question Input */}
          <div className="bg-[#FFFBD9] dark:bg-[#0F1A0F] p-3 rounded-2xl border border-[#ADCA88] dark:border-[#3C5A40] shadow-xs">
            <label className="block text-[11px] font-semibold text-[#546C37] dark:text-[#CFE3A8] mb-1 font-mono">
              PREGUNTA U OBSERVACIÓN ADICIONAL (OPCIONAL):
            </label>
            <input
              type="text"
              value={userNote}
              onChange={(e) => setUserNote(e.target.value)}
              placeholder="Ej: Hallar la corriente en R2 o calcular el campo en la superficie..."
              className="w-full bg-white dark:bg-[#16241A] px-3 py-2 rounded-xl border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 text-xs font-['Space_Grotesk'] text-[#546C37] dark:text-[#CFE3A8] placeholder:text-[#546C37]/40 dark:placeholder:text-[#CFE3A8]/40 focus:outline-none focus:ring-1 focus:ring-[#546C37] dark:focus:ring-[#6E8F47]"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#ADCA88]/40 dark:border-[#3C5A40]/40 flex flex-wrap items-center justify-between gap-2">
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
              onClick={handleOpenCamera}
              className="py-2.5 px-3 bg-[#FA8989]/20 hover:bg-[#FA8989]/30 text-[#941C2F] dark:text-[#FF9FAE] border border-[#FA8989] dark:border-[#8A3A4A] rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#941C2F] dark:text-[#FF9FAE]" />
              <span>Tomar foto</span>
            </button>

            {/* Subir Imagen Button */}
            <button
              type="button"
              onClick={handleOpenUpload}
              className="py-2.5 px-3 bg-white dark:bg-[#16241A] hover:bg-[#FFFBD9] dark:hover:bg-[#0F1A0F] text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88] dark:border-[#3C5A40] rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#546C37] dark:text-[#CFE3A8]" />
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
                ? 'bg-[#941C2F]/40 dark:bg-[#C0334A]/40 text-white/70 cursor-not-allowed shadow-none'
                : 'bg-[#941C2F] dark:bg-[#C0334A] hover:bg-[#941C2F]/90 dark:hover:bg-[#C0334A]/90 text-white cursor-pointer'
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
