# Transition Glitch Fix - Experience Section

## 🐛 Issue Identified

**Problem**: When scrolling to the "experience" section, a brief distraction layer/flash appears during the transition.

**Root Cause**: Poor timing coordination between fade-out and fade-in animations:
1. Old layers fade out in 500ms
2. System waits 250ms before starting new layers
3. New layers then take 600ms to fade in
4. Result: ~250ms gap where both old and new layers have low opacity → visible flash/glitch

---

## ✅ Solutions Implemented

### 1. Reversed Transition Order (SceneOrchestrator.js)
**Changed from**: Fade out old → Wait 250ms → Fade in new  
**Changed to**: Fade in new → Wait 50ms → Fade out old

```javascript
// Before (lines 424-439)
// Fade out first
Object.values(this.layers).forEach(wrapper => {
  if (!nextLayers.has(wrapper)) {
    this._fadeOut(wrapper.object3d, instant ? 0 : 0.5);
  }
});

// Then wait 250ms before fading in
const fadeInDelay = instant ? 0 : 250;
setTimeout(() => { /* fade in */ }, fadeInDelay);

// After (lines 424-439)
// Fade in first (creates crossfade overlap)
[...next.front, ...next.back].forEach((wrapper, i) => {
  this._fadeIn(wrapper.object3d, instant ? 0 : 0.5);
});

// Then fade out with small delay (50ms overlap)
const fadeOutDelay = instant ? 0 : 50;
setTimeout(() => { /* fade out */ }, fadeOutDelay);
```

**Why This Fixes It**:
- Creates a **crossfade effect** where new layers appear before old ones fully disappear
- 50ms overlap ensures smooth transition with no visibility gap
- Prevents the "black flash" or "distraction layer" glitch

---

### 2. Improved Fade-Out Visibility Logic (SceneOrchestrator.js)

**Problem**: `visible = false` was being set exactly when opacity reached 0, sometimes causing premature hiding.

**Solution**: Added buffer time and opacity verification.

```javascript
// Before (lines 131-148)
setTimeout(() => {
  if (obj.userData.targetOpacity === 0) {
    obj.visible = false;
  }
}, dur * 1000);

// After (lines 131-160)
setTimeout(() => {
  if (obj.userData.targetOpacity === 0) {
    // Double-check opacity is actually near zero
    let actuallyZero = true;
    obj.traverse(o => {
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(m => {
          if (m.opacity > 0.01) actuallyZero = false;
        });
      }
    });
    
    if (actuallyZero) {
      obj.visible = false;
    }
  }
}, dur * 1000 + 100); // +100ms buffer
```

**Benefits**:
- 100ms buffer prevents race conditions
- Verifies all materials are actually transparent before hiding
- Prevents premature visibility toggle during crossfade

---

### 3. Shimmer Effect Guarding (DataLattice.js)

**Problem**: Shimmer animations were overriding fade opacity values during transitions.

**Solution**: Only apply shimmer when layer is fully visible and not fading.

```javascript
// Before (lines 80-100)
// Shimmer - only if not being animated by fade system
if (!this.group.userData.isFading && this.group.userData.targetOpacity === 1) {
  const shimmer = 0.15 + Math.sin(this.pulsePhase * 2) * 0.05;
  this.points.material.opacity = shimmer * 4;
  this.links.material.opacity = shimmer * 2;
}

// After (lines 80-101)
const isFading = this.group.userData.isFading;
const isVisible = this.group.visible && this.group.userData.targetOpacity === 1;
const pointsOpacity = this.points.material.opacity;
const isFullyFadedIn = pointsOpacity > 0.7; // Only shimmer when mostly visible

if (!isFading && isVisible && isFullyFadedIn) {
  const shimmer = 0.15 + Math.sin(this.pulsePhase * 2) * 0.05;
  const basePoints = this.points.material.userData.baseOpacity || 1;
  const baseLinks = this.links.material.userData.baseOpacity || 1;
  this.points.material.opacity = Math.min(0.8, shimmer * 4) * basePoints;
  this.links.material.opacity = Math.min(0.3, shimmer * 2) * baseLinks;
}
```

**Key Improvements**:
- Added `isFullyFadedIn` check (opacity > 0.7)
- Respects `baseOpacity` set by fade system
- Multiplies shimmer by base opacity instead of replacing it

---

### 4. Twinkle Effect Guarding (GalaxyBackground.js)

**Problem**: Twinkle effect was fighting with fade animations.

**Solution**: Only twinkle when fully visible.

```javascript
// Before (lines 58-66)
// Twinkle effect
const twinkle = 0.4 + Math.sin(this.timeAcc * 2) * 0.2;
this.stars.material.opacity = twinkle;

// After (lines 58-76)
const isFading = this.group.userData.isFading;
const currentOpacity = this.stars.material.opacity;
const isFullyVisible = this.group.visible && this.group.userData.targetOpacity === 1;
const isFullyFadedIn = currentOpacity > 0.5;

if (!isFading && isFullyVisible && isFullyFadedIn) {
  const twinkle = 0.4 + Math.sin(this.timeAcc * 2) * 0.2;
  const baseOpacity = this.stars.material.userData.baseOpacity || 0.6;
  this.stars.material.opacity = twinkle * baseOpacity;
}
```

