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
  surfaceContainerHigh: '#e4e9e8',
  surfaceContainerHighest: '#dde4e3',
  surfaceVariant: '#dde4e3',
  
  // Primary Palette (Botanical Sage)
  primary: '#4f6359',
  primaryDim: '#44574e',
  primaryContainer: '#d1e8db',
  primaryFixed: '#d1e8db',
  primaryFixedDim: '#c3dacd',
  onPrimary: '#e8fef1',
  onPrimaryContainer: '#42564c',
  
  // Secondary / Tertiary
  secondary: '#55625c',
  secondaryContainer: '#d8e6de',
  onSecondaryContainer: '#48554f',
  tertiary: '#59615e',
  tertiaryContainer: '#f6fefa',
  
  // Text and UI
  onSurface: '#2d3433',
  onSurfaceVariant: '#596060', // Label-md
  outline: '#757c7b',
  outlineVariant: '#acb3b2',
  
  // States
  error: '#a83836',
  errorContainer: '#fa746f',
  
  // Glassmorphism
  glassBackground: 'rgba(248, 250, 249, 0.8)',
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
  s16: 88, // 5.5rem
  s20: 112, // 7rem
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

export const EditorialStyles = {
  noLineBoundary: {
    borderWidth: 0,
    // Use background shifts instead
  },
  glass: {
    backgroundColor: Colors.glassBackground,
    // Use BackdropBlur on web/ios
  },
  asymmetricHeader: {
    marginLeft: Spacing.s6,
    marginTop: Spacing.s6,
  },
};
