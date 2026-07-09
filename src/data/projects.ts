export interface Link {
  label: string;
  href: string;
}

export interface Project {
  name: string;
  /** The one-line claim. What it is. */
  summary: string;
  /** What was actually hard. Featured projects only. */
  detail?: string;
  image?: string;
  alt?: string;
  tags: string[];
  links: Link[];
}

export const featured: Project[] = [
  {
    name: 'FridgeMate',
    summary:
      'A native Android app that reads what is in your fridge, builds the shopping list, and suggests recipes from what is left.',
    detail:
      'The tagging model is my own — trained to identify grocery products from a phone camera and run on-device, so the app works with the fridge door open and no signal. Everything downstream, from the shopping list to recipe matching, depends on that classifier being right.',
    image: '/images/FridgeMate.jpg',
    alt: 'FridgeMate app screenshot',
    tags: ['Python', 'PyTorch', 'Kotlin', 'Android'],
    links: [{ label: 'Source', href: 'https://github.com/Emtrixx/RecipeApp' }],
  },
  {
    name: 'MingleFlix',
    summary: 'Watch films with friends who are somewhere else. Shared playback, synchronised, with chat.',
    detail:
      'Keeping playback in sync across clients is the whole problem — a pause has to land at the same frame for everyone, over connections that do not agree on latency. Built as microservices and deployed to a bare-metal Kubernetes cluster I set up, with CI/CD from commit to rollout.',
    image: '/images/mingleflix.webp',
    alt: 'MingleFlix synchronised video player',
    tags: ['Kubernetes', 'Docker', 'Microservices', 'CI/CD'],
    links: [{ label: 'Source', href: 'https://github.com/MingleFlix' }],
  },
  {
    name: 'Raytracer',
    summary: 'A raytracer that runs in real time in this browser tab. Written in Rust, compiled to WebAssembly.',
    detail:
      'Every pixel is a ray traced against the scene, every frame, on the CPU. Rust compiled to WASM makes that fast enough to fly through with WASD. Open it and move around.',
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
      'A cocktail mixing machine, built at Metropolia University Helsinki. Embedded C and FreeRTOS on a Raspberry Pi Pico W.',
    tags: ['C', 'FreeRTOS', 'Embedded'],
    links: [
      { label: 'Watch', href: 'https://www.youtube.com/watch?v=Rg3dUluKYmY' },
      { label: 'Source', href: 'https://github.com/metromix-fi/PicoMixController' },
    ],
  },
  {
    name: 'Mandelbrot',
    summary: 'Explore the Mandelbrot set at native speed in the browser. Rust, compiled to WebAssembly.',
    tags: ['Rust', 'WebAssembly'],
    links: [
      { label: 'Run it', href: '/mandelbrot/' },
      { label: 'Source', href: 'https://github.com/Emtrixx/mandelbrot_wasm' },
    ],
  },
  {
    name: 'Zombie game',
    summary: 'A game prototype on an entity-component system I wrote from scratch, in TypeScript and Three.js.',
    tags: ['TypeScript', 'Three.js', 'ECS'],
    links: [
      { label: 'Play', href: 'https://zombie.dorm-hub.de/' },
      { label: 'Source', href: 'https://github.com/Emtrixx/threejs-ecs' },
    ],
  },
  {
    name: 'Dorm-Hub',
    summary: 'The site my student dorm actually uses — noticeboard, bookings, the lot. MEVN stack.',
    tags: ['Vue.js', 'Node.js', 'MongoDB'],
    links: [
      { label: 'Visit', href: 'https://dorm-hub.de/' },
      { label: 'Source', href: 'https://github.com/Emtrixx/dorm-hub' },
    ],
  },
  {
    name: 'Foodsharing',
    summary: 'A neighbourhood food-sharing platform, built as a university group project. Nominated for the Karl H. Ditze award.',
    tags: ['Web', 'Group project'],
    links: [{ label: 'Source', href: 'https://git.lumos.city/haw-ms/neighborhood-foodsharing' }],
  },
];
