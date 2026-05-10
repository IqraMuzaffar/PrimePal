# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the landing page with professional navy & blue colors matching teacher/admin portals, wider centered role cards, and footer admin link.

**Architecture:** Single-file modification to `frontend/app/page.tsx` — update visual styling (colors, spacing, sizing) only. Keep all existing animation components and structure intact.

**Tech Stack:** Next.js 14, React, TypeScript, Tailwind CSS (via className), inline styles

---

## File Structure

**Files to Modify:**
- `frontend/app/page.tsx` — Main landing page component (lines 1-153)

**No New Files**

**No Test Files** — This is a visual redesign verified through manual testing checklist in spec

---

## Task 1: Update Background Gradient to Professional Navy

**Files:**
- Modify: `frontend/app/page.tsx:40`

- [ ] **Step 1: Update main background gradient from indigo/violet/purple to navy/blue**

Find the main container div (currently line 40):
```tsx
<div className="h-screen bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden flex flex-col items-center justify-center px-4 selection:bg-white/20">
```

Replace with:
```tsx
<div className="h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 selection:bg-white/20" style={{ background: 'linear-gradient(145deg, #0b1535 0%, #0f1e4a 45%, #162660 100%)' }}>
```

**Why inline style:** The gradient has 3 stops at specific percentages that are easier to express in CSS than Tailwind classes.

- [ ] **Step 2: Start dev server and verify background color**

Run:
```bash
cd frontend && npm run dev
```

Visit: `http://localhost:3000`

Expected: Deep navy gradient background (dark blue, not purple)

- [ ] **Step 3: Commit background change**

```bash
git add frontend/app/page.tsx
git commit -m "style(landing): update background to professional navy gradient"
```

---

## Task 2: Update Decorative Background Blobs to Blue Spectrum

**Files:**
- Modify: `frontend/app/page.tsx:43-45`

- [ ] **Step 1: Update ambient background blob colors**

Find the three decorative blobs (currently lines 43-45):
```tsx
<div className="absolute top-[15%] left-[20%] w-[28rem] h-[28rem] bg-indigo-400/15 rounded-full blur-[100px]" />
<div className="absolute bottom-[10%] right-[15%] w-[34rem] h-[34rem] bg-violet-400/15 rounded-full blur-[120px]" />
<div className="absolute top-[60%] left-[55%] w-[20rem] h-[20rem] bg-fuchsia-400/10 rounded-full blur-[80px]" />
```

Replace with:
```tsx
<div className="absolute top-[15%] left-[20%] w-[28rem] h-[28rem] rounded-full blur-[100px]" style={{ background: 'radial-gradient(circle, rgba(67,97,238,0.15) 0%, transparent 70%)' }} />
<div className="absolute bottom-[10%] right-[15%] w-[34rem] h-[34rem] rounded-full blur-[120px]" style={{ background: 'radial-gradient(circle, rgba(124,158,255,0.1) 0%, transparent 70%)' }} />
<div className="absolute top-[60%] left-[55%] w-[20rem] h-[20rem] rounded-full blur-[80px]" style={{ display: 'none' }} />
```

**Note:** Third blob is hidden to reduce visual clutter with new color scheme. Can be removed entirely or kept for future use.

- [ ] **Step 2: Verify blob colors in browser**

Refresh: `http://localhost:3000`

Expected: Subtle blue glows instead of purple/pink

- [ ] **Step 3: Commit blob changes**

```bash
git add frontend/app/page.tsx
git commit -m "style(landing): update decorative blobs to blue spectrum"
```

---

## Task 3: Update Hero Section Colors (Logo, Title, Tagline, Skills)

**Files:**
- Modify: `frontend/app/page.tsx:53-75`

- [ ] **Step 1: Update logo badge to blue gradient**

Find the logo badge (currently line 53):
```tsx
<AnimatedHeroItem className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl mb-4 border border-white/20 shadow-lg shadow-black/10">
```

