import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from 'react';
import { Login } from '@/components/Login';
import { Dashboard } from '@/components/Dashboard';

interface User {
  id: number;
  firstname: string;
  lastname: string;
  email: string;
  admin: boolean;
}

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verifică dacă utilizatorul este deja autentificat
  useEffect(() => {
    const storedUserData = localStorage.getItem('userData');
    const token = localStorage.getItem('authToken');

    if (storedUserData && token) {
      try {
        const userData = JSON.parse(storedUserData);
        setUser(userData);
      } catch (error) {
        console.error('Eroare la parsarea datelor utilizatorului:', error);
        // În caz de eroare, curăță localStorage
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
      }
    }

    setIsLoading(false);
  }, []);

  // Handler pentru autentificare reușită
  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  // Handler pentru deconectare
  const handleLogout = () => {
    localStorage.removeItem('userData');
    localStorage.removeItem('authToken');
    setUser(null);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <img 
              src="https://darurialese.com/wp-content/themes/woodmart-child/img/logo-menu-wt-01.svg" 
              alt="Logo Daruri Alese" 
              className="h-16 mb-4"
            />
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Se încarcă...</p>
          </div>
        ) : user ? (
          <Dashboard 
            user={{ 
              name: `${user.firstname} ${user.lastname}`, 
              email: user.email,
              id: user.id 
            }} 
            onLogout={handleLogout} 
          />
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
