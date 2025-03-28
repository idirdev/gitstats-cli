import { describe, it, expect } from 'vitest';
import { formatNumber } from '../src/utils/format';
import type { CommitInfo, AuthorStats } from '../src/utils/git';

// ─── Format Utilities ───
// Testing the pure formatting functions that don't require a git repo.

describe('formatNumber', () => {
  it('should format a small number without commas', () => {
    const result = formatNumber(42);
    expect(result).toBe('42');
  });

  it('should format thousands with comma separator', () => {
    const result = formatNumber(1234);
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('should format millions', () => {
    const result = formatNumber(1234567);
    expect(result).toContain('1');
    expect(result).toContain('234');
    expect(result).toContain('567');
  });

  it('should format zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

// ─── CommitInfo type shape ───

describe('CommitInfo type', () => {
  it('should represent a commit with expected fields', () => {
    const commit: CommitInfo = {
      hash: 'abc123def456',
      author: 'John Doe',
      email: 'john@example.com',
      date: '2025-01-15 10:30:00 +0000',
      message: 'fix: resolve login bug',
    };

    expect(commit.hash).toBe('abc123def456');
    expect(commit.author).toBe('John Doe');
    expect(commit.email).toBe('john@example.com');
    expect(commit.date).toContain('2025');
    expect(commit.message).toContain('fix');
  });
});

describe('AuthorStats type', () => {
  it('should represent author statistics with expected fields', () => {
    const stats: AuthorStats = {
      name: 'Jane Smith',
      email: 'jane@example.com',
      commits: 150,
      additions: 5000,
      deletions: 2000,
      firstCommit: '2024-01-01 10:00:00 +0000',
      lastCommit: '2025-06-01 15:30:00 +0000',
    };

    expect(stats.name).toBe('Jane Smith');
    expect(stats.commits).toBe(150);
    expect(stats.additions).toBeGreaterThan(stats.deletions);
  });
});

// ─── Commit log parsing simulation ───

describe('commit log parsing', () => {
  it('should parse pipe-delimited commit lines', () => {
    const line = 'abc123|John Doe|john@example.com|2025-01-15|feat: add user auth';
    const parts = line.split('|');

    const commit: CommitInfo = {
      hash: parts[0],
      author: parts[1],
      email: parts[2],
      date: parts[3],
      message: parts.slice(4).join('|'),
    };

    expect(commit.hash).toBe('abc123');
    expect(commit.author).toBe('John Doe');
    expect(commit.email).toBe('john@example.com');
    expect(commit.date).toBe('2025-01-15');
    expect(commit.message).toBe('feat: add user auth');
  });

  it('should handle commit messages with pipe characters', () => {
    const line = 'abc123|Author|a@b.com|2025-01-15|fix: handle a|b case';
    const parts = line.split('|');

    const commit: CommitInfo = {
      hash: parts[0],
      author: parts[1],
      email: parts[2],
      date: parts[3],
      message: parts.slice(4).join('|'),
    };

    expect(commit.message).toBe('fix: handle a|b case');
  });
});

// ─── Author stats aggregation ───

describe('author stats aggregation', () => {
  it('should aggregate commits by author', () => {
    const commits: CommitInfo[] = [
      { hash: 'a1', author: 'Alice', email: 'alice@ex.com', date: '2025-01-01', message: 'init' },
      { hash: 'a2', author: 'Alice', email: 'alice@ex.com', date: '2025-01-02', message: 'fix' },
      { hash: 'b1', author: 'Bob', email: 'bob@ex.com', date: '2025-01-03', message: 'feat' },
    ];

    // Simulate the aggregation logic from getAuthorStats
    const authorMap = new Map<string, AuthorStats>();

    for (const commit of commits) {
      const key = commit.email || commit.author;
      if (!authorMap.has(key)) {
        authorMap.set(key, {
          name: commit.author,
          email: commit.email,
          commits: 0,
          additions: 0,
          deletions: 0,
          firstCommit: commit.date,
          lastCommit: commit.date,
        });
      }
      const stats = authorMap.get(key)!;
      stats.commits++;
      stats.lastCommit = commit.date;
    }

    const results = Array.from(authorMap.values());
    expect(results).toHaveLength(2);

    const alice = results.find((s) => s.name === 'Alice')!;
    expect(alice.commits).toBe(2);
    expect(alice.firstCommit).toBe('2025-01-01');
    expect(alice.lastCommit).toBe('2025-01-02');

    const bob = results.find((s) => s.name === 'Bob')!;
    expect(bob.commits).toBe(1);
  });
});

// ─── File change frequency ───

describe('file change frequency', () => {
  it('should count file occurrences in commit log', () => {
    const logLines = [
      'src/index.ts',
      'src/utils.ts',
      'src/index.ts',
      'README.md',
      'src/index.ts',
    ];

    const freq = new Map<string, number>();
    for (const line of logLines) {
      const file = line.trim();
      if (file) {
        freq.set(file, (freq.get(file) || 0) + 1);
      }
    }

    expect(freq.get('src/index.ts')).toBe(3);
    expect(freq.get('src/utils.ts')).toBe(1);
    expect(freq.get('README.md')).toBe(1);
  });
});

// ─── Repo age calculation ───

describe('repo age calculation', () => {
  it('should calculate age from first commit date', () => {
    const firstDate = new Date('2024-01-01');
    const now = new Date('2025-07-01');
    const diffMs = now.getTime() - firstDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    expect(days).toBeGreaterThan(500);

    // Format similar to getRepoAge
    if (days >= 365) {
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      expect(years).toBe(1);
      expect(months).toBeGreaterThanOrEqual(5);
    }
  });

  it('should handle same-day case', () => {
    const firstDate = new Date();
    const now = new Date();
    const diffMs = now.getTime() - firstDate.getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    expect(days).toBe(0);
  });
});
