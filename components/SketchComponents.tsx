import React from 'react';

// Common Crayon Filter ID - Apply only to SVGs
const CRAYON_FILTER = "url(#crayon-filter)";

// --- EMOTION TYPES ---
export type AvatarMood = 'neutral' | 'angry' | 'happy' | 'sweat' | 'shouting';
export type AvatarVariant = 'human' | 'cat' | 'bear' | 'rabbit' | 'dog' | 'pig';

export const SketchBox: React.FC<{ children: React.ReactNode; className?: string; color?: 'white' | 'yellow' | 'blue' | 'pink' }> = ({ children, className = '', color = 'white' }) => {
  const styles = {
    white:  'bg-[#fffdf5] border-[#d1d5db]',
    yellow: 'bg-[#fffde7] border-[#fcd34d]',
    blue:   'bg-[#f0f9ff] border-[#7dd3fc]',
    pink:   'bg-[#fff1f2] border-[#fda4af]'
  };

  return (
    <div className={`relative ${styles[color]} border-4 border-crayon shadow-[6px_6px_0px_0px_rgba(0,0,0,0.05)] p-6 ${className}`}>
      {children}
    </div>
  );
};

export const SketchButton: React.FC<{ 
  onClick?: () => void; 
  children: React.ReactNode; 
  disabled?: boolean; 
  className?: string;
  variant?: 'primary' | 'secondary' | 'danger'
}> = ({ onClick, children, disabled, className = '', variant = 'primary' }) => {
  const baseStyle = "transition-transform active:scale-95 border-4 border-crayon-sm px-6 py-3 font-bold text-lg cursor-pointer select-none disabled:opacity-50 disabled:cursor-not-allowed font-handwriting rounded-2xl flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#fdba74] text-white border-[#fb923c] shadow-[4px_4px_0px_0px_#fb923c] hover:bg-[#fb923c]",
    secondary: "bg-[#a5f3fc] text-[#0e7490] border-[#22d3ee] shadow-[4px_4px_0px_0px_#22d3ee] hover:bg-[#67e8f9]",
    danger: "bg-[#fda4af] text-[#881337] border-[#f43f5e] shadow-[4px_4px_0px_0px_#f43f5e] hover:bg-[#fb7185]"
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export const SketchInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  return (
    <input 
      {...props}
      className={`w-full bg-white/60 border-2 border-dashed border-gray-400 focus:border-[#fb923c] focus:bg-white rounded-xl outline-none py-3 px-4 font-handwriting text-xl placeholder-gray-400 transition-all ${props.className || ''}`}
    />
  );
};

