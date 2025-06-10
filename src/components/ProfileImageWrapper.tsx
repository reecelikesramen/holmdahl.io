import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ProfileImageWrapperProps {
  width?: number;
  height?: number;
  className?: string;
  children: React.ReactNode;
}

export function ProfileImageWrapper({ 
  width = 200, 
  height = 200, 
  className = '',
  children
}: ProfileImageWrapperProps) {
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

  // Simplified gradients for better Safari compatibility
  const borderGradient = `conic-gradient(from var(--rotation, 0deg), 
    var(--profile-gradient-1) 0deg, 
    var(--profile-gradient-2) 60deg, 
    var(--profile-gradient-3) 120deg, 
    var(--profile-gradient-4) 180deg, 
    var(--profile-gradient-5) 240deg, 
    var(--profile-gradient-6) 300deg, 
    var(--profile-gradient-1) 360deg
  )`;

  const glowGradient = `conic-gradient(from calc(var(--rotation, 0deg) + 30deg), 
    var(--profile-glow-1) 0deg, 
    var(--profile-glow-2) 60deg, 
    var(--profile-glow-3) 120deg, 
    var(--profile-glow-4) 180deg, 
    var(--profile-glow-5) 240deg, 
    var(--profile-glow-6) 300deg, 
    var(--profile-glow-1) 360deg
  )`;

  // Calculate proper dimensions to allow glow overflow
  const glowPadding = 40; // Extra space for glow to extend
  const containerSize = Math.max(width, height) + glowPadding * 2;
  const profileOffset = glowPadding;

  return (
    <div 
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{ 
        width: containerSize, 
        height: containerSize,
        touchAction: 'none',
        // Remove overflow constraints to prevent clipping
        overflow: 'visible',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Extended outer glow layer - no clipping */}
      <div 
        className={`absolute transition-all ease-out ${
          isHovered ? 'opacity-50 dark:opacity-20 duration-500' : 'opacity-0 duration-200'
        }`}
        style={{
          background: glowGradient,
          filter: 'blur(24px)',
          borderRadius: '50%',
          transform: isHovered ? 'scale(1.15)' : 'scale(1)',
          left: profileOffset - 20,
          top: profileOffset - 20,
          right: profileOffset - 20,
          bottom: profileOffset - 20,
          willChange: 'transform, opacity',
        }}
      />

      {/* Medium glow layer */}
      <div 
        className={`absolute transition-all ease-out ${
          isHovered ? 'opacity-70 dark:opacity-30 duration-400 delay-50' : 'opacity-0 duration-200'
        }`}
        style={{
          background: glowGradient,
          filter: 'blur(12px)',
          borderRadius: '50%',
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
          left: profileOffset - 8,
          top: profileOffset - 8,
          right: profileOffset - 8,
          bottom: profileOffset - 8,
          willChange: 'transform, opacity',
        }}
      />

      {/* Gradient border layer */}
      <div 
        className={`absolute transition-all ease-out ${
          isHovered ? 'opacity-100 duration-300 delay-100' : 'opacity-0 duration-200'
        }`}
        style={{
          background: borderGradient,
          borderRadius: '50%',
          padding: '6px',
          left: profileOffset - 6,
          top: profileOffset - 6,
          right: profileOffset - 6,
          bottom: profileOffset - 6,
          willChange: 'opacity',
        }}
      >
        <div 
          className="w-full h-full" 
          style={{ 
            backgroundColor: 'var(--theme-color, #ffffff)',
            borderRadius: '50%',
          }} 
        />
      </div>

      {/* Profile image container */}
      <div 
        className={`absolute transition-all duration-300 ease-out`}
        style={{
          left: profileOffset,
          top: profileOffset,
          width: width,
          height: height,
          borderRadius: '50%',
          overflow: 'hidden',
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          willChange: 'transform',
        }}
      >
        <div 
          className="w-full h-full"
          style={{
            width: width,
            height: height,
            borderRadius: '50%',
          }}
        >
          {children}
        </div>
        
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
            borderRadius: '50%',
          }}
        />
      </div>

      {/* Simple themed border when not hovered */}
      <div 
        className={`absolute border-2 border-border-color/40 transition-opacity ease-out ${
          isHovered ? 'opacity-0 duration-75' : 'opacity-100 duration-300 delay-0'
        }`}
        style={{
          left: profileOffset - 2,
          top: profileOffset - 2,
          right: profileOffset - 2,
          bottom: profileOffset - 2,
          borderRadius: '50%',
        }}
      />
    </div>
  );
} 