const { describe, it, expect, jest, beforeEach, afterEach } = globalThis;
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

jest.mock('fs');
jest.mock('better-sqlite3');

describe('restore_pixels.js', () => {
  let mockDb;
  let mockConsoleLog;
  let mockConsoleError;
  let originalArgv;

  beforeEach(() => {
    mockDb = {
      pragma: jest.fn(),
      exec: jest.fn(),
      prepare: jest.fn(),
      transaction: jest.fn(),
      close: jest.fn()
    };
    Database.mockImplementation(() => mockDb);

    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    originalArgv = process.argv;
    process.argv = ['node', 'restore_pixels.js', 'test-pixels.json', ':memory:'];

    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.mkdirSync = jest.fn();
    fs.readFileSync = jest.fn();
    fs.statSync = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    process.argv = originalArgv;
  });

  describe('file validation', () => {
    it('should exit with code 1 when source file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      expect(() => require('../restore_pixels.js')).toThrow();
      expect(process.exitCode).toBe(1);
    });

    it('should read source file when it exists', () => {
      const mockPixels = [{ x: 1, y: 2, color: '#ff0000' }];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      require('../restore_pixels.js');

      expect(fs.readFileSync).toHaveBeenCalledWith('test-pixels.json', 'utf-8');
    });

    it('should handle JSON parse errors', () => {
      fs.readFileSync.mockReturnValue('invalid json');

      expect(() => require('../restore_pixels.js')).toThrow();
    });
  });

  describe('database initialization', () => {
    it('should create database directory if it does not exist', () => {
      process.argv = ['node', 'restore_pixels.js', 'test-pixels.json', '/some/path/test.db'];
      fs.existsSync.mockImplementation((p) => {
        if (p === '/some/path') return false;
        return true;
      });

      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      require('../restore_pixels.js');

      expect(fs.mkdirSync).toHaveBeenCalledWith('/some/path', { recursive: true });
    });

    it('should not create directory if it exists', () => {
      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));
      fs.existsSync.mockReturnValue(true);

      require('../restore_pixels.js');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should set WAL mode on database', () => {
      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      require('../restore_pixels.js');

      expect(mockDb.pragma).toHaveBeenCalledWith('journal_mode = WAL');
    });

    it('should create pixels table', () => {
      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      require('../restore_pixels.js');

      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS pixels'));
    });

    it('should create activity table', () => {
      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      require('../restore_pixels.js');

      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS activity'));
    });

    it('should create indexes', () => {
      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      require('../restore_pixels.js');

      expect(mockDb.exec).toHaveBeenCalledWith(expect.stringContaining('CREATE INDEX IF NOT EXISTS'));
    });
  });

  describe('data restoration', () => {
    it('should parse and restore pixels from JSON', () => {
      const mockPixels = [
        { x: 1, y: 2, color: '#ff0000', letter: 'A', sats: 100 },
        { x: 3, y: 4, color: '#00ff00', letter: 'B', sats: 200 }
      ];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      const mockInsertStmt = {
        run: jest.fn()
      };
      const mockTransaction = jest.fn((pixels) => pixels.length);
      mockDb.prepare.mockReturnValue(mockInsertStmt);
      mockDb.transaction.mockReturnValue(mockTransaction);

      require('../restore_pixels.js');

      expect(mockTransaction).toHaveBeenCalledWith(mockPixels);
    });

    it('should handle pixels without optional fields', () => {
      const mockPixels = [
        { x: 1, y: 2, color: '#ff0000', sats: 100 }
      ];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      const mockInsertStmt = {
        run: jest.fn()
      };
      const mockTransaction = jest.fn((pixels) => pixels.length);
      mockDb.prepare.mockReturnValue(mockInsertStmt);
      mockDb.transaction.mockReturnValue(mockTransaction);

      require('../restore_pixels.js');

      expect(mockTransaction).toHaveBeenCalled();
    });

    it('should use default timestamps when not provided', () => {
      const mockPixels = [
        { x: 1, y: 2, color: '#ff0000', sats: 100 }
      ];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      const mockInsertStmt = {
        run: jest.fn()
      };
      mockDb.prepare.mockReturnValue(mockInsertStmt);

      require('../restore_pixels.js');

      expect(mockInsertStmt.run).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: expect.any(Number),
          updated_at: expect.any(Number)
        })
      );
    });

    it('should use provided timestamps when available', () => {
      const mockPixels = [
        { x: 1, y: 2, color: '#ff0000', sats: 100, created_at: 1234567890, updated_at: 1234567900 }
      ];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      const mockInsertStmt = {
        run: jest.fn()
      };
      mockDb.prepare.mockReturnValue(mockInsertStmt);

      require('../restore_pixels.js');

      expect(mockInsertStmt.run).toHaveBeenCalledWith(
        expect.objectContaining({
          created_at: 1234567890,
          updated_at: 1234567900
        })
      );
    });

    it('should handle INSERT OR REPLACE for duplicate positions', () => {
      const mockPixels = [
        { x: 1, y: 2, color: '#ff0000', sats: 100 }
      ];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      const mockInsertStmt = {
        run: jest.fn()
      };
      mockDb.prepare.mockReturnValue(mockInsertStmt);

      require('../restore_pixels.js');

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO pixels')
      );
    });
  });

  describe('progress reporting', () => {
    it('should log progress for large datasets', () => {
      const mockPixels = Array.from({ length: 1000 }, (_, i) => ({
        x: i % 100,
        y: Math.floor(i / 100),
        color: '#ff0000',
        sats: 100
      }));
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      const mockInsertStmt = {
        run: jest.fn()
      };
      const mockTransaction = jest.fn((pixels) => {
        let count = 0;
        for (const pixel of pixels) {
          mockInsertStmt.run(pixel);
          count++;
        }
        return count;
      });
      mockDb.prepare.mockReturnValue(mockInsertStmt);
      mockDb.transaction.mockReturnValue(mockTransaction);

      const mockStdoutWrite = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

      require('../restore_pixels.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Restored 1000 pixels')
      );

      mockStdoutWrite.mockRestore();
    });
  });

  describe('completion', () => {
    it('should close database connection after restoration', () => {
      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      const mockTransaction = jest.fn(() => 0);
      mockDb.prepare.mockReturnValue({ run: jest.fn() });
      mockDb.transaction.mockReturnValue(mockTransaction);

      require('../restore_pixels.js');

      expect(mockDb.close).toHaveBeenCalled();
    });

    it('should log success message with count and duration', () => {
      const mockPixels = [{ x: 1, y: 2, color: '#ff0000', sats: 100 }];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      const mockTransaction = jest.fn(() => 1);
      mockDb.prepare.mockReturnValue({ run: jest.fn() });
      mockDb.transaction.mockReturnValue(mockTransaction);

      require('../restore_pixels.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/Success! Restored \d+ pixels in \d+\.\d+s/)
      );
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors', () => {
      Database.mockImplementation(() => {
        throw new Error('Cannot open database');
      });

      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      expect(() => require('../restore_pixels.js')).toThrow();
    });

    it('should handle transaction errors', () => {
      const mockPixels = [{ x: 1, y: 2, color: '#ff0000', sats: 100 }];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      const mockTransaction = jest.fn(() => {
        throw new Error('Transaction failed');
      });
      mockDb.prepare.mockReturnValue({ run: jest.fn() });
      mockDb.transaction.mockReturnValue(mockTransaction);

      expect(() => require('../restore_pixels.js')).toThrow();
    });

    it('should handle directory creation errors', () => {
      fs.mkdirSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      expect(() => require('../restore_pixels.js')).toThrow();
    });
  });

  describe('command line arguments', () => {
    it('should use default arguments when not provided', () => {
      process.argv = ['node', 'restore_pixels.js'];
      fs.existsSync.mockReturnValue(true);

      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      require('../restore_pixels.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Source: pixels.json')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Target: pixels.db')
      );
    });

    it('should use provided arguments', () => {
      process.argv = ['node', 'restore_pixels.js', 'custom.json', 'custom.db'];
      fs.existsSync.mockReturnValue(true);

      const mockPixels = [];
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPixels));

      require('../restore_pixels.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Source: custom.json')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Target: custom.db')
      );
    });
  });
});
