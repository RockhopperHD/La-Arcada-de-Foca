export interface GameData {
  title: string;
  description: string;
  target_lang: string;
  comf_language: string;
  labels: string;
  how_to_play: string[];
}

export interface ParseResult {
  gameData: GameData | null;
  gameScript: string | null;
  error: string | null;
}

export interface GameParameter {
  name: string;
  description: string;
  type: 'number' | 'string' | 'boolean' | 'array_string' | 'array_object' | 'object';
  value: any;
}

export interface UserMessage {
    role: 'user';
    content: string;
}

export interface AinaraMessage {
    role: 'model';
    header: string;
    body: string;
    footer: string;
    language: string;
}

export type Message = UserMessage | AinaraMessage;
