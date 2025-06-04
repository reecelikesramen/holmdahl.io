import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ProfileImageProps {
  src: string;
  alt: string;
  title?: string;
  width?: number;
  height?: number;
  className?: string;
}

export function ProfileImage({ 
  src, 
  alt, 
  title, 
  width = 200, 
  height = 200, 
  className = '' 
}: ProfileImageProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mouseSpeedMultiplier, setMouseSpeedMultiplier] = useState(1); // Separate from base rotation
  const [isMobileSpeedBoost, setIsMobileSpeedBoost] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const baseRotationRef = useRef(0);
  const lastMousePositionRef = useRef({ x: 0, y: 0 });
  const mouseVelocityRef = useRef(0);
  const speedBoostTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Continuous base rotation animation with variable speed
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      // Base speed: 0.9 degrees per frame = 1 full rotation per ~6.7 seconds (50% faster)
      const baseSpeed = 0.9;
      
      // Always have base rotation, increase when hovered, add mouse multiplier on top
      const hoverMultiplier = isHovered ? 1.8 : 1;
      const currentSpeed = isMobileSpeedBoost 
        ? baseSpeed * 3 
        : baseSpeed * hoverMultiplier * mouseSpeedMultiplier;
      
      baseRotationRef.current = (baseRotationRef.current + currentSpeed) % 360;
      
      // Force re-render by updating a dummy state - this ensures the gradients update
      if (containerRef.current) {
        containerRef.current.style.setProperty('--rotation', `${baseRotationRef.current}deg`);
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate(); // Start immediately
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [mouseSpeedMultiplier, isMobileSpeedBoost, isHovered]);

  // Check if mouse is within circular area
  const isMouseInCircle = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return false;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = width / 2;
    
    const distance = Math.sqrt(
      Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2)
    );
    
    return distance <= radius;
  }, [width]);

  // Mouse velocity tracking for speed control - much more gradual
  const updateMouseVelocity = useCallback((clientX: number, clientY: number) => {
    const currentPos = { x: clientX, y: clientY };
    const lastPos = lastMousePositionRef.current;
    
    // Initialize lastPos if it's the first movement
    if (lastPos.x === 0 && lastPos.y === 0) {
      lastMousePositionRef.current = currentPos;
      return;
    }
    
    // Calculate velocity based on distance moved
    const distance = Math.sqrt(
      Math.pow(currentPos.x - lastPos.x, 2) + Math.pow(currentPos.y - lastPos.y, 2)
    );
    
    // Remove threshold - even tiny movements should have an effect
    // Much more gradual speed increase: 0.005 instead of 0.02
    const boostAmount = Math.min(distance * 0.005, 0.3); // Much smaller cap
    setMouseSpeedMultiplier(prev => Math.min(prev + boostAmount, 1.6)); // Slower max speed
    
    lastMousePositionRef.current = currentPos;
  }, []);

  // More gradual decay
  useEffect(() => {
    if (!isHovered) {
      setMouseSpeedMultiplier(1); // Reset immediately when not hovered
      return;
    }
    
    const interval = setInterval(() => {
      setMouseSpeedMultiplier(prev => {
        // Faster decay rate for more responsive feel
        const decayRate = 0.85; // Faster decay
        const newSpeed = prev * decayRate;
        return newSpeed < 1.02 ? 1 : newSpeed; // Snap to 1 when very close
      });
    }, 32); // 30fps for decay, less aggressive
    
    return () => clearInterval(interval);
  }, [isHovered]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Check if mouse is in circular area
    const inCircle = isMouseInCircle(e.clientX, e.clientY);
    
    if (inCircle !== isHovered) {
      setIsHovered(inCircle);
      if (inCircle) {
        setMouseSpeedMultiplier(1); // Reset speed multiplier on enter
      }
    }
    
    if (inCircle) {
      updateMouseVelocity(e.clientX, e.clientY);
    }
  }, [isHovered, updateMouseVelocity, isMouseInCircle]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const inCircle = isMouseInCircle(touch.clientX, touch.clientY);
      
      if (inCircle !== isHovered) {
        setIsHovered(inCircle);
        if (inCircle) {
          setMouseSpeedMultiplier(1);
        }
      }
      
      if (inCircle) {
        updateMouseVelocity(touch.clientX, touch.clientY);
      }
    }
  }, [isHovered, updateMouseVelocity, isMouseInCircle]);

  // Mobile tap speed boost
  const handleMobileTap = useCallback(() => {
    // Only on mobile devices
    if (window.innerWidth <= 768) {
      setIsMobileSpeedBoost(true);
      
      // Clear any existing timeout
      if (speedBoostTimeoutRef.current) {
        clearTimeout(speedBoostTimeoutRef.current);
      }
      
      // Reset after 2 seconds with ease-in-out effect
      speedBoostTimeoutRef.current = setTimeout(() => {
        setIsMobileSpeedBoost(false);
      }, 2000);
    }
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only set hover false if actually leaving the container
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (clientX < rect.left || clientX > rect.right || 
          clientY < rect.top || clientY > rect.bottom) {
        setIsHovered(false);
        setMouseSpeedMultiplier(1);
      }
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const inCircle = isMouseInCircle(touch.clientX, touch.clientY);
      if (inCircle) {
        setIsHovered(true);
        handleMobileTap(); // Trigger speed boost on mobile
      }
    }
  }, [handleMobileTap, isMouseInCircle]);

  const handleTouchEnd = useCallback(() => {
    setIsHovered(false);
    setMouseSpeedMultiplier(1); // Reset speed
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (speedBoostTimeoutRef.current) {
        clearTimeout(speedBoostTimeoutRef.current);
      }
    };
  }, []);

  // Use base rotation directly (no mouse angle offset)
  const finalRotation = baseRotationRef.current;

  // Theme-aware gradient colors - muted for light mode, vibrant for dark mode
  const borderGradient = `conic-gradient(from var(--rotation, 0deg), 
    var(--profile-gradient-1, #93c5fd) 0deg, 
    var(--profile-gradient-2, #c4b5fd) 36deg, 
    var(--profile-gradient-3, #67e8f9) 72deg, 
    var(--profile-gradient-4, #6ee7b7) 108deg, 
    var(--profile-gradient-5, #fcd34d) 144deg, 
    var(--profile-gradient-6, #fca5a5) 180deg, 
    var(--profile-gradient-7, #f9a8d4) 216deg, 
    var(--profile-gradient-2, #c4b5fd) 252deg, 
    var(--profile-gradient-3, #67e8f9) 288deg,
    var(--profile-gradient-1, #93c5fd) 324deg,
    var(--profile-gradient-1, #93c5fd) 360deg
  )`;

  // Softer glow gradient with transparency
  const glowGradient = `conic-gradient(from calc(var(--rotation, 0deg) + 30deg), 
    var(--profile-glow-1, rgba(147, 197, 253, 0.3)) 0deg, 
    var(--profile-glow-2, rgba(196, 181, 253, 0.3)) 36deg, 
    var(--profile-glow-3, rgba(103, 232, 249, 0.3)) 72deg, 
    var(--profile-glow-4, rgba(110, 231, 183, 0.3)) 108deg, 
    var(--profile-glow-5, rgba(252, 211, 77, 0.3)) 144deg, 
    var(--profile-glow-6, rgba(252, 165, 165, 0.3)) 180deg, 
    var(--profile-glow-7, rgba(249, 168, 212, 0.3)) 216deg, 
    var(--profile-glow-2, rgba(196, 181, 253, 0.3)) 252deg, 
    var(--profile-glow-3, rgba(103, 232, 249, 0.3)) 288deg,
    var(--profile-glow-1, rgba(147, 197, 253, 0.3)) 324deg,
    var(--profile-glow-1, rgba(147, 197, 253, 0.3)) 360deg
  )`;

  return (
    <div 
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{ 
        width: width + 24, 
        height: height + 24,
        touchAction: 'none',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Outer glow layer - much smaller and more subtle */}
      <div 
        className={`absolute inset-1 rounded-full transition-all ease-out ${
          isHovered ? 'opacity-70 dark:opacity-30 scale-108 duration-500' : 'opacity-0 scale-100 duration-200'
        }`}
        style={{
          background: glowGradient,
          filter: 'blur(16px)',
        }}
      />

      {/* Concentrated color ring - 75% of previous size */}
      <div 
        className={`absolute inset-2 rounded-full transition-all ease-out ${
          isHovered ? 'opacity-100 dark:opacity-80 scale-102 duration-400 delay-50' : 'opacity-0 scale-100 duration-200'
        }`}
        style={{
          background: glowGradient,
          filter: 'blur(3px)',
        }}
      />

      {/* Gradient border layer - only visible when hovered */}
      <div 
        className={`absolute inset-2.75 rounded-full transition-all ease-out ${
          isHovered ? 'opacity-100 duration-300 delay-100' : 'opacity-0 duration-200'
        }`}
        style={{
          background: borderGradient,
          padding: '6px',
        }}
      >
        <div 
          className="w-full h-full rounded-full" 
          style={{ 
            backgroundColor: 'var(--theme-color, #ffffff)',
          }} 
        />
      </div>

      {/* Profile image container - always visible, unaffected by borders */}
      <div className={`absolute inset-4 rounded-full overflow-hidden transition-all duration-300 ease-out ${
        isHovered ? 'scale-102' : 'scale-100'
      }`}>
        <img 
          draggable="false"
          src={src}
          alt={alt}
          title={title}
          width={width}
          height={height}
          className="w-full h-full object-cover"
        />
        
        {/* Holographic shine overlay */}
        <div 
          className={`absolute inset-0 pointer-events-none transition-opacity ease-out ${
            isHovered ? 'opacity-15 duration-300 delay-100' : 'opacity-0 duration-200'
          }`}
          style={{
            background: `linear-gradient(135deg, 
              transparent 30%, 
              rgba(255, 255, 255, 0.6) 50%, 
              transparent 70%)`,
            mixBlendMode: 'overlay',
          }}
        />
      </div>

      {/* Simple themed border when not hovered */}
      <div 
        className={`absolute inset-3.5 rounded-full border transition-opacity ease-out ${
          isHovered ? 'opacity-0 duration-75' : 'opacity-100 duration-300 delay-0'
        }`}
        style={{
          borderColor: 'var(--border-color, rgba(0, 0, 0, 0.2))',
          borderWidth: '2px',
        }}
      />
    </div>
  );
} 