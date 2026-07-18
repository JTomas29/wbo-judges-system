import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import TeacherStudentList from './TeacherStudentList';
import * as studentService from '../../services/studentService';
import * as teacherGroupAssignmentService from '../../services/teacherGroupAssignmentService';

jest.mock('../../services/studentService');
jest.mock('../../services/teacherGroupAssignmentService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useParams: () => ({ groupId: '1' }),
}));

const mockUser = { id: 1, name: 'Profesor Test', role: 'teacher' };
const mockToken = 'fake-token';
const mockStudents = [
  { id: 1, name: 'Juan Pérez', email: 'juan@test.com', is_active: true },
  { id: 2, name: 'María García', email: 'maria@test.com', is_active: true },
  { id: 3, name: 'Carlos López', email: 'carlos@test.com', is_active: false },
];

const renderComponent = () => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: mockUser, token: mockToken }}>
        <TeacherStudentList />
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('TeacherStudentList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    studentService.getStudents.mockResolvedValue({ data: mockStudents });
  });

  test('renderiza el botón de volver', async () => {
    renderComponent();
    expect(screen.getByText(/volver/i)).toBeInTheDocument();
  });

  test('muestra loading inicialmente', () => {
    renderComponent();
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  test('muestra estudiantes después de cargar', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
    });
  });

  test('muestra mensaje cuando no hay estudiantes', async () => {
    studentService.getStudents.mockResolvedValue({ data: [] });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/no hay estudiantes/i)).toBeInTheDocument();
    });
  });

  test('muestra mensaje de error', async () => {
    studentService.getStudents.mockRejectedValue(new Error('Error de red'));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('filtra estudiantes por nombre', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/buscar/i);
    fireEvent.change(searchInput, { target: { value: 'Juan' } });

    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    expect(screen.queryByText('María García')).not.toBeInTheDocument();
  });
});
