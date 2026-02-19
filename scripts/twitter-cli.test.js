const { describe, it, expect, jest, beforeEach, afterEach } = globalThis;
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

jest.mock('pg');
jest.mock('crypto');

describe('twitter-cli.js', () => {
  let mockPool;
  let mockClient;
  let mockConsoleLog;
  let mockConsoleError;
  let mockConsoleWarn;
  let originalArgv;
  let originalEnv;
  let TwitterCLIClass;

  beforeEach(() => {
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn()
    };

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      end: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue({ rows: [] })
    };

    Pool.mockImplementation(() => mockPool);

    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

    originalArgv = process.argv;
    originalEnv = { ...process.env };

    randomUUID.mockReturnValue('test-uuid-123');

    TwitterCLIClass = require('../twitter-cli.js').TwitterCLI;
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  describe('TwitterCLI class initialization', () => {
    it('should create a PostgreSQL pool with correct connection string', () => {
      process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test_db';

      new TwitterCLIClass();

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://test:test@localhost:5432/test_db'
      });
    });

    it('should use default connection string when POSTGRES_URL not set', () => {
      delete process.env.POSTGRES_URL;

      new TwitterCLIClass();

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/pixel_agent'
      });
    });

    it('should have connect method', () => {
      const cli = new TwitterCLIClass();

      expect(cli.connect).toBeDefined();
      expect(typeof cli.connect).toBe('function');
    });

    it('should have disconnect method', () => {
      const cli = new TwitterCLIClass();

      expect(cli.disconnect).toBeDefined();
      expect(typeof cli.disconnect).toBe('function');
    });

    it('should have testAuth method', () => {
      const cli = new TwitterCLIClass();

      expect(cli.testAuth).toBeDefined();
      expect(typeof cli.testAuth).toBe('function');
    });

    it('should have logDryRun method', () => {
      const cli = new TwitterCLIClass();

      expect(cli.logDryRun).toBeDefined();
      expect(typeof cli.logDryRun).toBe('function');
    });
  });

  describe('database connection', () => {
    it('should connect to database', async () => {
      const cli = new TwitterCLIClass();

      await cli.connect();

      expect(mockPool.connect).toHaveBeenCalled();
    });

    it('should disconnect from database', async () => {
      const cli = new TwitterCLIClass();

      await cli.disconnect();

      expect(mockPool.end).toHaveBeenCalled();
    });
  });

  describe('testAuth method', () => {
    beforeEach(() => {
      process.env.TWITTER_API_KEY = 'test_key';
      process.env.TWITTER_API_SECRET_KEY = 'test_secret';
      process.env.TWITTER_ACCESS_TOKEN = 'test_token';
      process.env.TWITTER_ACCESS_TOKEN_SECRET = 'test_token_secret';
      process.env.ENABLE_TWITTER_PLUGIN = 'true';
    });

    it('should log authentication test with dry-run flag', async () => {
      const cli = new TwitterCLIClass();
      await cli.testAuth(true);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Testing Twitter credentials (dry-run: true)')
      );
    });

    it('should log authentication test without dry-run flag', async () => {
      const cli = new TwitterCLIClass();
      await cli.testAuth(false);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Testing Twitter credentials (dry-run: false)')
      );
    });

    it('should error when credentials are missing', async () => {
      delete process.env.TWITTER_API_KEY;

      const cli = new TwitterCLIClass();

      try {
        await cli.testAuth();
      } catch (e) {}

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Twitter credentials not configured')
      );
    });

    it('should warn when plugin is disabled', async () => {
      process.env.ENABLE_TWITTER_PLUGIN = 'false';

      const cli = new TwitterCLIClass();
      await cli.testAuth();

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Twitter plugin is disabled')
      );
    });

    it('should handle 401 authentication errors', async () => {
      jest.mock('twitter-api-v2', () => ({
        TwitterApi: jest.fn().mockImplementation(() => ({
          v2: {
            me: jest.fn().mockRejectedValue({ code: 401 })
          })
        }))
      });

      const cli = new TwitterCLIClass();

      try {
        await cli.testAuth();
      } catch (e) {}

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Authentication failed (401)')
      );
    });

    it('should handle 429 rate limit errors', async () => {
      jest.mock('twitter-api-v2', () => ({
        TwitterApi: jest.fn().mockImplementation(() => ({
          v2: {
            me: jest.fn().mockRejectedValue({ code: 429 })
          }
        }))
      }));

      const cli = new TwitterCLIClass();

      try {
        await cli.testAuth();
      } catch (e) {}

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Rate limited (429)')
      );
    });

    it('should handle successful authentication', async () => {
      jest.mock('twitter-api-v2', () => ({
        TwitterApi: jest.fn().mockImplementation(() => ({
          v2: {
            me: jest.fn().mockResolvedValue({
              data: {
                id: '12345',
                username: 'testuser',
                name: 'Test User',
                description: 'Test bio',
                public_metrics: {
                  followers_count: 1000,
                  following_count: 500
                },
                verified: true,
                created_at: '2020-01-01'
              }
            })
          }
        }))
      }));

      const cli = new TwitterCLIClass();
      await cli.testAuth();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Authentication successful!')
      );
    });
  });

  describe('logDryRun method', () => {
    it('should log dry-run content to console', async () => {
      const cli = new TwitterCLIClass();
      await cli.logDryRun('Test content');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('DRY-RUN MODE - Would post the following:')
      );
    });

    it('should log content to diary in database', async () => {
      const cli = new TwitterCLIClass();
      await cli.logDryRun('Test content');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO diary_entries'),
        expect.any(Array)
      );
    });

    it('should use correct diary entry fields', async () => {
      const cli = new TwitterCLIClass();
      await cli.logDryRun('Test content');

      const queryCall = mockPool.query.mock.calls[0];
      const values = queryCall[1];

      expect(values[1]).toBe('TwitterDryRun');
      expect(values[2]).toBe('Would post: Test content');
      expect(values[3]).toEqual(['twitter', 'dry-run']);
    });

    it('should generate unique UUID for each entry', async () => {
      randomUUID.mockReturnValueOnce('uuid-1');
      randomUUID.mockReturnValueOnce('uuid-2');

      const cli = new TwitterCLIClass();
      await cli.logDryRun('Content 1');
      await cli.logDryRun('Content 2');

      expect(randomUUID).toHaveBeenCalledTimes(2);
    });
  });

  describe('command line interface', () => {
    beforeEach(() => {
      process.env.TWITTER_API_KEY = 'test_key';
      process.env.TWITTER_API_SECRET_KEY = 'test_secret';
      process.env.TWITTER_ACCESS_TOKEN = 'test_token';
      process.env.TWITTER_ACCESS_TOKEN_SECRET = 'test_token_secret';
      process.env.ENABLE_TWITTER_PLUGIN = 'true';
    });

    it('should handle test-auth command', async () => {
      process.argv = ['node', 'twitter-cli.js', 'test-auth'];

      jest.mock('twitter-api-v2', () => ({
        TwitterApi: jest.fn().mockImplementation(() => ({
          v2: {
            me: jest.fn().mockResolvedValue({
              data: {
                id: '123',
                username: 'test',
                name: 'Test',
                description: 'Bio',
                public_metrics: {},
                verified: false,
                created_at: '2020-01-01'
              }
            })
          }
        }))
      }));

      try {
        await require('../twitter-cli.js');
      } catch (e) {}
    });

    it('should handle test-auth with --dry-run flag', async () => {
      process.argv = ['node', 'twitter-cli.js', 'test-auth', '--dry-run'];

      jest.mock('twitter-api-v2', () => ({
        TwitterApi: jest.fn().mockImplementation(() => ({
          v2: {
            me: jest.fn().mockResolvedValue({
              data: {
                id: '123',
                username: 'test',
                name: 'Test',
                description: 'Bio',
                public_metrics: {},
                verified: false,
                created_at: '2020-01-01'
              }
            })
          }
        }))
      }));

      try {
        await require('../twitter-cli.js');
      } catch (e) {}
    });

    it('should handle dry-run-post command with content', async () => {
      process.argv = ['node', 'twitter-cli.js', 'dry-run-post', 'Hello, world!'];

      try {
        await require('../twitter-cli.js');
      } catch (e) {}

      expect(mockPool.query).toHaveBeenCalled();
    });

    it('should error on dry-run-post without content', async () => {
      process.argv = ['node', 'twitter-cli.js', 'dry-run-post'];

      try {
        await require('../twitter-cli.js');
      } catch (e) {}

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Usage: twitter-cli dry-run-post')
      );
    });

    it('should show usage for unknown command', async () => {
      process.argv = ['node', 'twitter-cli.js', 'unknown-command'];

      try {
        await require('../twitter-cli.js');
      } catch (e) {}

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage: twitter-cli <command>')
      );
    });

    it('should handle -d short flag for dry-run', async () => {
      process.argv = ['node', 'twitter-cli.js', 'test-auth', '-d'];

      jest.mock('twitter-api-v2', () => ({
        TwitterApi: jest.fn().mockImplementation(() => ({
          v2: {
            me: jest.fn().mockResolvedValue({
              data: {
                id: '123',
                username: 'test',
                name: 'Test',
                description: 'Bio',
                public_metrics: {},
                verified: false,
                created_at: '2020-01-01'
              }
            })
          }
        }))
      }));

      try {
        await require('../twitter-cli.js');
      } catch (e) {}
    });
  });

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      const cli = new TwitterCLIClass();

      try {
        await cli.connect();
      } catch (e) {}

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle database query errors', async () => {
      mockPool.query.mockRejectedValue(new Error('Query failed'));

      const cli = new TwitterCLIClass();

      try {
        await cli.logDryRun('Test content');
      } catch (e) {}

      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      mockPool.end.mockRejectedValue(new Error('Disconnect failed'));

      const cli = new TwitterCLIClass();

      try {
        await cli.disconnect();
      } catch (e) {}
    });

    it('should exit with code 1 on authentication failure', async () => {
      delete process.env.TWITTER_API_KEY;

      const cli = new TwitterCLIClass();

      try {
        await cli.testAuth();
      } catch (e) {}

      expect(process.exitCode).toBe(1);
    });
  });

  describe('TwitterProfile interface', () => {
    it('should correctly map Twitter API response to profile', async () => {
      jest.mock('twitter-api-v2', () => ({
        TwitterApi: jest.fn().mockImplementation(() => ({
          v2: {
            me: jest.fn().mockResolvedValue({
              data: {
                id: 'test-id',
                username: 'testusername',
                name: 'Test Name',
                description: 'Test Biography',
                public_metrics: {
                  followers_count: 5000,
                  following_count: 1000
                },
                verified: true,
                created_at: '2020-01-01T00:00:00.000Z'
              }
            })
          }
        }))
      }));

      const cli = new TwitterCLIClass();
      await cli.testAuth();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('@testusername')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Test Name')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('5,000')
      );
    });
  });
});
