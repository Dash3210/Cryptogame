import { LevelData, Track, Branch, DailyQuote } from '../types';

// ============================================================================
// SUBJECT CATEGORIES (CORE TRACKS)
// ============================================================================

// `icon` is an icon-kit slug rendered by the Icon component.
export const SUBJECTS: Track[] = [
  { id: 'biology', label: 'Biology', icon: 'subject-biology', description: 'Life & Cells' },
  { id: 'physics', label: 'Physics', icon: 'subject-physics', description: 'Matter & Energy' },
  { id: 'chemistry', label: 'Chemistry', icon: 'subject-chemistry', description: 'Elements & Reactions' },
  { id: 'astronomy', label: 'Astronomy', icon: 'subject-astronomy', description: 'Stars & Space' },
  { id: 'geography', label: 'Geography', icon: 'subject-geography', description: 'Earth & Places' },
  { id: 'history', label: 'History', icon: 'subject-history', description: 'Past Events' },
  { id: 'literature', label: 'Literature', icon: 'subject-literature', description: 'Books & Terms' },
  { id: 'lexicon', label: 'Lexicon', icon: 'subject-lexicon', description: 'Words & Meanings' },
];

// ============================================================================
// EXTENSION CATEGORIES (EXTENSION TRACKS)
// ============================================================================

export const EXTENSIONS: Track[] = [
  { id: 'compsci', label: 'Comp Sci', icon: 'subject-compsci', description: 'Bits, Algorithms & Logic', isExtension: true, isDownloaded: false, coinPrice: 100 },
  { id: 'anatomy', label: 'Anatomy', icon: 'subject-anatomy', description: 'The Human Machine', isExtension: true, isDownloaded: false, coinPrice: 100 },
  { id: 'music', label: 'Music Theory', icon: 'subject-music', description: 'Harmony, Notes & Rhythm', isExtension: true, isDownloaded: false, coinPrice: 120 },
  { id: 'economics', label: 'Economics', icon: 'subject-economics', description: 'Markets, Capital & Wealth', isExtension: true, isDownloaded: false, coinPrice: 120 },
  { id: 'mythology', label: 'Mythology', icon: 'subject-mythology', description: 'Legends, Gods & Lore', isExtension: true, isDownloaded: false, coinPrice: 150 },
];

// All top-level tracks
export const TRACKS: Track[] = [...SUBJECTS, ...EXTENSIONS];

