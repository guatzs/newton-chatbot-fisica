import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, ExternalLink, FileText, X } from 'lucide-react';

interface SyllabusPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  pdfUrl?: string;
}

const DEFAULT_PDF_URL = '/silabo-fisica-aplicada.pdf';
const PDF_DOWNLOAD_NAME = 'Silabo-Fisica-Aplicada-UCSUR.pdf';

interface SyllabusModuleItem {
  number: string;
  title: string;
  weeks: string;
  hours: string;
  topics: string[];
}

interface EvaluationItem {
  name: string;
  code: string;
  detail: string;
  week: string;
  weight: string;
}

const SYLLABUS_MODULES: SyllabusModuleItem[] = [
  {
    number: 'Módulo 1',
    title: 'Electrostática',
    weeks: 'Semanas 1 – 3',
    hours: '18 h (6 T · 12 P)',
    topics: [
      'Carga eléctrica, ley de Coulomb, campo eléctrico, flujo eléctrico y ley de Gauss.',
      'Potencial eléctrico, energía potencial eléctrica, superficies equipotenciales y relación campo-potencial.',
      'Capacidad eléctrica, tipos de condensadores, energía en un condensador y circuitos en serie y paralelo.',
    ],
  },
  {
    number: 'Módulo 2',
    title: 'Electrodinámica',
    weeks: 'Semanas 4 – 7',
    hours: '24 h (8 T · 16 P)',
    topics: [
      'Corriente eléctrica, resistencia eléctrica y ley de Ohm.',
      'Asociación de resistencias en serie y paralelo, resistencia equivalente, potencia eléctrica e instrumentos (amperímetros y voltímetros).',
      'Leyes de Kirchhoff y su aplicación en circuitos eléctricos.',
      'Análisis de circuitos transitorios RC en CC: carga, descarga y análisis con condensador cargado.',
    ],
  },
  {
    number: 'Módulo 3',
    title: 'Magnetismo',
    weeks: 'Semanas 9 – 13',
    hours: '30 h (10 T · 20 P)',
    topics: [
      'Origen del magnetismo, campo magnético terrestre, fuerza magnética sobre cargas en movimiento y conductores con corriente.',
      'Fuentes de campo magnético: ley de Biot-Savart y ley de Ampere.',
      'Inducción electromagnética: flujo magnético y leyes de Faraday y Lenz.',
      'Corriente alterna, valor medio y eficaz, representación fasorial y compleja, elementos pasivos e impedancia.',
      'Circuitos RLC en serie y paralelo, potencia en CA, factor de potencia y resonancia.',
    ],
  },
  {
    number: 'Módulo 4',
    title: 'Fundamentos de electrónica',
    weeks: 'Semanas 14 – 15',
    hours: '12 h (4 T · 8 P)',
    topics: [
      'Semiconductores, estructura atómica, teoría de bandas de energía, dopaje tipo P y N, electrones libres y huecos, polarización directa e inversa, diodo Shockley y curva I–V.',
      'Modelos del diodo y circuitos rectificadores de media onda y onda completa, filtrado capacitivo y diodo Zener para regulación de voltaje.',
    ],
  },
];

const EVALUATION_ITEMS: EvaluationItem[] = [
  { name: 'Evaluación diagnóstica', code: 'ED', detail: 'Prueba de entrada', week: 'Semana 1', weight: '0%' },
  { name: 'Evaluación continua 1', code: 'EC1', detail: 'Electrostática', week: 'Semana 5', weight: '15%' },
  { name: 'Evaluación Parcial', code: 'EP', detail: 'Electricidad', week: 'Semana 8', weight: '20%' },
  { name: 'Evaluación continua 2', code: 'EC2', detail: 'Magnetismo', week: 'Semana 11', weight: '15%' },
  { name: 'Evaluación continua 3', code: 'EC3', detail: 'Trabajo Integrador', week: 'Semana 15', weight: '30%' },
  { name: 'Evaluación Final', code: 'EF', detail: 'Todo el contenido', week: 'Semana 16', weight: '20%' },
];

const MANDATORY_REFERENCES: string[] = [
  'Serway RA, Jewett JW. Física para ciencias e ingeniería. Vol. 2. 10ª ed. Cengage Learning; 2019.',
  'Tipler PA, Mosca G. Física para la ciencia y la tecnología. Vol. 2: Electricidad y magnetismo/Luz. 6ª ed. Reverté; 2021.',
  'Boylestad RL, Nashelsky L. Electrónica: teoría de circuitos y dispositivos electrónicos. 11ª ed. Pearson Educación; 2018.',
];

