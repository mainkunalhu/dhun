/**
 * Fill the project library with realistic folders, for testing the list and
 * scroll. Writes to the same folder the app reads.
 *
 *   bun run seed         # 23 projects
 *   bun run seed 50      # more
 *
 * Existing names are skipped, so it is safe to run twice.
 */
import { homedir } from 'node:os';
import path from 'node:path';
import { createProjectStore } from '../src/main/projects/store';

function defaultRoot(): string {
  const home = homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'Library/Application Support/Dhun/projects');
    case 'win32':
      return path.join(process.env.APPDATA ?? home, 'Dhun/projects');
    default:
      return path.join(home, '.config/Dhun/projects');
  }
}

const names = [
  'Week 32 reel',
  'Diwali drop',
  'Podcast intro (season 2)',
  'Client scripts',
  'Product launch teaser',
  'Founder story',
  'Hindi explainer',
  'August reels',
  'Voice test: Ananya',
  'Voice test: Kabir',
  'Sunday newsletter',
  'Course trailer',
  'App walkthrough',
  'Testimonial cuts',
  'Festival greetings',
  'YouTube shorts batch',
  'Ad reads, week 12',
  'Onboarding narration',
  'Documentary scratch',
  'Radio spot, 30s',
  'Explainer, 60s',
  'Hindi promo',
  'B-roll narration',
];

const count = Math.max(1, Number(process.argv[2] ?? 23));
const root = process.argv[3] ?? defaultRoot();
const store = createProjectStore(root);

const existing = new Set((await store.list()).map((project) => project.name));
let created = 0;

for (let index = 0; index < count; index += 1) {
  const name =
    index < names.length
      ? names[index]
      : `Reel batch ${String(index + 1).padStart(2, '0')}`;

  if (existing.has(name)) continue;

  await store.create(name);
  created += 1;
}

const total = (await store.list()).length;
console.log(`created ${created}, ${total} projects in ${root}`);