// ============================================================================
// CURRICULUM BRANCHES
// ============================================================================
// Each branch belongs to one or more tracks (via `tracks` array).
// Levels are authored once in QUOTE_DB keyed strictly by branch id.
export const BRANCHES: Branch[] = [
  // Core initial curriculum branches (1:1 migration mapping)
  { id: 'biology', label: 'Biology', description: 'Life & Cells', tracks: ['biology'], icon: 'subject-biology', order: 1 },
  { id: 'physics', label: 'Physics', description: 'Matter & Energy', tracks: ['physics'], icon: 'subject-physics', order: 1 },
  { id: 'chemistry', label: 'Chemistry', description: 'Elements & Reactions', tracks: ['chemistry'], icon: 'subject-chemistry', order: 1 },
  { id: 'astronomy', label: 'Astronomy', description: 'Stars & Space', tracks: ['astronomy'], icon: 'subject-astronomy', order: 1 },
  { id: 'geography', label: 'Geography', description: 'Earth & Places', tracks: ['geography'], icon: 'subject-geography', order: 1 },
  { id: 'history', label: 'History', description: 'Past Events', tracks: ['history'], icon: 'subject-history', order: 1 },
  { id: 'literature', label: 'Literature', description: 'Books & Terms', tracks: ['literature'], icon: 'subject-literature', order: 1 },
  { id: 'lexicon', label: 'Lexicon', description: 'Words & Meanings', tracks: ['lexicon'], icon: 'subject-lexicon', order: 1 },

  // Extension initial curriculum branches (1:1 migration mapping)
  { id: 'compsci', label: 'Comp Sci', description: 'Bits, Algorithms & Logic', tracks: ['compsci'], icon: 'subject-compsci', order: 1 },
  { id: 'anatomy', label: 'Anatomy', description: 'The Human Machine', tracks: ['anatomy'], icon: 'subject-anatomy', order: 1 },
  { id: 'music', label: 'Music Theory', description: 'Harmony, Notes & Rhythm', tracks: ['music'], icon: 'subject-music', order: 1 },
  { id: 'economics', label: 'Economics', description: 'Markets, Capital & Wealth', tracks: ['economics'], icon: 'subject-economics', order: 1 },
  { id: 'mythology', label: 'Mythology', description: 'Legends, Gods & Lore', tracks: ['mythology'], icon: 'subject-mythology', order: 1 },

  // Cross-disciplinary shared curriculum branch (belongs to both Biology and Chemistry)
  { id: 'biochemistry', label: 'Biochemistry', description: 'Chemical processes within living organisms', tracks: ['biology', 'chemistry'], icon: 'subject-chemistry', order: 2 },

  // Scientific Foundations cross-disciplinary curriculum branch
  { id: 'scientific-foundations', label: 'Scientific Foundations', description: 'Scientific Inquiry, Methods & Core Principles', tracks: ['physics', 'chemistry', 'biology', 'astronomy'], icon: 'subject-physics', order: 0 },

  // Physics curriculum branches
  { id: 'physics-mechanics', label: 'Mechanics', description: 'Motion, Forces, Energy & Momentum', tracks: ['physics'], icon: 'subject-physics', order: 1 },
  { id: 'physics-fluids', label: 'Fluids', description: 'Fluid Dynamics, Pressure & Buoyancy', tracks: ['physics'], icon: 'subject-physics', order: 2 },
  { id: 'physics-thermodynamics', label: 'Thermodynamics', description: 'Heat, Temperature, Work & Entropy', tracks: ['physics'], icon: 'subject-physics', order: 3 },
  { id: 'physics-waves-sound', label: 'Waves & Sound', description: 'Oscillations, Wave Mechanics & Acoustics', tracks: ['physics'], icon: 'subject-physics', order: 4 },
  { id: 'physics-electromagnetism', label: 'Electromagnetism', description: 'Electric Charges, Fields, Magnetism & Currents', tracks: ['physics'], icon: 'subject-physics', order: 5 },
  { id: 'physics-optics', label: 'Optics', description: 'Light, Reflection, Refraction & Optical Systems', tracks: ['physics'], icon: 'subject-physics', order: 6 },
  { id: 'physics-modern', label: 'Modern Physics', description: 'Special Relativity & Quantum Phenomena', tracks: ['physics'], icon: 'subject-physics', order: 7 },
  { id: 'physics-nuclear-particle', label: 'Nuclear & Particle', description: 'Nuclear Reactions, Radioactivity & Fundamental Particles', tracks: ['physics'], icon: 'subject-physics', order: 8 },
];

