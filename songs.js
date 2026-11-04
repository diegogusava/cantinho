// Domínio público. "C4" = bloco curto. "C4:2" = bloco longo de 2 tempos (segurar).
// "D#5" = sustenido. Melodias escritas de memória: conferir de ouvido.
const repeat = (phrase, times) => Array(times).fill(phrase).join(" ");
const hold = (phrase) => phrase.split(" ").map((note) => `${note}:2`).join(" ");

const SONGS = [
  {
    name: "Ode à Alegria",
    notes: "E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4 E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 D4 C4 C4",
  },
  {
    name: "Parabéns pra Você",
    notes: "C4 C4 D4 C4 F4 E4 C4 C4 D4 C4 G4 F4 C4 C4 C5 A4 F4 E4 D4 B4 B4 A4 F4 G4 F4",
  },
  {
    name: "Brilha, Brilha, Estrelinha",
    notes: "C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2 G4 G4 F4 F4 E4 E4 D4:2 G4 G4 F4 F4 E4 E4 D4:2 C4 C4 G4 G4 A4 A4 G4:2 F4 F4 E4 E4 D4 D4 C4:2",
  },
  {
    name: "Sapo Cururu",
    notes: repeat("E4 E4 G4 G4 E4 G4 A4 G4:2 E4 E4 G4 G4 E4 D4 C4:2 D4 D4 F4 F4 D4 F4 G4 F4:2 E4 D4 C4:2", 2),
  },
  {
    name: "Alecrim Dourado",
    notes: repeat("G4 G4 C5 C5 B4 A4 G4:2 E4 E4 G4 G4 F4 E4 D4:2 G4 G4 C5 C5 B4 A4 G4:2 F4 E4 D4 C4:2", 2),
  },
  {
    name: "Atirei o Pau no Gato",
    notes: repeat("C4 C4 E4 E4 G4 G4 G4:2 G4 G4 E4 E4 C4 D4 C4:2 D4 D4 F4 F4 A4 A4 A4:2 G4 F4 E4 D4 C4:2", 3),
  },
  {
    name: "Para Elisa",
    notes: [
      "E5 D#5 E5 D#5 E5 B4 D5 C5 A4 C4 E4 A4 B4 E4 G#4 B4 C5",
      "E5 D#5 E5 D#5 E5 B4 D5 C5 A4 C4 E4 A4 B4 E4 C5 B4 A4",
      "B4 C5 D5 E5 G4 F5 E5 D5:2 F4 E5 D5 C5 E4 D5 C5 B4:2",
      "E5 D#5 E5 D#5 E5 B4 D5 C5 A4 C4 E4 A4 B4 E4 G#4 B4 C5",
      "E5 D#5 E5 D#5 E5 B4 D5 C5 A4 C4 E4 A4 B4 E4 C5 B4 A4:3",
    ].join(" "),
  },
  {
    name: "Marcha Turca",
    notes: [
      "B4 A4 G#4 A4 C5 D5 C5 B4 C5 E5 F5 E5 D#5 E5",
      "B5 A5 G#5 A5 B5 A5 G#5 A5 C6 A5 C6",
      "B5 A5 G5 A5 B5 A5 G5 A5 B5 A5 G5 F#5 E5 E5 F5",
      "G5 G5 A5 G5 F5 E5 D5 E5 F5 G5 G5 A5 G5 F5 E5 D5 C5 D5",
      "E5 E5 F5 E5 D5 C5 B4 C5 D5 E5 E5 F5 E5 D5 C5 B4 B4 A4 G#4 A4:3",
    ].join(" "),
  },
  {
    name: "Cancã",
    notes: [
      "A4 E4 E4 F#4 E4 D4 D4 F#4 G4 B4 D5 B4 B4 A4 A4:2",
      "B4 C#5 C#5 B4 A4 D4 D4 F#4 E4:2 F#4 E4 E4 D4 D4:2",
      "F#5:2 D5:2 B4:2 A4:2 A4 E4 F#4 G4 F#4 E4 D4:2",
      "F#5:2 D5:2 B4:2 A4:2 G#4 A4 B4 C#5 E5 D5 D5:2",
      "D5 A4 C#5 A4 D5 A4 C#5 A4 D5 A4 C#5 A4 D5 A4 C#5 A4",
      "D5 D5 D5 D5 D5 D5 D5 D5 D5 D5 D5 D5 D5 D5 D5 D5:3",
    ].join(" "),
  },
  {
    name: "Rei da Montanha",
    notes: [
      hold("B4 C#5 D5 B4 C#5 D5 B4 D5 F#5 E5 D5 C#5 B4"),
      "B4 C#5 D5 B4 C#5 D5 B4 D5 F#5 E5 D5 C#5 B4",
      repeat("D5 E5 F#5 D5 E5 F#5 D5 F#5 A5 G5 F#5 E5 D5", 2),
      "F#5 G5 A5 F#5 G5 A5 F#5 A5 C#6 B5 A5 G5 F#5",
      "F#5 G5 A5 F#5 G5 A5 F#5 A5 C#6 B5 A5 G5 F#5:3",
    ].join(" "),
  },
];

const LEVELS = [
  { name: "Fácil", speed: 2 },
  { name: "Médio", speed: 3.2 },
  { name: "Difícil", speed: 4.8 },
];
