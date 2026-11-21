import React from 'react'
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div
      className='home flex min-h-screen w-full flex-col items-center bg-white px-6'
      style={{
        backgroundImage: 'radial-gradient(#d4d4d4 1px, transparent 1px)',
        backgroundSize: '22px 22px',
      }}
    >
      {/* Top bar */}
      <nav className='flex w-full max-w-6xl items-center justify-between py-6'>
        <span className='w-16' />
        <h2 className='font-display text-lg font-bold'>BoardCollab</h2>
        <Link to='/register' className='w-16 text-right text-sm font-medium hover:underline'>
          Login
        </Link>
      </nav>

      {/* Hero */}
      <main className='flex flex-1 flex-col items-center justify-center pb-24 text-center'>
        <h1 className='font-display max-w-4xl text-4xl font-bold leading-tight sm:text-6xl'>
          An online whiteboard for teams to{' '}
          <span className='rounded-md bg-violet-200 px-2'>sketch</span> and{' '}
          <span className='rounded-md bg-yellow-300 px-2'>collaborate</span>{' '}
          <span className='relative inline-block'>
            together.
            <svg
              className='absolute -bottom-3 left-0 w-full'
              viewBox='0 0 200 12'
              fill='none'
              preserveAspectRatio='none'
            >
              <path
                d='M2 8 C 30 0, 60 14, 100 6 S 170 2, 198 8'
                stroke='black'
                strokeWidth='3'
                strokeLinecap='round'
              />
            </svg>
          </span>
        </h1>

        <p className='mt-8 text-lg text-neutral-600'>
          Draw together, in real time.
        </p>

        <Link
          to='/register'
          className='mt-8 inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800'
        >
          Get started free 
          <i className="ri-arrow-right-up-line"></i>
        </Link>
      </main>
    </div>
  )
}

export default Home