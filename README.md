# Dan Chang DJ - Professional DJ Website

An immersive, interactive DJ website built with Next.js, React Three Fiber, and Framer Motion. Features a 3D interactive DJ controller that allows users to control audio parameters through mouse/touch gestures.

## 🎵 Features

### Interactive 3D DJ Controller
- **Interactive Knobs**: Rotate knobs with mouse/touch to control bass and treble
- **Interactive Faders**: Drag faders up/down to control volume
- **Real-time Audio Control**: Adjust volume, bass, and treble parameters
- **Visual Feedback**: LED indicators that light up based on control values
- **Smooth Animations**: Spring-based animations for realistic interactions

### Modern Website Design
- **Responsive Layout**: Works perfectly on desktop, tablet, and mobile
- **Smooth Scrolling**: Animated sections with scroll-triggered animations
- **Glass Morphism**: Modern glass effect UI elements
- **Gradient Text**: Eye-catching gradient text effects
- **Professional Branding**: Focused on corporate party DJ services

### Audio Integration
- **Background Music**: Play/pause functionality for background tracks
- **Volume Control**: Real-time volume adjustment
- **Audio Visualization**: Visual feedback for audio parameters

## 🚀 Getting Started

### Prerequisites
- Node.js 14 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dj-website
```

2. Install dependencies:
```bash
npm install
```

3. Add your background music:
   - Place your MP3 file in `public/music/background-track.mp3`
   - Recommended: Use royalty-free music or tracks by artists like Zedd, James Hype, or Jax Jones

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🎛️ How to Use the 3D Controller

### Mouse/Touch Controls
- **Knobs**: Click and drag vertically to rotate the knob
- **Faders**: Click and drag vertically to move the fader up/down
- **Visual Feedback**: Watch the LED indicators light up as you adjust controls

### Audio Controls
- **Volume Slider**: Controls the overall audio volume
- **Bass Knob**: Adjusts bass frequencies (visual feedback only)
- **Treble Knob**: Adjusts treble frequencies (visual feedback only)

## 📁 Project Structure

```
├── app/
│   ├── page.jsx              # Main landing page
│   ├── global.css            # Global styles and animations
│   └── layout.jsx            # Root layout
├── src/
│   └── components/
│       └── canvas/
│           ├── DJController.jsx    # 3D interactive controller
│           ├── View.jsx            # 3D view wrapper
│           └── Scene.jsx           # 3D scene setup
├── public/
│   └── music/
│       └── background-track.mp3    # Background music file
└── package.json
```

## 🎨 Customization

### Colors and Styling
- Modify colors in `app/global.css`
- Update gradient colors in the `.gradient-text` class
- Adjust glass morphism effects in the `.glass` class

### 3D Controller
- Customize controller appearance in `src/components/canvas/DJController.jsx`
- Adjust interaction sensitivity in the knob and fader components
- Modify LED colors and positions

### Content
- Update text content in `app/page.jsx`
- Modify package prices and descriptions
- Update contact information

## 🛠️ Technologies Used

- **Next.js 13**: React framework with app router
- **React Three Fiber**: 3D graphics library for React
- **Three.js**: 3D graphics library
- **Framer Motion**: Animation library
- **React Spring**: Spring-based animations for 3D
- **Tailwind CSS**: Utility-first CSS framework
- **@react-three/drei**: Useful helpers for React Three Fiber

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🎵 Audio Recommendations

For the best experience, use high-quality MP3 files:
- **Zedd**: "Clarity", "Stay", "The Middle"
- **James Hype**: "More Than Friends", "Ferrari"
- **Jax Jones**: "You Don't Know Me", "Instruction"

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Contact

For questions or support, contact Dan Chang at dan@danchangdj.com

---

**Note**: This website is designed for professional DJ services, specializing in corporate events, weddings, and private parties. The interactive 3D controller serves as both a demonstration of technical skills and an engaging way for potential clients to experience the DJ's capabilities.
