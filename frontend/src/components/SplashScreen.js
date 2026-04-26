import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export default function SplashScreen({ onComplete }) {
  const [flicker, setFlicker] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onComplete, 3000);
    const flickerInterval = setInterval(
      () => setFlicker(f => !f),
      120 + Math.random() * 100
    );
    return () => { clearTimeout(timer); clearInterval(flickerInterval); };
  }, [onComplete]);

  const title = "CineScope".split("");

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      className="flex items-center justify-center h-screen bg-black text-white"
      style={{ background: "radial-gradient(ellipse at center, #1e1b4b 0%, #000 100%)" }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: [1, 1.07, 1], opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        className="text-center"
      >
        <motion.h1 className="text-9xl font-extrabold flex justify-center relative select-none">
          {title.map((letter, index) => (
            <motion.span
              key={index}
              initial={{ opacity: 0, y: 40, scale: 0.8, rotate: -10 }}
              animate={{
                opacity: 1, y: 0, scale: 1, rotate: 0,
                filter: flicker && index % 2 === 0 ? "brightness(1.3)" : "brightness(1)"
              }}
              transition={{ delay: index * 0.13, duration: 0.7, type: "spring", stiffness: 300, damping: 18 }}
              className="relative"
            >
              <span
                className="absolute inset-0 blur-xl opacity-90 pointer-events-none"
                style={{ color: "rgba(255,0,128,0.8)", textShadow: "0 0 30px #ff0099, 0 0 60px #ff33cc, 0 0 90px #cc00ff" }}
              >{letter}</span>
              <span style={{
                background: "linear-gradient(45deg, #ff0099, #ff33cc, #ff66ff, #cc00ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                display: "inline-block"
              }}>{letter}</span>
            </motion.span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{
            opacity: 1, y: 0, scale: [0.95, 1.05, 1],
            boxShadow: ["0 0 15px rgba(255,0,128,0.5)", "0 0 30px rgba(255,0,128,0.7)", "0 0 15px rgba(255,0,128,0.5)"]
          }}
          transition={{ delay: 1.5, duration: 1.2, scale: { repeat: Infinity, repeatType: "reverse", duration: 1.8, delay: 2.5 } }}
          className="text-2xl text-gray-100 mt-4 px-4 py-2 inline-block rounded-lg"
          style={{ background: "rgba(255,0,128,0.2)", boxShadow: "0 0 15px rgba(255,0,128,0.5)" }}
        >
          Your Ultimate Movie Guide 🎬✨
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
