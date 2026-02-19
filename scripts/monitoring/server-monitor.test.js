const { describe, it, expect, jest, beforeEach, afterEach } = globalThis;
const os = require('os');
const fs = require('fs');
const path = require('path');

jest.mock('fs');
jest.mock('path');

const ServerMonitor = require('../server-monitor.js');

describe('server-monitor.js', () => {
  let mockConsoleLog;
  let mockConsoleError;

  beforeEach(() => {
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    path.join = jest.fn((...args) => args.join('/'));
    __dirname = '/scripts/monitoring';
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('ServerMonitor initialization', () => {
    it('should create monitor instance with default values', () => {
      const monitor = new ServerMonitor();

      expect(monitor.interval).toBe(30000);
      expect(monitor.maxLogSize).toBe(10 * 1024 * 1024);
      expect(monitor.maxLogFiles).toBe(7);
      expect(monitor.logCount).toBe(0);
    });

    it('should set log file path correctly', () => {
      path.join = jest.fn(() => '/scripts/monitoring/server-monitor.log');
      const monitor = new ServerMonitor();

      expect(monitor.logFile).toBe('/scripts/monitoring/server-monitor.log');
    });

    it('should record start time', () => {
      const beforeTime = Date.now();
      const monitor = new ServerMonitor();
      const afterTime = Date.now();

      expect(monitor.startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(monitor.startTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getCPUUsage', () => {
    it('should return CPU usage percentage', () => {
      const monitor = new ServerMonitor();
      const cpuUsage = monitor.getCPUUsage();

      expect(cpuUsage).toHaveProperty('usage');
      expect(cpuUsage).toHaveProperty('cores');
      expect(parseFloat(cpuUsage.usage)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(cpuUsage.usage)).toBeLessThanOrEqual(100);
    });

    it('should return correct core count', () => {
      const monitor = new ServerMonitor();
      const cpuUsage = monitor.getCPUUsage();

      expect(cpuUsage.cores).toBe(os.cpus().length);
    });

    it('should return usage as string with 2 decimal places', () => {
      const monitor = new ServerMonitor();
      const cpuUsage = monitor.getCPUUsage();

      expect(cpuUsage.usage).toMatch(/^\d+\.\d{2}$/);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory statistics', () => {
      const monitor = new ServerMonitor();
      const memUsage = monitor.getMemoryUsage();

      expect(memUsage).toHaveProperty('total');
      expect(memUsage).toHaveProperty('used');
      expect(memUsage).toHaveProperty('free');
      expect(memUsage).toHaveProperty('usagePercent');
    });

    it('should calculate correct usage percentage', () => {
      const monitor = new ServerMonitor();
      const memUsage = monitor.getMemoryUsage();
      const usagePercent = parseFloat(memUsage.usagePercent);

      expect(usagePercent).toBeGreaterThan(0);
      expect(usagePercent).toBeLessThanOrEqual(100);
    });

    it('should format bytes correctly', () => {
      const monitor = new ServerMonitor();
      const memUsage = monitor.getMemoryUsage();

      expect(memUsage.total).toMatch(/^\d+(\.\d+)? (Bytes|KB|MB|GB|TB)$/);
      expect(memUsage.used).toMatch(/^\d+(\.\d+)? (Bytes|KB|MB|GB|TB)$/);
      expect(memUsage.free).toMatch(/^\d+(\.\d+)? (Bytes|KB|MB|GB|TB)$/);
    });
  });

  describe('getDiskUsage', () => {
    it('should return disk statistics', () => {
      const monitor = new ServerMonitor();
      const diskUsage = monitor.getDiskUsage();

      expect(diskUsage).toHaveProperty('total');
      expect(diskUsage).toHaveProperty('used');
      expect(diskUsage).toHaveProperty('free');
      expect(diskUsage).toHaveProperty('usagePercent');
    });

    it('should handle errors gracefully', () => {
      const originalCpus = os.cpus;
      os.cpus = jest.fn(() => {
        throw new Error('CPU error');
      });

      const monitor = new ServerMonitor();
      const diskUsage = monitor.getDiskUsage();

      expect(diskUsage.total).toBe('Unknown');
      expect(diskUsage.used).toBe('Unknown');
      expect(diskUsage.free).toBe('Unknown');
      expect(diskUsage.usagePercent).toBe('Unknown');

      os.cpus = originalCpus;
    });
  });

  describe('getNetworkStats', () => {
    it('should return network statistics', () => {
      const monitor = new ServerMonitor();
      const netStats = monitor.getNetworkStats();

      expect(netStats).toHaveProperty('rx');
      expect(netStats).toHaveProperty('tx');
    });

    it('should format network bytes', () => {
      const monitor = new ServerMonitor();
      const netStats = monitor.getNetworkStats();

      expect(netStats.rx).toMatch(/^\d+(\.\d+)? (Bytes|KB|MB|GB|TB)$/);
      expect(netStats.tx).toMatch(/^\d+(\.\d+)? (Bytes|KB|MB|GB|TB)$/);
    });
  });

  describe('getProcessInfo', () => {
    it('should return process information', () => {
      const monitor = new ServerMonitor();
      const procInfo = monitor.getProcessInfo();

      expect(procInfo).toHaveProperty('total');
      expect(procInfo).toHaveProperty('pid');
      expect(procInfo).toHaveProperty('uptime');
      expect(procInfo).toHaveProperty('platform');
      expect(procInfo).toHaveProperty('arch');
    });

    it('should return correct process ID', () => {
      const monitor = new ServerMonitor();
      const procInfo = monitor.getProcessInfo();

      expect(procInfo.pid).toBe(process.pid);
    });

    it('should return system platform', () => {
      const monitor = new ServerMonitor();
      const procInfo = monitor.getProcessInfo();

      expect(procInfo.platform).toBe(os.platform());
    });

    it('should return system architecture', () => {
      const monitor = new ServerMonitor();
      const procInfo = monitor.getProcessInfo();

      expect(procInfo.arch).toBe(os.arch());
    });
  });

  describe('getSystemInfo', () => {
    it('should return system information', () => {
      const monitor = new ServerMonitor();
      const sysInfo = monitor.getSystemInfo();

      expect(sysInfo).toHaveProperty('hostname');
      expect(sysInfo).toHaveProperty('type');
      expect(sysInfo).toHaveProperty('release');
      expect(sysInfo).toHaveProperty('uptime');
      expect(sysInfo).toHaveProperty('loadAverage');
    });

    it('should return correct hostname', () => {
      const monitor = new ServerMonitor();
      const sysInfo = monitor.getSystemInfo();

      expect(sysInfo.hostname).toBe(os.hostname());
    });

    it('should return load average', () => {
      const monitor = new ServerMonitor();
      const sysInfo = monitor.getSystemInfo();

      expect(sysInfo.loadAverage).toHaveLength(3);
      expect(Array.isArray(sysInfo.loadAverage)).toBe(true);
    });
  });

  describe('formatBytes', () => {
    it('should format zero bytes', () => {
      const monitor = new ServerMonitor();

      expect(monitor.formatBytes(0)).toBe('0 Bytes');
    });

    it('should format bytes', () => {
      const monitor = new ServerMonitor();

      expect(monitor.formatBytes(500)).toBe('500 Bytes');
      expect(monitor.formatBytes(1024)).toBe('1 KB');
    });

    it('should format kilobytes', () => {
      const monitor = new ServerMonitor();

      expect(monitor.formatBytes(1024)).toBe('1 KB');
      expect(monitor.formatBytes(1536)).toBe('1.5 KB');
    });

    it('should format megabytes', () => {
      const monitor = new ServerMonitor();

      expect(monitor.formatBytes(1024 * 1024)).toBe('1 MB');
      expect(monitor.formatBytes(1024 * 1024 * 1.5)).toBe('1.5 MB');
    });

    it('should format gigabytes', () => {
      const monitor = new ServerMonitor();

      expect(monitor.formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
      expect(monitor.formatBytes(1024 * 1024 * 1024 * 2.5)).toBe('2.5 GB');
    });

    it('should format terabytes', () => {
      const monitor = new ServerMonitor();

      expect(monitor.formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1 TB');
    });
  });

  describe('shouldLogDetailed', () => {
    it('should return true every 20 logs', () => {
      const monitor = new ServerMonitor();

      for (let i = 0; i < 25; i++) {
        const shouldLog = monitor.shouldLogDetailed();
        monitor.logCount++;

        if ((i + 1) % 20 === 0) {
          expect(shouldLog).toBe(true);
        } else {
          expect(shouldLog).toBe(false);
        }
      }
    });

    it('should increment log count', () => {
      const monitor = new ServerMonitor();

      expect(monitor.logCount).toBe(0);
      monitor.shouldLogDetailed();
      expect(monitor.logCount).toBe(0);

      monitor.logCount++;
      expect(monitor.logCount).toBe(1);
    });
  });

  describe('rotateLogIfNeeded', () => {
    it('should not rotate when log file does not exist', () => {
      fs.existsSync.mockReturnValue(false);

      const monitor = new ServerMonitor();
      monitor.rotateLogIfNeeded();

      expect(fs.statSync).not.toHaveBeenCalled();
    });

    it('should rotate when log file exceeds max size', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 11 * 1024 * 1024 });
      fs.renameSync.mockImplementation(() => {});
      fs.readdirSync.mockReturnValue([]);
      fs.unlinkSync.mockImplementation(() => {});

      const monitor = new ServerMonitor();
      monitor.rotateLogFile = jest.fn();
      monitor.rotateLogIfNeeded();

      expect(monitor.rotateLogFile).toHaveBeenCalled();
    });

    it('should not rotate when log file is under max size', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({ size: 5 * 1024 * 1024 });

      const monitor = new ServerMonitor();
      monitor.rotateLogFile = jest.fn();
      monitor.rotateLogIfNeeded();

      expect(monitor.rotateLogFile).not.toHaveBeenCalled();
    });

    it('should handle stat errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockImplementation(() => {
        throw new Error('Stat error');
      });

      const monitor = new ServerMonitor();

      expect(() => monitor.rotateLogIfNeeded()).not.toThrow();
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('rotateLogFile', () => {
    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date('2024-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should rename current log file with timestamp', () => {
      fs.existsSync.mockReturnValue(true);
      fs.renameSync.mockImplementation(() => {});
      fs.readdirSync.mockReturnValue([]);
      fs.unlinkSync.mockImplementation(() => {});

      const monitor = new ServerMonitor();
      monitor.rotateLogFile();

      expect(fs.renameSync).toHaveBeenCalledWith(
        '/scripts/monitoring/server-monitor.log',
        '/scripts/monitoring/server-monitor-2024-01-15.log'
      );
    });

    it('should call cleanupOldLogs after rotation', () => {
      fs.existsSync.mockReturnValue(true);
      fs.renameSync.mockImplementation(() => {});
      fs.readdirSync.mockReturnValue([]);
      fs.unlinkSync.mockImplementation(() => {});

      const monitor = new ServerMonitor();
      monitor.cleanupOldLogs = jest.fn();
      monitor.rotateLogFile();

      expect(monitor.cleanupOldLogs).toHaveBeenCalled();
    });

    it('should handle rename errors gracefully', () => {
      fs.existsSync.mockReturnValue(true);
      fs.renameSync.mockImplementation(() => {
        throw new Error('Rename error');
      });

      const monitor = new ServerMonitor();
      monitor.cleanupOldLogs = jest.fn();
      monitor.rotateLogFile();

      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete logs exceeding maxLogFiles', () => {
      const mockFiles = [
        'server-monitor-2024-01-08.log',
        'server-monitor-2024-01-09.log',
        'server-monitor-2024-01-10.log',
        'server-monitor-2024-01-11.log',
        'server-monitor-2024-01-12.log',
        'server-monitor-2024-01-13.log',
        'server-monitor-2024-01-14.log',
        'server-monitor-2024-01-15.log',
        'server-monitor-2024-01-16.log'
      ];

      fs.readdirSync.mockReturnValue(mockFiles);
      fs.unlinkSync.mockImplementation(() => {});

      const monitor = new ServerMonitor();
      monitor.cleanupOldLogs();

      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    });

    it('should only rotate server-monitor log files', () => {
      const mockFiles = [
        'server-monitor-2024-01-15.log',
        'other-file.log',
        'server-monitor-backup.log'
      ];

      fs.readdirSync.mockReturnValue(mockFiles);

      const monitor = new ServerMonitor();
      monitor.cleanupOldLogs();

      expect(fs.readdirSync).toHaveBeenCalled();
    });

    it('should handle readdir errors gracefully', () => {
      fs.readdirSync.mockImplementation(() => {
        throw new Error('Readdir error');
      });

      const monitor = new ServerMonitor();

      expect(() => monitor.cleanupOldLogs()).not.toThrow();
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('getCurrentStats', () => {
    it('should return complete stats object', () => {
      const monitor = new ServerMonitor();
      const stats = monitor.getCurrentStats();

      expect(stats).toHaveProperty('timestamp');
      expect(stats).toHaveProperty('system');
      expect(stats).toHaveProperty('cpu');
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('disk');
      expect(stats).toHaveProperty('network');
      expect(stats).toHaveProperty('processes');
    });

    it('should include timestamp', () => {
      const beforeTime = Date.now();
      const monitor = new ServerMonitor();
      const stats = monitor.getCurrentStats();
      const afterTime = Date.now();

      expect(stats.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('logData', () => {
    it('should log summary to console', () => {
      const monitor = new ServerMonitor();
      const data = monitor.getCurrentStats();
      monitor.logData(data);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Server Monitor')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('CPU:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Memory:')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Disk:')
      );
    });

    it('should increment log count', () => {
      const monitor = new ServerMonitor();
      const data = monitor.getCurrentStats();
      const initialCount = monitor.logCount;

      monitor.logData(data);

      expect(monitor.logCount).toBe(initialCount + 1);
    });

    it('should log detailed data when shouldLogDetailed returns true', () => {
      fs.existsSync.mockReturnValue(false);
      fs.appendFileSync.mockImplementation(() => {});

      const monitor = new ServerMonitor();
      monitor.logCount = 20;
      const data = monitor.getCurrentStats();
      monitor.logData(data);

      expect(fs.appendFileSync).toHaveBeenCalled();
    });
  });

  describe('command line interface', () => {
    let originalArgv;

    beforeEach(() => {
      originalArgv = process.argv;
      process.exit = jest.fn();
    });

    afterEach(() => {
      process.argv = originalArgv;
    });

    it('should display help with --help flag', () => {
      process.argv = ['node', 'server-monitor.js', '--help'];

      require('../server-monitor.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Server Monitor')
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage:')
      );
    });

    it('should display help with -h flag', () => {
      process.argv = ['node', 'server-monitor.js', '-h'];

      require('../server-monitor.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Server Monitor')
      );
    });

    it('should show current stats with --once flag', () => {
      process.argv = ['node', 'server-monitor.js', '--once'];

      require('../server-monitor.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Current Server Statistics')
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should show log status with --logs flag', () => {
      fs.readdirSync.mockReturnValue([]);
      process.argv = ['node', 'server-monitor.js', '--logs'];

      require('../server-monitor.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Log File Status')
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should rotate logs with --rotate-logs flag', () => {
      fs.existsSync.mockReturnValue(true);
      fs.renameSync.mockImplementation(() => {});
      fs.readdirSync.mockReturnValue([]);
      fs.unlinkSync.mockImplementation(() => {});

      process.argv = ['node', 'server-monitor.js', '--rotate-logs'];

      require('../server-monitor.js');

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Rotating log files')
      );
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });
});
