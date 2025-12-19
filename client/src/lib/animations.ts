import { Variants, Transition } from 'framer-motion';

// Shared easing curves
export const easeOutExpo = [0.16, 1, 0.3, 1] as const;
export const easeInOut = [0.4, 0, 0.2, 1] as const;

// Shared transition presets
export const transitionFast: Transition = {
  duration: 0.15,
  ease: easeOutExpo,
};

export const transitionNormal: Transition = {
  duration: 0.2,
  ease: easeOutExpo,
};

export const transitionSlow: Transition = {
  duration: 0.3,
  ease: easeOutExpo,
};

// Page transitions
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOutExpo },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

// Staggered list animations
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: easeOutExpo },
  },
};

// Fade in from different directions
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitionNormal },
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOutExpo },
  },
};

export const fadeInDown: Variants = {
  initial: { opacity: 0, y: -10 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: easeOutExpo },
  },
};

// Scale animations
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: easeOutExpo },
  },
};

// Card hover effect - subtle lift
export const cardHover = {
  whileHover: {
    y: -4,
    transition: { duration: 0.2, ease: easeOutExpo },
  },
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// Button press feedback
export const buttonPress = {
  whileTap: {
    scale: 0.98,
    transition: { duration: 0.1 },
  },
};

// Progress bar animation
export const progressAnimation: Variants = {
  initial: { width: 0 },
  animate: (percent: number) => ({
    width: `${percent}%`,
    transition: { duration: 0.5, ease: easeOutExpo },
  }),
};

// Counter animation (for stats)
export const counterVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: easeOutExpo },
  },
};

// Hero section staggered entrance
export const heroContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const heroItem: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOutExpo },
  },
};

// Subtle pulse for processing states
export const subtlePulse: Variants = {
  animate: {
    scale: [1, 1.02, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Success checkmark animation
export const checkmarkAnimation: Variants = {
  initial: { scale: 0, rotate: -45 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 200,
      damping: 15,
    },
  },
};

// Slide in from side (for sidebars, drawers)
export const slideInFromLeft: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: easeOutExpo },
  },
  exit: {
    x: -20,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export const slideInFromRight: Variants = {
  initial: { x: 20, opacity: 0 },
  animate: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.2, ease: easeOutExpo },
  },
  exit: {
    x: 20,
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

// Viewport animation triggers
export const viewportOnce = { once: true, margin: '-50px' };
export const viewportAlways = { once: false, margin: '-50px' };
