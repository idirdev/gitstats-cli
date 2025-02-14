import { execSync } from 'child_process';

export interface CommitInfo {
  hash: string;
  author: string;
  email: string;
  date: string;
  message: string;
}

export interface FileChange {
  file: string;
  additions: number;
  deletions: number;
}

export interface AuthorStats {
  name: string;
  email: string;
  commits: number;
  additions: number;
  deletions: number;
  firstCommit: string;
  lastCommit: string;
}

/**
 * Execute a git command and return the trimmed stdout.
 * Throws if git is not available or not in a repo.
 */
export function gitExec(command: string): string {
  try {
    return execSync(`git ${command}`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large repos
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error: any) {
    if (error.stderr?.includes('not a git repository')) {
      throw new Error('Current directory is not a git repository. Use -d to specify a repo path.');
    }
    throw new Error(`Git command failed: git ${command}\n${error.stderr || error.message}`);
  }
}

/** Check if we are inside a valid git repository */
export function isGitRepo(): boolean {
  try {
    gitExec('rev-parse --is-inside-work-tree');
    return true;
  } catch {
    return false;
  }
}

/** Get the repository name from the remote or folder name */
export function getRepoName(): string {
  try {
    const remote = gitExec('remote get-url origin');
    const match = remote.match(/\/([^/]+?)(?:\.git)?$/);
    if (match) return match[1];
  } catch {
    // no remote configured
  }
  const topLevel = gitExec('rev-parse --show-toplevel');
  return topLevel.split('/').pop() || 'unknown';
}

/** Get total number of commits, optionally filtered by --since */
export function getCommitCount(since?: string): number {
  const sinceArg = since ? ` --since="${since}"` : '';
  const output = gitExec(`rev-list --count HEAD${sinceArg}`);
  return parseInt(output, 10) || 0;
}

/** Get list of all local branches */
export function getBranches(): string[] {
  const output = gitExec('branch --format="%(refname:short)"');
  return output.split('\n').filter(Boolean);
}

/** Get list of all tags */
export function getTags(): string[] {
  try {
    const output = gitExec('tag -l');
    return output.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/** Get the date of the very first commit */
export function getFirstCommitDate(): string {
  return gitExec('log --reverse --format="%ai" | head -1').split('\n')[0] || 'unknown';
}

/** Get the date of the most recent commit */
export function getLastCommitDate(): string {
  return gitExec('log -1 --format="%ai"');
}

/** Get the current branch name */
export function getCurrentBranch(): string {
  return gitExec('branch --show-current') || 'HEAD (detached)';
}

/** Parse the full commit log into structured data */
export function getCommitLog(since?: string, until?: string): CommitInfo[] {
  const args: string[] = ['log', '--format="%H|%an|%ae|%ai|%s"'];
  if (since) args.push(`--since="${since}"`);
  if (until) args.push(`--until="${until}"`);

  const output = gitExec(args.join(' '));
  if (!output) return [];

  return output.split('\n').filter(Boolean).map((line) => {
    const clean = line.replace(/^"|"$/g, '');
    const [hash, author, email, date, ...messageParts] = clean.split('|');
    return {
      hash: hash || '',
      author: author || 'Unknown',
      email: email || '',
      date: date || '',
      message: messageParts.join('|') || '',
    };
  });
}

/** Get per-author stats with additions/deletions */
export function getAuthorStats(since?: string): AuthorStats[] {
  const commits = getCommitLog(since);
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

  // Get additions/deletions per author via shortlog
  try {
    const sinceArg = since ? ` --since="${since}"` : '';
    const shortlog = gitExec(`log --format="%ae" --shortstat${sinceArg}`);
    const lines = shortlog.split('\n');
    let currentEmail = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.includes('@') && !trimmed.includes('file')) {
        currentEmail = trimmed;
      } else if (trimmed.includes('file')) {
        const addMatch = trimmed.match(/(\d+) insertion/);
        const delMatch = trimmed.match(/(\d+) deletion/);
        if (currentEmail && authorMap.has(currentEmail)) {
          const stats = authorMap.get(currentEmail)!;
          stats.additions += addMatch ? parseInt(addMatch[1], 10) : 0;
          stats.deletions += delMatch ? parseInt(delMatch[1], 10) : 0;
        }
      }
    }
  } catch {
    // shortstat parsing is best-effort
  }

  return Array.from(authorMap.values());
}

/** Get file change frequency: how many commits touched each file */
export function getFileChangeFrequency(since?: string): Map<string, number> {
  const sinceArg = since ? ` --since="${since}"` : '';
  const output = gitExec(`log --name-only --format=""${sinceArg}`);
  const freq = new Map<string, number>();

  for (const line of output.split('\n')) {
    const file = line.trim();
    if (file) {
      freq.set(file, (freq.get(file) || 0) + 1);
    }
  }
  return freq;
}

/** Get the list of currently tracked files */
export function getTrackedFiles(): string[] {
  const output = gitExec('ls-files');
  return output.split('\n').filter(Boolean);
}

/** Calculate the repo age in human-readable form */
export function getRepoAge(): string {
  const firstDate = new Date(getFirstCommitDate());
  const now = new Date();
  const diffMs = now.getTime() - firstDate.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days < 1) return 'less than a day';
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''}`;
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  }
  const years = Math.floor(days / 365);
  const remainingMonths = Math.floor((days % 365) / 30);
  if (remainingMonths === 0) return `${years} year${years !== 1 ? 's' : ''}`;
  return `${years} year${years !== 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}`;
}
