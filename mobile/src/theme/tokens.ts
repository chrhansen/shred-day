// Shred.Day iOS design tokens — React Native / Expo.
// Values are in points (pt). Derived 1:1 from the HTML mockups in ../prototype.
// Fonts: Space Grotesk 400/500/700 (already bundled in the Expo app).

export const colors = {
  // Surfaces
  canvas: '#FFFFFF',
  surfaceSubtle: '#F8FAFC',   // Season / Settings / Gear background, notices, inactive inputs
  fill: '#F1F5F9',            // neutral fill: segmented track, ski chip, avatar, skeleton, icon tiles
  // Text
  ink: '#0F172A',             // primary text, dark buttons, selected calendar date
  text700: '#334155',         // body on light fills, icon tiles
  text600: '#475569',         // avatar initials, secondary labels on buttons
  textSecondary: '#64748B',   // meta, captions, helper text, unselected tab
  textMuted: '#94A3B8',       // placeholders, chevrons, optional labels, weekday headers
  // Lines
  border: '#E2E8F0',          // hairlines, card borders, input borders
  borderStrong: '#CBD5E1',    // dashed add tiles, sheet grabber, disabled primary bg
  divider: '#F1F5F9',         // row separators inside cards/lists
  // Brand / accent
  primary: '#2563EB',         // links, nav text buttons, active tab, today, checkmarks
  indigo: '#4F46E5',          // gradient end, chart accents, spinner head, calendar dot
  primaryGradient: ['#2563EB', '#4F46E5'] as const, // 90deg (left→right) for buttons/chips/FAB/toggle
  accentFill: '#EFF6FF',      // tag chips (read), selected legend row, empty-state icon circle, info notice
  accentFillStrong: '#DBEAFE',// logged calendar dates, focus ring
  accentBorder: '#BFDBFE',    // "Connect" pill border, info spinner track
  tagText: '#1D4ED8',         // tag chip text (read views), Connect text
  loggedDateText: '#1E3A8A',
  infoText: '#1E40AF',
  dayBadgeBg: '#EEF2FF',
  dayBadgeText: '#4338CA',
  barInactive: '#C7D2FE',     // month bars (unselected, non-zero)
  // Status
  destructive: '#DC2626',
  destructiveDisabled: '#FCA5A5',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#B91C1C',
  success: '#15803D',
  toastIcon: '#86EFAC',
  // Overlays
  scrim: 'rgba(15,23,42,0.42)',       // behind sheets / action sheets
  photoBadge: 'rgba(15,23,42,0.66)',  // photo-count badge, remove-photo button
  photoTopShade: ['rgba(15,23,42,0.5)', 'rgba(15,23,42,0)'] as const, // top 130pt of gallery
  floatingButtonBg: 'rgba(255,255,255,0.92)', // + blur 10
  stickyHeaderBg: 'rgba(255,255,255,0.96)',   // + blur 12
  tabBarBg: 'rgba(255,255,255,0.94)',         // + blur 20
  uploadOverlay: 'rgba(255,255,255,0.6)',
  failedOverlay: 'rgba(127,29,29,0.55)',
  // Provider buttons (keep provider treatment)
  appleBg: '#000000',
  googleBorder: '#DADCE0',
  googleText: '#1F1F1F',
  // Charts
  tag: { 'With friends': '#4F46E5', Groomers: '#3FA9C9', Powder: '#8B5CF6', Touring: '#F59E0B', Bluebird: '#22A06B' },
  tagFallback: ['#4F46E5', '#3FA9C9', '#8B5CF6', '#F59E0B', '#22A06B'], // cycle for user-defined tags
  ski: ['#4F46E5', '#3FA9C9', '#8B5CF6'],
  barZero: '#E2E8F0',
} as const;

export const fonts = {
  regular: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  bold: 'SpaceGrotesk_700Bold',
} as const;

