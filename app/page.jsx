'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap/dist/gsap'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'
import { scrollState } from '@/helpers/scrollState'

const BallCanvas = dynamic(() => import('@/components/canvas/BallCanvas').then((mod) => mod.BallCanvas), { ssr: false })

const STORY_STEPS = [
  {
    index: '01',
    title: 'Listen first',
    copy: 'Every event starts with a conversation, not a playlist. I learn the room, the crowd, and the moments that matter to you — long before a single track is queued.',
  },
  {
    index: '02',
    title: 'Design the night',
    copy: 'From doors to last call, I map the energy of the evening: a soundtrack built around your timeline, your taste, and the people on your floor.',
  },
  {
    index: '03',
    title: 'Read the floor',
    copy: 'On the night, I steer it live — seamless transitions, clean MC work, and the judgment that 10+ years behind the decks buys. The dance floor stays full.',
  },
]

const PACKAGES = [
  {
    name: 'Basic',
    price: '$1,000',
    features: '4 hours · professional sound system · lighting · music consultation',
    tag: null,
  },
  {
    name: 'Premium',
    price: '$1,500',
    features: '6 hours · advanced lighting & effects · MC services · music consultation',
    tag: 'Most booked',
  },
  {
    name: 'Luxury',
    price: '$2,000',
    features: '8 hours · full lighting & laser show · MC services · photo booth setup',
    tag: null,
  },
]

const MARQUEE_ITEMS = ['Weddings', 'Corporate events', 'Private parties', 'Anniversaries', 'Galas']

