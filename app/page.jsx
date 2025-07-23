'use client'

import dynamic from 'next/dynamic'
import { Suspense, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion'

const EnhancedDiscoBall = dynamic(() => import('@/components/canvas/DiscoBall').then((mod) => mod.EnhancedDiscoBall), { ssr: false })
const View = dynamic(() => import('@/components/canvas/View').then((mod) => mod.View), {
  ssr: false,
  loading: () => (
    <div className='flex h-96 w-full flex-col items-center justify-center'>
      <svg className='-ml-1 mr-3 h-5 w-5 animate-spin text-black' fill='none' viewBox='0 0 24 24'>
        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
        <path
          className='opacity-75'
          fill='currentColor'
          d='M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 0 1 4 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
        />
      </svg>
    </div>
  ),
})
const Common = dynamic(() => import('@/components/canvas/View').then((mod) => mod.Common), { ssr: false })

export default function Page() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)
  const [audioElement, setAudioElement] = useState(null)
  
  // Scroll animations
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 0.8])
  
  // Spring animations for smooth effects
  const springY = useSpring(y, { stiffness: 300, damping: 30 })
  const springOpacity = useSpring(opacity, { stiffness: 300, damping: 30 })
  const springScale = useSpring(scale, { stiffness: 300, damping: 30 })

  return (
    <>
      {/* Navigation */}
      <motion.nav 
        className="fixed top-0 w-full bg-black/80 backdrop-blur-sm z-50"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, type: "spring" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <motion.div 
              className="text-white text-2xl font-bold gradient-text"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.2 }}
            >
              Dan Chang
            </motion.div>
            <div className="hidden md:flex space-x-8">
              {['Home', 'About', 'Packages', 'Contact'].map((item, index) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="text-white hover:text-purple-400 transition-colors relative"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ 
                    scale: 1.1,
                    transition: { duration: 0.2 }
                  }}
                >
                  {item}
                  <motion.div
                    className="absolute -bottom-1 left-0 w-0 h-0.5 bg-purple-400"
                    whileHover={{ width: "100%" }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section id="home" className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 flex items-center justify-center relative overflow-hidden">
        {/* Enhanced Animated Background Elements */}
        <motion.div 
          className="absolute inset-0 overflow-hidden"
          style={{ y: springY, opacity: springOpacity, scale: springScale }}
        >
          {/* Floating orbs with complex animations */}
          <motion.div 
            className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
              x: [0, 50, 0],
              y: [0, -30, 0]
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <motion.div 
            className="absolute top-40 right-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
            animate={{
              scale: [1.2, 1, 1.2],
              rotate: [360, 180, 0],
              x: [0, -50, 0],
              y: [0, 30, 0]
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
          />
          <motion.div 
            className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [180, 360, 180],
              x: [0, 30, 0],
              y: [0, -50, 0]
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2
            }}
          />
          
          {/* Additional floating elements */}
          <motion.div 
            className="absolute top-1/4 right-1/4 w-32 h-32 bg-yellow-400 rounded-full mix-blend-multiply filter blur-lg opacity-30"
            animate={{
              scale: [0.8, 1.2, 0.8],
              rotate: [0, 90, 180, 270, 360],
              x: [0, 20, 0, -20, 0],
              y: [0, -20, 0, 20, 0]
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <motion.div 
            className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-cyan-400 rounded-full mix-blend-multiply filter blur-lg opacity-40"
            animate={{
              scale: [1.2, 0.8, 1.2],
              rotate: [360, 270, 180, 90, 0],
              x: [0, -30, 0, 30, 0],
              y: [0, 30, 0, -30, 0]
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5
            }}
          />
        </motion.div>
        {/* Background Music Player */}
        <div className="absolute top-4 right-4 z-10">
          <audio 
            ref={setAudioElement}
            loop 
            preload="auto"
            onLoadedData={() => console.log('Audio loaded')}
            onError={(e) => console.log('Audio error:', e)}
          >
            <source src="/music/background-track.mp3" type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <button
            onClick={() => {
              if (audioElement) {
                if (isPlaying) {
                  audioElement.pause()
                } else {
                  audioElement.play().catch(e => console.log('Play failed:', e))
                }
                setIsPlaying(!isPlaying)
              }
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full flex items-center space-x-2 transition-colors glass"
          >
            <span>{isPlaying ? '⏸️' : '▶️'}</span>
            <span>{isPlaying ? 'Pause' : 'Play'} Music</span>
          </button>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-white"
            >
              <motion.h1 
                className="text-6xl lg:text-7xl font-bold mb-6"
                animate={{ 
                  textShadow: [
                    "0 0 20px rgba(99, 102, 241, 0.5)",
                    "0 0 40px rgba(99, 102, 241, 0.8)",
                    "0 0 20px rgba(99, 102, 241, 0.5)"
                  ]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <motion.span 
                  className="gradient-text"
                  animate={{ 
                    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                >
                  Dan Chang
                </motion.span>
                <br />
                <motion.span 
                  className="text-4xl lg:text-5xl text-white"
                  animate={{ opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Professional DJ
                </motion.span>
              </motion.h1>
              <motion.p 
                className="text-xl lg:text-2xl mb-8 text-gray-300"
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
              >
                Creating unforgettable experiences for over 10 years
              </motion.p>
              <motion.p 
                className="text-lg mb-8 text-gray-400"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                Specializing in corporate events, weddings, and private parties. 
                Let me bring the perfect vibe to your next celebration.
              </motion.p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button 
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors hover-lift"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  Book Now
                </motion.button>
                <motion.button 
                  className="border-2 border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white px-8 py-3 rounded-full text-lg font-semibold transition-colors hover-lift"
                  whileHover={{ 
                    scale: 1.05,
                    boxShadow: "0 10px 30px rgba(99, 102, 241, 0.4)"
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  View Packages
                </motion.button>
              </div>
            </motion.div>

            {/* 3D Disco Ball */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.5 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ 
                duration: 1.2, 
                delay: 0.2,
                type: "spring",
                stiffness: 100,
                damping: 15
              }}
              className="h-96 lg:h-[500px]"
            >
              <View className='flex h-full w-full flex-col items-center justify-center'>
                <Suspense fallback={null}>
                  <EnhancedDiscoBall />
                  <Common />
                </Suspense>
              </View>
            </motion.div>
          </div>
        </div>

        {/* Audio Controls */}
        <motion.div 
          className="absolute bottom-8 left-8 glass p-4 rounded-lg"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
        >
          <div className="text-white space-y-3">
            <div>
              <label className="block text-sm mb-1 font-semibold">Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => {
                  const newVolume = parseFloat(e.target.value)
                  setVolume(newVolume)
                  if (audioElement) {
                    audioElement.volume = newVolume
                  }
                }}
                className="w-32"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-gray-900 relative overflow-hidden">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-400 rounded-full opacity-30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0.3, 0.8, 0.3],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-5xl font-bold text-white mb-8 gradient-text">About Dan Chang</h2>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-12">
              With over a decade of experience in the DJ industry, I've had the privilege of entertaining at hundreds of corporate events, 
              weddings, and private parties. My passion for music and commitment to creating the perfect atmosphere has made me a trusted 
              choice for clients who demand excellence.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <motion.div
                initial={{ opacity: 0, y: 30, rotateY: -15 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                viewport={{ once: true }}
                className="glass p-6 rounded-lg hover-lift"
                whileHover={{ 
                  scale: 1.05, 
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div 
                  className="text-4xl mb-4"
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  🎵
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-3">Music Expertise</h3>
                <p className="text-gray-300">Versatile music selection spanning multiple genres and decades to keep any crowd engaged.</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 30, rotateY: -15 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
                viewport={{ once: true }}
                className="glass p-6 rounded-lg hover-lift"
                whileHover={{ 
                  scale: 1.05, 
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div 
                  className="text-4xl mb-4"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  🎉
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-3">Event Mastery</h3>
                <p className="text-gray-300">Professional equipment and seamless transitions to ensure your event flows perfectly.</p>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 30, rotateY: -15 }}
                whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.6, type: "spring" }}
                viewport={{ once: true }}
                className="glass p-6 rounded-lg hover-lift"
                whileHover={{ 
                  scale: 1.05, 
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div 
                  className="text-4xl mb-4"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  ⭐
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-3">10+ Years Experience</h3>
                <p className="text-gray-300">Over a decade of experience in creating unforgettable moments and lasting memories.</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="py-20 bg-black relative overflow-hidden">
        {/* Animated disco lights background */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${(i * 12.5) + Math.random() * 10}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -200, 0],
                opacity: [0, 1, 0],
                scale: [0, 2, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.5,
              }}
            />
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-5xl font-bold text-white mb-8 gradient-text">DJ Packages</h2>
            <p className="text-xl text-gray-300 mb-12">
              Choose the perfect package for your event
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                viewport={{ once: true }}
                className="glass p-8 rounded-lg hover-lift relative"
                whileHover={{ 
                  scale: 1.05, 
                  y: -10,
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-purple-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <h3 className="text-3xl font-bold text-white mb-4">Basic Package</h3>
                <motion.div 
                  className="text-4xl font-bold text-purple-400 mb-6"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  $1000
                </motion.div>
                <ul className="text-gray-300 space-y-3 mb-8">
                  <li>• 4 hours of DJ service</li>
                  <li>• Professional sound system</li>
                  <li>• Basic lighting setup</li>
                  <li>• Music consultation</li>
                </ul>
                <motion.button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Book Now
                </motion.button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
                viewport={{ once: true }}
                className="glass p-8 rounded-lg hover-lift border-2 border-purple-400 relative"
                whileHover={{ 
                  scale: 1.05, 
                  y: -10,
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div 
                  className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-purple-400 text-black px-4 py-1 rounded-full text-sm font-bold"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Most Popular
                </motion.div>
                <motion.div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
                />
                <h3 className="text-3xl font-bold text-white mb-4">Premium Package</h3>
                <motion.div 
                  className="text-4xl font-bold text-purple-400 mb-6"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
                >
                  $1500
                </motion.div>
                <ul className="text-gray-300 space-y-3 mb-8">
                  <li>• 6 hours of DJ service</li>
                  <li>• Professional sound system</li>
                  <li>• Advanced lighting & effects</li>
                  <li>• Music consultation</li>
                  <li>• MC services included</li>
                </ul>
                <motion.button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Book Now
                </motion.button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.6, type: "spring" }}
                viewport={{ once: true }}
                className="glass p-8 rounded-lg hover-lift relative"
                whileHover={{ 
                  scale: 1.05, 
                  y: -10,
                  transition: { duration: 0.3 }
                }}
              >
                <motion.div
                  className="absolute -top-2 -right-2 w-4 h-4 bg-pink-400 rounded-full"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: 1 }}
                />
                <h3 className="text-3xl font-bold text-white mb-4">Luxury Package</h3>
                <motion.div 
                  className="text-4xl font-bold text-purple-400 mb-6"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}
                >
                  $2000
                </motion.div>
                <ul className="text-gray-300 space-y-3 mb-8">
                  <li>• 8 hours of DJ service</li>
                  <li>• Premium sound system</li>
                  <li>• Full lighting & laser show</li>
                  <li>• Music consultation</li>
                  <li>• MC services included</li>
                  <li>• Photo booth setup</li>
                </ul>
                <motion.button 
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Book Now
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-900 relative overflow-hidden">
        {/* Floating contact icons */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-2xl opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -50, 0],
                rotate: [0, 360],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: 5 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            >
              {['📧', '📱', '📍', '💬', '🎵'][i % 5]}
            </motion.div>
          ))}
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-5xl font-bold text-white mb-8 gradient-text">Get In Touch</h2>
            <p className="text-xl text-gray-300 mb-12">
              Ready to make your event unforgettable? Let's talk!
            </p>
            
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16">
              <motion.div
                initial={{ opacity: 0, x: -50, rotateY: -15 }}
                whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                viewport={{ once: true }}
                className="glass p-8 rounded-lg"
                whileHover={{ 
                  scale: 1.02, 
                  rotateY: 5,
                  transition: { duration: 0.3 }
                }}
              >
                <h3 className="text-2xl font-bold text-white mb-6">Contact Information</h3>
                <div className="space-y-4 text-left">
                  <motion.div 
                    className="flex items-center space-x-4"
                    whileHover={{ x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div 
                      className="text-2xl"
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      📧
                    </motion.div>
                    <div>
                      <div className="font-semibold text-white">Email</div>
                      <div className="text-gray-300">dmagma@hotmail.com</div>
                    </div>
                  </motion.div>
                  <motion.div 
                    className="flex items-center space-x-4"
                    whileHover={{ x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div 
                      className="text-2xl"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      📱
                    </motion.div>
                    <div>
                      <div className="font-semibold text-white">Phone</div>
                      <div className="text-gray-300">604-725-7754</div>
                    </div>
                  </motion.div>
                  <motion.div 
                    className="flex items-center space-x-4"
                    whileHover={{ x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <motion.div 
                      className="text-2xl"
                      animate={{ y: [0, -5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      📍
                    </motion.div>
                    <div>
                      <div className="font-semibold text-white">Location</div>
                      <div className="text-gray-300">Serving the greater metropolitan area</div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 50, rotateY: 15 }}
                whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
                transition={{ duration: 0.8, delay: 0.4, type: "spring" }}
                viewport={{ once: true }}
                className="glass p-8 rounded-lg"
                whileHover={{ 
                  scale: 1.02, 
                  rotateY: -5,
                  transition: { duration: 0.3 }
                }}
              >
                <h3 className="text-2xl font-bold text-white mb-6">Quick Contact Form</h3>
                <form className="space-y-4">
                  <motion.input
                    type="text"
                    placeholder="Your Name"
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.input
                    type="email"
                    placeholder="Your Email"
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.textarea
                    placeholder="Tell us about your event"
                    rows="4"
                    className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-400"
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  />
                  <motion.button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors hover-lift"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Send Message
                  </motion.button>
                </form>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-white mb-4">Dan Chang</div>
            <p className="text-gray-400 mb-6">Professional DJ Services</p>
            <div className="flex justify-center space-x-6 mb-6">
              <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                <span className="sr-only">Facebook</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                <span className="sr-only">Instagram</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 6.62 5.367 11.987 11.988 11.987 6.62 0 11.987-5.367 11.987-11.987C24.014 5.367 18.637.001 12.017.001zM8.449 16.988c-1.297 0-2.448-.49-3.323-1.297C4.198 14.895 3.708 13.744 3.708 12.447s.49-2.448 1.418-3.323c.875-.807 2.026-1.297 3.323-1.297s2.448.49 3.323 1.297c.928.875 1.418 2.026 1.418 3.323s-.49 2.448-1.418 3.244c-.875.807-2.026 1.297-3.323 1.297zm7.83-9.781c-.49 0-.928-.175-1.297-.49-.368-.315-.49-.753-.49-1.243 0-.49.122-.928.49-1.243.369-.315.807-.49 1.297-.49s.928.175 1.297.49c.368.315.49.753.49 1.243 0 .49-.122.928-.49 1.243-.369.315-.807.49-1.297.49z"/>
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-purple-400 transition-colors">
                <span className="sr-only">YouTube</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
            </div>
            <div className="border-t border-gray-800 pt-6">
              <p className="text-gray-400">&copy; 2024 Dan Chang DJ. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
