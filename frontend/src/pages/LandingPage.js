import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

// ── Movie poster placeholder colors (cinema palette) ─────────────────────────
const POSTER_COLORS = [
  ["#ff0080", "#7928ca"],
  ["#ff4d00", "#f9cb28"],
  ["#00d2ff", "#3a7bd5"],
  ["#11998e", "#38ef7d"],
  ["#fc4a1a", "#f7b733"],
  ["#c94b4b", "#4b134f"],
  ["#1a1a2e", "#16213e"],
  ["#0f3460", "#e94560"],
  ["#833ab4", "#fd1d1d"],
  ["#00b09b", "#96c93d"],
  ["#f7971e", "#ffd200"],
  ["#56ccf2", "#2f80ed"],
  ["#eb3349", "#f45c43"],
  ["#1d976c", "#93f9b9"],
  ["#4776e6", "#8e54e9"],
  ["#f953c6", "#b91d73"],
  ["#000428", "#004e92"],
  ["#c0392b", "#8e44ad"],
  ["#2193b0", "#6dd5ed"],
  ["#ee0979", "#ff6a00"],
  ["#aa076b", "#61045f"],
  ["#f00000", "#dc281e"],
];

const GENRES = ["Action", "Romance", "Horror", "Comedy", "Thriller", "Fantasy", "Drama", "Sci-Fi", "Mystery", "Adventure"];
const WORDS = ["Cinema", "Stories", "Emotions", "Worlds", "Dreams", "Magic", "Art", "Life"];

// ── 3D Poster Card ───────────────────────────────────────────────────────────
function PosterCard({ colors, index, row }) {
  const [hovered, setHovered] = useState(false);
  const genre = GENRES[index % GENRES.length];

  return (
    <motion.div
      className="relative flex-shrink-0 rounded-xl overflow-hidden cursor-pointer"
      style={{
        width: "120px",
        height: "175px",
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        transformStyle: "preserve-3d",
        boxShadow: hovered
          ? `0 25px 60px ${colors[0]}80, 0 0 40px ${colors[1]}60`
          : `0 8px 32px rgba(0,0,0,0.6)`,
      }}
      whileHover={{
        scale: 1.12,
        rotateY: 8,
        rotateX: -5,
        z: 40,
        transition: { duration: 0.3 }
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
    >
      {/* Shimmer effect */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
          backgroundSize: "200% 100%",
          animation: `shimmer ${2 + (index % 3)}s infinite linear`,
          animationDelay: `${index * 0.2}s`
        }}
      />
      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }}
      />
      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-3">
        <div className="flex justify-between items-start">
          <div className="w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">CS</span>
          </div>
          <div className="text-white/60 text-[9px] font-medium bg-black/20 rounded px-1">
            ★ {(6.5 + (index % 35) / 10).toFixed(1)}
          </div>
        </div>
        <div>
          <div className="text-white/50 text-[9px] uppercase tracking-widest mb-1">{genre}</div>
          <div className="w-full h-0.5 bg-white/20 rounded" />
        </div>
      </div>
      {/* Glow border on hover */}
      {hovered && (
        <div className="absolute inset-0 rounded-xl border-2"
          style={{ borderColor: colors[0], boxShadow: `inset 0 0 20px ${colors[0]}40` }} />
      )}
    </motion.div>
  );
}

