# PrimePal Avatar Component — Dynamic Sentiment & Empathy

## Overview

The `PrimePalAvatar` component is an animated character avatar that responds to the student's affective state with different expressions and encouraging messages. It's a core part of the **Dynamic Sentiment & Avatar Empathy** feature, which manages the student's **Affective Filter** in real-time.

## Component Location

```
frontend/components/student/PrimePalAvatar.tsx
```

## Sentiment States

The avatar supports 4 distinct emotional states:

### 1. **Neutral** (Default)
- **Appearance**: Calm, attentive expression; straight mouth
- **Glow**: Indigo (soft blue)
- **Animation**: Minimal bobbing
- **Usage**: Default state when student loads the page or between interactions
- **When to use**: No special feedback needed

```tsx
<PrimePalAvatar sentiment="neutral" />
```

### 2. **Happy**
- **Appearance**: Bright smile; tilted head; rosy cheeks
- **Glow**: Green (positive energy)
- **Animation**: Head bobs gently
- **Usage**: Student is progressing well, answering correctly
- **When to use**: After a correct answer, when student is in flow state

```tsx
<PrimePalAvatar sentiment="happy" />
```

### 3. **Encouraging**
- **Appearance**: Concerned-supportive expression; tilted head; warm glow
- **Glow**: Orange (warm support)
- **Animation**: Subtle bobbing
- **Usage**: Student is struggling, needs cognitive load reduction
- **When to use**: After 3 consecutive incorrect answers OR average time > 12 seconds (when `is_frustrated=true` from backend)

```tsx
<PrimePalAvatar sentiment="encouraging" />
```

### 4. **Celebratory**
- **Appearance**: Wide smile/laugh; sparkles and emojis around avatar
- **Glow**: Orange (energetic celebration)
- **Animation**: Energetic bobbing; sparkle effects
- **Usage**: Student just succeeded after struggling
- **When to use**: First correct answer after the avatar went "encouraging"

```tsx
<PrimePalAvatar sentiment="celebratory" />
```

## Props

```typescript
interface PrimePalAvatarProps {
  sentiment?: Sentiment;  // 'neutral' | 'happy' | 'encouraging' | 'celebratory'
  size?: 'sm' | 'md' | 'lg';
  showSpeechBubble?: boolean;
  speechText?: string;
}
```

### `sentiment` (optional, default: "neutral")
The emotional state of the avatar. Determines appearance, glow color, and animations.

### `size` (optional, default: "md")
Avatar container size:
- **`'sm'`**: 80px (mobile contexts)
- **`'md'`**: 120px (standard gameplay)
- **`'lg'`**: 160px (full-screen modal or demo)

### `showSpeechBubble` (optional, default: false)
Whether to display the speech bubble with encouragement text.

### `speechText` (optional)
Text to display in the speech bubble. Only shown if `showSpeechBubble=true`.

## Usage Examples

### Basic Usage
```tsx
import PrimePalAvatar from '@/components/student/PrimePalAvatar';

export default function MyComponent() {
  return <PrimePalAvatar sentiment="happy" size="md" />;
}
```

### With Speech Bubble
```tsx
<PrimePalAvatar
  sentiment="encouraging"
  size="md"
  showSpeechBubble={true}
  speechText="Take a deep breath, you got this! 💪"
/>
```

### Dynamic State Management
```tsx
import { useState } from 'react';
import PrimePalAvatar from '@/components/student/PrimePalAvatar';

export default function GameplayComponent() {
  const [sentiment, setSentiment] = useState<'neutral' | 'happy' | 'encouraging' | 'celebratory'>('neutral');

  const handleAnswer = (isCorrect: boolean, isFrustrated: boolean) => {
    if (isFrustrated) {
      setSentiment('encouraging');
    } else if (isCorrect) {
      setSentiment('celebratory');
    } else {
      setSentiment('happy');
    }
  };

  return (
    <div>
      <PrimePalAvatar
        sentiment={sentiment}
        size="md"
        showSpeechBubble={sentiment !== 'neutral'}
        speechText={getSpeechText(sentiment)}
      />
    </div>
  );
}

function getSpeechText(sentiment: string) {
  const speeches = {
    neutral: "Ready to go?",
    happy: "Great job!",
    encouraging: "You got this! 💪",
    celebratory: "Amazing work! 🎉",
  };
  return speeches[sentiment as keyof typeof speeches] || "";
}
```

## Integration in Gameplay Loop

### In `app/student/missions/[pillar]/page.tsx`:

