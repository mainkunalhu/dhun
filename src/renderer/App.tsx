import { RouterProvider } from 'react-router';
import { ModelsProvider } from './lib/models-context';
import { PlayerProvider } from './lib/player';
import { ThemeProvider } from './lib/theme';
import { router } from './router';

export default function App() {
  return (
    <ThemeProvider>
      <ModelsProvider>
        <PlayerProvider>
          <RouterProvider router={router} />
        </PlayerProvider>
      </ModelsProvider>
    </ThemeProvider>
  );
}
