const { describe, it, expect, jest, beforeEach, afterEach } = globalThis;
const { execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');

jest.mock('child_process');
jest.mock('fs');
jest.mock('path');

describe('report-status.js', () => {
  let mockConsoleLog;
  let mockConsoleError;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    path.join = jest.fn((...args) => args.join('/'));
    path.dirname = jest.fn(() => '/scripts/monitoring');
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe(' getUrl function', () => {
    let getUrl;

    beforeEach(() => {
      jest.resetModules();
      getUrl = require('../report-status.js').getUrl || (() => Promise.resolve({}));
    });

    it('should make HTTP GET request', async () => {
      const mockHttpReq = {
        on: jest.fn((event, handler) => {
          if (event === 'end') handler();
        })
      };
      http.get = jest.fn((url, callback) => {
        callback(mockHttpReq);
        return mockHttpReq;
      });

      await getUrl('http://test.com');

      expect(http.get).toHaveBeenCalledWith('http://test.com', expect.any(Function));
    });

    it('should parse JSON response', async () => {
      const mockHttpReq = {
        on: jest.fn()
      };

      http.get = jest.fn((url, callback) => {
        callback(mockHttpReq);
        setTimeout(() => {
          mockHttpReq.on.mock.calls.find(c => c[0] === 'data')[1]('{"test": "value"}');
          mockHttpReq.on.mock.calls.find(c => c[0] === 'end')[1]();
        }, 0);
        return mockHttpReq;
      });

      const result = await getUrl('http://test.com');

      expect(result).toEqual({ test: 'value' });
    });

    it('should handle non-JSON response', async () => {
      const mockHttpReq = {
        on: jest.fn()
      };

      http.get = jest.fn((url, callback) => {
        callback(mockHttpReq);
        setTimeout(() => {
          mockHttpReq.on.mock.calls.find(c => c[0] === 'data')[1]('plain text');
          mockHttpReq.on.mock.calls.find(c => c[0] === 'end')[1]();
        }, 0);
        return mockHttpReq;
      });

      const result = await getUrl('http://test.com');

      expect(result).toBe('plain text');
    });

    it('should handle HTTP errors', async () => {
      const mockHttpReq = {
        on: jest.fn()
      };

      http.get = jest.fn((url, callback) => {
        const error = new Error('Network error');
        callback(mockHttpReq);
        setTimeout(() => {
          mockHttpReq.on.mock.calls.find(c => c[0] === 'error')[1](error);
        }, 0);
        return mockHttpReq;
      });

      const result = await getUrl('http://test.com');

      expect(result).toEqual({ error: 'Network error' });
    });
  });

  describe('system resources section', () => {
    it('should log system resources header', () => {
      const report = require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('System Resources')
      );
    });

    it('should log CPU load with core count', () => {
      const report = require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/CPU Load.*cores/)
      );
    });

    it('should log memory usage in GB', () => {
      const report = require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/Memory.*GB.*GB/)
      );
    });

    it('should log system uptime in days', () => {
      const report = require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/Uptime.*days/)
      );
    });

    it('should calculate memory percentage correctly', () => {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const expectedPercent = ((usedMem / totalMem) * 100).toFixed(1);

      const report = require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`${expectedPercent}%`)
      );
    });

    it('should display load average', () => {
      const report = require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\d+\.\d+.*\d+\.\d+.*\d+\.\d+/)
      );
    });
  });

  describe('PM2 services section', () => {
    beforeEach(() => {
      const mockPM2List = [
        {
          name: 'api',
          pm2_env: {
            status: 'online',
            pm_uptime: Date.now() - 3600000,
            restart_time: 2
          },
          monit: {
            cpu: 5.2,
            memory: 52428800
          }
        },
        {
          name: 'agent',
          pm2_env: {
            status: 'online',
            pm_uptime: Date.now() - 7200000,
            restart_time: 0
          },
          monit: {
            cpu: 2.1,
            memory: 104857600
          }
        }
      ];

      execSync.mockReturnValue(JSON.stringify(mockPM2List));
    });

    it('should log PM2 services header', () => {
      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Service Status (PM2)')
      );
    });

    it('should display PM2 table header', () => {
      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('| Service | Status |')
      );
    });

    it('should display service information', () => {
      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('| api | online |')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('| agent | online |')
      );
    });

    it('should display memory in MB', () => {
      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('MB')
      );
    });

    it('should display uptime in hours', () => {
      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/\d+\.\d+h/)
      );
    });

    it('should handle PM2 errors', () => {
      execSync.mockImplementation(() => {
        throw new Error('PM2 not found');
      });

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching PM2 status')
      );
    });

    it('should handle offline services', () => {
      const mockPM2List = [
        {
          name: 'api',
          pm2_env: {
            status: 'stopped',
            pm_uptime: 0,
            restart_time: 5
          },
          monit: {
            cpu: 0,
            memory: 0
          }
        }
      ];

      execSync.mockReturnValue(JSON.stringify(mockPM2List));

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('| api | stopped | 0h |')
      );
    });
  });

  describe('API & Database section', () => {
    it('should log API & Database header', () => {
      http.get = jest.fn((url, callback) => {
        const mockHttpReq = {
          on: jest.fn()
        };
        callback(mockHttpReq);
        setTimeout(() => {
          mockHttpReq.on.mock.calls.find(c => c[0] === 'data')[1]('{"env": "1.0.0", "pixels": 9041}');
          mockHttpReq.on.mock.calls.find(c => c[0] === 'end')[1]();
        }, 0);
        return mockHttpReq;
      });

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('API & Database')
      );
    });

    it('should display successful API health check', () => {
      http.get = jest.fn((url, callback) => {
        const mockHttpReq = {
          on: jest.fn()
        };
        callback(mockHttpReq);
        setTimeout(() => {
          mockHttpReq.on.mock.calls.find(c => c[0] === 'data')[1]('{"env": "1.0.0", "pixels": 9041}');
          mockHttpReq.on.mock.calls.find(c => c[0] === 'end')[1]();
        }, 0);
        return mockHttpReq;
      });

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('LNPixels API: ✅ Online')
      );
    });

    it('should display API version', () => {
      http.get = jest.fn((url, callback) => {
        const mockHttpReq = {
          on: jest.fn()
        };
        callback(mockHttpReq);
        setTimeout(() => {
          mockHttpReq.on.mock.calls.find(c => c[0] === 'data')[1]('{"env": "1.0.0", "pixels": 9041}');
          mockHttpReq.on.mock.calls.find(c => c[0] === 'end')[1]();
        }, 0);
        return mockHttpReq;
      });

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('v1.0.0')
      );
    });

    it('should display total pixels', () => {
      http.get = jest.fn((url, callback) => {
        const mockHttpReq = {
          on: jest.fn()
        };
        callback(mockHttpReq);
        setTimeout(() => {
          mockHttpReq.on.mock.calls.find(c => c[0] === 'data')[1]('{"env": "1.0.0", "pixels": 9041}');
          mockHttpReq.on.mock.calls.find(c => c[0] === 'end')[1]();
        }, 0);
        return mockHttpReq;
      });

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('9041')
      );
    });

    it('should handle API offline', () => {
      http.get = jest.fn((url, callback) => {
        const mockHttpReq = {
          on: jest.fn()
        };
        callback(mockHttpReq);
        setTimeout(() => {
          mockHttpReq.on.mock.calls.find(c => c[0] === 'error')[1](new Error('Connection refused'));
        }, 0);
        return mockHttpReq;
      });

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('LNPixels API: ❌ Offline')
      );
    });

    it('should handle API errors gracefully', () => {
      http.get = jest.fn((url, callback) => {
        const mockHttpReq = {
          on: jest.fn()
        };
        callback(mockHttpReq);
        setTimeout(() => {
          mockHttpReq.on.mock.calls.find(c => c[0] === 'error')[1](new Error('ETIMEDOUT'));
        }, 0);
        return mockHttpReq;
      });

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('ETIMEDOUT')
      );
    });
  });

  describe('Configuration Sanity section', () => {
    it('should log Configuration Sanity header', () => {
      fs.readFileSync.mockReturnValue('{"version": "1.0.0"}');
      fs.existsSync.mockReturnValue(true);

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Configuration Sanity')
      );
    });

    it('should read agent package.json', () => {
      const mockPackage = { version: '1.0.0' };
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPackage));
      fs.existsSync.mockReturnValue(true);

      require('../report-status.js');

      expect(fs.readFileSync).toHaveBeenCalledWith(
        '/scripts/monitoring/pixel-agent/package.json',
        'utf-8'
      );
    });

    it('should display agent version', () => {
      const mockPackage = { version: '2.5.0' };
      fs.readFileSync.mockReturnValue(JSON.stringify(mockPackage));
      fs.existsSync.mockReturnValue(true);

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Agent Version: 2.5.0')
      );
    });

    it('should check for deepseek model in character settings', () => {
      const mockPackage = { version: '1.0.0' };
      const mockCharContent = 'deepseek/deepseek-r1:free';

      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify(mockPackage);
        }
        return mockCharContent;
      });
      fs.existsSync.mockReturnValue(true);

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Default Model: ✅ deepseek-r1:free')
      );
    });

    it('should warn about non-standard model', () => {
      const mockPackage = { version: '1.0.0' };
      const mockCharContent = 'gpt-4-turbo';

      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify(mockPackage);
        }
        return mockCharContent;
      });
      fs.existsSync.mockReturnValue(true);

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Default Model: ⚠️ Non-standard')
      );
    });

    it('should handle missing character file', () => {
      const mockPackage = { version: '1.0.0' };

      fs.readFileSync.mockImplementation((path) => {
        if (path.includes('package.json')) {
          return JSON.stringify(mockPackage);
        }
        throw new Error('File not found');
      });
      fs.existsSync.mockReturnValue(false);

      require('../report-status.js');

      expect(fs.existsSync).toHaveBeenCalledWith(
        '/scripts/monitoring/pixel-agent/src/character/settings.ts'
      );
    });
  });

  describe('report formatting', () => {
    it('should log report title', () => {
      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Pixel Ecosystem Status Report')
      );
    });

    it('should log generated timestamp', () => {
      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Generated on:')
      );
    });

    it('should log section separators', () => {
      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('##')
      );
    });

    it('should log footer', () => {
      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Keep painting. Keep coding. Keep surviving')
      );
    });
  });

  describe('error handling', () => {
    it('should handle execSync errors', () => {
      execSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching PM2 status')
      );
    });

    it('should handle fs.readFileSync errors', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Read error');
      });

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalled();
    });

    it('should catch and log runtime errors', () => {
      http.get = jest.fn(() => {
        throw new Error('Unexpected error');
      });

      const mockConsoleErrorOriginal = console.error;
      console.error = jest.fn();

      require('../report-status.js');

      expect(console.error).toHaveBeenCalled();

      console.error = mockConsoleErrorOriginal;
    });
  });

  describe('data accuracy', () => {
    it('should calculate memory in GB correctly', () => {
      const totalMem = os.totalmem();
      const expectedGB = (totalMem / 1024 / 1024 / 1024).toFixed(2);

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(expectedGB + 'GB')
      );
    });

    it('should calculate used memory correctly', () => {
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const expectedGB = (usedMem / 1024 / 1024 / 1024).toFixed(2);

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(expectedGB + 'GB')
      );
    });

    it('should calculate uptime in days correctly', () => {
      const uptime = os.uptime();
      const expectedDays = (uptime / 3600 / 24).toFixed(1);

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(expectedDays + ' days')
      );
    });

    it('should display CPU core count accurately', () => {
      const coreCount = os.cpus().length;

      require('../report-status.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`${coreCount} cores`)
      );
    });
  });
});
