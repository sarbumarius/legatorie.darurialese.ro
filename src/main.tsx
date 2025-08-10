import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Adăugare favicon
const link = document.createElement('link');
link.rel = 'icon';
link.href = 'https://darurialese.com/wp-content/uploads/2020/03/cropped-favicon-01-32x32.png';
document.head.appendChild(link);

// Setare titlu document
document.title = 'Dashboard Gravare - Daruri Alese';

createRoot(document.getElementById("root")!).render(<App />);
