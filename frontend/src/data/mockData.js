export const mockUser = {
  id: 1,
  name: 'Admin WBO',
  email: 'admin@wbo.com',
  role: 'admin',
};

export const mockFights = [
  {
    id: 1,
    evento: 'Velada del Año',
    boxeadorRojo: 'Juan Pérez',
    boxeadorAzul: 'Carlos López',
    estado: 'Activa',
    fecha: '2026-07-15',
    rounds: 12,
  },
  {
    id: 2,
    evento: 'Campeonato Mundial',
    boxeadorRojo: 'Mike Torres',
    boxeadorAzul: 'Sergio Díaz',
    estado: 'Finalizada',
    fecha: '2026-06-20',
    rounds: 10,
  },
  {
    id: 3,
    evento: 'Noche de Combates',
    boxeadorRojo: 'Andrés Ruiz',
    boxeadorAzul: 'Luis Mora',
    estado: 'Pendiente',
    fecha: '2026-08-10',
    rounds: 8,
  },
  {
    id: 4,
    evento: 'Título Intercontinental',
    boxeadorRojo: 'Roberto Vega',
    boxeadorAzul: 'Fernando Cruz',
    estado: 'Activa',
    fecha: '2026-07-28',
    rounds: 12,
  },
];

export const mockJudges = [
  { id: 1, nombre: 'Dr. Ricardo Méndez', email: 'rmendez@wbo.com', estado: 'Activo' },
  { id: 2, nombre: 'Lic. Ana Flores', email: 'aflores@wbo.com', estado: 'Activo' },
  { id: 3, nombre: 'Mtro. Pedro Sánchez', email: 'psanchez@wbo.com', estado: 'Inactivo' },
  { id: 4, nombre: 'Ing. Laura Vega', email: 'lvega@wbo.com', estado: 'Activo' },
  { id: 5, nombre: 'Sr. Jorge Ríos', email: 'jrios@wbo.com', estado: 'Activo' },
];

export const mockAssignments = [
  { id: 1, fightId: 1, judgeId: 1, estado: 'Confirmado' },
  { id: 2, fightId: 1, judgeId: 2, estado: 'Pendiente' },
  { id: 3, fightId: 1, judgeId: 4, estado: 'Pendiente' },
  { id: 4, fightId: 2, judgeId: 1, estado: 'Confirmado' },
  { id: 5, fightId: 2, judgeId: 3, estado: 'Confirmado' },
  { id: 6, fightId: 2, judgeId: 5, estado: 'Confirmado' },
];

export const mockRounds = [
  { round: 1, rojo: 10, azul: 9 },
  { round: 2, rojo: 10, azul: 9 },
  { round: 3, rojo: 9, azul: 10 },
  { round: 4, rojo: 10, azul: 9 },
  { round: 5, rojo: 9, azul: 10 },
  { round: 6, rojo: 10, azul: 9 },
  { round: 7, rojo: 10, azul: 9 },
  { round: 8, rojo: 9, azul: 10 },
  { round: 9, rojo: 10, azul: 9 },
  { round: 10, rojo: 10, azul: 9 },
];

export const mockAnalysis = {
  ganadorOficial: 'Juan Pérez',
  mejorJuez: 'Dr. Ricardo Méndez',
  peorJuez: 'Ing. Laura Vega',
  consistencia: [
    { juez: 'Dr. Ricardo Méndez', aciertos: 10, errores: 0, porcentaje: 100 },
    { juez: 'Lic. Ana Flores', aciertos: 8, errores: 2, porcentaje: 80 },
    { juez: 'Ing. Laura Vega', aciertos: 6, errores: 4, porcentaje: 60 },
  ],
};