// "Cute Stick Figure Avatar" with Variants
export const StickFigureAvatar: React.FC<{ 
  id: 1 | 2; 
  name: string; 
  size?: 'sm' | 'lg'; 
  className?: string;
  showName?: boolean;
  animate?: boolean;
  mood?: AvatarMood;
  variant?: AvatarVariant; 
  customColor?: string; // Optional override
}> = ({ id, name, size = 'lg', className = '', showName = true, animate = false, mood = 'neutral', variant = 'human', customColor }) => {
  const isP1 = id === 1;
  const sizeClass = size === 'lg' ? "w-44 h-44" : "w-16 h-16";
  
  // Default Colors: P1 Blue-ish, P2 Orange-ish
  const defaultColor = isP1 ? "#6366f1" : "#f97316"; 
  const strokeColor = customColor || defaultColor;

  // Body Fill - lighter version of stroke or default pastel
  const bodyFillMap: Record<string, string> = {
     'human': '#fff',
     'cat': '#fef3c7', // Yellowish
     'bear': '#d6d3d1', // Grayish
     'rabbit': '#fce7f3', // Pinkish
     'dog': '#e5e7eb', // Gray
     'pig': '#ffe4e6', // Pink
  };
  // Use custom body fill if main players, else variant based
  const bodyFill = (id === 1 || id === 2) 
      ? (isP1 ? "#e0e7ff" : "#ffedd5") 
      : (bodyFillMap[variant] || '#fff');

  const blushColor = "#fda4af";

  const getEars = () => {
    const props = { fill: bodyFill, stroke: strokeColor, strokeWidth: "3", strokeLinejoin: "round" as "round" };
    switch (variant) {
      case 'cat':
        return (
          <g {...props}>
            <path d="M30,25 L25,10 L45,20 Z" />
            <path d="M70,25 L75,10 L55,20 Z" />
          </g>
        );
      case 'bear':
        return (
          <g {...props}>
            <circle cx="25" cy="20" r="10" />
            <circle cx="75" cy="20" r="10" />
          </g>
        );
      case 'rabbit':
        return (
          <g {...props}>
             <ellipse cx="35" cy="15" rx="6" ry="18" transform="rotate(-10 35 15)" />
             <ellipse cx="65" cy="15" rx="6" ry="18" transform="rotate(10 65 15)" />
          </g>
        );
      case 'dog':
        return (
           <g {...props}>
              <path d="M25,25 Q15,35 20,45 L28,30 Z" />
              <path d="M75,25 Q85,35 80,45 L72,30 Z" />
           </g>
        );
      case 'pig':
         return (
           <g {...props}>
              <path d="M30,20 L25,15 L35,25 Z" />
              <path d="M70,20 L75,15 L65,25 Z" />
           </g>
         );
      default: return null;
    }
  };
  
  // Expressions
  const getEyes = () => {
    if (mood === 'angry' || mood === 'shouting') {
      return (
        <g stroke={strokeColor} strokeWidth="4" strokeLinecap="round">
           <path d="M35,35 L45,45" />
           <path d="M45,35 L35,45" />
           <path d="M55,35 L65,45" />
           <path d="M65,35 L55,45" />
        </g>
      );
    }
    if (mood === 'happy') {
       return (
        <g stroke={strokeColor} strokeWidth="4" strokeLinecap="round" fill="none">
          <path d="M32,40 Q38,32 44,40" />
          <path d="M56,40 Q62,32 68,40" />
        </g>
       );
    }
    if (mood === 'sweat') {
      return (
        <g>
           <circle cx="38" cy="40" r="4" fill={strokeColor} />
           <circle cx="62" cy="40" r="4" fill={strokeColor} />
           <path d="M75,25 Q80,30 75,35 Q70,30 75,25" fill="#bae6fd" stroke="#38bdf8" strokeWidth="2" />
        </g>
      );
    }
    return (
      <g fill={strokeColor}>
        <circle cx="38" cy="40" r="4" />
        <circle cx="62" cy="40" r="4" />
      </g>
    );
  };

  const getMouth = () => {
    if (variant === 'pig') {
        // Pig nose instead of mouth or with mouth
        return (
            <g>
                <ellipse cx="50" cy="52" rx="10" ry="7" fill="#fecdd3" stroke={strokeColor} strokeWidth="2" />
                <circle cx="46" cy="52" r="2" fill={strokeColor} />
                <circle cx="54" cy="52" r="2" fill={strokeColor} />
            </g>
        )
    }
    if (mood === 'angry') return <path d="M40,55 Q50,50 60,55" stroke={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" />;
    if (mood === 'shouting') return <circle cx="50" cy="55" r="8" stroke={strokeColor} strokeWidth="3" fill="#4a0404" fillOpacity="0.1" />;
    if (mood === 'happy') return <path d="M40,55 Q50,65 60,55" stroke={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" />;
    if (mood === 'sweat') return <ellipse cx="50" cy="58" rx="4" ry="6" stroke={strokeColor} strokeWidth="3" fill="none" />;
    return <path d="M45,55 Q50,58 55,55" stroke={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" />;
  };

  const getArms = () => {
    if (mood === 'shouting') {
       return (
         <g stroke={strokeColor} strokeWidth="3" strokeLinecap="round">
            <path d="M35,65 L15,45">
               <animate attributeName="d" values="M35,65 L15,45; M35,65 L15,55; M35,65 L15,45" dur="0.2s" repeatCount="indefinite" />
            </path>
            <path d="M65,65 L85,45">
               <animate attributeName="d" values="M65,65 L85,45; M65,65 L85,55; M65,65 L85,45" dur="0.2s" repeatCount="indefinite" begin="0.1s" />
            </path>
         </g>
       )
    }
    if (mood === 'angry') {
       return (
         <g stroke={strokeColor} strokeWidth="3" strokeLinecap="round">
            <path d="M35,65 L20,50" />
            <path d="M65,65 L80,50" />
         </g>
       );
    }
    return (
       <g stroke={strokeColor} strokeWidth="3" strokeLinecap="round">
          <path d="M35,65 L25,75" />
          <path d="M65,65 L75,75" />
       </g>
    );
  }

  const animationClass = animate 
    ? (id === 1 ? 'animate-shout-left' : 'animate-shout-right') 
    : 'hover:scale-105';

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className={`${sizeClass} relative transition-transform ${animationClass} duration-300`}>
        {/* Hide lines behind head */}
        <div className="absolute inset-0 bg-white rounded-full opacity-0"></div> 
        
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full z-10 relative overflow-visible drop-shadow-sm" 
          style={{ filter: CRAYON_FILTER }}
        >
          {/* Body */}
          <path d="M35,60 Q20,90 30,95 L70,95 Q80,90 65,60 Z" fill={bodyFill} stroke={strokeColor} strokeWidth="3" strokeLinejoin="round" />

          {/* Arms */}
          {getArms()}

          {/* Ears */}
          {getEars()}

          {/* Head */}
          <circle cx="50" cy="40" r="28" fill="white" stroke={strokeColor} strokeWidth="3" />
          
          {/* Blush */}
          <ellipse cx="30" cy="48" rx="5" ry="3" fill={blushColor} opacity="0.6" />
          <ellipse cx="70" cy="48" rx="5" ry="3" fill={blushColor} opacity="0.6" />

          {/* Face */}
          {getEyes()}
          {getMouth()}

          {/* Decoration for main players */}
          {variant === 'human' && (
             isP1 ? <path d="M50,12 Q40,5 35,15 M50,12 Q60,5 65,15" stroke="#84cc16" strokeWidth="3" fill="none" strokeLinecap="round" /> : 
             (id === 2 ? <path d="M40,10 L50,15 L60,10 L50,15 L50,20" stroke="#f472b6" strokeWidth="3" fill="none" strokeLinecap="round" /> : null)
          )}

        </svg>
      </div>
      {showName && (
        <span 
          className={`font-handwriting font-bold ${size === 'lg' ? 'text-xl mt-2' : 'text-xs mt-1'} truncate max-w-[150px] bg-white/80 px-2 py-0.5 rounded-lg border-2 border-dashed ${isP1 ? 'border-indigo-300 text-indigo-600' : 'border-orange-300 text-orange-600'}`}
        >
          {name || (isP1 ? "甲方" : "乙方")}
        </span>
      )}
    </div>
  );
};

// New: Shouting Match Animation
export const ShoutingAnimation: React.FC<{ p1Name: string; p2Name: string }> = ({ p1Name, p2Name }) => {
  return (
    <div className="relative w-full h-64 flex items-center justify-center gap-8 overflow-hidden">
       {/* Background Action Lines */}
       <div className="absolute inset-0 flex items-center justify-center opacity-30">
          <div className="w-[150%] h-[20px] bg-yellow-200 rotate-12 absolute animate-pulse"></div>
          <div className="w-[150%] h-[20px] bg-red-100 -rotate-12 absolute animate-pulse delay-75"></div>
       </div>

       {/* P1 Shouting */}
       <div className="relative z-10">
         <StickFigureAvatar id={1} name={p1Name} mood="shouting" animate={true} size="lg" />
         <div className="absolute -top-4 -right-8 text-4xl animate-bounce">🗣️</div>
       </div>

       {/* Impact Effect */}
       <div className="z-20 text-6xl animate-ping text-red-500 font-bold">VS</div>

       {/* P2 Shouting */}
       <div className="relative z-10">
         <StickFigureAvatar id={2} name={p2Name} mood="shouting" animate={true} size="lg" />
         <div className="absolute -top-4 -left-8 text-4xl animate-bounce delay-100">🗯️</div>
       </div>
    </div>
  );
};

// Floating Card with Mini Avatar
export const FloatingCard: React.FC<{ 
  text: string; 
  selected: boolean; 
  onClick: () => void;
  index: number;
  avatarVariant?: AvatarVariant;
  avatarColor?: string;
}> = ({ text, selected, onClick, index, avatarVariant = 'cat', avatarColor }) => {
  const rotation = (index * 13) % 8 - 4; 
  // Determine avatar color roughly by index if not provided
  const isP1Side = index % 2 === 0;

  return (
    <div 
      onClick={onClick}
      className={`
        cursor-pointer transition-all duration-200 transform
        border-crayon-sm border-2 p-2 m-2 flex items-center gap-2 max-w-[240px] text-left
        font-handwriting text-base leading-snug select-none animate-pop rounded-xl
        ${selected 
          ? 'bg-[#fef9c3] text-[#854d0e] border-[#eab308] scale-105 shadow-md rotate-0 z-10' 
          : 'bg-white text-gray-600 border-gray-200 hover:-translate-y-1 hover:bg-gray-50 hover:border-gray-300 shadow-sm'
        }
      `}
      style={{
        transform: selected ? 'scale(1.05)' : `rotate(${rotation}deg)`,
        animationDelay: `${index * 0.05}s`
      }}
    >
      {/* Mini Avatar in the card */}
      <div className="shrink-0 scale-75 origin-left">
         <StickFigureAvatar 
           id={isP1Side ? 1 : 2} 
           name="" 
           size="sm" 
           showName={false} 
           variant={avatarVariant}
           customColor={avatarColor}
           mood={selected ? 'happy' : 'neutral'}
         />
      </div>
      
      {/* Bubble text */}
      <div className="relative bg-white/50 p-2 rounded-lg border border-dashed border-gray-300 text-sm font-bold">
        {text}
      </div>
    </div>
  );
};

// Chat Bubble
export const ChatBubble: React.FC<{ 
  text: string; 
  isP1: boolean;
  speakerName: string;
  roundIndex?: number;
}> = ({ text, isP1, speakerName, roundIndex = 0 }) => {
  return (
    <div className={`flex w-full mb-6 ${isP1 ? 'justify-start' : 'justify-end'} animate-slide-up group`}>
      <div className={`flex max-w-[85%] items-end ${isP1 ? 'flex-row' : 'flex-row-reverse'} gap-2`}>
        <StickFigureAvatar 
           id={isP1 ? 1 : 2} 
           name={speakerName} 
           size="sm" 
           className="shrink-0 -mb-2" 
           showName={false} 
           mood="angry"
        />
        <div className={`
          relative px-5 py-3 border-2 border-crayon-sm text-base font-handwriting leading-relaxed shadow-sm
          ${isP1 
            ? 'bg-[#e0e7ff] text-[#3730a3] border-[#a5b4fc] rounded-[20px_20px_20px_4px]' 
            : 'bg-[#ffedd5] text-[#9a3412] border-[#fdba74] rounded-[20px_20px_4px_20px]'
          }
        `}>
          {text}
        </div>
      </div>
    </div>
  );
};