import React from "react";

export const Footer = () => {
  return (
    <footer className="p-4 border-t border-border mt-auto hidden md:block bg-secondary text-foreground dark:bg-black dark:text-white">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <p className="text-sm">&copy; {new Date().getFullYear()} Daruri Alese. Toate drepturile rezervate.</p>
        </div>
        <div className="flex space-x-4">
          <a href="#" className="text-sm hover:text-primary transition-colors">Termeni și condiții</a>
          <a href="#" className="text-sm hover:text-primary transition-colors">Politica de confidențialitate</a>
          <a href="#" className="text-sm hover:text-primary transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
};
