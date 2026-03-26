# FillIt Brand Guidelines

## 1. Concept & Voice
FillIt is a trustworthy, lightning-fast application designed to simplify document scanning, auto-filling, and PDF generation with the help of strictly audited AI. The brand voice is **secure, professional, clean, and modern.** 

## 2. Logo & App Icon
The FillIt app icon is a sleek, glassmorphic 3D rendering. It should be used:
*   **As the main App Icon:** 1024x1024 solid PNG for iOS, and as a padded foreground image over `#0066CC` for Android Adaptive Icons.
*   **Without Text:** The logo mark stands alone on mobile home screens.
*   **Clear Space:** Allow at least 20% padding around the icon when placed in marketing materials.

## 3. Brand Colors
These core colors anchor the design system and are officially registered in `apps/mobile/src/theme/tokens/colors.ts`:

### Primary Palette
*   **Brand Blue (`#0066CC`):** The primary color for trust, links, primary buttons, and Android's splash/adaptive backgrounds.
*   **Dark Mode Blue (`#5EA6FF`):** A luminous variant used when the app shifts to its dark UI to reduce eye strain.

### Secondary Palette
*   **Indigo Focus (`#5C6BC0` / `#9FA8DA`):** Used for subtle accents, secondary chip elements, and active states.

### Surfaces
*   **Clean Surfaces:** True white (`#FFFFFF`) to off-white (`#F5F5F5`) for cards and forms.
*   **Dark Surfaces:** Deep blacks (`#121212`) and elevated greys (`#1E1E1E`) to give dark mode cards depth without stark borders.

## 4. Typography
*   **Inter (Sans Serif):** The primary font for all UI elements, headings, body text, and structural components. Its high legibility is ideal for form-filling.
*   **JetBrains Mono (Monospace):** Reserved purely for technical data, parsed OCR strings, or cryptographic keys where distinct character recognition is vital.

## 5. UI Application Notes
*   **Splash Screens:** The application opens on a bright white (`#F5F5F5`) or deep black (`#121212`) screen showcasing the logo centrally aligned (no text).
*   **Corner Radii:** Use the soft radii defined in `spacing.ts` (e.g. 12px or 16px) for cards to complement the soft edges of the glassmorphic icon.
*   **Shadows:** Rely on soft, diffuse drop-shadows (elevation tokens) rather than hard strokes to maintain the modern, "light" scanning theme.
