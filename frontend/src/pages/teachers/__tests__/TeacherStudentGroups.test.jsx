import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import TeacherStudentGroups from './TeacherStudentGroups';
import * as teacherGroupAssignmentService from '../../services/teacherGroupAssignmentService';

jest.mock('../../services/teacherGroupAssignmentService');

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockUser = { id: 1, name: 'Profesor Test', role: 'teacher' };
const mockToken = 'fake-token';
const mockGroups = [
  { id: 1, name: 'Grupo A', subject: 'Matemáticas' },
  { id: 2, name: 'Grupo B', subject: 'Ciencias' },
];

const renderComponent = () => {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={{ user: mockUser, token: mockToken }}>
        <TeacherStudentGroups />
      </AuthContext.Provider>
    </MemoryRouter>
  );
};

describe('TeacherStudentGroups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    teacherGroupAssignmentService.getGroupsByTeacher.mockResolvedValue({ data: mockGroups });
  });

  test('renderiza el botón de volver', async () => {
    renderComponent();
    expect(screen.getByText(/volver/i)).toBeInTheDocument();
  });

  test('muestra loading inicialmente', () => {
    renderComponent();
    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  test('muestra grupos después de cargar', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Grupo A')).toBeInTheDocument();
      expect(screen.getByText('Grupo B')).toBeInTheDocument();
    });
  });

  test('muestra mensaje cuando no hay grupos', async () => {
    teacherGroupAssignmentService.getGroupsByTeacher.mockResolvedValue({ data: [] });
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/no hay grupos/i)).toBeInTheDocument();
    });
  });

  test('muestra mensaje de error', async () => {
    teacherGroupAssignmentService.getGroupsByTeacher.mockRejectedValue(new Error('Error de red'));
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('navega a lista de estudiantes al hacer clic en un grupo', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Grupo A')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Grupo A').closest('div'));

    expect(mockNavigate).toHaveBeenCalledWith('/teacher/groups/1/students');
  });
});