Replace with:
```tsx
<AnimatedHeroItem className="inline-flex items-center justify-center backdrop-blur-md rounded-2xl mb-4 border border-white/20" style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #4361ee 0%, #7c9eff 100%)', boxShadow: '0 6px 24px rgba(67,97,238,0.4)' }}>
```

- [ ] **Step 2: Update title font size**

Find the title (currently line 57):
```tsx
<AnimatedHeroH1 className="text-5xl sm:text-7xl font-black text-white tracking-tight leading-none">
```

Replace with:
```tsx
<AnimatedHeroH1 className="font-black text-white tracking-tight leading-none" style={{ fontSize: '56px', letterSpacing: '-0.02em' }}>
```

- [ ] **Step 3: Update tagline color and size**

Find the tagline (currently line 61):
```tsx
<AnimatedHeroP className="text-indigo-200 text-lg sm:text-xl font-semibold mt-4">
```

Replace with:
```tsx
<AnimatedHeroP className="font-semibold mt-4" style={{ color: '#93c5fd', fontSize: '18px' }}>
```

- [ ] **Step 4: Update skills pills color**

Find the skills container (currently line 65-75), update the span styling:
```tsx
<AnimatedHeroItem className="flex items-center justify-center gap-4 mt-4">
  {pillars.map(({ icon: Icon, label }) => (
    <span
      key={label}
      className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
      style={{ color: 'rgba(147,197,253,0.7)' }}
    >
      <Icon size={14} strokeWidth={2.5} />
      {label}
    </span>
  ))}
</AnimatedHeroItem>
```

Change only the className on the inner span from `className="flex items-center gap-1.5 text-indigo-300/70 text-xs font-bold uppercase tracking-wider"` to include the inline style.

- [ ] **Step 5: Verify hero section in browser**

Refresh: `http://localhost:3000`

Expected:
- Blue gradient logo badge with shadow
- Light blue tagline and skills pills
- Title at 56px font size

- [ ] **Step 6: Commit hero section changes**

```bash
git add frontend/app/page.tsx
git commit -m "style(landing): update hero section to blue color scheme"
```

---

## Task 4: Update Role Cards Container and Sizing

**Files:**
- Modify: `frontend/app/page.tsx:79-143`

- [ ] **Step 1: Update cards container for wider, centered layout**

Find the role cards container (currently line 79):
```tsx
<div className="flex flex-col sm:flex-row gap-5 sm:gap-6 w-full max-w-2xl relative z-10">
```

Replace with:
```tsx
<div className="flex flex-col sm:flex-row gap-5 sm:gap-6 w-full relative z-10" style={{ maxWidth: '800px' }}>
```

**Why:** Increases max-width from 2xl (672px) to 800px for wider cards.

- [ ] **Step 2: Update student card sizing**

Find AnimatedCard wrapper for student (currently line 81):
```tsx
<AnimatedCard xOffset={-36} delay={0.5} className="flex-1">
```

Keep as-is (flex-1 allows cards to grow).

Find AnimatedCardInner for student (currently line 83):
```tsx
<AnimatedCardInner className="relative bg-gradient-to-br from-amber-400 to-orange-500 rounded-[1.5rem] p-6 sm:p-7 shadow-2xl shadow-orange-600/20 border border-amber-300/30 overflow-hidden">
```

Replace with:
```tsx
<AnimatedCardInner className="relative bg-gradient-to-br from-amber-400 to-orange-500 overflow-hidden" style={{ maxWidth: '380px', borderRadius: '24px', padding: '40px 32px', boxShadow: '0 20px 60px rgba(245,158,11,0.35)', border: '1px solid rgba(255,255,255,0.2)' }}>
```

**Changes:** Increased max-width to 380px, padding to 40px 32px, border-radius to 24px, stronger shadow.

- [ ] **Step 3: Update student card title and description sizing**

