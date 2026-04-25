export interface MetroData {
  date: string;
  city: string;
  passenger_volume: number;
}

export interface ExtractionResult {
  data: MetroData[];
  rawText?: string;
  error?: string;
}

export interface CityMap {
  [key: string]: string;
}
