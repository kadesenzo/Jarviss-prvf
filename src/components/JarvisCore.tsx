import { motion } from "motion/react";

export default function JarvisCore({ isListening, isSpeaking, small }: { isListening: boolean; isSpeaking?: boolean; small?: boolean }) {
  const sizeClass = small ? "w-10 h-10" : "w-72 h-72";
  const coreSize = small ? "w-4 h-4" : "w-32 h-32";
  const prismSize = small ? "w-3 h-3" : "w-20 h-20";
  const barWidth = small ? "w-0.5" : "w-1.5";
  const barGap = small ? "gap-0.5" : "gap-1.5";
  const barHeight = small ? [2, 12, 2] : [10, 60, 10];

  return (
    <div className={`relative flex items-center justify-center ${sizeClass}`}>
      {/* Outer Decorative Ring */}
      <div className="absolute w-full h-full dashed-ring opacity-20" />
      
      {/* Rotating Outer Ring */}
      <motion.div
        animate={{
          rotate: 360,
          scale: isListening ? [1, 1.05, 1] : 1,
        }}
        transition={{
          rotate: { duration: 20, repeat: Infinity, ease: "linear" },
          scale: { duration: 2, repeat: Infinity },
        }}
        className="absolute w-[95%] h-[95%] border border-purple-500/20 rounded-full"
      />

      {/* Main Rotating Ring */}
      <motion.div
        animate={{
          rotate: -360,
          scale: isListening ? [1, 1.1, 1] : 1,
        }}
        transition={{
          rotate: { duration: 10, repeat: Infinity, ease: "linear" },
          scale: { duration: 1, repeat: Infinity },
        }}
        className="absolute w-full h-full border-2 border-purple-500/30 rounded-full shadow-[0_0_30px_rgba(168,85,247,0.2)]"
      >
        {/* Decorative notches */}
        {!small && (
          <>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-purple-500/50" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-4 bg-purple-500/50" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-1 bg-purple-500/50" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-1 bg-purple-500/50" />
          </>
        )}
      </motion.div>

      {/* Middle Ring */}
      {!small && (
        <motion.div
          animate={{
            rotate: 360,
            scale: isSpeaking ? [1, 1.2, 1] : 1,
          }}
          transition={{
            rotate: { duration: 15, repeat: Infinity, ease: "linear" },
            scale: { duration: 0.5, repeat: Infinity },
          }}
          className="absolute w-4/5 h-4/5 border-2 border-violet-400/50 rounded-full border-dashed shadow-[0_0_40px_rgba(139,92,246,0.3)]"
        />
      )}

      {/* Inner Core Glow */}
      <motion.div
        animate={{
          scale: isListening || isSpeaking ? [1, 1.4, 1] : 1,
          opacity: isListening ? 1 : 0.6,
        }}
        transition={{ duration: 0.8, repeat: Infinity }}
        className={`${coreSize} bg-purple-600 rounded-full blur-2xl opacity-40 shadow-[0_0_60px_rgba(168,85,247,0.9)]`}
      />
      
      {/* Central Prism */}
      {!small && (
        <motion.div 
          animate={{
            rotate: isSpeaking ? [0, 90, 180, 270, 360] : 0
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className={`absolute ${prismSize} bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg rotate-45 flex items-center justify-center overflow-hidden`}
        >
          <div className="w-12 h-12 bg-white rounded-full blur-md opacity-30" />
        </motion.div>
      )}
      
      {/* Waveforms */}
      <div className={`absolute flex ${barGap} items-center`}>
        {[...Array(small ? 3 : 7)].map((_, i) => (
          <motion.div
            key={i}
            animate={{ 
              height: isListening || isSpeaking ? (small ? [4, 16, 4] : [10, 60, 10]) : (small ? [2, 6, 2] : [5, 15, 5]),
              opacity: isListening || isSpeaking ? 1 : 0.3
            }}
            transition={{ 
              duration: 0.4, 
              repeat: Infinity, 
              delay: i * 0.08,
              ease: "easeInOut"
            }}
            className={`${barWidth} bg-gradient-to-t from-purple-600 to-fuchsia-400 rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]`}
          />
        ))}
      </div>

      {/* Data Particles */}
      {!small && (isListening || isSpeaking) && [...Array(8)].map((_, i) => (
        <motion.div
          key={`p-${i}`}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            x: Math.cos(i * 45 * Math.PI / 180) * 140,
            y: Math.sin(i * 45 * Math.PI / 180) * 140
          }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          className="absolute w-1 h-1 bg-fuchsia-400 rounded-full"
        />
      ))}
    </div>
  );
}
