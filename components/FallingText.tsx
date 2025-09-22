import { motion } from "framer-motion";
import dynamic from "next/dynamic";

interface FallingTextProps {
  children: string;
  className?: string;
  delay?: number;
}

function FallingTextComponent({ children, className, delay = 0 }: FallingTextProps) {
  const letters = (children || "").split("");

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
        delayChildren: delay,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.004,
        staggerDirection: -1,
      },
    },
  };

  const item = {
    hidden: { y: -20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.06 },
    },
    exit: {
      y: 50,
      opacity: 0,
      transition: { duration: 0.06 },
    },
  };

  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{ display: "inline-block" }}
    >
      {letters.map((letter, index) => (
        <motion.span key={index} variants={item}>
          {letter}
        </motion.span>
      ))}
    </motion.div>
  );
}

export const FallingText = dynamic(() => Promise.resolve(FallingTextComponent), {
  ssr: false,
});
