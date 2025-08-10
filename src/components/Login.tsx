import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface LoginProps {
  onLogin: (userData: any) => void;
}

export const Login = ({ onLogin }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL pentru API-ul de autentificare
  const LOGIN_API_URL = 'https://crm.actium.ro/api/login-angajati';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(LOGIN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Eroare la autentificare');
      }

      // Salvează token-ul în localStorage pentru a-l folosi în viitoarele cereri
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.staff));

      // Notifică componenta părinte despre login-ul reușit
      onLogin(data.staff);

    } catch (err: any) {
      console.error('Eroare login:', err);
      setError(err.message || 'A apărut o eroare la autentificare');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 backgroundculiniute">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <img 
              src="https://darurialese.com/wp-content/themes/woodmart-child/img/logo-menu-wt-01.svg" 
              alt="Logo" 
              className="h-16"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Dashboard Producție</CardTitle>
          <CardDescription className="text-center">
            Introduceți datele de autentificare pentru a accesa dashboard-ul
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nume@exemplu.ro" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Parolă</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? 'Se autentifică...' : 'Autentificare'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Dashboard Gravare v1.0
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};