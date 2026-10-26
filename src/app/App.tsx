import { RouterProvider } from 'react-router';
import { router } from './routes';

/**
 * App entry — react-router owns navigation; shells own chrome.
 * Styles load via src/styles/index.css from main.tsx.
 */
export default function App() {
  return <RouterProvider router={router} />;
}
