import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global error boundary
window.addEventListener('error', (e) => {
  console.error('Script error:', e.message, e.filename);
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('Unhandled rejection:', e.reason);
});

console.log('Starting VulnScout...');
console.log('Root element:', document.getElementById('root'));

try {
  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root element not found');
  }
  
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  console.log('React mounted successfully');
} catch (err) {
  console.error('Failed to mount React:', err);
  document.body.innerHTML = `
    <div style="color: red; padding: 20px;">
      <h1>Error loading VulnScout</h1>
      <pre>${err}</pre>
    </div>
  `;
}