export const SyllabusPdfModal: React.FC<SyllabusPdfModalProps> = ({
  isOpen,
  onClose,
  pdfUrl = DEFAULT_PDF_URL,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="syllabus-pdf-modal-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-2.5 sm:p-5 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92dvh] sm:max-h-[88vh] flex flex-col bg-[#FFFBD9] dark:bg-[#0F1A0F] rounded-2xl sm:rounded-3xl border border-[#ADCA88]/70 dark:border-[#3C5A40]/80 shadow-2xl overflow-hidden"
      >
        {/* Top Modal Header + Primary PDF Actions */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 bg-[#FFFBD9] dark:bg-[#16241A] border-b border-[#ADCA88]/50 dark:border-[#3C5A40]/60 shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#546C37] dark:bg-[#24402B] text-[#FFFBD9] dark:text-[#CFE3A8] flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id="syllabus-pdf-modal-title"
                  className="text-base sm:text-lg font-bold text-[#3D121A] dark:text-[#FBE9E4] font-['Space_Grotesk'] leading-snug break-words"
                >
                  Sílabo Oficial — Física Aplicada (815972)
                </h2>
                <p className="text-xs text-[#546C37]/85 dark:text-[#CFE3A8]/85 font-['Space_Grotesk'] mt-0.5">
                  Universidad Científica del Sur · Sílabo 2026-2 · Plan 2026 · Ciclo 02 · 4 créditos
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar sílabo oficial"
              className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-white/80 hover:bg-[#FA8989]/25 dark:bg-[#0F1A0F]/80 dark:hover:bg-[#3A1820]/70 text-[#546C37] hover:text-[#941C2F] dark:text-[#CFE3A8] dark:hover:text-[#FF9FAE] border border-[#ADCA88]/60 dark:border-[#3C5A40]/60 flex items-center justify-center transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] dark:focus-visible:ring-[#8FB35E]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Direct PDF Actions (no iframe blocking on Brave / mobile) */}
          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-4 py-2 rounded-xl bg-[#546C37] hover:bg-[#44592C] dark:bg-[#6E8F47] dark:hover:bg-[#5E7C3B] text-white text-xs font-bold font-['Space_Grotesk'] inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] dark:focus-visible:ring-[#8FB35E] whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Abrir PDF en nueva pestaña</span>
            </a>

            <a
              href={pdfUrl}
              download={PDF_DOWNLOAD_NAME}
              className="min-h-[40px] px-4 py-2 rounded-xl bg-white/90 hover:bg-[#D6E3B1]/60 dark:bg-[#0F1A0F] dark:hover:bg-[#24402B] text-[#546C37] dark:text-[#CFE3A8] border border-[#ADCA88]/80 dark:border-[#3C5A40] text-xs font-bold font-['Space_Grotesk'] inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#546C37] dark:focus-visible:ring-[#8FB35E] whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Descargar PDF</span>
            </a>

            <span className="text-[11px] text-[#546C37]/75 dark:text-[#CFE3A8]/75 font-['Space_Grotesk']">
              Documento oficial (8 páginas) · Vista previa rápida debajo
            </span>
          </div>
        </div>

        {/* Scrollable Static Structured Syllabus Preview */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5 space-y-5 font-['Space_Grotesk'] text-[#3D121A] dark:text-[#FBE9E4]">
          {/* Section 1: Course Overview & Sumilla */}
          <section className="rounded-2xl bg-white/85 dark:bg-[#16241A]/90 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 p-4 space-y-3">
            <h3 className="text-sm font-bold text-[#546C37] dark:text-[#CFE3A8]">
              1. Datos generales y sumilla
            </h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 text-xs">
              <div>
                <dt className="text-[#546C37]/75 dark:text-[#CFE3A8]/75">Código y condición</dt>
                <dd className="font-semibold font-mono tabular-nums">815972 · Obligatorio</dd>
              </div>
              <div>
                <dt className="text-[#546C37]/75 dark:text-[#CFE3A8]/75">Horas totales</dt>
                <dd className="font-semibold tabular-nums">32 h teóricas · 64 h prácticas</dd>
              </div>
              <div>
                <dt className="text-[#546C37]/75 dark:text-[#CFE3A8]/75">Requisito</dt>
                <dd className="font-semibold">Fundamentos Científicos</dd>
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <dt className="text-[#546C37]/75 dark:text-[#CFE3A8]/75">Departamento Académico</dt>
                <dd className="font-semibold">
                  Ingeniería Industrial, Electrónica, Software y de Sistemas
                </dd>
              </div>
              <div>
                <dt className="text-[#546C37]/75 dark:text-[#CFE3A8]/75">Responsable del curso</dt>
                <dd className="font-semibold">Mg. Ana Sofía Quispe Ubilla</dd>
              </div>
            </dl>
            <p className="text-xs leading-relaxed text-[#3D121A]/85 dark:text-[#FBE9E4]/85 pt-2 border-t border-[#ADCA88]/30 dark:border-[#3C5A40]/35">
              Curso de naturaleza teórico-práctica orientado a explicar los principios físicos de fenómenos eléctricos, magnéticos y energéticos aplicados al análisis de sistemas tecnológicos en ingeniería: magnitudes eléctricas, circuitos de corriente continua, leyes fundamentales, potencia y energía, electromagnetismo, corriente alterna y fundamentos de electrónica.
            </p>
          </section>

          {/* Section 2: 4 Modules & Weekly Structure */}
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-bold text-[#546C37] dark:text-[#CFE3A8]">
                2. Organización de contenidos por módulos
              </h3>
              <span className="text-[11px] text-[#546C37]/75 dark:text-[#CFE3A8]/75 tabular-nums">
                4 módulos · Semanas 1 a 15 (Semana 8: Parcial · Semana 16: Final)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SYLLABUS_MODULES.map((mod) => (
                <article
                  key={mod.number}
                  className="rounded-2xl bg-white/85 dark:bg-[#16241A]/90 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 p-3.5 space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-[#941C2F] dark:text-[#FF9FAE] font-semibold">
                      <span>{mod.number}</span>
                      <span>{mod.weeks}</span>
                    </div>
                    <h4 className="text-sm font-bold text-[#3D121A] dark:text-[#FBE9E4] mt-0.5">
                      {mod.title}
                    </h4>
                    <p className="text-[11px] text-[#546C37]/80 dark:text-[#CFE3A8]/80 font-mono tabular-nums">
                      Carga horaria: {mod.hours}
                    </p>
                  </div>
                  <ul className="space-y-1.5 text-xs text-[#3D121A]/85 dark:text-[#FBE9E4]/85 list-disc pl-4 leading-relaxed">
                    {mod.topics.map((topic, idx) => (
                      <li key={idx}>{topic}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>

          {/* Section 3: Evaluation System */}
          <section className="rounded-2xl bg-white/85 dark:bg-[#16241A]/90 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#ADCA88]/35 dark:border-[#3C5A40]/40 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#546C37] dark:text-[#CFE3A8]">
                3. Sistema de evaluación
              </h3>
              <span className="text-[11px] font-mono text-[#546C37]/80 dark:text-[#CFE3A8]/80 tabular-nums">
                Peso total: 100%
              </span>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#ADCA88]/35 dark:border-[#3C5A40]/40 text-[11px] text-[#546C37]/85 dark:text-[#CFE3A8]/85">
                    <th className="py-2 px-4 font-semibold">Evaluación</th>
                    <th className="py-2 px-3 font-semibold">Cód.</th>
                    <th className="py-2 px-3 font-semibold">Detalle</th>
                    <th className="py-2 px-3 font-semibold">Semana</th>
                    <th className="py-2 px-4 font-semibold text-right">Peso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ADCA88]/25 dark:divide-[#3C5A40]/25">
                  {EVALUATION_ITEMS.map((item) => (
                    <tr
                      key={item.code}
                      className="hover:bg-[#D6E3B1]/25 dark:hover:bg-[#24402B]/40 transition-colors"
                    >
                      <td className="py-2 px-4 font-medium">{item.name}</td>
                      <td className="py-2 px-3 font-mono font-bold text-[#546C37] dark:text-[#CFE3A8]">
                        {item.code}
                      </td>
                      <td className="py-2 px-3 text-[#3D121A]/85 dark:text-[#FBE9E4]/85">
                        {item.detail}
                      </td>
                      <td className="py-2 px-3 font-mono tabular-nums whitespace-nowrap">
                        {item.week}
                      </td>
                      <td className="py-2 px-4 font-mono font-bold tabular-nums text-right text-[#941C2F] dark:text-[#FF9FAE]">
                        {item.weight}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-4 py-2.5 bg-[#FFFBD9]/75 dark:bg-[#0F1A0F]/80 border-t border-[#ADCA88]/35 dark:border-[#3C5A40]/40 text-xs font-mono tabular-nums text-[#3D121A] dark:text-[#FBE9E4] break-words">
              <span className="font-semibold text-[#546C37] dark:text-[#CFE3A8]">Fórmula: </span>
              ED(0.0) + EC1(0.15) + EP(0.20) + EC2(0.15) + EC3(0.30) + EF(0.20)
            </div>
          </section>

          {/* Section 4: Mandatory Bibliography */}
          <section className="rounded-2xl bg-white/85 dark:bg-[#16241A]/90 border border-[#ADCA88]/50 dark:border-[#3C5A40]/50 p-4 space-y-2">
            <h3 className="text-sm font-bold text-[#546C37] dark:text-[#CFE3A8]">
              4. Bibliografía obligatoria
            </h3>
            <ul className="space-y-1.5 text-xs text-[#3D121A]/85 dark:text-[#FBE9E4]/85 list-disc pl-4 leading-relaxed">
              {MANDATORY_REFERENCES.map((ref, idx) => (
                <li key={idx}>{ref}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>,
    document.body
  );
};