export default function Page() {
  const root = useRef(null)

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger)
    // The site scrolls inside the layout's wrapper div, not the window. Pass
    // the element itself: gsap.context would scope a selector string to this
    // component's subtree, and the scroller lives above it.
    const scrollerEl = document.getElementById('main-scroll')
    if (scrollerEl) ScrollTrigger.defaults({ scroller: scrollerEl })

    const mm = gsap.matchMedia()
    const ctx = gsap.context(() => {
      mm.add(
        {
          reduce: '(prefers-reduced-motion: reduce)',
          full: '(prefers-reduced-motion: no-preference)',
        },
        (mmCtx) => {
          if (mmCtx.conditions.reduce) {
            // Reduced motion: everything visible, story steps stacked, no pin
            gsap.set('[data-intro], [data-reveal], [data-row]', { autoAlpha: 1, y: 0 })
            gsap.set('.line-mask > span', { yPercent: 0 })
            gsap.set('[data-step]', { position: 'relative', autoAlpha: 1, y: 0 })
            return
          }

          // ---- intro
          gsap
            .timeline({ defaults: { ease: 'power3.out' } })
            .from('[data-nav]', { y: -20, autoAlpha: 0, duration: 0.7 }, 0.1)
            .from('.line-mask > span', { yPercent: 112, duration: 1.05, stagger: 0.085, ease: 'power4.out' }, 0.25)
            .from('[data-intro]', { y: 16, autoAlpha: 0, duration: 0.8, stagger: 0.09 }, 0.8)

          // ---- nav backdrop after leaving the hero
          gsap.to('[data-nav-bg]', {
            autoAlpha: 1,
            ease: 'none',
            scrollTrigger: { trigger: '[data-hero]', start: 'bottom 90%', end: 'bottom 60%', scrub: true },
          })

          // ---- hero: gentle parallax out + progress for the 3D layer
          gsap.to('[data-hero-inner]', {
            yPercent: -10,
            autoAlpha: 0.25,
            ease: 'none',
            scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true },
          })
          ScrollTrigger.create({
            trigger: '[data-hero]',
            start: 'top top',
            end: 'bottom top',
            onUpdate: (self) => {
              scrollState.hero = self.progress
            },
          })

          // ---- pinned story: steps crossfade under a scrubbed timeline
          const steps = gsap.utils.toArray('[data-step]')
          const story = gsap.timeline({
            scrollTrigger: {
              trigger: '[data-story]',
              start: 'top top',
              end: '+=250%',
              pin: true,
              scrub: 0.7,
              anticipatePin: 1,
              onUpdate: (self) => {
                scrollState.story = self.progress
              },
            },
          })
          steps.forEach((step, i) => {
            if (i > 0) story.fromTo(step, { autoAlpha: 0, y: 56 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' }, i)
            if (i < steps.length - 1) story.to(step, { autoAlpha: 0, y: -56, duration: 0.4, ease: 'power2.in' }, i + 0.6)
          })
          story.fromTo('[data-progress]', { scaleX: 0 }, { scaleX: 1, ease: 'none', duration: steps.length - 0.4 }, 0)

          // ---- services + contact: row reveals and 3D progress
          gsap.utils.toArray('[data-row]').forEach((row, i) => {
            gsap.from(row, {
              autoAlpha: 0,
              y: 36,
              duration: 0.8,
              delay: i * 0.06,
              ease: 'power3.out',
              scrollTrigger: { trigger: row, start: 'top 90%' },
            })
          })
          gsap.utils.toArray('[data-reveal]').forEach((el) => {
            gsap.from(el, {
              autoAlpha: 0,
              y: 28,
              duration: 0.9,
              ease: 'power3.out',
              scrollTrigger: { trigger: el, start: 'top 86%' },
            })
          })
          ScrollTrigger.create({
            trigger: '[data-services]',
            start: 'top bottom',
            end: 'top 25%',
            onUpdate: (self) => {
              scrollState.services = self.progress
            },
          })
          ScrollTrigger.create({
            trigger: '[data-contact]',
            start: 'top bottom',
            end: 'top 30%',
            onUpdate: (self) => {
              scrollState.contact = self.progress
            },
          })

          // ---- marquee: slow, linear, unobtrusive
          gsap.to('[data-marquee-track]', { xPercent: -50, ease: 'none', duration: 26, repeat: -1 })
        }
      )
    }, root)

    return () => {
      ctx.revert()
      mm.revert()
    }
  }, [])

  return (
    <div ref={root} className='bg-black text-white'>
      {/* 3D layer — sits visually behind all z-10 content */}
      <div className='pointer-events-none fixed inset-0'>
        <BallCanvas />
      </div>

      <div className='grain' aria-hidden='true' />

      {/* navigation */}
      <header data-nav className='fixed inset-x-0 top-0 z-30'>
        <div data-nav-bg className='absolute inset-0 bg-black/70 opacity-0 backdrop-blur-md' />
        <nav className='relative mx-auto flex max-w-6xl items-center justify-between px-6 py-5'>
          <a href='#top' className='text-sm font-bold tracking-widest'>
            DAN CHANG
          </a>
          <div className='flex items-center gap-7'>
            <a href='#story' className='u-link hidden text-sm text-gray-300 hover:text-white sm:block'>
              Approach
            </a>
            <a href='#services' className='u-link hidden text-sm text-gray-300 hover:text-white sm:block'>
              Packages
            </a>
            <a href='#contact' className='u-link hidden text-sm text-gray-300 hover:text-white sm:block'>
              Contact
            </a>
            <Link
              href='/dj'
              className='rounded-full border border-purple-400/60 px-4 py-1.5 text-sm text-purple-200 transition-colors hover:border-purple-300 hover:bg-purple-400/10'
            >
              DJ Booth ↗
            </Link>
          </div>
        </nav>
      </header>

      <main id='top' className='relative z-10'>
        {/* ---- hero */}
        <section data-hero className='flex min-h-screen flex-col justify-end px-6 pb-16 pt-32'>
          <div data-hero-inner className='mx-auto w-full max-w-6xl'>
            <p data-intro className='eyebrow mb-6'>
              Dan Chang — DJ &amp; MC · Serving the greater metropolitan area
            </p>
            <h1 className='display text-[clamp(2.8rem,8.5vw,7.5rem)]'>
              <span className='line-mask'>
                <span>EVERY</span>
              </span>
              <span className='line-mask'>
                <span>GREAT NIGHT</span>
              </span>
              <span className='line-mask'>
                <span>
                  HAS A <span className='text-purple-400'>SOUNDTRACK.</span>
                </span>
              </span>
            </h1>
            <div className='mt-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between'>
              <p data-intro className='max-w-md text-base leading-relaxed text-gray-400'>
                Ten-plus years of corporate events, weddings and private parties — planned with care, mixed live, and
                carried by a floor that never empties.
              </p>
              <div data-intro className='flex items-center gap-4'>
                <a
                  href='#contact'
                  className='rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition-transform duration-300 hover:scale-[1.03]'
                >
                  Plan your event
                </a>
                <a href='#story' className='u-link text-sm text-gray-300'>
                  How I work
                </a>
              </div>
            </div>
            <div data-intro className='mt-14 flex items-center gap-3 text-gray-500'>
              <span className='block h-px w-10 bg-gray-600' />
              <span className='text-xs tracking-widest'>SCROLL</span>
            </div>
          </div>
        </section>

        {/* ---- pinned story */}
        <section id='story' data-story className='relative flex h-screen items-center px-6'>
          <div className='mx-auto w-full max-w-6xl'>
            <p className='eyebrow mb-10' data-reveal>
              The approach
            </p>
            <div className='relative min-h-[22rem] sm:min-h-[20rem]'>
              {STORY_STEPS.map((step, i) => (
                <article
                  key={step.index}
                  data-step
                  className='absolute inset-0 grid content-start gap-6 sm:grid-cols-[1fr_2fr] sm:gap-12'
                  style={{ opacity: i === 0 ? 1 : 0 }}
                >
                  <div className='display text-[clamp(4rem,9vw,8rem)] text-white/15'>{step.index}</div>
                  <div className='max-w-xl'>
                    <h2 className='display mb-5 text-[clamp(2rem,4.4vw,3.6rem)]'>{step.title}</h2>
                    <p className='text-lg leading-relaxed text-gray-400'>{step.copy}</p>
                  </div>
                </article>
              ))}
            </div>
            <div className='mt-12 h-px w-full bg-white/10'>
              <div data-progress className='h-px origin-left bg-purple-400' style={{ transform: 'scaleX(0)' }} />
            </div>
          </div>
        </section>

        {/* ---- services */}
        <section id='services' data-services className='px-6 py-32'>
          <div className='mx-auto w-full max-w-6xl'>
            <p className='eyebrow mb-4' data-reveal>
              Packages
            </p>
            <h2 className='display mb-16 text-[clamp(2.2rem,5vw,4rem)]' data-reveal>
              Built around your event.
            </h2>
            <div>
              {PACKAGES.map((pkg, i) => (
                <div key={pkg.name} data-row className='service-row grid gap-2 py-8 sm:grid-cols-[3rem_1fr_auto] sm:items-baseline sm:gap-8'>
                  <span className='text-sm text-gray-500'>0{i + 1}</span>
                  <div>
                    <div className='flex items-baseline gap-4'>
                      <h3 className='display text-3xl sm:text-4xl'>{pkg.name}</h3>
                      {pkg.tag && (
                        <span className='rounded-full border border-purple-400/50 px-3 py-0.5 text-xs text-purple-300'>
                          {pkg.tag}
                        </span>
                      )}
                    </div>
                    <p className='mt-2 text-sm text-gray-400'>{pkg.features}</p>
                  </div>
                  <div className='display text-2xl text-gray-200 sm:text-3xl'>{pkg.price}</div>
                </div>
              ))}
            </div>
            <p className='mt-10 text-sm text-gray-500' data-reveal>
              Every booking includes a planning call, a shared request list, and full setup &amp; teardown.
            </p>
          </div>
        </section>

        {/* ---- marquee */}
        <section className='overflow-hidden border-y border-white/10 py-6' aria-hidden='true'>
          <div data-marquee-track className='flex w-max whitespace-nowrap'>
            {[0, 1].map((dup) => (
              <div key={dup} className='flex'>
                {MARQUEE_ITEMS.map((item) => (
                  <span key={`${dup}-${item}`} className='display mx-8 text-2xl text-white/25'>
                    {item} <span className='mx-8 text-purple-400/40'>·</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ---- contact */}
        <section id='contact' data-contact className='px-6 pb-16 pt-36'>
          <div className='mx-auto w-full max-w-6xl'>
            <p className='eyebrow mb-6' data-reveal>
              Booking
            </p>
            <h2 className='display text-[clamp(3rem,9vw,7.5rem)]' data-reveal>
              LET&apos;S TALK.
            </h2>
            <div className='mt-12 grid gap-10 sm:grid-cols-2' data-reveal>
              <div className='space-y-4'>
                <a href='mailto:dmagma@hotmail.com' className='u-link block w-fit text-xl text-gray-200 sm:text-2xl'>
                  dmagma@hotmail.com
                </a>
                <a href='tel:604-725-7754' className='u-link block w-fit text-xl text-gray-200 sm:text-2xl'>
                  604-725-7754
                </a>
                <p className='pt-2 text-sm text-gray-500'>Serving the greater metropolitan area</p>
              </div>
              <div className='flex flex-col items-start gap-3 sm:items-end'>
                <a href='#' className='u-link text-sm text-gray-400'>
                  Instagram
                </a>
                <a href='#' className='u-link text-sm text-gray-400'>
                  Facebook
                </a>
                <a href='#' className='u-link text-sm text-gray-400'>
                  YouTube
                </a>
                <Link href='/dj' className='u-link pt-3 text-sm text-purple-300'>
                  Try the virtual DJ booth ↗
                </Link>
              </div>
            </div>
            <div className='mt-24 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-gray-600 sm:flex-row sm:justify-between'>
              <span>© 2026 Dan Chang. All rights reserved.</span>
              <span>DJ &amp; MC services — corporate · weddings · private</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