// ============================================================================
// DAILY CHALLENGE QUOTES POOL
// ============================================================================
// All quotes strictly vetted for Public Domain compliance: first published 1930 or earlier.
export const DAILY_QUOTES: DailyQuote[] = [
  {
    text: "This above all: to thine own self be true.",
    author: "William Shakespeare",
    source: "Hamlet",
    year: 1603,
  },
  {
    text: "Waste no more time arguing what a good man should be. Be one.",
    author: "Marcus Aurelius",
    source: "Meditations",
    year: 180,
  },
  {
    text: "If you know the enemy and know yourself, you need not fear the result of a hundred battles.",
    author: "Sun Tzu",
    source: "The Art of War",
    year: 1910,
  },
  {
    text: "There is no charm equal to tenderness of heart.",
    author: "Jane Austen",
    source: "Emma",
    year: 1815,
  },
  {
    text: "It was the best of times, it was the worst of times.",
    author: "Charles Dickens",
    source: "A Tale of Two Cities",
    year: 1859,
  },
  {
    text: "Work consists of whatever a body is obliged to do, and play consists of whatever a body is not obliged to do.",
    author: "Mark Twain",
    source: "The Adventures of Tom Sawyer",
    year: 1876,
  },
  {
    text: "Ignorance more frequently begets confidence than does knowledge.",
    author: "Charles Darwin",
    source: "The Descent of Man",
    year: 1871,
  },
  {
    text: "An investment in knowledge pays the best interest.",
    author: "Benjamin Franklin",
    source: "The Way to Wealth",
    year: 1758,
  },
  {
    text: "No man is good enough to govern another man without that other's consent.",
    author: "Abraham Lincoln",
    source: "Peoria Speech",
    year: 1854,
  },
  {
    text: "A foolish consistency is the hobgoblin of little minds.",
    author: "Ralph Waldo Emerson",
    source: "Self-Reliance",
    year: 1841,
  },
  {
    text: "Do I contradict myself? Very well then I contradict myself, I am large, I contain multitudes.",
    author: "Walt Whitman",
    source: "Song of Myself",
    year: 1855,
  },
  {
    text: "Our life is frittered away by detail. Simplify, simplify.",
    author: "Henry David Thoreau",
    source: "Walden",
    year: 1854,
  },
  {
    text: "Beware; for I am fearless, and therefore powerful.",
    author: "Mary Shelley",
    source: "Frankenstein",
    year: 1818,
  },
  {
    text: "It is not down in any map; true places never are.",
    author: "Herman Melville",
    source: "Moby-Dick",
    year: 1851,
  },
  {
    text: "If there is no struggle, there is no progress.",
    author: "Frederick Douglass",
    source: "West India Emancipation Address",
    year: 1857,
  },
  {
    text: "All happy families are alike; each unhappy family is unhappy in its own way.",
    author: "Leo Tolstoy",
    source: "Anna Karenina",
    year: 1878,
  },
  {
    text: "Knowledge is power.",
    author: "Francis Bacon",
    source: "Meditationes Sacrae",
    year: 1597,
  },
  {
    text: "If I have seen further it is by standing on the shoulders of Giants.",
    author: "Isaac Newton",
    source: "Letter to Robert Hooke",
    year: 1675,
  },
  {
    text: "I am no bird; and no net ensnares me; I am a free human being with an independent will.",
    author: "Charlotte Brontë",
    source: "Jane Eyre",
    year: 1847,
  },
  {
    text: "All human wisdom is contained in these two words: Wait and hope.",
    author: "Alexandre Dumas",
    source: "The Count of Monte Cristo",
    year: 1846,
  },
];

// ============================================================================
// BLITZ RUSH POOL (Short, high-intensity definitions)
// ============================================================================

export const BLITZ_QUOTES: Omit<LevelData, 'category' | 'id'>[] = [
  { text: "A unit of digital information consisting of eight bits.", author: "Byte" },
  { text: "The speed of light in a vacuum.", author: "Constant" },
  { text: "A subatomic particle with no electrical charge.", author: "Neutron" },
  { text: "A large body in space orbiting a central star.", author: "Planet" },
  { text: "A sudden violent shaking of the ground.", author: "Earthquake" },
  { text: "The basic physical unit of heredity.", author: "Gene" },
  { text: "A piece of code that calls itself recursively.", author: "Recursion" },
  { text: "The hardest natural substance known on earth.", author: "Diamond" },
  { text: "An instrument used to measure atmospheric pressure.", author: "Barometer" },
  { text: "The center of an atom containing protons and neutrons.", author: "Nucleus" },
  { text: "A sequence of continuous musical notes.", author: "Melody" },
  { text: "A government ruled by a single supreme monarch.", author: "Monarchy" },
  { text: "A statement that contradicts itself yet reveals truth.", author: "Paradox" },
  { text: "The flow of electric charge through a conductor.", author: "Current" },
  { text: "The organ responsible for pumping oxygenated blood.", author: "Heart" },
];

// ============================================================================
// QUOTE DATABASE
// ============================================================================