// size / lineHeight / letterSpacing in pt. Use allowFontScaling (Dynamic Type) on all text.
export const type = {
  display:     { fontFamily: fonts.bold,    fontSize: 44, lineHeight: 46, letterSpacing: -1.6 }, // Welcome headline
  statHero:    { fontFamily: fonts.bold,    fontSize: 48, lineHeight: 50, letterSpacing: -1.5 }, // season total
  titleXL:     { fontFamily: fonts.bold,    fontSize: 30, lineHeight: 36, letterSpacing: -0.6 }, // day detail resort
  titleL:      { fontFamily: fonts.bold,    fontSize: 28, lineHeight: 34, letterSpacing: -0.5 }, // auth / public / expired
  titleM:      { fontFamily: fonts.bold,    fontSize: 24, lineHeight: 30, letterSpacing: -0.4 }, // delete account / deleted
  header:      { fontFamily: fonts.bold,    fontSize: 22, lineHeight: 28, letterSpacing: -0.3 }, // tab-root header, empty-state title
  sheetTitle:  { fontFamily: fonts.bold,    fontSize: 20, lineHeight: 26 },
  headline:    { fontFamily: fonts.bold,    fontSize: 17, lineHeight: 22 },  // row title, card title, section title, nav title
  bodyL:       { fontFamily: fonts.regular, fontSize: 17, lineHeight: 26 },  // notes
  button:      { fontFamily: fonts.bold,    fontSize: 17, lineHeight: 20 },  // primary 52pt button
  navAction:   { fontFamily: fonts.medium,  fontSize: 17, lineHeight: 20 },  // Cancel / back label (primary color)
  body:        { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },  // inputs, auth subtitle
  bodyMedium:  { fontFamily: fonts.medium,  fontSize: 16, lineHeight: 21 },  // settings row labels, secondary buttons
  callout:     { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },  // empty-state body, detail meta
  chip:        { fontFamily: fonts.medium,  fontSize: 15, lineHeight: 18 },  // chips / pills
  subhead:     { fontFamily: fonts.medium,  fontSize: 14, lineHeight: 19 },  // journal meta "#4 · Yesterday"
  footnote:    { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },  // notices, sheet descriptions
  label:       { fontFamily: fonts.medium,  fontSize: 13, lineHeight: 18 },  // field / group labels, counts
  caption:     { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },  // helper text, group footers
  small:       { fontFamily: fonts.medium,  fontSize: 12, lineHeight: 16 },  // Required/Optional, weekday headers, legends
  tab:         { fontFamily: fonts.medium,  fontSize: 11, lineHeight: 13 },  // tab bar labels
  badge:       { fontFamily: fonts.bold,    fontSize: 11, lineHeight: 13 },  // photo count badge
} as const;

export const space = { xxs: 2, xs: 4, s: 6, m: 8, ml: 10, l: 12, xl: 14, xxl: 16, x3: 20, x4: 22, x5: 24, x6: 28 } as const;

export const layout = {
  screenPadding: 16,        // lists, editor, settings, season
  readingPadding: 20,       // day detail, public day, sheets, delete account
  authPadding: 24,          // welcome, email auth
  tabRootHeaderHeight: 62,  // Days / Season / Settings header (below status bar)
  navBarHeight: 52,         // pushed screens & full-screen modals
  sheetNavHeight: 44,
  tabBarContentHeight: 50,  // + bottom safe area (34 on notched phones) = 84
  minTouch: 44,
  journalThumb: 84,         // list row thumbnail
  calendarThumb: 72,
  editorPhotoTile: 96,
  galleryHeight: 400,       // owner detail
  publicGalleryHeight: 300,
  calendarCell: 44,         // circle 38
  fabHeight: 52,
  primaryButton: 52,
  secondaryButton: 50,
  inputHeight: 50,          // auth / profile / DELETE field; 48 for gear add + suggest resort
  chipHeight: 40,           // selectable pills in editor
  tagChipHeight: 32,        // read-only tag pill
  skiChipHeight: 34,        // read-only ski chip
  settingsRow: 52,          // 64 for sign-in method rows, 58 for gear rows
} as const;

export const radius = {
  xs: 5,      // small badges
  s: 6,       // day badge, photo-count badge
  m: 8,       // segmented items, ski chip, viewer thumbs, icon tiles (30pt)
  input: 10,  // inputs, segmented track, gear add button
  l: 12,      // primary buttons, thumbnails, notices, auth segmented track
  card: 14,   // grouped lists, link cards, dashed empty cards
  xl: 16,     // stat cards, sheet top corners
  pill: 999,  // chips, tag pills, small pill buttons, FAB
} as const;

// iOS shadows (shadowColor/Offset/Opacity/Radius). Android elevation optional.
export const shadow = {
  primaryButton: { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.45, shadowRadius: 10 },
  fab:           { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 14 },
  seasonCard:    { shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 12 },
  floating:      { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3 },  // detail Back/Edit/⋯
  segment:       { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.12, shadowRadius: 2 },  // selected segment
  sheet:         { shadowColor: '#0F172A', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.15, shadowRadius: 30 },
  toast:         { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.4, shadowRadius: 20 },
  mapMarker:     { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 6 },
} as const;

export const motion = {
  quick: 150,    // map marker select
  standard: 200, // toggle, donut highlight, gallery dot width, bar color
  toast: 2400,   // toast visible duration
  spinner: 800,  // one rotation, linear
  // Respect AccessibilityInfo.isReduceMotionEnabled(): drop spring/scale, keep opacity fades.
} as const;
