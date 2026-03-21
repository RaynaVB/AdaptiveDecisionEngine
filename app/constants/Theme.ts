/**
 * Editorial Vitality Design System Tokens
 * Based on WIP/Theme/design_system.md
 */

export const Colors = {
  // Tonal Architecture
  background: '#f8faf9',
  surface: '#f8faf9',
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
  
  // Semantic UI (Extended)
  onPrimaryContrast: '#ffffff',
  primaryMuted: 'rgba(79, 99, 89, 0.08)', // primary + 8% alpha
  onSurfaceMuted: 'rgba(45, 52, 51, 0.8)', // onSurface + 80% alpha
  borderSubtle: 'rgba(0,0,0,0.02)',
  surfaceSubtle: 'rgba(0,0,0,0.01)',
  
  success: '#10b981',
  successMuted: 'rgba(16, 185, 129, 0.1)',
  warning: '#fbbf24',
  warningMuted: 'rgba(251, 191, 36, 0.1)',
  error: '#a83836',
  errorMuted: 'rgba(168, 56, 54, 0.1)',
  info: '#3b82f6',
  infoMuted: 'rgba(59, 130, 246, 0.1)',
  
  // Interaction and Specific Brands
  interactive: '#2563eb', // Standard blue for buttons/links
  experiment: '#8b5cf6',   // Purple for experiments
  experimentMuted: 'rgba(139, 92, 246, 0.1)',
  
  // Additional Tonal Layers
  border: '#e5e7eb',
  divider: '#f1f5f9',
  
  // High-contrast translucent (for use on primary/colored backgrounds)
  onPrimaryAlpha70: 'rgba(255, 255, 255, 0.7)',
  onPrimaryAlpha50: 'rgba(255, 255, 255, 0.5)',
  onPrimaryAlpha15: 'rgba(255, 255, 255, 0.15)',
  onPrimaryAlpha90: 'rgba(255, 255, 255, 0.9)',
  
  // Glassmorphism
  glassBackground: 'rgba(248, 250, 249, 0.8)',

  // Event Types (Timeline)
  mealMuted: '#f3e8ff',
  mealIcon: '#9333ea',
  moodMuted: '#dcfce7',
  moodIcon: '#22c55e',
  symptomMuted: '#fee2e2',
  symptomIcon: '#ef4444',
  
  // Overlays
  scrim: 'rgba(23, 31, 28, 0.4)',
  scrimLight: 'rgba(0,0,0,0.1)',

  // Insight Types
  predictionMuted: '#fee2e2',
  predictionIcon: '#ef4444',
  predictionOnMuted: '#991b1b',
  
  triggerMuted: '#fef3c7',
  triggerIcon: '#f59e0b',
  triggerOnMuted: '#92400e',
  
  protectiveMuted: '#d1fae5',
  protectiveIcon: '#10b981',
  protectiveOnMuted: '#065f46',
  
  // Accents / Indigo (for Profile/Sensitivity sections)
  accentMuted: 'rgba(99, 102, 241, 0.05)',
  accentIcon: 'rgba(99, 102, 241, 0.1)',
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