// ── Infinite marquee row ─────────────────────────────────────────────────────
function MarqueeRow({ colors, speed = 25, reverse = false, yOffset = 0 }) {
  const posters = [...colors, ...colors, ...colors];
  return (
    <div
      className="flex gap-3 overflow-hidden"
      style={{ transform: `translateY(${yOffset}px)` }}
    >
      <motion.div
        className="flex gap-3"
        animate={{ x: reverse ? ["0%", "33.33%"] : ["0%", "-33.33%"] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
        style={{ width: "max-content" }}
      >
        {posters.map((colPair, i) => (
          <PosterCard key={i} colors={colPair} index={i} />
        ))}
      </motion.div>
    </div>
  );
}

// ── Floating particle ────────────────────────────────────────────────────────
function Particle({ x, y, color, size, duration, delay }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, background: color, filter: "blur(1px)" }}
      animate={{
        y: [0, -80, 0],
        x: [0, Math.random() > 0.5 ? 30 : -30, 0],
        opacity: [0, 0.8, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{ duration, repeat: Infinity, delay, ease: "easeInOut" }}
    />
  );
}

// ── Cycling word animation ───────────────────────────────────────────────────
function CyclingWord() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % WORDS.length), 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={idx}
        initial={{ y: 40, opacity: 0, filter: "blur(8px)" }}
        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
        exit={{ y: -40, opacity: 0, filter: "blur(8px)" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="inline-block"
        style={{
          background: `linear-gradient(90deg, ${POSTER_COLORS[idx % POSTER_COLORS.length][0]}, ${POSTER_COLORS[(idx + 3) % POSTER_COLORS.length][1]})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {WORDS[idx]}
      </motion.span>
    </AnimatePresence>
  );
}

// ── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage({ onEnter }) {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 500], [0, 150]);
  const contentY = useTransform(scrollY, [0, 500], [0, -80]);
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);

  // Split posters into rows
  const row1 = POSTER_COLORS.slice(0, 8);
  const row2 = POSTER_COLORS.slice(8, 16);
  const row3 = POSTER_COLORS.slice(14, 22);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 30,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    color: POSTER_COLORS[i % POSTER_COLORS.length][0],
    size: `${3 + Math.random() * 6}px`,
    duration: 4 + Math.random() * 6,
    delay: Math.random() * 4,
  }));

  const handleEnter = () => {
    onEnter?.();
    navigate("/login");
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-hidden bg-black"
      style={{ fontFamily: "'Bebas Neue', 'Impact', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;600&display=swap');

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 30px #ff008080, 0 0 60px #7928ca40; }
          50% { box-shadow: 0 0 60px #ff0080cc, 0 0 120px #7928ca80; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        .btn-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .float-anim { animation: float 4s ease-in-out infinite; }
      `}</style>

      {/* ── Deep background gradient ── */}
      <div className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 50%, #1a0030 0%, #000000 70%)" }} />

      {/* ── Scanlines ── */}
      <div className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
          zIndex: 1
        }} />

      {/* ── Particles ── */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
        {particles.map((p, i) => <Particle key={i} {...p} />)}
      </div>

      {/* ── 3D Poster Grid Background ── */}
      <motion.div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{
          y: bgY,
          rotateX: mousePos.y * 0.3,
          rotateY: mousePos.x * 0.3,
          transformStyle: "preserve-3d",
          perspective: "1000px",
          zIndex: 2,
        }}
      >
        {/* Top fade */}
        <div className="absolute top-0 left-0 right-0 h-40 z-10"
          style={{ background: "linear-gradient(to bottom, #000000, transparent)" }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-60 z-10"
          style={{ background: "linear-gradient(to top, #000000 30%, transparent)" }} />
        {/* Side fades */}
        <div className="absolute top-0 left-0 bottom-0 w-32 z-10"
          style={{ background: "linear-gradient(to right, #000000, transparent)" }} />
        <div className="absolute top-0 right-0 bottom-0 w-32 z-10"
          style={{ background: "linear-gradient(to left, #000000, transparent)" }} />

        <div className="flex flex-col gap-4 opacity-60 pt-4"
          style={{ transform: "perspective(800px) rotateX(8deg) scale(1.1)" }}>
          <MarqueeRow colors={row1} speed={30} yOffset={0} />
          <MarqueeRow colors={row2} speed={22} reverse yOffset={0} />
          <MarqueeRow colors={row3} speed={28} yOffset={0} />
        </div>
      </motion.div>

      {/* ── Center glow orb ── */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 3 }}>
        <div className="rounded-full opacity-20"
          style={{
            width: "600px", height: "600px",
            background: "radial-gradient(circle, #ff008080 0%, #7928ca40 40%, transparent 70%)",
            filter: "blur(40px)"
          }} />
      </div>

      {/* ── Main Content ── */}
      <motion.div
        className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center"
        style={{ y: contentY, opacity, zIndex: 10 }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-8"
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase"
            style={{
              background: "linear-gradient(135deg, rgba(255,0,128,0.15), rgba(121,40,202,0.15))",
              border: "1px solid rgba(255,0,128,0.3)",
              color: "#ff80bf",
              backdropFilter: "blur(10px)"
            }}>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Your Ultimate Movie Universe
          </span>
        </motion.div>

        {/* Main title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          className="mb-4 float-anim"
        >
          <h1
            className="text-[clamp(5rem,18vw,14rem)] leading-none tracking-tight select-none"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              background: "linear-gradient(135deg, #ffffff 0%, #ff80bf 30%, #c77dff 60%, #4cc9f0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 40px rgba(255,0,128,0.5))",
              letterSpacing: "0.02em",
            }}
          >
            CINE
          </h1>
          <h1
            className="text-[clamp(5rem,18vw,14rem)] leading-none tracking-tight select-none -mt-6"
            style={{
              fontFamily: "'Bebas Neue', Impact, sans-serif",
              background: "linear-gradient(135deg, #4cc9f0 0%, #7209b7 40%, #ff0080 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 40px rgba(76,201,240,0.5))",
              letterSpacing: "0.02em",
            }}
          >
            SCOPE
          </h1>
        </motion.div>

        {/* Cycling tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.6 }}
          className="text-2xl md:text-4xl mb-3 overflow-hidden h-12"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.1em" }}
        >
          <span className="text-white/60">Discover </span>
          <CyclingWord />
          <span className="text-white/60"> Like Never Before</span>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6 }}
          className="max-w-lg mb-12 leading-relaxed"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontWeight: 300,
            fontSize: "1rem",
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.02em"
          }}
        >
          AI-powered recommendations across 6 languages. Mood-based discovery.
          3000+ movies. One universe.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 items-center"
        >
          {/* Primary CTA */}
          <motion.button
            onClick={handleEnter}
            className="relative px-10 py-4 rounded-full text-white font-bold text-lg overflow-hidden btn-glow"
            style={{
              fontFamily: "'Bebas Neue', sans-serif",
              letterSpacing: "0.15em",
              fontSize: "1.1rem",
              background: "linear-gradient(135deg, #ff0080, #7928ca, #4cc9f0)",
              backgroundSize: "200% 200%",
              animation: "pulse-glow 2s ease-in-out infinite, gradientShift 3s ease infinite",
              border: "none",
              minWidth: "220px"
            }}
            whileHover={{ scale: 1.06, backgroundPosition: "right center" }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="relative z-10 flex items-center gap-2">
              🎬 Start Watching
            </span>
            {/* Shimmer on button */}
            <div className="absolute inset-0 opacity-0 hover:opacity-30 transition-opacity"
              style={{ background: "linear-gradient(105deg, transparent 40%, white 50%, transparent 60%)", backgroundSize: "200% 100%" }} />
          </motion.button>

          {/* Secondary CTA */}
          <motion.button
            onClick={handleEnter}
            className="px-8 py-4 rounded-full text-sm font-semibold"
            style={{
              fontFamily: "'Inter', sans-serif",
              letterSpacing: "0.08em",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(10px)",
              minWidth: "180px"
            }}
            whileHover={{
              scale: 1.04,
              backgroundColor: "rgba(255,255,255,0.1)",
              color: "#ffffff"
            }}
            whileTap={{ scale: 0.97 }}
          >
            Sign In →
          </motion.button>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="flex flex-wrap justify-center gap-3 mt-14"
        >
          {[
            { icon: "🤖", label: "AI Mood Detection" },
            { icon: "🌐", label: "6 Languages" },
            { icon: "🎭", label: "Multi-Profile" },
            { icon: "⚡", label: "Smart Search" },
            { icon: "📋", label: "Watchlists" },
          ].map(({ icon, label }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.6 + i * 0.1 }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
                fontFamily: "'Inter', sans-serif",
                backdropFilter: "blur(8px)"
              }}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-white/30 text-xs tracking-widest uppercase"
            style={{ fontFamily: "'Inter', sans-serif" }}>scroll</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-px h-8 rounded-full"
            style={{ background: "linear-gradient(to bottom, rgba(255,0,128,0.6), transparent)" }}
          />
        </motion.div>
      </motion.div>

      {/* ── Decorative corner elements ── */}
      <div className="absolute top-6 left-6 pointer-events-none" style={{ zIndex: 10 }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,0,128,0.1)", border: "1px solid rgba(255,0,128,0.2)" }}>
          <span style={{ fontSize: "20px" }}>🎬</span>
        </div>
      </div>
      <div className="absolute top-6 right-6 pointer-events-none" style={{ zIndex: 10 }}>
        <div className="text-xs text-white/20 text-right" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div>Powered by AI</div>
          <div className="text-[10px] text-white/10">sentence-transformers</div>
        </div>
      </div>

      {/* ── Bottom color bands ── */}
      <div className="absolute bottom-0 left-0 right-0 h-1 pointer-events-none" style={{ zIndex: 20 }}>
        <div style={{ background: "linear-gradient(90deg, #ff0080, #7928ca, #4cc9f0, #11998e, #f7971e, #ee0979)", height: "3px" }} />
      </div>
    </div>
  );
}
