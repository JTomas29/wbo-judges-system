/**
 * notificationNavigation.js — Resolución de la ruta a la que lleva cada notificación.
 *
 * No hace requests HTTP: es un módulo de lógica pura que decide la URL destino
 * a partir del "title" de la notificación (matcheo por texto), de su tipo de
 * referencia (fight/user) y del rol del usuario que la recibe.
 *
 * getNotificationRoute(notification, userRole):
 *   - Devuelve { path, deleted }.
 *   - "deleted" marca notificaciones de entidades que ya no existen (p. ej.
 *     pelea eliminada); el componente que la consume puede ocultar el enlace y
 *     solo mostrar el texto.
 */

// Tabla de reglas: cada entrada define una condición `match` y una función
// `route` que construye la ruta (recibe title, refType, refId, role).
const TITLE_ROUTE_MAP = [
  {
    // Pelea asignada a un juez → detalle de la pelea.
    match: (title) => title === 'Fuiste designado para una pelea',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    // Se quitó una asignación → se mantiene el detalle de la pelea.
    match: (title) => title === 'Asignación eliminada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    // Pelea activada para puntuar en vivo → detalle de la pelea.
    match: (title) => title === 'Pelea lista para comenzar',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    // Pelea con datos modificados → detalle de la pelea.
    match: (title) => title === 'Pelea modificada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    // Pelea finalizada → detalle de la pelea.
    match: (title) => title === 'Pelea finalizada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    // Pelea eliminada → ya no existe; se va al dashboard y se marca "deleted".
    match: (title) => title === 'Pelea eliminada',
    route: () => '/dashboard',
    deleted: true,
  },
  {
    // Alta de una pelea → detalle de la pelea recién creada.
    match: (title) => title === 'Nueva pelea creada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    // El juez finalizó su tarjeta de puntuación → detalle de la pelea.
    match: (title) => title === 'Tarjeta finalizada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    // Análisis generado. La ruta es la misma para 'judge' y otros roles,
    // por eso el match/route incluye "role" aunque ambas ramas coincidan.
    match: (title) => title === 'Análisis completado',
    route: (_title, _refType, refId, role) =>
      role === 'judge' ? `/analysis/${refId}` : `/analysis/${refId}`,
  },
  {
    // Notificación general de análisis listo → pantalla de análisis.
    match: (title) => title === 'Análisis disponible',
    route: (_title, _refType, refId) => `/analysis/${refId}`,
  },
  {
    // Tarjeta oficial emitida → vista de tarjeta oficial de la pelea.
    match: (title) => title === 'Tarjeta oficial cargada',
    route: (_title, _refType, refId) => `/official-cards/${refId}`,
  },
  {
    match: (title) => title === 'Tarjeta oficial disponible',
    route: (_title, _refType, refId) => `/official-cards/${refId}`,
  },
  {
    // Nivel del juez recalificado → listado de jueces.
    match: (title) => title === 'Nivel actualizado',
    route: () => '/judges',
  },
  {
    // Registro de un nuevo usuario. Solo lleva a /admin/users si el receptor
    // es admin; los títulos empiezan con "Nuevo" y contienen "registrado".
    match: (title, _refType, _refId, role) =>
      role === 'admin' && title?.startsWith('Nuevo') && title?.includes('registrado'),
    route: () => '/admin/users',
  },
  {
    // Actualización de un juez (solo visible/accionable para admin).
    match: (title, _refType, _refId, role) =>
      role === 'admin' && title === 'Juez actualizado',
    route: () => '/admin/users',
  },
  {
    // Eliminación de un juez (solo admin): se usa la pantalla de usuarios.
    match: (title, _refType, _refId, role) =>
      role === 'admin' && title === 'Juez eliminado',
    route: () => '/admin/users',
  },
];

// Fallback por tipo de referencia cuando ningún título matchea: si la
// notificación referencia una pelea → su detalle; si referencia un usuario → /admin/users.
const REFERENCE_TYPE_FALLBACK = {
  fight: (refId) => `/fights/${refId}`,
  user: () => '/admin/users',
};

// Decide la ruta destino de una notificación en este orden:
//   1. Recorre TITLE_ROUTE_MAP y usa la primera regla cuyo `match` dé true.
//   2. Si ninguna matchea, usa el fallback según reference_type.
//   3. Último recurso: /dashboard.
export const getNotificationRoute = (notification, userRole) => {
  const { title, reference_type, reference_id } = notification;

  for (const entry of TITLE_ROUTE_MAP) {
    if (entry.match(title, reference_type, reference_id, userRole)) {
      return {
        path: entry.route(title, reference_type, reference_id, userRole),
        // "deleted" se propaga si la regla lo marcó (ej.: pelea eliminada).
        deleted: entry.deleted || false,
      };
    }
  }

  if (reference_type && REFERENCE_TYPE_FALLBACK[reference_type]) {
    return {
      path: REFERENCE_TYPE_FALLBACK[reference_type](reference_id),
      deleted: false,
    };
  }

  return { path: '/dashboard', deleted: false };
};
