export type CourseModuleId = 'electrostatica' | 'electrodinamica' | 'magnetismo' | 'electronica';

export interface CourseModule {
  id: CourseModuleId;
  number: number;
  title: string;
  subtitle: string;
  weeks: string;
  badge: string;
  color: string;
  accentBg: string;
  topics: string[];
  exercisesCount: number;
  sampleQuestions: string[];
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
  formula?: string;
  formulaTitle?: string;
  quickChips?: string[];
  simulationType?: 'conductor_gauss' | 'circuito_rc' | 'diodo_iv';
  imageUrl?: string;
  imageNote?: string;
  isAudio?: boolean;
  latex?: string;
  isError?: boolean;
  retryPrompt?: string;
  retryImageBase64?: string;
  diagramPrompt?: string;
  diagramUrl?: string;
  diagramLoading?: boolean;
  diagramError?: string;
}

export interface ChatSession {
  id: string;
  userId?: string;
  title: string;
  topic: string;
  moduleId: CourseModuleId;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage?: string;
}

export interface FormulaItem {
  id: string;
  moduleId: CourseModuleId;
  name: string;
  latex: string;
  description: string;
  variables: { symbol: string; name: string; unit: string }[];
  constants?: { symbol: string; name: string; value: string }[];
}
