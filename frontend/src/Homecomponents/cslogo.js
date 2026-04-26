import { motion } from "framer-motion";

export default function CsLogo() {
  return (
    <motion.h1
      className="text-5xl font-extrabold mb-6 drop-shadow-lg tracking-wide
                 bg-gradient-to-r from-purple-400 via-purple-500 to-blue-500
                 text-transparent bg-clip-text whitespace-nowrap"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1.1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      whileHover={{ scale: 1.15, textShadow: "0px 0px 15px rgba(147,51,234,0.8)" }}
    >
      CineScope
    </motion.h1>
  );
}
