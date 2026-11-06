import React from 'react';

interface NewtonMascotProps {
  size?: number | string;
  className?: string;
  mood?: 'happy' | 'thinking' | 'talking' | 'celebrating';
  animated?: boolean;
}

export const NewtonMascot: React.FC<NewtonMascotProps> = ({
  size = 64,
  className = '',
  mood = 'happy',
  animated = false,
}) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        animated ? 'transition-transform duration-300 hover:scale-105' : ''
      } ${className}`}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-sm"
      >
        {/* Drop shadow underneath */}
        <ellipse cx="100" cy="188" rx="60" ry="8" fill="#546C37" fillOpacity="0.12" />

        {/* --- Stem & Leaf --- */}
        {/* Curved stem */}
        <path
          d="M 98 42 C 104 22, 116 16, 126 18"
          stroke="#4A1E24"
          strokeWidth="6.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Green Leaf */}
        <path
          d="M 108 34 C 125 15, 148 20, 142 46 C 124 54, 108 34, 108 34 Z"
          fill="#ADCA88"
          stroke="#3D121A"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M 112 36 Q 126 32 138 38"
          stroke="#546C37"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* --- Apple Body --- */}
        {/* Main kawaii apple body with top dip and bottom indent */}
        <path
          d="M 100 48 
             C 120 40, 168 44, 172 82 
             C 176 122, 165 160, 128 168 
             C 112 172, 104 165, 100 165 
             C 96 165, 88 172, 72 168 
             C 35 160, 24 122, 28 82 
             C 32 44, 80 40, 100 48 Z"
          fill="#FA8989"
          stroke="#3D121A"
          strokeWidth="6.5"
          strokeLinejoin="round"
        />

        {/* Apple subtle top dip highlight */}
        <path
          d="M 92 49 Q 100 54 108 49"
          stroke="#3D121A"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Soft Blushing Cheeks */}
        <ellipse cx="60" cy="126" rx="14" ry="9" fill="#FDC2B1" />
        <ellipse cx="140" cy="126" rx="14" ry="9" fill="#FDC2B1" />


        {/* --- Eyes (Big, Anime Sparkle) --- */}
        {/* Left Eye */}
        <g>
          <ellipse cx="67" cy="104" rx="10" ry="13" fill="#3D121A" />
          {/* Top-right sparkle */}
          <circle cx="70" cy="99" r="4.5" fill="#FFFBD9" />
          {/* Bottom-left sparkle */}
          <circle cx="64" cy="110" r="2.2" fill="#FFFBD9" />
          {/* Eyebrow */}
          <path d="M 60 76 Q 67 72 74 76" stroke="#3D121A" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* Right Eye */}
        <g>
          <ellipse cx="133" cy="104" rx="10" ry="13" fill="#3D121A" />
          {/* Top-right sparkle */}
          <circle cx="136" cy="99" r="4.5" fill="#FFFBD9" />
          {/* Bottom-left sparkle */}
          <circle cx="130" cy="110" r="2.2" fill="#FFFBD9" />
          {/* Eyebrow */}
          <path d="M 126 76 Q 133 72 140 76" stroke="#3D121A" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>

        {/* --- Mouth --- */}
        {mood === 'talking' ? (
          <ellipse cx="100" cy="132" rx="6" ry="8" fill="#3D121A" />
        ) : mood === 'thinking' ? (
          <path d="M 94 133 Q 100 128 106 133" stroke="#3D121A" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        ) : (
          <path
            d="M 92 128 C 92 128, 93 144, 100 144 C 107 144, 108 128, 108 128 Z"
            fill="#3D121A"
          >
            {/* Tongue inside */}
          </path>
        )}
        {mood === 'happy' && (
          <path d="M 95 137 Q 100 142 105 137" fill="#FA8989" />
        )}
      </svg>
    </div>
  );
};
