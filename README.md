# Interactive Portfolio Website with Three.js

A modern, interactive portfolio website featuring parallax effects, 3D backgrounds, and smooth transitions. Built with Three.js and modern web technologies.

## 🌐 Live Demo

**[View Live Website](https://satyagames.vercel.app/)** ✨

Experience the interactive portfolio live on Vercel. The site features smooth transitions, 3D effects, and responsive design across all devices.

## 🚀 Technical Stack

### Core Technologies
- **HTML5** - Semantic markup and modern web standards
- **CSS3** - Advanced styling with flexbox, grid, and animations
- **JavaScript (ES6+)** - Modern JavaScript for interactive features

### Key Libraries & Frameworks
- **Three.js** - 3D graphics and WebGL rendering
  - Used for creating immersive 3D background effects
  - Handles camera movements and parallax effects
  - Custom shaders for visual effects

- **GSAP (GreenSock Animation Platform)** - Animation library
  - Smooth section transitions
  - Scroll-based animations
  - Timeline animations for experience section

- **Vite** - Next Generation Frontend Tooling
  - Fast hot module replacement (HMR)
  - Efficient bundling
  - Optimized build process

### Features
- Responsive design that works across all devices
- Smooth section transitions with GSAP
- Interactive 3D background with Three.js
- Custom scrolling behavior
- Glassmorphism UI effects
- Progressive loading with custom loader

## 📦 Installation

### Prerequisites
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher) or yarn

### Windows Installation
```powershell
# Clone the repository
git clone https://github.com/satyagames/parallax-website.git

# Navigate to project directory
cd parallax-website

# Install dependencies
npm install
# or
yarn install
```

### macOS/Linux Installation
```bash
# Clone the repository
git clone https://github.com/satyagames/parallax-website.git

# Navigate to project directory
cd parallax-website

# Install dependencies
npm install
# or
yarn install
```

## 🚀 Running the Project

### Development Environment

#### Windows
```powershell
# Start development server
npm run dev
# or
yarn dev
```

#### macOS/Linux
```bash
# Start development server
npm run dev
# or
yarn dev
```

The development server will start at `http://localhost:5173`

### Production Build

#### Windows
```powershell
# Create production build
npm run build
# or
yarn build

# Preview production build
npm run preview
# or
yarn preview
```

#### macOS/Linux
```bash
# Create production build
npm run build
# or
yarn build

# Preview production build
npm run preview
# or
yarn preview
```

## 🔧 Project Structure

```
parallax-website/
├── src/                    # Source files
│   ├── assets/            # Images and other assets
│   ├── script.js          # Main JavaScript file
│   ├── style.css          # Global styles
│   └── index.html         # Main HTML file
├── static/                # Static files
│   └── textures/         # Texture files for Three.js
├── vite.config.js         # Vite configuration
└── package.json           # Project dependencies and scripts
```

## 🎨 Key Components

### Three.js Implementation
- Custom shader materials for background effects
- Optimized rendering with WebGL
- Responsive 3D scene that adapts to viewport size
- Camera controls for parallax effects

### Animation System
- GSAP-powered transitions between sections
- Smooth scrolling implementation
- Interactive elements with hover effects
- Loading animations

### Responsive Design
- Mobile-first approach
- Breakpoint-based adaptations
- Touch-friendly interactions
- Performance optimizations for mobile devices

## 🔍 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## ⚡ Performance Optimization

- Lazy loading of assets
- Optimized Three.js rendering
- Efficient animation handling
- Minified production build
- Compressed textures and assets

## 📱 Responsive Testing

The website has been tested and optimized for:
- Desktop (1920x1080 and higher)
- Laptop (1366x768)
- Tablet (768x1024)
- Mobile (375x667 and higher)

## 🛠️ Development Notes

### Local Development
- Hot Module Replacement (HMR) enabled
- Source maps for easy debugging
- ESLint configuration for code quality
- Prettier for code formatting

### Production Deployment
- Minified and optimized assets
- Gzipped files for faster loading
- Cache-optimized resources
- Environment-specific configurations

### Vercel Deployment
The website is deployed on Vercel for optimal performance and reliability. You can deploy your own version by:

1. Fork this repository
2. Sign up on [Vercel](https://vercel.com)
3. Connect your GitHub repository
4. Deploy with a single click

Current deployment: [https://satyagames.vercel.app/](https://satyagames.vercel.app/)

## 🔒 Environment Variables

Create a `.env` file in the root directory for any environment variables:

```env
VITE_PUBLIC_PATH=/
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Three.js community for resources and inspiration
- GSAP team for animation capabilities
- Vite team for the build tooling