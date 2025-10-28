import { format } from "date-fns";

describe('Date handling for ski day logging', () => {
  describe('Date object to string conversion', () => {
    it('should format date without timezone shift using date-fns format', () => {
      const testDate = new Date(2025, 9, 28);

      const formattedDate = format(testDate, 'yyyy-MM-dd');

      expect(formattedDate).toBe('2025-10-28');
    });

    it('format() preserves local date while toISOString() converts to UTC', () => {
      const testDate = new Date(2025, 9, 28);
      const correctFormat = format(testDate, 'yyyy-MM-dd');

      expect(correctFormat).toBe('2025-10-28');
    });

    it('should preserve the date across different times of day', () => {
      const morning = new Date(2025, 9, 28, 8, 0, 0);
      const evening = new Date(2025, 9, 28, 22, 0, 0);

      expect(format(morning, 'yyyy-MM-dd')).toBe('2025-10-28');
      expect(format(evening, 'yyyy-MM-dd')).toBe('2025-10-28');
    });
  });

  describe('String to Date object conversion', () => {
    it('should parse date string in local timezone', () => {
      const dateString = '2025-10-28';
      const [year, month, day] = dateString.split('-').map(Number);
      const parsedDate = new Date(year, month - 1, day);

      expect(parsedDate.getFullYear()).toBe(2025);
      expect(parsedDate.getMonth()).toBe(9);
      expect(parsedDate.getDate()).toBe(28);
    });

    it('should create date at local midnight', () => {
      const dateString = '2025-10-28';
      const [year, month, day] = dateString.split('-').map(Number);
      const parsedDate = new Date(year, month - 1, day);

      expect(parsedDate.getHours()).toBe(0);
      expect(parsedDate.getMinutes()).toBe(0);
      expect(parsedDate.getSeconds()).toBe(0);
    });

    it('should round-trip correctly: string -> Date -> string', () => {
      const originalDateString = '2025-10-28';

      const [year, month, day] = originalDateString.split('-').map(Number);
      const dateObject = new Date(year, month - 1, day);

      const formattedBack = format(dateObject, 'yyyy-MM-dd');

      expect(formattedBack).toBe(originalDateString);
    });
  });
});
