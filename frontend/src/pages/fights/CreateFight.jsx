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
    <div className="bg-white rounded-xl shadow-sm p-5 max-w-[600px]">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Crear Nueva Pelea</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Evento</label>
          <input name="evento" value={form.evento} onChange={handleChange} placeholder="Nombre del evento" required
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Fecha</label>
          <input name="fecha" type="date" value={form.fecha} onChange={handleChange} required
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Boxeador Rojo</label>
            <input name="boxeadorRojo" value={form.boxeadorRojo} onChange={handleChange} placeholder="Nombre" required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Boxeador Azul</label>
            <input name="boxeadorAzul" value={form.boxeadorAzul} onChange={handleChange} placeholder="Nombre" required
              className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1">Cantidad de Rounds</label>
          <select name="rounds" value={form.rounds} onChange={handleChange}
            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 bg-white">
            {[4, 6, 8, 10, 12].map((r) => (
              <option key={r} value={r}>{r} rounds</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 bg-[#6b1421] text-white rounded-lg text-sm font-semibold hover:bg-[#4a0f14] transition-colors">Guardar</button>
          <button type="button" className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:border-[#6b1421] hover:text-[#6b1421] transition-colors" onClick={() => navigate('/fights')}>Cancelar</button>
        </div>
      </form>
    </div>
  );
};

export default CreateFight;
