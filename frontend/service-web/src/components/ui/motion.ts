import type { Transition, Variants } from 'motion/react';

export const standardEase = [0.16, 1, 0.3, 1] as const;

export const transitionFast: Transition = {
  duration: 0.15,
  ease: standardEase,
};

export const transitionNormal: Transition = {
  duration: 0.2,
  ease: standardEase,
};

export const transitionSlow: Transition = {
  duration: 0.28,
  ease: standardEase,
};

export const pageTransitionVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitionNormal,
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: transitionFast,
  },
};

export const modalVariants: Variants = {
  closed: {
    opacity: 0,
    scale: 0.98,
    y: 8,
    transition: transitionFast,
  },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitionNormal,
  },
};

export const drawerVariants: Variants = {
  closed: {
    x: '100%',
    transition: transitionFast,
  },
  open: {
    x: 0,
    transition: transitionNormal,
  },
};

export const backdropVariants: Variants = {
  closed: { opacity: 0, transition: transitionFast },
  open: { opacity: 1, transition: transitionFast },
};

export const accordionVariants: Variants = {
  collapsed: { height: 0, opacity: 0, overflow: 'hidden' },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: transitionNormal,
  },
};

export const dropdownVariants: Variants = {
  closed: {
    opacity: 0,
    scale: 0.96,
    y: -4,
    transition: transitionFast,
  },
  open: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitionFast,
  },
};
