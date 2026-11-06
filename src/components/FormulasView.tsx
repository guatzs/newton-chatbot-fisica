import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { FORMULA_CATALOG, PHYSICAL_CONSTANTS, COURSE_MODULES } from '../data/syllabus';
import { CourseModuleId } from '../types';
import { Search, Copy, Check, Sparkles } from 'lucide-react';

interface FormulasViewProps {
  onAskAboutFormula: (formulaName: string, latex: string) => void;
}

export const FormulasView: React.FC<FormulasViewProps> = ({ onAskAboutFormula }) => {
  const [selectedModule, setSelectedModule] = useState<CourseModuleId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFormulas = FORMULA_CATALOG.filter((f) => {
    const matchesMod = selectedModule === 'all' || f.moduleId === selectedModule;
    const matchesQuery =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.latex.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMod && matchesQuery;
  });

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#FFFBD9] rounded-3xl p-5 border-2 border-[#ADCA88]/50 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#D6E3B1] text-[#546C37] px-2.5 py-0.5 rounded-full text-xs font-bold font-mono">
              COMPENDIO OFICIAL
            </span>
            <span className="text-xs text-[#546C37]/80">Física Aplicada • UCSUR</span>
          </div>
          <h1 className="text-2xl font-bold text-[#546C37] font-['Pixelify_Sans'] mt-1">
            Explorador de Fórmulas y Constantes
          </h1>
          <p className="text-xs text-[#546C37]/80 font-['Space_Grotesk'] mt-0.5">
            Ecuaciones fundamentales, definiciones de variables en el Sistema Internacional y constantes físicas.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#546C37]/50" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ley, variable o tema..."
            className="w-full bg-white pl-9 pr-3 py-2 rounded-2xl border border-[#ADCA88] text-xs text-[#546C37] placeholder-[#546C37]/50 focus:outline-none focus:ring-1 focus:ring-[#546C37]"
          />
        </div>
      </div>

      {/* Module Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedModule('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            selectedModule === 'all'
              ? 'bg-[#546C37] text-white shadow-sm'
              : 'bg-[#D6E3B1]/60 text-[#546C37] hover:bg-[#D6E3B1]'
          }`}
        >
          Todas las fórmulas
        </button>
        {COURSE_MODULES.map((mod) => (
          <button
            key={mod.id}
            onClick={() => setSelectedModule(mod.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              selectedModule === mod.id
                ? 'bg-[#546C37] text-white shadow-sm'
                : 'bg-[#D6E3B1]/60 text-[#546C37] hover:bg-[#D6E3B1]'
            }`}
          >
            {mod.badge}: {mod.title}
          </button>
        ))}
      </div>

      {/* Formulas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredFormulas.map((f) => (
          <div
            key={f.id}
            className="bg-white rounded-3xl p-5 border border-[#ADCA88]/50 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-full bg-[#D6E3B1] text-[#546C37]">
                  {f.moduleId}
                </span>
                <button
                  onClick={() => handleCopy(f.id, f.latex)}
                  className="text-xs text-[#546C37] hover:text-[#941C2F] flex items-center gap-1"
                  title="Copiar fórmula"
                >
                  {copiedId === f.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="text-[11px] font-mono">{copiedId === f.id ? 'Copiado' : 'Copiar LaTeX'}</span>
                </button>
              </div>

              <h3 className="font-bold text-base text-[#546C37] font-['Space_Grotesk']">
                {f.name}
              </h3>
              <p className="text-xs text-[#546C37]/80 mt-1">
                {f.description}
              </p>

              {/* Equation Box with KaTeX rendering */}
              <div className="my-2 text-center">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {`$$${f.latex}$$`}
                </ReactMarkdown>
              </div>

              {/* Variables breakdown */}
              <div className="space-y-1 text-xs">
                <span className="font-semibold text-[#546C37] text-[11px]">Variables y Unidades SI:</span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-[#546C37]/85 font-mono">
                  {f.variables.map((v, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#FFFBD9]/50 px-2 py-0.5 rounded">
                      <span className="font-bold text-[#941C2F]">{v.symbol}</span>
                      <span>{v.name} ({v.unit})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => onAskAboutFormula(f.name, f.latex)}
              className="mt-4 w-full py-2 bg-[#D6E3B1] hover:bg-[#ADCA88] text-[#546C37] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#941C2F]" />
              <span>Pedir a Newton que resuelva un ejercicio con esta fórmula</span>
            </button>
          </div>
        ))}
      </div>

      {/* Fundamental Constants Section */}
      <div className="bg-white rounded-3xl p-5 border border-[#ADCA88]/50 shadow-xs space-y-3">
        <h2 className="text-lg font-bold text-[#546C37] font-['Pixelify_Sans']">
          Constantes Físicas Fundamentales
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PHYSICAL_CONSTANTS.map((c, idx) => (
            <div key={idx} className="bg-[#FFFBD9]/70 rounded-2xl p-3 border border-[#ADCA88]/40 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-[#546C37]">{c.name}</span>
                <span className="font-mono font-bold text-sm text-[#941C2F]">{c.symbol}</span>
              </div>
              <div className="font-mono text-xs font-semibold text-[#546C37]">
                {c.value}
              </div>
              <p className="text-[10px] text-[#546C37]/75">
                {c.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
