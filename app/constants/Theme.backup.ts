/**
 * Editorial Vitality Design System Tokens
 * Based on WIP/Theme/design_system.md
 */

export const Colors = {
  // Tonal Architecture
  background: '#f8faf9',
  surfaceLowest: '#ffffff',
  surfaceContainerLow: '#f0f4f3',
  surfaceContainer: '#eaefee',
  surfaceContainerHighest: '#dde4e3',
  
  // Primary Palette (Botanical Sage)
  primary: '#4f6359',
  primaryContainer: '#d1e8db',
  onPrimaryContainer: '#42564c',
  
  // Secondary / Tertiary
  secondary: '#55625c',
  
  // Text and UI
  onSurface: '#2d3433',
  onSurfaceVariant: '#596060', // Label-md
  outline: '#757c7b',
  
  // Semantic UI
  onPrimaryContrast: '#ffffff',
  primarySubtle: 'rgba(79, 99, 89, 0.08)',
  onSurfaceSubtle: 'rgba(45, 52, 51, 0.8)',
  borderSubtle: 'rgba(0,0,0,0.02)',
  surfaceSubtle: 'rgba(0,0,0,0.01)',
  
  success: '#10b981',
  successContainer: 'rgba(16, 185, 129, 0.1)',
  onSuccessContainer: '#065f46',
  
  warning: '#fbbf24',
  warningContainer: 'rgba(251, 191, 36, 0.1)',
  onWarningContainer: '#92400e',
  
  error: '#a83836',
  errorContainer: 'rgba(168, 56, 54, 0.1)',
  onErrorContainer: '#991b1b',
  
  info: '#3b82f6',
  infoContainer: 'rgba(59, 130, 246, 0.1)',
  
  // Interaction and Specific Brands
  interactive: '#2563eb',
  experiment: '#8b5cf6',
  experimentContainer: 'rgba(139, 92, 246, 0.1)',
  
  // Event Types (Timeline)
  mealIcon: '#9333ea',
  mealContainer: '#f3e8ff',
  moodIcon: '#22c55e',
  moodContainer: '#dcfce7',
  
  // Overlays & Glass
  scrim: 'rgba(23, 31, 28, 0.4)',
  scrimLight: 'rgba(0,0,0,0.1)',
  glassBackground: 'rgba(248, 250, 249, 0.8)',

  // High-contrast translucent (for use on primary/colored backgrounds)
  onPrimaryAlphaMedium: 'rgba(255, 255, 255, 0.7)',
  onPrimaryAlphaLow: 'rgba(255, 255, 255, 0.15)',
};

export const Typography = {
  fontFamily: 'Manrope', // Ensure this is loaded in App.tsx
  display: {
    fontSize: 48,
    fontWeight: '700' as const,
    letterSpacing: -0.96, // -0.02em
    color: Colors.onSurface,
  },
  headline: {
    fontSize: 32,
    fontWeight: '700' as const,
    letterSpacing: -0.64,
    color: Colors.onSurface,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.onSurface,
  },
  body: {
    fontSize: 16,
    lineHeight: 25.6, // 1.6
    color: Colors.onSurface,
  },
  label: {
    fontSize: 12,
    fontWeight: '600' as const,
    letterSpacing: 0.6, // 0.05em
    textTransform: 'uppercase' as const,
    color: Colors.onSurfaceVariant,
  },
};

export const Spacing = {
  s1: 4,
  s2: 8,
  s3: 16, // 1rem
  s4: 24,
  s5: 28, // 1.7rem
  s6: 32, // 2rem
};

export const Radii = {
  md: 8,
  lg: 16, // 1rem
  xl: 24, // 1.5rem
  full: 9999,
};

export const Shadows = {
  ambient: {
    shadowColor: '#2d3433',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 32,
    elevation: 4,
  },
};

