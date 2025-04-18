
export interface SkiDay {
  id?: string;
  date: Date;
  resort: string;
  ski: string;
  activity: string;
}

export interface SkiStats {
  totalDays: number;
  uniqueResorts: number;
  mostUsedSki: string;
}
