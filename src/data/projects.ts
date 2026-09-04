export interface Link {
  label: string;
  href: string;
}

export interface Project {
  name: string;
  /** What it is, in one line. */
  summary: string;
  /** How it was built. Featured projects only. */
  detail?: string;
  image?: string;
  alt?: string;
  tags: string[];
  links: Link[];
}

export const featured: Project[] = [
  {
    name: 'Splat Fighter',
    summary:
      'Browser 2.5D fighting game whose arenas are Gaussian-splat scans of real places — film a room, then fight in it.',
    detail:
      'A deterministic combat core drives rollback netcode over WebRTC, and a self-hosted GPU pipeline reconstructs uploaded videos into arenas — and a few photos into a rigged, playable fighter.',
    image: '/images/splat-fighter.jpg',
    alt: 'Two custom fighters mid-match in a Gaussian-splat scan of a garden courtyard',
    tags: ['TypeScript', 'Three.js', 'Gaussian Splatting', 'WebRTC'],
    links: [
      { label: 'Play', href: 'https://splat-fighter.jesseguenzl.com' },
      { label: 'Write-up', href: '/blog/splat-fighter/' },
    ],
  },
  {
    name: 'FridgeMate',
    summary:
      'Native Android app for managing your fridge, creating shopping lists, and finding recipes.',
    detail:
      'Product tagging is handled by a custom ML model I trained and serve from the cloud.',
    image: '/images/FridgeMate.jpg',
    alt: 'FridgeMate app screenshot',
    tags: ['Python', 'PyTorch', 'Kotlin', 'Android'],
    links: [{ label: 'Source', href: 'https://github.com/Emtrixx/RecipeApp' }],
  },
  {
    name: 'MingleFlix',
    summary:
      'Synchronised video-watching for friends, with real-time chat and shared playback controls.',
    detail:
      'Built on a microservices architecture and deployed to a bare-metal Kubernetes cluster with a full CI/CD pipeline.',
    image: '/images/mingleflix.webp',
    alt: 'MingleFlix synchronised video player',
    tags: ['Kubernetes', 'Docker', 'Microservices', 'CI/CD'],
    links: [{ label: 'Source', href: 'https://github.com/MingleFlix' }],
  },
  {
    name: 'Raytracer',
    summary: 'Realtime raytracer written in Rust and compiled to WebAssembly.',
    detail: 'Runs in the browser. Move through the scene with WASD.',
    image: '/images/raytracer.avif',
    alt: 'Rust WebAssembly raytracer render',
    tags: ['Rust', 'WebAssembly'],
    links: [
      { label: 'Run it', href: '/raytracer/' },
      { label: 'Source', href: 'https://github.com/Emtrixx/raytracer_wasm' },
    ],
  },
];

export const secondary: Project[] = [
  {
    name: 'PicoMix',
    summary:
      'Cocktail mixing machine built for an IoT project at Metropolia University Helsinki, using embedded C and FreeRTOS on a Raspberry Pi Pico W.',
    tags: ['C', 'FreeRTOS', 'Embedded'],
    links: [
      { label: 'Write-up', href: '/blog/picomix/' },
      { label: 'Watch', href: 'https://www.youtube.com/watch?v=Rg3dUluKYmY' },
      { label: 'Source', href: 'https://github.com/metromix-fi/PicoMixController' },
    ],
  },
  {
    name: 'Mandelbrot',
    summary:
      'Explore the Mandelbrot set in your browser. Written in Rust and compiled to WebAssembly.',
    tags: ['Rust', 'WebAssembly'],
    links: [
      { label: 'Run it', href: '/mandelbrot/' },
      { label: 'Source', href: 'https://github.com/Emtrixx/mandelbrot_wasm' },
    ],
  },
  {
    name: 'Zombie game',
    summary:
      'Game prototype built with TypeScript, Three.js and my own entity-component system.',
    tags: ['TypeScript', 'Three.js', 'ECS'],
    links: [
      { label: 'Play', href: 'https://zombie.dorm-hub.de/' },
      { label: 'Source', href: 'https://github.com/Emtrixx/threejs-ecs' },
    ],
  },
  {
    name: 'Dorm-Hub',
    summary: 'Multipurpose website for my student dorm, built with the MEVN stack.',
    tags: ['Vue.js', 'Node.js', 'MongoDB'],
    links: [
      { label: 'Visit', href: 'https://dorm-hub.de/' },
      { label: 'Source', href: 'https://github.com/Emtrixx/dorm-hub' },
    ],
  },
  {
    name: 'Foodsharing',
    summary:
      'Foodsharing website built as a university group project. Nominated for the Karl H. Ditze award.',
    tags: ['Web', 'Group project'],
    links: [{ label: 'Source', href: 'https://git.lumos.city/haw-ms/neighborhood-foodsharing' }],
  },
];
