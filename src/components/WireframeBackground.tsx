import React, { useEffect, useRef, useState } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
}

export const WireframeBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const nodesRef = useRef<Node[]>([]);
  const animationFrameRef = useRef<number>(0);
  
  // Initialize wireframe
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match container
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Re-create nodes when canvas is resized
      createNodes();
    };
    
    // Create nodes for wireframe - optimized for performance
    const createNodes = () => {
      const nodes: Node[] = [];
      // Adjust node count based on device performance (fewer nodes for better performance)
      const nodeCount = Math.min(100, Math.floor((canvas.width * canvas.height) / 12000)); // Responsive node count
      
      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5, // Random velocity
          vy: (Math.random() - 0.5) * 0.5,
          connections: [] // Will store indices of connected nodes
        });
      }
      
      // Create connections between nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        // Connect to 2-4 nearest nodes
        const connectionCount = Math.floor(Math.random() * 3) + 2;
        
        // Calculate distances to all other nodes
        const distances: {index: number, distance: number}[] = [];
        for (let j = 0; j < nodes.length; j++) {
          if (i !== j) {
            const otherNode = nodes[j];
            const dx = node.x - otherNode.x;
            const dy = node.y - otherNode.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            distances.push({ index: j, distance });
          }
        }
        
        // Sort by distance and take the closest ones
        distances.sort((a, b) => a.distance - b.distance);
        for (let k = 0; k < Math.min(connectionCount, distances.length); k++) {
          node.connections.push(distances[k].index);
        }
      }
      
      nodesRef.current = nodes;
    };
    
    // Handle mouse movement
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY,
      });
    };
    
    // Animation loop with performance optimizations
    let lastFrameTime = 0;
    const targetFPS = 30; // Lower FPS for better performance
    const frameInterval = 1000 / targetFPS;
    
    const animate = (timestamp: number) => {
      if (!ctx || !canvas) return;
      
      // Throttle frame rate for better performance
      const elapsed = timestamp - lastFrameTime;
      if (elapsed < frameInterval) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      lastFrameTime = timestamp - (elapsed % frameInterval);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw tech background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#0a0a1a'); // Dark blue at top
      gradient.addColorStop(0.5, '#101035'); // Mid-tone
      gradient.addColorStop(1, '#1a1a2a'); // Lighter blue at bottom
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate mouse influence
      const mouseRadius = 150; // Radius of mouse influence
      const mouseStrength = 0.05; // Strength of mouse pull
      
      // Update and draw nodes
      const nodes = nodesRef.current;
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        // Update position based on velocity
        node.x += node.vx;
        node.y += node.vy;
        
        // Bounce off edges
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
        
        // Keep within bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));
        
        // Mouse influence
        const dx = mousePosition.x - node.x;
        const dy = mousePosition.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouseRadius) {
          // Move towards mouse
          node.vx += (dx / distance) * mouseStrength;
          node.vy += (dy / distance) * mouseStrength;
          
          // Limit velocity
          const speed = Math.sqrt(node.vx * node.vx + node.vy * node.vy);
          if (speed > 2) {
            node.vx = (node.vx / speed) * 2;
            node.vy = (node.vy / speed) * 2;
          }
        }
        
        // Apply slight friction
        node.vx *= 0.99;
        node.vy *= 0.99;
        
        // Draw node with a tech-like glow effect
        // Outer glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80, 180, 255, 0.2)';
        ctx.fill();
        
        // Inner node
        ctx.beginPath();
        ctx.arc(node.x, node.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(120, 220, 255, 0.8)';
        ctx.fill();
      }
      
      // Draw connections with tech-like styling
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        
        for (let j = 0; j < node.connections.length; j++) {
          const connectedNode = nodes[node.connections[j]];
          
          // Calculate distance to determine if we should draw the connection
          const dx = node.x - connectedNode.x;
          const dy = node.y - connectedNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Only draw connections within a certain distance
          if (distance < 150) {
            // Fade out connections based on distance
            const opacity = 0.2 * (1 - distance / 150);
            
            // Draw main connection line
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(connectedNode.x, connectedNode.y);
            ctx.strokeStyle = `rgba(100, 200, 255, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            
            // Add a subtle pulse effect to some connections
            if (Math.random() < 0.3) { // Only apply to 30% of connections for performance
              const pulseOpacity = opacity * 0.7 * (0.5 + 0.5 * Math.sin(Date.now() * 0.001 + i * 0.1));
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(connectedNode.x, connectedNode.y);
              ctx.strokeStyle = `rgba(150, 230, 255, ${pulseOpacity})`;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
      }
      
      // Draw enhanced lines to mouse position with tech-like effects
      const mouseConnectRadius = 200;
      
      // Draw a subtle glow around the mouse position
      const mouseGlowRadius = 50;
      const mouseGradient = ctx.createRadialGradient(
        mousePosition.x, mousePosition.y, 0,
        mousePosition.x, mousePosition.y, mouseGlowRadius
      );
      mouseGradient.addColorStop(0, 'rgba(100, 200, 255, 0.1)');
      mouseGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(mousePosition.x, mousePosition.y, mouseGlowRadius, 0, Math.PI * 2);
      ctx.fillStyle = mouseGradient;
      ctx.fill();
      
      // Draw connection lines to mouse
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const dx = mousePosition.x - node.x;
        const dy = mousePosition.y - node.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < mouseConnectRadius) {
          const opacity = 0.3 * (1 - distance / mouseConnectRadius);
          
          // Main connection line
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(mousePosition.x, mousePosition.y);
          ctx.strokeStyle = `rgba(120, 210, 255, ${opacity})`;
          ctx.lineWidth = 0.7;
          ctx.stroke();
          
          // Add animated data-flow effect on some lines
          if (Math.random() < 0.2 && distance > 30) { // Only on 20% of lines and not too close
            const flowPosition = (Date.now() % 2000) / 2000; // 0 to 1 over 2 seconds
            const flowX = node.x + dx * flowPosition;
            const flowY = node.y + dy * flowPosition;
            
            ctx.beginPath();
            ctx.arc(flowX, flowY, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(180, 240, 255, ${opacity * 1.5})`;
            ctx.fill();
          }
        }
      }
      
      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    // Set up event listeners and start animation with timestamp
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    resizeCanvas();
    requestAnimationFrame(animate);
    
    // Clean up
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);
  
  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full z-0"
      />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};