Find student card title (currently line 97):
```tsx
<h2 className="text-2xl sm:text-3xl font-black text-white mb-1.5 leading-tight">
```

Replace with:
```tsx
<h2 className="font-black text-white mb-1.5 leading-tight" style={{ fontSize: '28px' }}>
```

Find student card description (currently line 100):
```tsx
<p className="text-amber-100/90 text-sm font-medium leading-relaxed">
```

Replace with:
```tsx
<p className="font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
```

- [ ] **Step 4: Verify student card changes**

Refresh: `http://localhost:3000`

Expected: Student card is wider (380px max), more padding, larger text

- [ ] **Step 5: Commit student card changes**

```bash
git add frontend/app/page.tsx
git commit -m "style(landing): increase student card width and sizing"
```

---

## Task 5: Update Teacher Card Colors and Sizing

**Files:**
- Modify: `frontend/app/page.tsx:113-142`

- [ ] **Step 1: Update teacher card gradient to green**

Find AnimatedCardInner for teacher (currently line 115):
```tsx
<AnimatedCardInner className="relative bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[1.5rem] p-6 sm:p-7 shadow-2xl shadow-teal-600/20 border border-emerald-400/30 overflow-hidden">
```

Replace with:
```tsx
<AnimatedCardInner className="relative overflow-hidden" style={{ maxWidth: '380px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', borderRadius: '24px', padding: '40px 32px', boxShadow: '0 20px 60px rgba(16,185,129,0.35)', border: '1px solid rgba(255,255,255,0.2)' }}>
```

**Changes:** Green gradient, increased max-width to 380px, padding to 40px 32px, border-radius to 24px, stronger shadow with green tint.

- [ ] **Step 2: Update teacher card title and description sizing**

Find teacher card title (currently line 129):
```tsx
<h2 className="text-2xl sm:text-3xl font-black text-white mb-1.5 leading-tight">
```

Replace with:
```tsx
<h2 className="font-black text-white mb-1.5 leading-tight" style={{ fontSize: '28px' }}>
```

Find teacher card description (currently line 132):
```tsx
<p className="text-emerald-100/90 text-sm font-medium leading-relaxed">
```

Replace with:
```tsx
<p className="font-medium leading-relaxed" style={{ color: 'rgba(255,255,255,0.9)', fontSize: '15px' }}>
```

- [ ] **Step 3: Verify teacher card changes**

Refresh: `http://localhost:3000`

Expected: Teacher card is green gradient, wider (380px max), more padding, larger text

- [ ] **Step 4: Commit teacher card changes**

```bash
git add frontend/app/page.tsx
git commit -m "style(landing): update teacher card to green gradient and increase sizing"
```

---

## Task 6: Add Admin Link to Footer

**Files:**
- Modify: `frontend/app/page.tsx:146-149`

- [ ] **Step 1: Update footer tagline color**

Find the footer tagline (currently line 146):
```tsx
<AnimatedFooter className="text-indigo-300/40 text-xs font-medium mt-8 relative z-10 text-center">
```

Replace with:
```tsx
<AnimatedFooter className="text-xs font-medium mt-8 relative z-10 text-center" style={{ color: 'rgba(147,197,253,0.4)' }}>
```

- [ ] **Step 2: Add admin link paragraph after tagline**

After the closing `</AnimatedFooter>` tag (currently line 149), add:

```tsx
<p className="text-xs font-medium mt-3 relative z-10 text-center" style={{ color: 'rgba(147,197,253,0.5)' }}>
  Are you an admin?{" "}
  <Link
    href="/admin/login"
    className="font-semibold"
    style={{ color: '#93c5fd', borderBottom: '1px solid rgba(147,197,253,0.5)', textDecoration: 'none' }}
  >
    Sign in here
  </Link>
</p>
```

**Note:** Link component is already imported at top of file (line 8).

- [ ] **Step 3: Verify admin link in browser**

Refresh: `http://localhost:3000`