export const QUOTE_DB: Record<string, Omit<LevelData, 'category'>[]> = {

  // --------------------------------------------------------------------------
  // BIOLOGY - Life & Cells
  // --------------------------------------------------------------------------
  biology: [
    { text: "The powerhouse of the cell responsible for generating most of the cell's supply of adenosine triphosphate.", author: "Mitochondria" },
    { text: "The process by which green plants and some other organisms use sunlight to synthesize foods from carbon dioxide and water.", author: "Photosynthesis" },
    { text: "The basic unit of heredity passed from parent to child.", author: "Gene" },
    { text: "A large organ in the body that stores and metabolizes nutrients, filters toxins, and produces bile.", author: "Liver" },
    { text: "The diffusion of water across a selectively permeable membrane.", author: "Osmosis" },
    { text: "The molecule that carries genetic instructions in all known living organisms and viruses.", author: "DNA" },
    { text: "Biological catalysts that speed up biochemical reactions without being consumed.", author: "Enzymes" },
    { text: "The process of programmed cell death that occurs in multicellular organisms.", author: "Apoptosis" },
    { text: "The cellular organelle that contains digestive enzymes to break down waste materials.", author: "Lysosome" },
    { text: "A symbiotic relationship between two organisms where both benefit.", author: "Mutualism" },
    { text: "The green pigment in plants that absorbs light energy used in photosynthesis.", author: "Chlorophyll" },
    { text: "Microscopic organisms that lack a membrane-bound nucleus.", author: "Prokaryotes" },
    { text: "The maintenance of stable internal physiological conditions in an organism.", author: "Homeostasis" },
    { text: "The type of cell division that results in four daughter cells each with half the number of chromosomes.", author: "Meiosis" },
    { text: "Proteins produced by the immune system to neutralize pathogens such as bacteria and viruses.", author: "Antibodies" }
  ],

  // --------------------------------------------------------------------------
  // PHYSICS - Matter & Energy
  // --------------------------------------------------------------------------
  physics: [
    { text: "The force that attracts a body toward the center of the earth, or toward any other physical body having mass.", author: "Gravity" },
    { text: "The rate of change of velocity per unit of time.", author: "Acceleration" },
    { text: "Energy that a body possesses by virtue of being in motion.", author: "Kinetic Energy" },
    { text: "The quantity of matter which a body contains, as measured by its acceleration under a given force.", author: "Mass" },
    { text: "A region of spacetime where gravity is so strong that nothing, including light or other electromagnetic waves, has enough energy to escape it.", author: "Black Hole" },
    { text: "The measure of disorder or randomness in a closed thermodynamic system.", author: "Entropy" },
    { text: "The principle that the position and momentum of a particle cannot both be measured exactly at the same time.", author: "Uncertainty Principle" },
    { text: "A quantum of light or other electromagnetic radiation.", author: "Photon" },
    { text: "The bending of a wave when it passes from one medium to another.", author: "Refraction" },
    { text: "The resistance of any physical object to any change in its velocity.", author: "Inertia" },
    { text: "The rate at which work is done or energy is transferred over time.", author: "Power" },
    { text: "The theoretical temperature at which all molecular motion ceases.", author: "Absolute Zero" },
    { text: "The property of matter by which it returns to its original shape after being deformed.", author: "Elasticity" },
    { text: "A nuclear reaction in which atomic nuclei combine to form a heavier nucleus.", author: "Fusion" },
    { text: "The phenomenon where a vibrating system drives another system to oscillate with greater amplitude at a specific frequency.", author: "Resonance" }
  ],

  // --------------------------------------------------------------------------
  // CHEMISTRY - Elements & Reactions
  // --------------------------------------------------------------------------
  chemistry: [
    { text: "A substance that cannot be broken down into simpler substances by chemical means.", author: "Element" },
    { text: "A substance that increases the rate of a chemical reaction without itself undergoing any permanent chemical change.", author: "Catalyst" },
    { text: "The number of protons in the nucleus of an atom, which determines the chemical properties of an element.", author: "Atomic Number" },
    { text: "A chemical bond that involves the sharing of electron pairs between atoms.", author: "Covalent Bond" },
    { text: "The loss of electrons during a chemical reaction by a molecule, atom, or ion.", author: "Oxidation" },
    { text: "A scale used to specify the acidity or basicity of an aqueous solution.", author: "pH Scale" },
    { text: "Substances that have identical molecular formulas but different structural arrangements.", author: "Isomers" },
    { text: "A state in a chemical reaction where the forward reaction rate equals the reverse reaction rate.", author: "Equilibrium" },
    { text: "The noble gas with atomic number two that is the second lightest element in the universe.", author: "Helium" },
    { text: "The amount of energy required to remove the most loosely bound electron from an isolated gaseous atom.", author: "Ionization Energy" },
    { text: "A homogeneous mixture composed of two or more substances dissolved in a solvent.", author: "Solution" },
    { text: "Atoms of the same element that have the same number of protons but different numbers of neutrons.", author: "Isotopes" },
    { text: "A chemical reaction that releases energy by light or heat.", author: "Exothermic" },
    { text: "The temperature at which the vapor pressure of a liquid equals atmospheric pressure.", author: "Boiling Point" },
    { text: "A chemical bond formed through electrostatic attraction between oppositely charged ions.", author: "Ionic Bond" }
  ],

  // --------------------------------------------------------------------------
  // ASTRONOMY - Stars & Space
  // --------------------------------------------------------------------------
  astronomy: [
    { text: "A massive, luminous sphere of plasma held together by its own gravity.", author: "Star" },
    { text: "A system of millions or billions of stars, together with gas and dust, held together by gravitational attraction.", author: "Galaxy" },
    { text: "The explosion of a star that has reached the end of its life.", author: "Supernova" },
    { text: "A celestial object consisting of a nucleus of ice and dust and, when near the sun, a tail of gas and dust particles pointing away from the sun.", author: "Comet" },
    { text: "A celestial body moving in an elliptical orbit around a star.", author: "Planet" },
    { text: "A luminous cloud of gas and dust in outer space where stars are born.", author: "Nebula" },
    { text: "A highly magnetized rotating neutron star that emits beams of electromagnetic radiation.", author: "Pulsar" },
    { text: "The boundary around a black hole beyond which events cannot affect an outside observer.", author: "Event Horizon" },
    { text: "The distance that light travels in one Julian year in a vacuum.", author: "Light Year" },
    { text: "An obscuring of the light from one celestial body by the passage of another between it and the observer.", author: "Eclipse" },
    { text: "An extremely luminous active galactic nucleus powered by a supermassive black hole.", author: "Quasar" },
    { text: "A small rocky body orbiting the sun, predominantly found between Mars and Jupiter.", author: "Asteroid" },
    { text: "The apparent shift in the position of an object when viewed from two different locations.", author: "Parallax" },
    { text: "The prevailing cosmological model explaining the rapid expansion of the universe from a singularity.", author: "Big Bang" },
    { text: "A hypothetical form of matter that does not interact with light but exerts gravitational influence.", author: "Dark Matter" }
  ],

  // --------------------------------------------------------------------------
  // GEOGRAPHY - Earth & Places
  // --------------------------------------------------------------------------
  geography: [
    { text: "An imaginary line drawn around the earth equally distant from both poles, dividing the earth into northern and southern hemispheres.", author: "Equator" },
    { text: "A piece of land almost surrounded by water or projecting out into a body of water.", author: "Peninsula" },
    { text: "A narrow passage of water connecting two seas or two large areas of water.", author: "Strait" },
    { text: "A group or chain of islands clustered together in a sea or ocean.", author: "Archipelago" },
    { text: "A flat-topped elevation with one or more cliff-like sides rising prominently above the surrounding land.", author: "Mesa" },
    { text: "A triangular tract of sediment deposited at the mouth of a river.", author: "Delta" },
    { text: "A ring-shaped reef, island, or chain of islands formed of coral surrounding a lagoon.", author: "Atoll" },
    { text: "The angular distance of a place north or south of the earth's equator.", author: "Latitude" },
    { text: "A long, narrow, deep inlet of the sea between high cliffs, typically formed by submerged glacial valleys.", author: "Fjord" },
    { text: "The scientific study of landforms and the processes that shape them.", author: "Geomorphology" },
    { text: "A narrow strip of land with sea on either side, forming a link between two larger areas of land.", author: "Isthmus" },
    { text: "A vast, flat, treeless Arctic region in which the subsoil is permanently frozen.", author: "Tundra" },
    { text: "A dry grassland plain with few trees found in southeastern Europe and Asia.", author: "Steppe" },
    { text: "A large underground chamber, typically of natural origin, in a hillside or cliff.", author: "Cavern" },
    { text: "The point on the Earth's surface directly above the focus of an earthquake.", author: "Epicenter" }
  ],

  // --------------------------------------------------------------------------
  // HISTORY - Past Events
  // --------------------------------------------------------------------------
  history: [
    { text: "A political system in which the supreme power lies in a body of citizens who can elect people to represent them.", author: "Democracy" },
    { text: "A period of European history marking the transition from the Middle Ages to modernity.", author: "Renaissance" },
    { text: "A formal agreement between two or more states in reference to peace, alliance, commerce, or other international relations.", author: "Treaty" },
    { text: "A monumental ancient Egyptian stone structure with a square base and four triangular sides.", author: "Pyramid" },
    { text: "An extensive group of states or countries under a single supreme authority, formerly an emperor or empress.", author: "Empire" },
    { text: "The social system in medieval Europe based on land held by vassals from lords in return for service.", author: "Feudalism" },
    { text: "The transition to new manufacturing processes in Europe and the United States in the late eighteenth century.", author: "Industrial Revolution" },
    { text: "The royal charter of political rights given to rebellious English barons by King John in twelve fifteen.", author: "Magna Carta" },
    { text: "A sixteenth-century religious movement aimed at reforming the Roman Catholic Church.", author: "Reformation" },
    { text: "A series of medieval military expeditions by European Christians to recover the Holy Land.", author: "Crusades" },
    { text: "The intellectual movement of the eighteenth century emphasizing reason and individualism.", author: "Enlightenment" },
    { text: "An ancient network of Eurasian trade routes that connected East Asia with the Mediterranean.", author: "Silk Road" },
    { text: "The systematic study and documentation of the human past.", author: "Historiography" },
    { text: "The prolonged period of geopolitical tension between the Soviet Union and the United States after World War Two.", author: "Cold War" },
    { text: "The policy or practice of acquiring full or partial political control over another country and exploiting it economically.", author: "Colonialism" }
  ],

  // --------------------------------------------------------------------------
  // LITERATURE - Books & Terms
  // --------------------------------------------------------------------------
  literature: [
    { text: "A figure of speech involving the comparison of one thing with another thing of a different kind, used to make a description more emphatic or vivid.", author: "Simile" },
    { text: "The attribution of a personal nature or human characteristics to something nonhuman.", author: "Personification" },
    { text: "A poem of fourteen lines using any of a number of formal rhyme schemes.", author: "Sonnet" },
    { text: "A figure of speech in which a word or phrase is applied to an object or action to which it is not literally applicable.", author: "Metaphor" },
    { text: "Exaggerated statements or claims not meant to be taken literally.", author: "Hyperbole" },
    { text: "The main character or one of the major characters in a drama, movie, novel, or other fictional text.", author: "Protagonist" },
    { text: "A literary or dramatic character who opposes the protagonist.", author: "Antagonist" },
    { text: "The repetition of usually initial consonant sounds in two or more neighboring words or syllables.", author: "Alliteration" },
    { text: "The formation of a word from a sound associated with what is named.", author: "Onomatopoeia" },
    { text: "An expression designed to call something to mind without mentioning it explicitly.", author: "Allusion" },
    { text: "A play dealing with tragic events and having an unhappy ending, especially concerning the downfall of the main character.", author: "Tragedy" },
    { text: "A short story, typically with animals as characters, conveying a moral.", author: "Fable" },
    { text: "A warning or indication of a future event in a story.", author: "Foreshadowing" },
    { text: "A story, poem, or picture that can be interpreted to reveal a hidden meaning, typically a moral or political one.", author: "Allegory" },
    { text: "The feeling of growing excitement and uncertainty created in a literary work.", author: "Suspense" }
  ],

  // --------------------------------------------------------------------------
  // COMP SCI - Bits & Bytes (Extension)
  // --------------------------------------------------------------------------
  compsci: [
    { text: "A set of instructions given to a computer to perform a specific task.", author: "Algorithm" },
    { text: "A defect or fault in a machine, system, or computer program that prevents it from working correctly.", author: "Bug" },
    { text: "The practice of protecting systems, networks, and programs from digital attacks.", author: "Cybersecurity" },
    { text: "A data structure that stores elements in a linear sequence where each element points to the next.", author: "Linked List" },
    { text: "A programming paradigm based on the concept of objects containing data and code.", author: "Object Oriented" },
    { text: "A function that solves a problem by calling itself with smaller sub-problems.", author: "Recursion" },
    { text: "The algorithmic method of solving a complex problem by breaking it down into subproblems and storing the results.", author: "Dynamic Programming" },
    { text: "A cryptographic network where records are stored across a peer-to-peer network in cryptographically linked blocks.", author: "Blockchain" },
    { text: "A hardware component that executes the instructions comprising a computer program.", author: "Processor" },
    { text: "A program that translates source code written in a high-level programming language into machine code.", author: "Compiler" },
    { text: "A software layer that provides a unified interface between hardware and application programs.", author: "Operating System" },
    { text: "A data structure implementing a first-in first-out order of operations.", author: "Queue" },
    { text: "The process of finding and resolving defects or problems within a computer program.", author: "Debugging" },
    { text: "An immutable, distributed ledger that securely records transactions across multiple computers.", author: "Distributed Ledger" },
    { text: "A computational model consisting of interconnected artificial neurons inspired by biological brains.", author: "Neural Network" }
  ],

  // --------------------------------------------------------------------------
  // ANATOMY - The Human Body (Extension)
  // --------------------------------------------------------------------------
  anatomy: [
    { text: "The framework of bone or cartilage enclosing the brain of a vertebrate.", author: "Cranium" },
    { text: "The long bone in the upper arm that extends from the shoulder to the elbow.", author: "Humerus" },
    { text: "The muscular tube through which food passes from the pharynx to the stomach.", author: "Esophagus" },
    { text: "The largest artery in the human body originating from the left ventricle of the heart.", author: "Aorta" },
    { text: "The dome-shaped muscle located below the lungs that is the primary muscle of respiration.", author: "Diaphragm" },
    { text: "The transparent front part of the eye that covers the iris, pupil, and anterior chamber.", author: "Cornea" },
    { text: "The thigh bone, which is the longest, heaviest, and strongest bone in the human body.", author: "Femur" },
    { text: "The butterfly-shaped endocrine gland in the neck that produces hormones controlling metabolism.", author: "Thyroid" },
    { text: "The major organ of the central nervous system located in the skull.", author: "Cerebrum" },
    { text: "The fluid tissue that delivers necessary substances such as nutrients and oxygen to the cells.", author: "Blood" },
    { text: "The largest organ of the human body that protects inner tissues from microbes and dehydration.", author: "Skin" },
    { text: "The two bean-shaped organs that filter waste products, excess water, and other impurities from the blood.", author: "Kidneys" },
    { text: "The small pouch located near the junction of the small and large intestines.", author: "Appendix" },
    { text: "The joint connecting the femur with the tibia and patella.", author: "Knee" },
    { text: "Tough bands of fibrous connective tissue that connect muscle to bone.", author: "Tendons" }
  ],

  // --------------------------------------------------------------------------
  // MUSIC - Notes & Rhythm (Extension)
  // --------------------------------------------------------------------------
  music: [
    { text: "The speed at which a passage of music is or should be played.", author: "Tempo" },
    { text: "A sequence of single notes that is musically satisfying.", author: "Melody" },
    { text: "The combination of simultaneously sounded musical notes to produce a pleasing sound.", author: "Harmony" },
    { text: "A group of three or more musical notes played simultaneously.", author: "Chord" },
    { text: "A musical notation sign placed at the beginning of a stave to indicate the pitch of the notes written on it.", author: "Clef" },
    { text: "A gradual increase in loudness in a piece of music.", author: "Crescendo" },
    { text: "A rapid succession of notes that produces a smooth transition from one pitch to another.", author: "Arpeggio" },
    { text: "The character or quality of a musical sound or voice as distinct from its pitch and intensity.", author: "Timbre" },
    { text: "A recurring rhythm or pattern in musical composition.", author: "Cadence" },
    { text: "An interval consisting of eight full musical notes in a diatonic scale.", author: "Octave" },
    { text: "The volume of a sound or the note value denoting loudness.", author: "Dynamics" },
    { text: "A musical composition for a solo instrument accompanied by an orchestra.", author: "Concerto" },
    { text: "The art of composing or performing music spontaneously without prior preparation.", author: "Improvisation" },
    { text: "The relative highness or lowness of a musical tone determined by frequency.", author: "Pitch" },
    { text: "A temporary displacement of the regular metrical accent in music caused by stressing the weak beat.", author: "Syncopation" }
  ],

  // --------------------------------------------------------------------------
  // ECONOMICS - Markets & Money (Extension)
  // --------------------------------------------------------------------------
  economics: [
    { text: "A general increase in prices and fall in the purchasing value of money.", author: "Inflation" },
    { text: "The total value of goods produced and services provided in a country during one year.", author: "GDP" },
    { text: "The fundamental economic problem of having seemingly unlimited human wants in a world of limited resources.", author: "Scarcity" },
    { text: "A market structure characterized by a single seller selling a unique product in the market.", author: "Monopoly" },
    { text: "The loss of potential gain from other alternatives when one alternative is chosen.", author: "Opportunity Cost" },
    { text: "The point at which market supply equals market demand.", author: "Market Equilibrium" },
    { text: "Wealth in the form of money or other assets owned by a person or organization.", author: "Capital" },
    { text: "A decrease in the general price level of goods and services.", author: "Deflation" },
    { text: "An economic system based on private ownership of the means of production and their operation for profit.", author: "Capitalism" },
    { text: "The degree to which an asset or security can be quickly bought or sold in the market without affecting its price.", author: "Liquidity" },
    { text: "A tax imposed by a government on goods and services imported from other countries.", author: "Tariff" },
    { text: "A sustained period of negative economic growth across multiple quarters.", author: "Recession" },
    { text: "The study of the economy as a whole, including inflation, unemployment, and economic growth.", author: "Macroeconomics" },
    { text: "The responsiveness of the quantity demanded or supplied of a good to a change in its price.", author: "Elasticity" },
    { text: "The distribution of a portion of a company's earnings to a class of its shareholders.", author: "Dividend" }
  ],

  // --------------------------------------------------------------------------
  // MYTHOLOGY - Legends & Gods (Extension)
  // --------------------------------------------------------------------------
  mythology: [
    { text: "The supreme ruler of the gods in Greek mythology and the god of the sky, lightning, and thunder.", author: "Zeus" },
    { text: "A legendary creature with the body of a lion and the head and wings of an eagle.", author: "Griffin" },
    { text: "The mythical hall in Norse mythology where fallen warriors dwell alongside Odin.", author: "Valhalla" },
    { text: "A legendary bird that cyclically regenerates or is reborn from its own ashes.", author: "Phoenix" },
    { text: "The Greek goddess of wisdom, warfare, and handicraft.", author: "Athena" },
    { text: "In Greek mythology, a box containing all the evils of the world, leaving only hope inside when opened.", author: "Pandoras Box" },
    { text: "A labyrinth on the island of Crete built to hold the mythical half-man, half-bull creature.", author: "Minotaur" },
    { text: "The hammer of Thor, the Norse god of thunder, capable of leveling mountains.", author: "Mjolnir" },
    { text: "The food and drink of the Greek gods that confers longevity or immortality.", author: "Ambrosia" },
    { text: "The underworld river in Greek mythology across which souls of the deceased are ferried.", author: "Styx" },
    { text: "The giant serpent in Norse mythology that encircles the world and bites its own tail.", author: "Jormungandr" },
    { text: "The winged horse in Greek mythology that was sired by Poseidon.", author: "Pegasus" },
    { text: "The ancient Egyptian god of the afterlife, death, and resurrection.", author: "Osiris" },
    { text: "The mythological Greek monster with venomous snakes in place of hair whose gaze turned onlookers to stone.", author: "Medusa" },
    { text: "A riddling winged monster of Thebes with the body of a lion and the face of a woman.", author: "Sphinx" }
  ],

  // --------------------------------------------------------------------------
  // LEXICON - Words & Meanings (Free Core Subject)
  // --------------------------------------------------------------------------
  lexicon: []
};

/**
 * Returns core subjects (tracks) that have active playable content authored in QUOTE_DB.
 */
export const getMasterableCoreTracks = (): Track[] =>
  SUBJECTS.filter(s =>
    BRANCHES.filter(b => b.tracks.includes(s.id)).some(b => (QUOTE_DB[b.id]?.length ?? 0) > 0)
  );

