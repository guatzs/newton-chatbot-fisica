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
      <img
        src="/newton-mascot.png"
        alt="Newton, mascota de Física Aplicada"
        draggable={false}
        className="w-full h-full object-contain drop-shadow-sm"
      />
    </div>
  );
};
