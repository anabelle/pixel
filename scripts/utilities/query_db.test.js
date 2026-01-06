const { describe, it, expect, beforeEach, afterEach, vi } = globalThis;
const Database = require('better-sqlite3');

describe('query_db.js', () => {
  let mockDb;
  let mockStmt;
  let mockConsoleLog;

  beforeEach(() => {
    mockStmt = {
      all: vi.fn()
    };
    mockDb = {
      prepare: vi.fn().mockReturnValue(mockStmt),
      close: vi.fn()
    };

    vi.mock('better-sqlite3', () => mockDb);

    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockRestore();
  });

  describe('database connection', () => {
    it('should connect to the correct database path', () => {
      const Database = require('better-sqlite3');

      expect(Database).toHaveBeenCalledWith('/home/pixel/lnpixels/api/pixels.db');
    });

    it('should prepare the query statement', () => {
      const Database = require('better-sqlite3');

      expect(mockDb.prepare).toHaveBeenCalledWith('SELECT * FROM activity ORDER BY created_at DESC LIMIT 20');
    });

    it('should execute the query', () => {
      const Database = require('better-sqlite3');

      expect(mockStmt.all).toHaveBeenCalled();
    });

    it('should close the database connection', () => {
      const Database = require('better-sqlite3');

      expect(mockDb.close).toHaveBeenCalled();
    });
  });

  describe('query execution', () => {
    it('should log query results as JSON', () => {
      const mockRows = [
        { id: 1, x: 10, y: 20, color: '#ff0000', created_at: '2024-01-01' },
        { id: 2, x: 15, y: 25, color: '#00ff00', created_at: '2024-01-02' }
      ];
      mockStmt.all.mockReturnValue(mockRows);

      const Database = require('better-sqlite3');

      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify(mockRows, null, 2));
    });

    it('should handle empty results', () => {
      mockStmt.all.mockReturnValue([]);

      const Database = require('better-sqlite3');

      expect(mockConsoleLog).toHaveBeenCalledWith(JSON.stringify([], null, 2));
    });

    it('should handle multiple results', () => {
      const mockRows = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        x: i * 10,
        y: i * 20,
        color: `#${i.toString(16).padStart(6, '0')}`,
        created_at: `2024-01-${(i + 1).toString().padStart(2, '0')}`
      }));
      mockStmt.all.mockReturnValue(mockRows);

      const Database = require('better-sqlite3');

      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedData).toHaveLength(20);
    });
  });

  describe('data integrity', () => {
    it('should preserve data structure', () => {
      const mockRows = [
        { id: 1, x: 10, y: 20, color: '#ff0000', sats: 100, created_at: '2024-01-01' }
      ];
      mockStmt.all.mockReturnValue(mockRows);

      const Database = require('better-sqlite3');

      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedData[0]).toHaveProperty('id');
      expect(loggedData[0]).toHaveProperty('x');
      expect(loggedData[0]).toHaveProperty('y');
      expect(loggedData[0]).toHaveProperty('color');
    });

    it('should handle null values', () => {
      const mockRows = [
        { id: 1, x: 10, y: 20, color: null, letter: null, created_at: '2024-01-01' }
      ];
      mockStmt.all.mockReturnValue(mockRows);

      const Database = require('better-sqlite3');

      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedData[0].color).toBeNull();
    });

    it('should handle special characters in data', () => {
      const mockRows = [
        { id: 1, x: 10, y: 20, color: '#ff"ff"ff', letter: '"quotes"', created_at: '2024-01-01' }
      ];
      mockStmt.all.mockReturnValue(mockRows);

      const Database = require('better-sqlite3');

      const loggedData = JSON.parse(mockConsoleLog.mock.calls[0][0]);
      expect(loggedData[0].color).toBe('#ff"ff"ff');
    });
  });
});
