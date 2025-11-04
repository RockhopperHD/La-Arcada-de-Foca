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