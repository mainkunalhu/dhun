import { BrowserWindow } from 'electron';

function broadcast(channel: string, ...args: unknown[]): void {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send(channel, ...args);
  }
}

export function notifyProjectsChanged(): void {
  broadcast('dhun:projects-changed');
}

export function notifyJobsChanged(projectId: string): void {
  broadcast('dhun:jobs-changed', projectId);
}
