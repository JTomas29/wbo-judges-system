import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockFights } from '../../data/mockData';

const CreateFight = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    evento: '',
    fecha: '',
    boxeadorRojo: '',
    boxeadorAzul: '',
    rounds: 12,
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newId = Math.max(...mockFights.map((f) => f.id)) + 1;
    navigate(`/fights/${newId}`);
  };

  return (
    <div className="card" style={{ maxWidth: 600 }}>
      <h2 className="mb-16">Crear Nueva Pelea</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Evento</label>
          <input name="evento" value={form.evento} onChange={handleChange} placeholder="Nombre del evento" required />
        </div>
        <div className="form-group">
          <label>Fecha</label>
          <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Boxeador Rojo</label>
            <input name="boxeadorRojo" value={form.boxeadorRojo} onChange={handleChange} placeholder="Nombre" required />
          </div>
          <div className="form-group">
            <label>Boxeador Azul</label>
            <input name="boxeadorAzul" value={form.boxeadorAzul} onChange={handleChange} placeholder="Nombre" required />
          </div>
        </div>
        <div className="form-group">
          <label>Cantidad de Rounds</label>
          <select name="rounds" value={form.rounds} onChange={handleChange}>
            {[4, 6, 8, 10, 12].map((r) => (
              <option key={r} value={r}>{r} rounds</option>
            ))}
          </select>
        </div>
        <div className="btn-group mt-16">
          <button type="submit" className="btn btn-primary">Guardar</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/fights')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default CreateFight;
