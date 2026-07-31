const TITLE_ROUTE_MAP = [
  {
    match: (title) => title === 'Fuiste designado para una pelea',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    match: (title) => title === 'Asignación eliminada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    match: (title) => title === 'Juez confirmó participación',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    match: (title) => title === 'Designación rechazada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    match: (title) => title === 'Pelea lista para comenzar',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    match: (title) => title === 'Pelea modificada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    match: (title) => title === 'Pelea finalizada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    match: (title) => title === 'Pelea eliminada',
    route: () => '/dashboard',
    deleted: true,
  },
  {
    match: (title) => title === 'Nueva pelea creada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    match: (title) => title === 'Tarjeta finalizada',
    route: (_title, _refType, refId) => `/fights/${refId}`,
  },
  {
    match: (title) => title === 'Análisis completado',
    route: (_title, _refType, refId, role) =>
      role === 'judge' ? `/analysis/${refId}` : `/analysis/${refId}`,
  },
  {
    match: (title) => title === 'Análisis disponible',
    route: (_title, _refType, refId) => `/analysis/${refId}`,
  },
  {
    match: (title) => title === 'Tarjeta oficial cargada',
    route: (_title, _refType, refId) => `/official-cards/${refId}`,
  },
  {
    match: (title) => title === 'Tarjeta oficial disponible',
    route: (_title, _refType, refId) => `/official-cards/${refId}`,
  },
  {
    match: (title) => title === 'Nivel actualizado',
    route: () => '/judges',
  },
  {
    match: (title, _refType, _refId, role) =>
      role === 'admin' && title?.startsWith('Nuevo') && title?.includes('registrado'),
    route: () => '/admin/users',
  },
  {
    match: (title, _refType, _refId, role) =>
      role === 'admin' && title === 'Juez actualizado',
    route: () => '/admin/users',
  },
  {
    match: (title, _refType, _refId, role) =>
      role === 'admin' && title === 'Juez eliminado',
    route: () => '/admin/users',
  },
];

const REFERENCE_TYPE_FALLBACK = {
  fight: (refId) => `/fights/${refId}`,
  user: () => '/admin/users',
};

export const getNotificationRoute = (notification, userRole) => {
  const { title, reference_type, reference_id } = notification;

  for (const entry of TITLE_ROUTE_MAP) {
    if (entry.match(title, reference_type, reference_id, userRole)) {
      return {
        path: entry.route(title, reference_type, reference_id, userRole),
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