---

### 5. Neural Web Shimmer Guarding (NeuralWeb.js)

**Problem**: Neural web shimmer and highlight effects interfering with transitions.

**Solution**: Guard all opacity animations.

```javascript
// Before (lines 206-240)
const shimmer = 0.15 + Math.sin(this.pulsePhase) * 0.05;
this.linkLines.material.opacity = shimmer;

// After (lines 206-248)
const isFading = this.group.userData.isFading;
const isVisible = this.group.visible && this.group.userData.targetOpacity === 1;
const currentOpacity = this.linkLines.material.opacity;
const isFullyFadedIn = currentOpacity > 0.12;

const shimmer = 0.15 + Math.sin(this.pulsePhase) * 0.05;

if (!isFading && isVisible && isFullyFadedIn) {
  const baseOpacity = this.linkLines.material.userData.baseOpacity || 1;
  this.linkLines.material.opacity = shimmer * baseOpacity;
}
```

---

## 📊 Technical Details

### Transition Timeline Comparison

**Before (Buggy)**:
```
Time    0ms    250ms   500ms   750ms   850ms
Old     [====fade out====][hidden]
New                   [delay][====fade in====][visible]
Result  ████▓▓▓▓░░░░░░░░░░░░░░░▒▒▒▒▓▓▓▓████
                      ↑ GLITCH GAP
```

**After (Fixed)**:
```
Time    0ms    50ms    550ms   600ms
Old     ████[====fade out====][hidden]
New     [====fade in====][visible]
Result  ████▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓████
             ↑ CROSSFADE OVERLAP
```

---

## 🎯 Key Principles Applied

### 1. Crossfade Over Gap
- Always start fading in before fading out completes
- Minimum 50-100ms overlap ensures smooth transition
- Prevents visibility "valley" that causes flashing

### 2. Opacity Verification
- Don't rely solely on target values
- Check actual material opacity before hiding
- Add buffer time for race condition protection

### 3. Animation Hierarchy
- Fade system has priority over layer animations
- Layer animations respect `baseOpacity` from fade system
- Only apply effects when layer is fully visible

### 4. State Checks
- `isFading`: Is fade animation active?
- `targetOpacity`: What opacity should layer reach?
- `currentOpacity`: What is actual material opacity?
- `isFullyFadedIn`: Is opacity high enough for effects?

---

## 🧪 Testing Checklist

- [x] Scroll to experience section from hero
- [x] Scroll to experience section from about
- [x] Scroll to experience section from work
- [x] Fast scrolling through experience
- [x] Slow scrolling through experience
- [x] Scroll back and forth rapidly
- [x] Check all 7 sections for similar issues
- [x] Test on mobile (different frame rates)
- [x] Test with reduced motion preference
- [x] Verify shimmer effects still work when visible
- [x] Verify twinkle effects still work when visible

---

## 📁 Files Modified

1. **src/js/hero/SceneOrchestrator.js**
   - Lines 131-160: Enhanced `_fadeOut()` with opacity verification
   - Lines 388-440: Reversed transition order (crossfade technique)

2. **src/js/hero/layers/DataLattice.js**
   - Lines 80-101: Added shimmer effect guarding

3. **src/js/hero/layers/GalaxyBackground.js**
   - Lines 58-76: Added twinkle effect guarding

4. **src/js/hero/layers/NeuralWeb.js**
   - Lines 206-248: Added shimmer and highlight guarding

---

## 🚀 Performance Impact

- **No Performance Degradation**: Same animation logic, just better conditions
- **Actually Faster**: Prevents unnecessary opacity changes during transitions
- **Smoother**: Crossfade eliminates visual discontinuity
- **GPU-Friendly**: Fewer material property changes per frame during fade

---

## 🔮 Future Improvements

1. **Unified Transition Manager**
   - Centralized state machine for all layer transitions
   - Queue-based system for complex multi-layer switches
   
2. **Adaptive Timing**
   - Adjust crossfade duration based on current FPS
   - Instant transitions on low-end devices
   
3. **Preemptive Fading**
   - Start fading based on scroll velocity prediction
   - Ultra-smooth transitions on fast scrolling

---

## 📝 Lessons Learned

1. **Order Matters**: In visual transitions, fade-in before fade-out prevents gaps
2. **Verify State**: Don't trust target values alone, check actual state
3. **Buffer Time**: Always add small delays to prevent race conditions
4. **Hierarchy**: Lower-level animations must respect higher-level state
5. **Crossfade > Sequential**: Overlapping animations are smoother than sequential

---

**Status**: ✅ Fixed and Tested  
**Date**: November 1, 2025  
**Impact**: High (user-facing visual quality improvement)  
**Risk**: Low (no breaking changes, only timing adjustments)
