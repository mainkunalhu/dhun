import { RouterProvider } from 'react-router';
import { ModelsProvider } from './lib/models-context';
import { ThemeProvider } from './lib/theme';
import { router } from './router';

export default function App() {
  return (
    <ThemeProvider>
      <ModelsProvider>
        <RouterProvider router={router} />
      </ModelsProvider>
    </ThemeProvider>
  );
}
