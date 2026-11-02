SIMANTIK Brand Assets
=====================

Files in this package are the three logo images provided for the SIMANTIK web project.

1. simantik-logo.png
   - SIMANTIK emblem and wordmark only. Original image has transparent background.
   - Suggested usage: product/brand logo in service and admin web headers, login pages, and favicon source (create a suitable cropped icon variant for favicon use).

2. kabupaten-bandung.png
   - Kabupaten Bandung crest. Original image has a white background.
   - Suggested usage: government/regional identity mark in the header, on a white/light surface. Do not redraw or recolor the official mark.

3. diskominfo.png
   - Diskominfo mark. Original image has transparent background.
   - Suggested usage: agency identity mark in the header/footer where appropriate.

Integration notes
------------------
- Preserve these source files unchanged.
- Before replacing assets, inspect current asset references and replace old logos consistently across service-web and admin-web (headers, login/splash pages, and footer, where those marks are currently used).
- Do not replace the Kabupaten Bandung crest with the SIMANTIK product logo, or vice versa; use each asset for its corresponding identity.
- Prefer existing shared components and design tokens. Keep image aspect ratios (`object-contain`), use alt text, and avoid stretching.
- Do not commit local .env files, secrets, build artifacts, or UAT backup files.
