import React from 'react';
import { motion } from 'motion/react';

interface BossCharacterProps {
  isSpeaking?: boolean;
  className?: string;
}

export function BossCharacter({ isSpeaking = false, className = "" }: BossCharacterProps) {
  return (
    <motion.svg
      viewBox="0 0 200 200"
      className={className}
      initial="idle"
      animate={isSpeaking ? "speaking" : "idle"}
    >
      {/* Head Group - Centered and Scaled Up */}
      <motion.g
        style={{ originX: "100px", originY: "100px" }}
        initial={{ scale: 1.2, y: 20 }} // Scale up and move down to center
        variants={{
          idle: { 
            y: 20, 
            rotate: 0 
          },
          speaking: { 
            y: [20, 15, 20], // Bobbing up and down
            rotate: [0, -2, 2, 0], // Slight wiggle
            transition: { repeat: Infinity, duration: 0.4, ease: "easeInOut" } 
          }
        }}
      >
        {/* Head Shape - Wide and cute with cheek tufts */}
        <path
          d="M 50 70 
             C 50 35, 150 35, 150 70
             C 160 85, 165 95, 155 110
             C 150 120, 140 125, 100 125
             C 60 125, 50 120, 45 110
             C 35 95, 40 85, 50 70 Z"
          fill="#262626"
          stroke="#000000"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* Ears */}
        <path 
          d="M 55 55 L 45 25 L 85 45 Z" 
          fill="#262626" 
          stroke="#000000" 
          strokeWidth="4" 
          strokeLinejoin="round" 
        />
        <path 
          d="M 145 55 L 155 25 L 115 45 Z" 
          fill="#262626" 
          stroke="#000000" 
          strokeWidth="4" 
          strokeLinejoin="round" 
        />
        
        {/* Inner Ear Detail */}
        <path d="M 58 50 L 52 35 L 70 45" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />
        <path d="M 142 50 L 148 35 L 130 45" fill="none" stroke="#333" strokeWidth="3" strokeLinecap="round" />

        {/* Eyes - Large Black Circles with Blinking */}
        <motion.ellipse 
            cx="75" cy="85" rx="12" ry="12" fill="#000000" 
            animate={{ ry: [12, 12, 1, 12] }}
            transition={{ repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 1], delay: Math.random() * 2 }}
        />
        <motion.ellipse 
            cx="125" cy="85" rx="12" ry="12" fill="#000000" 
            animate={{ ry: [12, 12, 1, 12] }}
            transition={{ repeat: Infinity, duration: 4, times: [0, 0.9, 0.95, 1], delay: Math.random() * 2 }}
        />
        
        {/* Cheeks - Pink Blush */}
        <ellipse cx="55" cy="105" rx="8" ry="5" fill="#ffb7b2" opacity="0.5" />
        <ellipse cx="145" cy="105" rx="8" ry="5" fill="#ffb7b2" opacity="0.5" />

        {/* Mouth Group */}
        <g>
          {/* Mouth Interior (Pink part that opens) */}
          <motion.path
            fill="#ff9999"
            stroke="none"
            variants={{
              idle: { d: "M 92 98 Q 100 98 108 98 Z" }, // Closed/Hidden
              speaking: { 
                d: [
                  "M 92 98 Q 100 98 108 98 Z",   // Closed
                  "M 92 98 Q 100 118 108 98 Z",  // Open (Deep U)
                  "M 92 98 Q 100 98 108 98 Z"    // Closed
                ],
                transition: { repeat: Infinity, duration: 0.2 }
              }
            }}
          />
          
          {/* Upper Lip (Static Line) */}
          <path 
            d="M 92 98 Q 100 102 108 98" 
            fill="none" 
            stroke="#000000" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </g>
      </motion.g>
    </motion.svg>
  );
}
