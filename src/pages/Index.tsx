import { useState } from "react";
import { Login } from "@/components/Login";
import { Dashboard } from "@/components/Dashboard";
import { toast } from "@/hooks/use-toast";

interface User {
  name: string;
  email: string;
}

const Index = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const handleLogin = (email: string, password: string) => {
    // Simulare autentificare - în realitate ai face o cerere la server
    const userName = email.split('@')[0]; // Extrage numele din email
    setUser({
      name: userName.charAt(0).toUpperCase() + userName.slice(1), // Primul caracter mare
      email: email
    });
    setIsLoggedIn(true);
    toast({
      title: "Autentificare reușită",
      description: `Bine ai venit, ${userName}!`,
    });
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    toast({
      title: "Deconectare",
      description: "Ai fost deconectat cu succes.",
    });
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard user={user!} onLogout={handleLogout} />;
};

export default Index;
