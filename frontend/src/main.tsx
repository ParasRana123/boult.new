import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import App from './App.tsx';
import { CLERK_PUBLISHABLE_KEY } from './config.ts';
import './index.css';

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn("Missing Clerk Publishable Key in environment variables.");
}

createRoot(document.getElementById('root')!).render(
  <ClerkProvider
    publishableKey={CLERK_PUBLISHABLE_KEY}
    appearance={{
      variables: {
        colorPrimary: '#9333ea',
        colorBackground: '#0f172a',
        colorText: '#f1f5f9',
        colorTextSecondary: '#94a3b8',
        colorInputBackground: '#1e293b',
        colorInputText: '#ffffff',
      },
    }}
  >
    <App />
  </ClerkProvider>
);
