// Domínio público. "C4" = bloco curto. "C4:2" = bloco longo de 2 tempos (segurar).
// Melodias escritas de memória: conferir de ouvido.
const repeat = (phrase, times) => Array(times).fill(phrase).join(" ");

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
];

const LEVELS = [
  { name: "Fácil", speed: 2 },
  { name: "Médio", speed: 3.2 },
  { name: "Difícil", speed: 4.8 },
];