```tsx
import PrimePalAvatar from '@/components/student/PrimePalAvatar';
import type { LogInteractionsResponse } from '@/types/api';

export default function MissionsPage() {
  const [currentSentiment, setCurrentSentiment] = useState<'neutral' | 'happy' | 'encouraging' | 'celebratory'>('neutral');
  const [showSpeechBubble, setShowSpeechBubble] = useState(false);

  const handleAnswer = async (questionId: string, isCorrect: boolean) => {
    // Submit answer to backend
    const response = await apiFetch<LogInteractionsResponse>('/interactions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({
        pillar: currentPillar,
        results: [{ question_id: questionId, is_correct: isCorrect, time_remaining: timeLeft }],
      }),
    });

    const { is_frustrated, frustration_reason } = response;

    // Update avatar sentiment based on frustration flag
    if (is_frustrated) {
      setCurrentSentiment('encouraging');
      setShowSpeechBubble(true);
      // Generate Confidence Builder questions on next fetch
    } else if (isCorrect) {
      setCurrentSentiment('celebratory');
      setShowSpeechBubble(true);
      playHighEnergySoundEffect(); // Reinforce positive behavior
      setTimeout(() => {
        setCurrentSentiment('neutral');
        setShowSpeechBubble(false);
      }, 2000);
    } else {
      setCurrentSentiment('happy');
      setShowSpeechBubble(true);
      setTimeout(() => {
        setCurrentSentiment('neutral');
        setShowSpeechBubble(false);
      }, 1500);
    }
  };

  return (
    <div className="space-y-8">
      {/* Avatar with dynamic sentiment */}
      <div className="flex justify-center">
        <PrimePalAvatar
          sentiment={currentSentiment}
          size="md"
          showSpeechBubble={showSpeechBubble}
          speechText={getSpeechText(currentSentiment)}
        />
      </div>

      {/* Question and gameplay UI */}
      <div className="space-y-4">
        {/* Render current question */}
      </div>
    </div>
  );
}

function getSpeechText(sentiment: string) {
  const speeches: Record<string, string> = {
    neutral: "Let's go!",
    happy: "Well done! 🌟",
    encouraging: "Take a deep breath. You're doing great! 💪",
    celebratory: "Amazing! Fantastic work! 🎉",
  };
  return speeches[sentiment] || "";
}
```

## Animations

### Smooth Sentiment Transitions
The avatar uses Framer Motion's `AnimatePresence` and spring physics for smooth transitions between sentiments. Transitions take ~300-400ms, creating a polished feel without being jarring.

### Sentiment-Specific Animations
- **Neutral**: Minimal motion, calm presence
- **Happy**: Gentle head bobbing (4px range), bouncy energy
- **Encouraging**: Subtle support signal (2px bobbing), warm glow pulsing
- **Celebratory**: Energetic bobbing (8px range), sparkle effects pulsing

### Eye Blinking
All sentiments have natural blinking (~3s intervals) to maintain life-like presence.

## Accessibility

- SVG-based rendering (scales smoothly across sizes)
- High contrast between avatar and background
- Clear speech bubble text with sufficient font size (14px base)
- Reduced motion support (respects `prefers-reduced-motion` if integrated)
- Speech text is plain English with simple vocabulary

## Customization

### Changing Avatar Colors
Edit the color values in the SVG `<circle>` and `<path>` elements:

```tsx
// Head color
<circle cx="50" cy="40" r="30" fill="#FFE5B4" stroke="#FFD699" strokeWidth="1" />

// Body color
<path
  d="M 30,70 L 70,70 L 75,95 L 25,95 Z"
  fill="#4F46E5"  // Change this to any hex color
  opacity="0.8"
  stroke="#4338CA"
  strokeWidth="1"
/>
```

### Changing Glow Colors
Edit the `sentimentConfig` object and the `glowColor` / `glowIntensity` values for each sentiment.

### Adding New Sentiments
1. Add new sentiment key to `Sentiment` type:
   ```typescript
   type Sentiment = "neutral" | "happy" | "encouraging" | "celebratory" | "confused";
   ```

2. Add configuration object:
   ```typescript
   confused: {
     headRotation: -5,
     eyePosition: { x: 0, y: 2 },
     mouthShape: "M -4,-2 Q 0,-6 4,-2", // Confused expression
     headBobAmount: 1,
     glowColor: "rgba(168, 85, 247, 0.3)",
     glowIntensity: "0 0 20px rgba(168, 85, 247, 0.3)",
   }
   ```

## Testing

Use the **AvatarShowcase** component to test all states:

```tsx
import { AvatarShowcase } from '@/components/student/AvatarShowcase';

export default function DemoPage() {
  return <AvatarShowcase />;
}
```

This displays:
- All 4 sentiments side-by-side
- All 3 sizes in comparison
- Interactive controls to switch between states
- Real-time preview

## Browser Support

- Chrome/Edge: Full support (Framer Motion fully compatible)
- Firefox: Full support
- Safari: Full support (iOS 14+)
- IE11: Not supported (uses modern CSS and ES6+)

## Performance

- SVG rendering is lightweight (~2KB gzipped)
- Framer Motion animations use `transform` and `opacity` only (GPU-accelerated)
- No external image files or dependencies beyond `framer-motion`
- Typical render time: <5ms per frame at 60fps

## Related Features

- **Frustration Detection Algorithm** (backend): Detects `is_frustrated` flag
- **Adaptive Question Generation**: Uses avatar sentiment to adjust difficulty
- **Confidence Builder Questions**: LLM-generated easy questions when avatar is "encouraging"
- **Sound Effects Integration**: High-energy sounds when avatar is "celebratory"

See [AI_CONTEXT.md](../../AI_CONTEXT.md) sections 26-28 for full feature documentation.