Expected:
- Footer tagline in light blue with reduced opacity
- New line below: "Are you an admin? Sign in here"
- Link is underlined and navigates to `/admin/login`

- [ ] **Step 4: Test admin link navigation**

Click "Sign in here" link

Expected: Navigates to `/admin/login` page

- [ ] **Step 5: Commit footer changes**

```bash
git add frontend/app/page.tsx
git commit -m "feat(landing): add admin link to footer"
```

---

## Task 7: Visual Verification and Testing

**Files:**
- Verify: `frontend/app/page.tsx` (all changes)
- Compare: `frontend/app/teacher/login/page.tsx` (color reference)
- Compare: `frontend/app/admin/login/page.tsx` (color reference)

- [ ] **Step 1: Full visual inspection on desktop**

Open browser: `http://localhost:3000`

Check against spec success criteria:
1. Background matches teacher/admin login colors (deep navy)
2. Student card is orange, teacher card is green
3. Cards are visibly wider and centered
4. Admin link appears in footer
5. Floating emojis animate
6. Logo badge is blue with shadow
7. All text colors are light blue

- [ ] **Step 2: Test responsive behavior on mobile**

Resize browser to mobile width (<768px)

Expected:
- Cards stack vertically
- Text sizes scale appropriately
- All content remains readable
- No horizontal scrolling

- [ ] **Step 3: Compare colors with teacher login page**

Open: `http://localhost:3000/teacher/login`

Compare background gradients side-by-side

Expected: Background colors match exactly (navy gradient)

- [ ] **Step 4: Compare colors with admin login page**

Open: `http://localhost:3000/admin/login`

Compare background gradients side-by-side

Expected: Background colors match exactly (navy gradient)

- [ ] **Step 5: Test all links**

From landing page:
- Click student card → should navigate to `/student/play`
- Click teacher card → should navigate to `/teacher/login`
- Click admin link → should navigate to `/admin/login`

Expected: All links work correctly

- [ ] **Step 6: Check browser console**

Open browser DevTools console

Expected: No errors or warnings

- [ ] **Step 7: Test animations**

Refresh page and observe:
- Floating emojis animate smoothly
- Hero section fades in
- Cards slide in from left/right
- Footer fades in

Expected: All animations work unchanged

- [ ] **Step 8: Final commit**

```bash
git add frontend/app/page.tsx
git commit -m "style(landing): complete professional redesign with navy theme

- Update background to professional navy gradient matching login pages
- Increase card width to 380px max with better centering
- Change teacher card from emerald to green gradient
- Update all text colors to light blue (#93c5fd)
- Add admin link to footer
- Update decorative blobs to blue spectrum
- Maintain all existing animations and responsive behavior"
```

---

## Self-Review Checklist

**Spec Coverage:**
- ✅ Background gradient (Task 1)
- ✅ Decorative blobs (Task 2)
- ✅ Logo badge colors (Task 3)
- ✅ Text colors - tagline and skills (Task 3)
- ✅ Card sizing - max-width 380px (Task 4, Task 5)
- ✅ Card container - max-width 800px (Task 4)
- ✅ Teacher card color - green gradient (Task 5)
- ✅ Footer admin link (Task 6)
- ✅ Visual verification (Task 7)
- ✅ Responsive behavior (Task 7)

**Placeholder Scan:**
- ✅ No TBD, TODO, or "implement later"
- ✅ All code blocks are complete
- ✅ All colors are exact hex values
- ✅ All sizing is specific (px values)
- ✅ All file paths are exact
- ✅ All test steps have expected output

**Type Consistency:**
- ✅ Color values consistent across tasks (#93c5fd for light blue)
- ✅ Sizing values consistent (380px max-width, 28px title, 15px description)
- ✅ Gradient syntax consistent (linear-gradient with deg)
- ✅ Component names match existing imports (AnimatedHeroItem, AnimatedCard, etc.)

**No Gaps Found**
